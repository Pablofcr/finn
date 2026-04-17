import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { transactionSchema } from '@/lib/validations/transaction'
import { checkTransactionLimit } from '@/lib/plan-limits'

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

  const { installments, ...data } = parsed.data

  if (installments && installments > 1) {
    const groupId = crypto.randomUUID()
    const installmentAmount = data.amount / installments
    const baseDate = new Date(data.date)

    const transactions = []
    for (let i = 0; i < installments; i++) {
      const installmentDate = new Date(baseDate)
      installmentDate.setMonth(installmentDate.getMonth() + i)

      const tx = await prisma.transaction.create({
        data: {
          userId: user.id,
          type: data.type,
          amount: installmentAmount,
          description: `${data.description} (${i + 1}/${installments})`,
          date: installmentDate,
          accountId: data.accountId,
          categoryId: data.categoryId || null,
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
        include: {
          category: true,
          account: true,
          installment: true,
        },
      })
      transactions.push(tx)
    }

    return Response.json({ data: transactions }, { status: 201 })
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: new Date(data.date),
      accountId: data.accountId,
      categoryId: data.categoryId || null,
      toAccountId: data.toAccountId || null,
      location: data.location || null,
      notes: data.notes || null,
      tags: data.tags || [],
    },
    include: {
      category: true,
      account: true,
    },
  })

  // Update account balance only for present/past transactions
  const transactionDate = new Date(data.date)
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const isFuture = transactionDate > today

  if (!isFuture) {
    if (data.type === 'EXPENSE') {
      await prisma.account.update({
        where: { id: data.accountId },
        data: { balance: { decrement: data.amount } },
      })
    } else if (data.type === 'INCOME') {
      await prisma.account.update({
        where: { id: data.accountId },
        data: { balance: { increment: data.amount } },
      })
    } else if (data.type === 'TRANSFER' && data.toAccountId) {
      await prisma.account.update({
        where: { id: data.accountId },
        data: { balance: { decrement: data.amount } },
      })
      await prisma.account.update({
        where: { id: data.toAccountId },
        data: { balance: { increment: data.amount } },
      })
    }
  }

  return Response.json({ data: transaction }, { status: 201 })
}
