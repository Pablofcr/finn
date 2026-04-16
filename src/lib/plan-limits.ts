import prisma from '@/lib/prisma'

export const PLAN_LIMITS = {
  FREE: {
    transactionsPerMonth: 50,
    accounts: 2,
    budgets: 3,
    goals: 1,
    recurringTransactions: 5,
    aiInsights: false,
    botVoice: false,
    botPhoto: false,
    autoCategory: false,
    exportData: false,
    fullReports: false,
  },
  PRO: {
    transactionsPerMonth: Infinity,
    accounts: Infinity,
    budgets: Infinity,
    goals: Infinity,
    recurringTransactions: Infinity,
    aiInsights: true,
    botVoice: true,
    botPhoto: true,
    autoCategory: true,
    exportData: true,
    fullReports: true,
  },
} as const

export type PlanType = keyof typeof PLAN_LIMITS

export const PLAN_PRICES = {
  FREE: 0,
  PRO: 14.90,
} as const

export async function getUserPlan(userId: string): Promise<PlanType> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  })
  return (user?.plan as PlanType) || 'FREE'
}

export async function checkLimit(
  userId: string,
  resource: 'accounts' | 'budgets' | 'goals' | 'recurringTransactions'
): Promise<{ allowed: boolean; current: number; limit: number; plan: PlanType }> {
  const plan = await getUserPlan(userId)
  const limits = PLAN_LIMITS[plan]
  const limit = limits[resource] as number

  let current = 0
  switch (resource) {
    case 'accounts':
      current = await prisma.account.count({ where: { userId } })
      break
    case 'budgets':
      current = await prisma.budget.count({ where: { userId } })
      break
    case 'goals':
      current = await prisma.goal.count({ where: { userId } })
      break
    case 'recurringTransactions':
      current = await prisma.recurringTransaction.count({
        where: { userId, status: 'ACTIVE' },
      })
      break
  }

  return { allowed: current < limit, current, limit, plan }
}

export async function checkTransactionLimit(
  userId: string
): Promise<{ allowed: boolean; current: number; limit: number; plan: PlanType }> {
  const plan = await getUserPlan(userId)
  const limit = PLAN_LIMITS[plan].transactionsPerMonth

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const current = await prisma.transaction.count({
    where: {
      userId,
      createdAt: { gte: startOfMonth },
    },
  })

  return { allowed: current < limit, current, limit, plan }
}

export async function canUseFeature(
  userId: string,
  feature: 'aiInsights' | 'botVoice' | 'botPhoto' | 'autoCategory' | 'exportData' | 'fullReports'
): Promise<boolean> {
  const plan = await getUserPlan(userId)
  return PLAN_LIMITS[plan][feature]
}
