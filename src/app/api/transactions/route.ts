import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { transactionSchema } from '@/lib/validations/transaction'
import { checkTransactionLimit } from '@/lib/plan-limits'
import { applyTransactionBalance } from '@/lib/transaction-balance'

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const type = searchParams.get('type')
  const categoryId = searchParams.get('categoryId')
  const accountId = searchParams.get('accountId')
  const search = searchParams.get('search')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const where: any = { userId: user.id }

  if (type) where.type = type
  if (categoryId) where.categoryId = categoryId
  if (accountId) where.accountId = accountId
  if (search) where.description = { contains: search, mode: 'insensitive' }
  if (startDate || endDate) {
    where.date = {}
    if (startDate) where.date.gte = new Date(startDate)
    if (endDate) where.date.lte = new Date(endDate)
  }

  const [transactions, total] = await Promise.all([
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
  ])

  return Response.json({
    data: transactions,
    total,
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

  // If payment method is CREDIT, the selected account must be a CREDIT_CARD.
  if (data.paymentMethod === 'CREDIT') {
    const account = await prisma.account.findFirst({
      where: { id: data.accountId, userId: user.id },
      select: { type: true },
    })
    if (!account || account.type !== 'CREDIT_CARD') {
      return Response.json({ error: 'Forma de pagamento "Crédito" exige um cartão de crédito.' }, { status: 400 })
    }
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
        return created
      })
      transactions.push(tx)
    }

    return Response.json({ data: transactions }, { status: 201 })
  }

  const transaction = await prisma.$transaction(async (db) => {
    const created = await db.transaction.create({
      data: {
        userId: user.id,
        type: data.type,
        amount: data.amount,
        description: data.description,
        date: new Date(data.date),
        accountId: data.accountId,
        categoryId: data.categoryId || null,
        toAccountId: data.toAccountId || null,
        paymentMethod: data.paymentMethod,
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
      date: new Date(data.date),
    })
    return created
  })

  return Response.json({ data: transaction }, { status: 201 })
}
