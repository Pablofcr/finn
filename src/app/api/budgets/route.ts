import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { budgetSchema } from '@/lib/validations/budget'
import { checkLimit } from '@/lib/plan-limits'

function getPeriodRange(period: string): { gte: Date; lte: Date } {
  const now = new Date()
  if (period === 'WEEKLY') {
    const day = now.getDay()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day)
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - day), 23, 59, 59)
    return { gte: start, lte: end }
  }
  if (period === 'YEARLY') {
    return {
      gte: new Date(now.getFullYear(), 0, 1),
      lte: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
    }
  }
  // MONTHLY (default)
  return {
    gte: new Date(now.getFullYear(), now.getMonth(), 1),
    lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
  }
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const budgets = await prisma.budget.findMany({
    where: { userId: user.id },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  })

  const budgetsWithSpent = await Promise.all(
    budgets.map(async (b) => {
      const range = getPeriodRange(b.period)
      const result = await prisma.transaction.aggregate({
        where: {
          userId: user.id,
          categoryId: b.categoryId,
          type: 'EXPENSE',
          date: range,
        },
        _sum: { amount: true },
      })
      return {
        ...b,
        spent: Number(result._sum.amount || 0),
      }
    })
  )

  return Response.json({ data: budgetsWithSpent })
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const limitCheck = await checkLimit(user.id, 'budgets')
  if (!limitCheck.allowed) {
    return Response.json({ error: `Limite do plano gratuito atingido (${limitCheck.current}/${limitCheck.limit}). Faça upgrade para o Finn Pro.`, upgrade: true }, { status: 403 })
  }

  const body = await request.json()
  const parsed = budgetSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const budget = await prisma.budget.create({
    data: {
      userId: user.id,
      ...parsed.data,
    },
    include: { category: true },
  })

  return Response.json({ data: budget }, { status: 201 })
}
