import prisma from '@/lib/prisma'

export const PLAN_LIMITS = {
  FREE: {
    transactionsPerMonth: 40,
    accounts: 1,
    budgets: 2,
    goals: 1,
    recurringTransactions: 5,
    aiInsights: false,
    botVoice: 2,
    botPhoto: 2,
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
  MASTER: {
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
  MASTER: 0,
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
  const value = PLAN_LIMITS[plan][feature]

  // Boolean features (true/false)
  if (typeof value === 'boolean') return value

  // Numeric features (limited uses per month) — 0 means blocked
  if (typeof value === 'number') {
    const numValue = value as number
    if (numValue === 0) return false
    if (!isFinite(numValue)) return true // Infinity = unlimited

    // Count confirmed uses this month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const mediaType = feature === 'botVoice' ? 'audio/ogg' : 'image'

    const usedCount = await prisma.botMessage.count({
      where: {
        userId,
        mediaType: feature === 'botVoice'
          ? 'audio/ogg'
          : { not: null, startsWith: 'image' } as any,
        status: 'CONFIRMED',
        createdAt: { gte: startOfMonth },
      },
    })

    return usedCount < value
  }

  return false
}

export async function getFeatureUsage(
  userId: string,
  feature: 'botVoice' | 'botPhoto'
): Promise<{ used: number; limit: number | true; plan: PlanType }> {
  const plan = await getUserPlan(userId)
  const value = PLAN_LIMITS[plan][feature]

  if (typeof value === 'boolean') {
    return { used: 0, limit: value ? Infinity : 0, plan }
  }

  if (!isFinite(value as number)) {
    return { used: 0, limit: Infinity, plan }
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const used = await prisma.botMessage.count({
    where: {
      userId,
      mediaType: feature === 'botVoice' ? 'audio/ogg' : { not: null },
      status: 'CONFIRMED',
      createdAt: { gte: startOfMonth },
    },
  })

  return { used, limit: value as number, plan }
}
