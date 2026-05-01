import type { Prisma, PrismaClient } from '@/generated/prisma/client'
import type { TransactionType, PaymentMethod } from '@/generated/prisma/enums'

type DB = PrismaClient | Prisma.TransactionClient

/**
 * Applies the balance side effect of a transaction.
 *
 * Rules:
 * - TRANSFER: debits accountId, credits toAccountId (payment method ignored).
 * - Non-TRANSFER with paymentMethod=CREDIT: the accountId is expected to be a
 *   CREDIT_CARD account. EXPENSE increments the card's outstanding invoice
 *   balance (amount owed); INCOME (refund/credit) decrements it. The linked
 *   bank account is NOT touched — it only moves when the invoice is paid
 *   (separate flow in Entrega 2).
 * - Non-TRANSFER with any other paymentMethod: EXPENSE decrements the account
 *   balance, INCOME increments it.
 *
 * Future-dated transactions do not alter balances regardless of method.
 */
export async function applyTransactionBalance(
  db: DB,
  args: {
    type: TransactionType
    amount: number
    accountId: string
    toAccountId?: string | null
    paymentMethod: PaymentMethod
    date: Date
  }
) {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  if (args.date > today) return

  if (args.type === 'TRANSFER') {
    if (!args.toAccountId) return
    await db.account.update({
      where: { id: args.accountId },
      data: { balance: { decrement: args.amount } },
    })
    await db.account.update({
      where: { id: args.toAccountId },
      data: { balance: { increment: args.amount } },
    })
    return
  }

  if (args.paymentMethod === 'CREDIT') {
    // Credit card: the card's "balance" represents the open invoice debt.
    // EXPENSE increases debt, INCOME (refund) reduces it.
    // Bank account (linked) is unaffected until invoice is paid.
    const delta = args.type === 'EXPENSE' ? args.amount : -args.amount
    await db.account.update({
      where: { id: args.accountId },
      data: { balance: { increment: delta } },
    })
    return
  }

  // PIX / DEBIT / CASH / BOLETO / TRANSFER / MEAL_VOUCHER / FOOD_VOUCHER
  // — debita direto da conta (sem fatura). VR/VA funcionam como conta de
  // saldo: o user é creditado pelo empregador e gasta direto.
  if (args.type === 'EXPENSE') {
    await db.account.update({
      where: { id: args.accountId },
      data: { balance: { decrement: args.amount } },
    })
  } else if (args.type === 'INCOME') {
    await db.account.update({
      where: { id: args.accountId },
      data: { balance: { increment: args.amount } },
    })
  }
}

/**
 * Reverses a previously-applied balance change. Use before deleting or editing
 * a transaction so the old effect can be undone, then applyTransactionBalance
 * runs with the new values.
 */
export async function revertTransactionBalance(
  db: DB,
  args: {
    type: TransactionType
    amount: number
    accountId: string
    toAccountId?: string | null
    paymentMethod: PaymentMethod
    date: Date
  }
) {
  await applyTransactionBalance(db, {
    ...args,
    type: args.type === 'INCOME' ? ('EXPENSE' as TransactionType) : args.type === 'EXPENSE' ? ('INCOME' as TransactionType) : args.type,
    // TRANSFER reverses by swapping accounts
    accountId: args.type === 'TRANSFER' ? (args.toAccountId ?? args.accountId) : args.accountId,
    toAccountId: args.type === 'TRANSFER' ? args.accountId : args.toAccountId,
  })
}
