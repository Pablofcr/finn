import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { PLAN_LIMITS, PLAN_PRICES } from '@/lib/plan-limits'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const plan = user.plan || 'FREE'
  const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]

  // Get current usage
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [transactionsCount, accountsCount, budgetsCount, goalsCount, recurringCount] = await Promise.all([
    prisma.transaction.count({ where: { userId: user.id, createdAt: { gte: startOfMonth } } }),
    prisma.account.count({ where: { userId: user.id } }),
    prisma.budget.count({ where: { userId: user.id } }),
    prisma.goal.count({ where: { userId: user.id } }),
    prisma.recurringTransaction.count({ where: { userId: user.id, status: 'ACTIVE' } }),
  ])

  return Response.json({
    data: {
      plan,
      price: PLAN_PRICES[plan as keyof typeof PLAN_PRICES],
      limits,
      usage: {
        transactionsThisMonth: transactionsCount,
        accounts: accountsCount,
        budgets: budgetsCount,
        goals: goalsCount,
        recurringTransactions: recurringCount,
      },
    },
  })
}
