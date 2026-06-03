import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { budgetSchema } from '@/lib/validations/budget'
import { checkLimit, planLimitMessage } from '@/lib/plan-limits'
import { getTodayInTimezone } from '@/lib/date-tz'

function getPeriodRange(period: string, timezone: string): { gte: Date; lte: Date } {
  // "Agora" no calendário do user, não no server local time. Const day usa
  // getUTCDay porque todayInTz é a midnight local expressa em UTC — o dia
  // da semana é o dia local correto.
  const todayInTz = getTodayInTimezone(timezone)
  const year = todayInTz.getUTCFullYear()
  const month = todayInTz.getUTCMonth()
  const date = todayInTz.getUTCDate()

  if (period === 'WEEKLY') {
    const day = todayInTz.getUTCDay()
    const start = new Date(Date.UTC(year, month, date - day))
    const end = new Date(Date.UTC(year, month, date + (6 - day), 23, 59, 59))
    return { gte: start, lte: end }
  }
  if (period === 'YEARLY') {
    return {
      gte: new Date(Date.UTC(year, 0, 1)),
      lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
    }
  }
  // MONTHLY (default)
  return {
    gte: new Date(Date.UTC(year, month, 1)),
    lte: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59)),
  }
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const userTz = user.timezone || 'America/Sao_Paulo'

  const budgets = await prisma.budget.findMany({
    where: { userId: user.id },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  })

  const budgetsWithSpent = await Promise.all(
    budgets.map(async (b) => {
      const range = getPeriodRange(b.period, userTz)
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
    return Response.json({ error: planLimitMessage(limitCheck.plan, `${limitCheck.current}/${limitCheck.limit} orçamentos`), upgrade: true }, { status: 403 })
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
