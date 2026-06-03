import prisma from '@/lib/prisma'
import { applyTransactionBalance, revertTransactionBalance } from '@/lib/transaction-balance'
import { resolveAccount } from '@/lib/detect-payment-context'
import { advanceByFrequency, expectedDueDatesBetween } from '@/lib/recurring-occurrence'
import type { PaymentMethod } from '@/generated/prisma/enums'
import type { RecurringTransaction, RecurringOccurrence } from '@/generated/prisma/client'

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

export type MarkRecurringOccurrencesAsPaidResult = {
  ok: boolean
  description?: string
  paidCount?: number
  totalAmount?: number
  paidDates?: string[]
  remainingPending?: number
  accountName?: string
  nextPendingDate?: string | null
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

/**
 * Garante que existem RecurringOccurrence PENDING pra toda data teórica
 * entre a última occurrence conhecida (ou nextDueDate) e `until`. Idempotente
 * via unique [recurringTransactionId, dueDate].
 *
 * Chamado pelo cron e pelo webhook antes de qualquer leitura de occurrences,
 * pra cobrir o caso de recorrências que nunca rodaram desde o backfill ou
 * acabaram de ser criadas. Para recorrências PAUSED/COMPLETED/CANCELLED,
 * não gera nada.
 */
export async function ensureNextOccurrences(
  recurring: Pick<RecurringTransaction, 'id' | 'startDate' | 'nextDueDate' | 'frequency' | 'status' | 'endDate'>,
  until: Date,
): Promise<number> {
  if (recurring.status !== 'ACTIVE') return 0

  // Última occurrence conhecida (PAID, PENDING, SNOOZED ou SKIPPED) — usada
  // como ponto de partida pra avançar pelas datas teóricas. Se não existe,
  // partimos do nextDueDate da recorrência.
  const latest = await prisma.recurringOccurrence.findFirst({
    where: { recurringTransactionId: recurring.id },
    orderBy: { dueDate: 'desc' },
    select: { dueDate: true },
  })

  // Próxima data teórica = latest + frequency, ou nextDueDate se não há latest.
  const from = latest
    ? advanceByFrequency(latest.dueDate, recurring.frequency)
    : recurring.nextDueDate

  if (from > until) return 0
  if (recurring.endDate && from > recurring.endDate) return 0

  const upper = recurring.endDate && recurring.endDate < until ? recurring.endDate : until
  const dates = expectedDueDatesBetween(recurring.startDate, recurring.frequency, from, upper)

  let created = 0
  for (const dueDate of dates) {
    try {
      await prisma.recurringOccurrence.create({
        data: { recurringTransactionId: recurring.id, dueDate, status: 'PENDING' },
      })
      created++
    } catch {
      // Unique violation — outra concorrência criou. Seguro pular.
    }
  }
  return created
}

/**
 * Quita as N occurrences PENDING mais antigas (FIFO) de uma recorrência.
 * Cria uma Transaction por occurrence, aplica balance, marca occurrence
 * como PAID com `paidTransactionId` setado. Atômico por occurrence.
 *
 * Caller pode passar `n='all'` pra quitar todas as PENDING. Se houver menos
 * PENDING que `n`, quita o que tem e retorna o paidCount real.
 */
export async function markRecurringOccurrencesAsPaid(
  userId: string,
  recurringId: string,
  n: number | 'all',
): Promise<MarkRecurringOccurrencesAsPaidResult> {
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

  const pending = await prisma.recurringOccurrence.findMany({
    where: { recurringTransactionId: recurringId, status: 'PENDING' },
    orderBy: { dueDate: 'asc' },
    take: n === 'all' ? undefined : n,
  })

  if (pending.length === 0) {
    return { ok: false, error: 'Nenhuma parcela pendente pra quitar.' }
  }

  const accountName = (await prisma.account.findUnique({
    where: { id: accountId! },
    select: { name: true },
  }))?.name ?? 'conta padrão'

  const paidDates: string[] = []
  for (const occ of pending) {
    await prisma.$transaction(async (db) => {
      const tx = await db.transaction.create({
        data: {
          userId,
          description: recurring.description,
          amount: recurring.amount,
          type: recurring.type,
          date: occ.dueDate,
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
        date: occ.dueDate,
      })
      await db.recurringOccurrence.update({
        where: { id: occ.id },
        data: { status: 'PAID', paidTransactionId: tx.id },
      })
    })
    paidDates.push(occ.dueDate.toISOString().slice(0, 10))
  }

  // Atualiza nextDueDate da recorrência pra próxima PENDING (se houver) ou
  // pra próxima data teórica após a última paid. Mantém o campo coerente
  // pra outras partes do sistema que ainda lêem nextDueDate.
  const stillPending = await prisma.recurringOccurrence.findFirst({
    where: { recurringTransactionId: recurringId, status: 'PENDING' },
    orderBy: { dueDate: 'asc' },
    select: { dueDate: true },
  })

  const lastPaidDate = pending[pending.length - 1].dueDate
  const nextDate = stillPending
    ? stillPending.dueDate
    : advanceByFrequency(lastPaidDate, recurring.frequency)
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

  const remainingPending = await prisma.recurringOccurrence.count({
    where: { recurringTransactionId: recurringId, status: 'PENDING' },
  })

  return {
    ok: true,
    description: recurring.description,
    paidCount: pending.length,
    totalAmount: Number(recurring.amount) * pending.length,
    paidDates,
    remainingPending,
    accountName,
    nextPendingDate: becameCompleted ? null : nextDate.toISOString(),
  }
}

/**
 * Quita occurrences específicas (por ID, não FIFO). Permite o caso parcial
 * não-FIFO ("paguei só a do meio") — exclusivo da UI no app. Retorna IDs
 * das occurrences quitadas e das Transactions criadas pra alimentar Undo.
 *
 * Cada occurrence vira uma Transaction; balance é aplicado por occurrence.
 * Diferente de markRecurringOccurrencesAsPaid (FIFO), aqui o caller já
 * escolheu quais; não tocamos em nextDueDate da recurring se as quitadas
 * forem do meio.
 */
export async function markRecurringOccurrenceIdsAsPaid(
  userId: string,
  occurrenceIds: string[],
): Promise<{
  ok: boolean
  paidCount?: number
  totalAmount?: number
  results?: Array<{ occurrenceId: string; transactionId: string; dueDate: string }>
  description?: string
  error?: string
}> {
  if (occurrenceIds.length === 0) {
    return { ok: false, error: 'Nenhuma parcela selecionada.' }
  }

  const occurrences = await prisma.recurringOccurrence.findMany({
    where: {
      id: { in: occurrenceIds },
      status: 'PENDING',
      recurring: { userId },
    },
    include: { recurring: true },
  })

  if (occurrences.length === 0) {
    return { ok: false, error: 'Nenhuma parcela pendente encontrada (talvez já foram quitadas).' }
  }

  // Todas as occurrences precisam ser da mesma recurring — caso contrário
  // o caller cometeu erro. Não dá pra misturar contas em uma chamada.
  const uniqueRecurringIds = new Set(occurrences.map(o => o.recurringTransactionId))
  if (uniqueRecurringIds.size > 1) {
    return { ok: false, error: 'Selecione parcelas de uma única recorrência por vez.' }
  }

  const recurring = occurrences[0].recurring

  let accountId = recurring.accountId
  if (!accountId) {
    const accounts = await prisma.account.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'asc' },
    })
    const resolved = resolveAccount(null, 'DEBIT', accounts as Parameters<typeof resolveAccount>[2])
    if (!resolved) {
      return { ok: false, error: 'Nenhuma conta ativa encontrada pra dar baixa.' }
    }
    accountId = resolved.id
  }

  const results: Array<{ occurrenceId: string; transactionId: string; dueDate: string }> = []
  for (const occ of occurrences) {
    await prisma.$transaction(async (db) => {
      const tx = await db.transaction.create({
        data: {
          userId,
          description: recurring.description,
          amount: recurring.amount,
          type: recurring.type,
          date: occ.dueDate,
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
        date: occ.dueDate,
      })
      await db.recurringOccurrence.update({
        where: { id: occ.id },
        data: { status: 'PAID', paidTransactionId: tx.id },
      })
      results.push({
        occurrenceId: occ.id,
        transactionId: tx.id,
        dueDate: occ.dueDate.toISOString(),
      })
    })
  }

  return {
    ok: true,
    paidCount: results.length,
    totalAmount: Number(recurring.amount) * results.length,
    results,
    description: recurring.description,
  }
}

/**
 * Reverte uma quitação: deleta a Transaction, reverte balance e devolve
 * a occurrence pro status PENDING. Usado pelo Undo da UI.
 */
export async function revertOccurrencePayment(
  userId: string,
  occurrenceId: string,
): Promise<{ ok: boolean; error?: string }> {
  const occ = await prisma.recurringOccurrence.findFirst({
    where: { id: occurrenceId, recurring: { userId } },
    include: { transaction: true },
  })
  if (!occ) return { ok: false, error: 'Parcela não encontrada.' }
  if (occ.status !== 'PAID' || !occ.transaction) {
    return { ok: false, error: 'Parcela não está marcada como paga.' }
  }

  const tx = occ.transaction
  await prisma.$transaction(async (db) => {
    await revertTransactionBalance(db, {
      type: tx.type,
      amount: Number(tx.amount),
      accountId: tx.accountId,
      toAccountId: tx.toAccountId,
      paymentMethod: tx.paymentMethod,
      date: tx.date,
    })
    await db.recurringOccurrence.update({
      where: { id: occ.id },
      data: { status: 'PENDING', paidTransactionId: null },
    })
    await db.transaction.delete({ where: { id: tx.id } })
  })

  return { ok: true }
}

/**
 * Same semantics as the "Paguei" button in cron alerts: creates the transaction,
 * applies the balance, and advances nextDueDate (or marks as COMPLETED if past endDate).
 *
 * Implementado em cima de markRecurringOccurrencesAsPaid (n=1) — todos os
 * callers existentes (cron auto-launch, /api/recurring/[id]/mark-paid,
 * agent tool, webhook "paid") continuam funcionando, e ganham de graça a
 * sincronização com a tabela de occurrences.
 */
export async function markRecurringAsPaid(
  userId: string,
  recurringId: string,
  _paidDate?: Date,
): Promise<MarkRecurringAsPaidResult> {
  // paidDate é ignorado intencionalmente — agora a data vem da occurrence
  // PENDING mais antiga (FIFO), que é a fonte de verdade pra qual parcela
  // estamos quitando. Param mantido por compat com chamadas existentes.
  const result = await markRecurringOccurrencesAsPaid(userId, recurringId, 1)
  if (!result.ok) return { ok: false, error: result.error }

  return {
    ok: true,
    description: result.description,
    amount: result.totalAmount,
    accountName: result.accountName,
    paymentMethod: 'DEBIT',
    nextDueDate: result.nextPendingDate,
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
