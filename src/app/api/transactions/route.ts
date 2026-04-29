import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { transactionSchema } from '@/lib/validations/transaction'
import { checkTransactionLimit } from '@/lib/plan-limits'
import { applyTransactionBalance } from '@/lib/transaction-balance'
import { getOrCreateInvoiceFor, adjustInvoiceTotal } from '@/lib/invoice'

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const type = searchParams.get('type')
  // Accept comma-separated category IDs (multi-select) — fallback to single
  const categoryIdsParam = searchParams.get('categoryIds') || searchParams.get('categoryId')
  const accountIdsParam = searchParams.get('accountIds') || searchParams.get('accountId')
  const search = searchParams.get('search')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const valueMinStr = searchParams.get('valueMin')
  const valueMaxStr = searchParams.get('valueMax')

  const where: any = { userId: user.id }

  if (type) where.type = type
  if (categoryIdsParam) {
    const ids = categoryIdsParam.split(',').filter(Boolean)
    if (ids.length === 1) where.categoryId = ids[0]
    else if (ids.length > 1) where.categoryId = { in: ids }
  }
  if (accountIdsParam) {
    const ids = accountIdsParam.split(',').filter(Boolean)
    if (ids.length === 1) where.accountId = ids[0]
    else if (ids.length > 1) where.accountId = { in: ids }
  }
  if (search) where.description = { contains: search, mode: 'insensitive' }
  if (startDate || endDate) {
    where.date = {}
    if (startDate) where.date.gte = new Date(startDate)
    if (endDate) where.date.lte = new Date(endDate)
  }
  if (valueMinStr || valueMaxStr) {
    where.amount = {}
    if (valueMinStr) where.amount.gte = parseFloat(valueMinStr)
    if (valueMaxStr) where.amount.lte = parseFloat(valueMaxStr)
  }

  const [transactions, total, sums] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
        account: { select: { id: true, name: true, type: true, color: true } },
        installment: true,
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
    // Totais do filtro atual — independente da paginação. Alimenta o totalizer.
    prisma.transaction.groupBy({
      where,
      by: ['type'],
      _sum: { amount: true },
    }),
  ])

  const incomeSum = Number(sums.find((s) => s.type === 'INCOME')?._sum.amount ?? 0)
  const expenseSum = Number(sums.find((s) => s.type === 'EXPENSE')?._sum.amount ?? 0)
  const totals = {
    income: incomeSum,
    expense: expenseSum,
    net: incomeSum - expenseSum,
  }

  return Response.json({
    data: transactions,
    total,
    totals,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const limitCheck = await checkTransactionLimit(user.id)
  if (!limitCheck.allowed) {
    return Response.json({ error: `Limite do plano gratuito atingido (${limitCheck.current}/${limitCheck.limit}). Faça upgrade para o Finn Pro.`, upgrade: true }, { status: 403 })
  }

  const body = await request.json()
  const parsed = transactionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { installments, ...rest } = parsed.data
  const data = { ...rest, paymentMethod: rest.paymentMethod ?? 'DEBIT' as const }

  // If payment method is CREDIT, the selected account must be a CREDIT_CARD
  // and must have closingDay/dueDay configured for invoice generation.
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
      return Response.json({ error: 'Configure o dia de fechamento e vencimento do cartão em Contas antes de registrar compras no crédito.' }, { status: 400 })
    }
    creditCard = account
  }

  if (installments && installments > 1) {
    const groupId = crypto.randomUUID()
    const installmentAmount = data.amount / installments
    const baseDate = new Date(data.date)

    const transactions = []
    for (let i = 0; i < installments; i++) {
      const installmentDate = new Date(baseDate)
      installmentDate.setMonth(installmentDate.getMonth() + i)

      const tx = await prisma.$transaction(async (db) => {
        const invoice = creditCard ? await getOrCreateInvoiceFor(db, creditCard, installmentDate) : null
        const created = await db.transaction.create({
          data: {
            userId: user.id,
            type: data.type,
            amount: installmentAmount,
            description: `${data.description} (${i + 1}/${installments})`,
            date: installmentDate,
            accountId: data.accountId,
            categoryId: data.categoryId || null,
            paymentMethod: data.paymentMethod,
            invoiceId: invoice?.id ?? null,
            location: data.location || null,
            notes: data.notes || null,
            tags: data.tags || [],
            installment: {
              create: {
                installmentNumber: i + 1,
                totalInstallments: installments,
                groupId,
              },
            },
          },
          include: { category: true, account: true, installment: true },
        })
        await applyTransactionBalance(db, {
          type: data.type,
          amount: installmentAmount,
          accountId: data.accountId,
          paymentMethod: data.paymentMethod,
          date: installmentDate,
        })
        if (invoice) {
          const delta = data.type === 'EXPENSE' ? installmentAmount : -installmentAmount
          await adjustInvoiceTotal(db, invoice.id, delta)
        }
        return created
      })
      transactions.push(tx)
    }

    return Response.json({ data: transactions }, { status: 201 })
  }

  const txDate = new Date(data.date)
  const transaction = await prisma.$transaction(async (db) => {
    const invoice = creditCard ? await getOrCreateInvoiceFor(db, creditCard, txDate) : null
    const created = await db.transaction.create({
      data: {
        userId: user.id,
        type: data.type,
        amount: data.amount,
        description: data.description,
        date: txDate,
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
      date: txDate,
    })
    if (invoice) {
      const delta = data.type === 'EXPENSE' ? data.amount : -data.amount
      await adjustInvoiceTotal(db, invoice.id, delta)
    }
    return created
  })

  return Response.json({ data: transaction }, { status: 201 })
}
