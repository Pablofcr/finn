import prisma from '@/lib/prisma'
import { applyTransactionBalance, revertTransactionBalance } from '@/lib/transaction-balance'
import { resolveAccount } from '@/lib/detect-payment-context'
import type { PaymentMethod } from '@/generated/prisma/enums'

export type MarkRecurringAsPaidResult = {
  ok: boolean
  transactionId?: string
  description?: string
  amount?: number
  accountName?: string
  paymentMethod?: PaymentMethod
  nextDueDate?: string | null
  error?: string
}

export type UpdateTransactionResult = {
  ok: boolean
  transactionId?: string
  description?: string
  amount?: number
  accountName?: string
  paymentMethod?: PaymentMethod
  date?: string
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

  const { created, account } = await prisma.$transaction(async (db) => {
    const tx = await db.transaction.create({
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
    const acc = await db.account.findUnique({ where: { id: accountId! }, select: { name: true } })
    return { created: tx, account: acc }
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
    transactionId: created.id,
    description: recurring.description,
    amount: Number(recurring.amount),
    accountName: account?.name ?? 'conta padrão',
    paymentMethod: 'DEBIT',
    nextDueDate: becameCompleted ? null : nextDate.toISOString(),
  }
}

/**
 * Update an existing transaction: change account, payment method, or date.
 * Reverts the old balance effect and applies the new one atomically.
 */
export async function updateTransaction(
  userId: string,
  transactionId: string,
  updates: { accountName?: string; paymentMethod?: PaymentMethod; date?: Date }
): Promise<UpdateTransactionResult> {
  const existing = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
  })
  if (!existing) {
    return { ok: false, error: 'Transação não encontrada ou não pertence a este usuário.' }
  }

  let newAccountId = existing.accountId
  if (updates.accountName) {
    const acc = await prisma.account.findFirst({
      where: { userId, isActive: true, name: { contains: updates.accountName, mode: 'insensitive' } },
      select: { id: true },
    })
    if (!acc) {
      return { ok: false, error: `Nenhuma conta ativa encontrada com o nome "${updates.accountName}".` }
    }
    newAccountId = acc.id
  }

  const newMethod = updates.paymentMethod ?? existing.paymentMethod
  const newDate = updates.date ?? existing.date

  const oldAmount = Number(existing.amount)

  const { updated, accountName } = await prisma.$transaction(async (db) => {
    // Revert old balance
    await revertTransactionBalance(db, {
      type: existing.type,
      amount: oldAmount,
      accountId: existing.accountId,
      toAccountId: existing.toAccountId,
      paymentMethod: existing.paymentMethod,
      date: existing.date,
    })

    // Update the transaction row
    const u = await db.transaction.update({
      where: { id: existing.id },
      data: {
        accountId: newAccountId,
        paymentMethod: newMethod,
        date: newDate,
      },
    })

    // Apply the new balance
    await applyTransactionBalance(db, {
      type: existing.type,
      amount: oldAmount,
      accountId: newAccountId,
      toAccountId: existing.toAccountId,
      paymentMethod: newMethod,
      date: newDate,
    })

    const acc = await db.account.findUnique({ where: { id: newAccountId }, select: { name: true } })
    return { updated: u, accountName: acc?.name ?? '' }
  })

  return {
    ok: true,
    transactionId: updated.id,
    description: updated.description,
    amount: Number(updated.amount),
    accountName,
    paymentMethod: newMethod,
    date: newDate.toISOString(),
  }
}
