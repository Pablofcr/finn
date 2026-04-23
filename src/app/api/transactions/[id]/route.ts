import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { transactionSchema } from '@/lib/validations/transaction'
import { applyTransactionBalance, revertTransactionBalance } from '@/lib/transaction-balance'
import { getOrCreateInvoiceFor, adjustInvoiceTotal } from '@/lib/invoice'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const transaction = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
    include: {
      category: true,
      account: true,
      installment: true,
    },
  })

  if (!transaction) {
    return Response.json({ error: 'Transação não encontrada' }, { status: 404 })
  }

  return Response.json({ data: transaction })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
  })

  if (!existing) {
    return Response.json({ error: 'Transação não encontrada' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = transactionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { installments: _installments, ...rest } = parsed.data
  const data = { ...rest, paymentMethod: rest.paymentMethod ?? 'DEBIT' as const }

  let creditCard: { id: string; userId: string; closingDay: number | null; dueDay: number | null } | null = null
  if (data.paymentMethod === 'CREDIT') {
    const account = await prisma.account.findFirst({
      where: { id: data.accountId, userId: user.id },
      select: { id: true, userId: true, type: true, closingDay: true, dueDay: true },
    })
    if (!account || account.type !== 'CREDIT_CARD') {
      return Response.json({ error: 'Forma de pagamento "Crédito" exige um cartão de crédito.' }, { status: 400 })
    }
    if (!account.closingDay || !account.dueDay) {
      return Response.json({ error: 'Configure fechamento e vencimento do cartão antes de lançar no crédito.' }, { status: 400 })
    }
    creditCard = account
  }

  const newDate = new Date(data.date)
  const transaction = await prisma.$transaction(async (db) => {
    // Reverse the old balance + invoice impact
    await revertTransactionBalance(db, {
      type: existing.type,
      amount: Number(existing.amount),
      accountId: existing.accountId,
      toAccountId: existing.toAccountId,
      paymentMethod: existing.paymentMethod,
      date: existing.date,
    })
    if (existing.invoiceId) {
      const revertDelta = existing.type === 'EXPENSE' ? -Number(existing.amount) : Number(existing.amount)
      await adjustInvoiceTotal(db, existing.invoiceId, revertDelta)
    }

    const invoice = creditCard ? await getOrCreateInvoiceFor(db, creditCard, newDate) : null

    const updated = await db.transaction.update({
      where: { id },
      data: {
        type: data.type,
        amount: data.amount,
        description: data.description,
        date: newDate,
        accountId: data.accountId,
        categoryId: data.categoryId || null,
        toAccountId: data.toAccountId || null,
        paymentMethod: data.paymentMethod,
        invoiceId: invoice?.id ?? null,
        location: data.location || null,
        notes: data.notes || null,
        tags: data.tags || [],
      },
      include: { category: true, account: true },
    })
    await applyTransactionBalance(db, {
      type: data.type,
      amount: data.amount,
      accountId: data.accountId,
      toAccountId: data.toAccountId,
      paymentMethod: data.paymentMethod,
      date: newDate,
    })
    if (invoice) {
      const delta = data.type === 'EXPENSE' ? data.amount : -data.amount
      await adjustInvoiceTotal(db, invoice.id, delta)
    }
    return updated
  })

  return Response.json({ data: transaction })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
  })

  if (!existing) {
    return Response.json({ error: 'Transação não encontrada' }, { status: 404 })
  }

  await prisma.$transaction(async (db) => {
    await revertTransactionBalance(db, {
      type: existing.type,
      amount: Number(existing.amount),
      accountId: existing.accountId,
      toAccountId: existing.toAccountId,
      paymentMethod: existing.paymentMethod,
      date: existing.date,
    })
    if (existing.invoiceId) {
      const delta = existing.type === 'EXPENSE' ? -Number(existing.amount) : Number(existing.amount)
      await adjustInvoiceTotal(db, existing.invoiceId, delta)
    }
    await db.transaction.delete({ where: { id } })
  })

  return Response.json({ message: 'Transação excluída' })
}
