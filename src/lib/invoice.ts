import type { Prisma, PrismaClient } from '@/generated/prisma/client'

type DB = PrismaClient | Prisma.TransactionClient

/**
 * Clamps a day-of-month to the last valid day of the given year+month.
 * Avoids Date's rollover (e.g., Feb 30 → Mar 2).
 */
function clampDay(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, lastDay))
}

/**
 * Given a transaction date and a card's closingDay/dueDay, return the
 * period boundaries and due date of the invoice that should contain that
 * transaction.
 *
 * Example — card closes on the 10th, due on the 20th:
 *   purchase on 05/Apr → period 11/Mar → 10/Apr, due 20/Apr
 *   purchase on 15/Apr → period 11/Apr → 10/May, due 20/May
 *
 * If dueDay <= closingDay, the due date naturally falls in the month
 * following the close.
 */
export function computeInvoicePeriod(
  txDate: Date,
  closingDay: number,
  dueDay: number,
) {
  const y = txDate.getFullYear()
  const m = txDate.getMonth()
  const d = txDate.getDate()

  // If the day is on or after closing day, it belongs to next month's invoice
  const closeMonthOffset = d >= closingDay ? 1 : 0

  const periodEndRaw = clampDay(y, m + closeMonthOffset, closingDay)
  const periodEnd = new Date(periodEndRaw)
  periodEnd.setHours(23, 59, 59, 999)

  // Period start = day after previous close
  const prevClose = clampDay(y, m + closeMonthOffset - 1, closingDay)
  const periodStart = new Date(prevClose)
  periodStart.setDate(periodStart.getDate() + 1)
  periodStart.setHours(0, 0, 0, 0)

  // Due date: if dueDay > closingDay, same month as close. Otherwise, next month.
  const dueMonthOffset = dueDay > closingDay ? closeMonthOffset : closeMonthOffset + 1
  const dueDate = clampDay(y, m + dueMonthOffset, dueDay)
  dueDate.setHours(23, 59, 59, 999)

  return { periodStart, periodEnd, dueDate }
}

interface CardLite {
  id: string
  userId: string
  closingDay: number | null
  dueDay: number | null
}

/**
 * Returns the Invoice that owns a given credit-card transaction on a given
 * date, creating it if it doesn't exist. The invoice's `total` is NOT
 * incremented here — caller is responsible for updating it inside the same
 * DB transaction where the Transaction row is created.
 */
export async function getOrCreateInvoiceFor(
  db: DB,
  card: CardLite,
  txDate: Date,
): Promise<{ id: string; periodStart: Date; periodEnd: Date; dueDate: Date } | null> {
  if (!card.closingDay || !card.dueDay) return null

  const { periodStart, periodEnd, dueDate } = computeInvoicePeriod(
    txDate,
    card.closingDay,
    card.dueDay,
  )

  const existing = await db.invoice.findUnique({
    where: { cardId_periodEnd: { cardId: card.id, periodEnd } },
    select: { id: true, periodStart: true, periodEnd: true, dueDate: true },
  })
  if (existing) return existing

  const created = await db.invoice.create({
    data: {
      userId: card.userId,
      cardId: card.id,
      periodStart,
      periodEnd,
      dueDate,
      total: 0,
      status: 'OPEN',
    },
    select: { id: true, periodStart: true, periodEnd: true, dueDate: true },
  })
  return created
}

/**
 * Adjust an invoice's running total. Positive delta for a new purchase,
 * negative when reversing (edit/delete). Also updates status when due date
 * passes or total is cleared.
 */
export async function adjustInvoiceTotal(
  db: DB,
  invoiceId: string,
  delta: number,
) {
  if (delta === 0) return
  await db.invoice.update({
    where: { id: invoiceId },
    data: { total: { increment: delta } },
  })
}
