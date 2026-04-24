import prisma from '@/lib/prisma'
import { applyTransactionBalance } from '@/lib/transaction-balance'
import { resolveAccount } from '@/lib/detect-payment-context'

export type MarkRecurringAsPaidResult = {
  ok: boolean
  transactionId?: string
  description?: string
  amount?: number
  nextDueDate?: string | null
  error?: string
}

function addByFrequency(current: Date, frequency: string): Date {
  const next = new Date(current)
  switch (frequency) {
    case 'DAILY': next.setDate(next.getDate() + 1); break
    case 'WEEKLY': next.setDate(next.getDate() + 7); break
    case 'BIWEEKLY': next.setDate(next.getDate() + 14); break
    case 'MONTHLY': next.setMonth(next.getMonth() + 1); break
    case 'QUARTERLY': next.setMonth(next.getMonth() + 3); break
    case 'YEARLY': next.setFullYear(next.getFullYear() + 1); break
  }
  return next
}

/**
 * Same semantics as the "Paguei" button in cron alerts: creates the transaction,
 * applies the balance, and advances nextDueDate (or marks as COMPLETED if past endDate).
 * `paidDate` defaults to the recurring's nextDueDate.
 */
export async function markRecurringAsPaid(
  userId: string,
  recurringId: string,
  paidDate?: Date
): Promise<MarkRecurringAsPaidResult> {
  const recurring = await prisma.recurringTransaction.findFirst({
    where: { id: recurringId, userId },
  })

  if (!recurring) {
    return { ok: false, error: 'Recorrência não encontrada ou não pertence a este usuário.' }
  }

  if (recurring.status !== 'ACTIVE') {
    return { ok: false, error: `Recorrência está com status ${recurring.status}, não pode ser marcada como paga.` }
  }

  let accountId = recurring.accountId
  if (!accountId) {
    const accounts = await prisma.account.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'asc' },
    })
    const resolved = resolveAccount(null, 'DEBIT', accounts as Parameters<typeof resolveAccount>[2])
    if (!resolved) {
      return { ok: false, error: 'Nenhuma conta ativa encontrada para dar baixa no pagamento.' }
    }
    accountId = resolved.id
  }

  const txDate = paidDate ?? recurring.nextDueDate

  const transaction = await prisma.$transaction(async (db) => {
    const created = await db.transaction.create({
      data: {
        userId,
        description: recurring.description,
        amount: recurring.amount,
        type: recurring.type,
        date: txDate,
        accountId: accountId!,
        categoryId: recurring.categoryId ?? undefined,
        recurringTransactionId: recurring.id,
        paymentMethod: 'DEBIT',
      },
    })
    await applyTransactionBalance(db, {
      type: recurring.type,
      amount: Number(recurring.amount),
      accountId: accountId!,
      paymentMethod: 'DEBIT',
      date: txDate,
    })
    return created
  })

  const nextDate = addByFrequency(recurring.nextDueDate, recurring.frequency)
  const becameCompleted = recurring.endDate !== null && nextDate > recurring.endDate

  if (becameCompleted) {
    await prisma.recurringTransaction.update({
      where: { id: recurring.id },
      data: { status: 'COMPLETED' },
    })
  } else {
    await prisma.recurringTransaction.update({
      where: { id: recurring.id },
      data: { nextDueDate: nextDate },
    })
  }

  return {
    ok: true,
    transactionId: transaction.id,
    description: recurring.description,
    amount: Number(recurring.amount),
    nextDueDate: becameCompleted ? null : nextDate.toISOString(),
  }
}
