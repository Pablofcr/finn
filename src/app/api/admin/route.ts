import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'

export async function GET() {
  const user = await getAuthUser()
  if (!user || !isAdmin(user.email)) {
    return Response.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - 7)

  // All users with stats
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      createdAt: true,
      _count: {
        select: {
          transactions: true,
          accounts: true,
          botConnections: true,
        },
      },
    },
  })

  // ── Engagement metric: DSLA (Days Since Last Activity) ──────────────────
  // Recomendação do data-squad/peter-fader: pra produto de finanças pessoais
  // (habit-forming, baixa frequência), recency domina frequência como
  // preditor de churn. Usa só sinal INBOUND (não conta mensagens enviadas
  // pelo cron — senão todo user parece "ativo" até desinstalar).
  const userIds = users.map(u => u.id)

  // Última transação criada (createdAt do registro, não a date do evento)
  const lastTxByUser = userIds.length > 0
    ? await prisma.transaction.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds } },
        _max: { createdAt: true },
      })
    : []

  // Última mensagem INBOUND do usuário pro bot (não conta outbound do cron)
  const lastInboundByUser = userIds.length > 0
    ? await prisma.botMessage.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, direction: 'INBOUND' },
        _max: { createdAt: true },
      })
    : []

  const txMap = new Map(lastTxByUser.map(r => [r.userId, r._max.createdAt]))
  const inboundMap = new Map(lastInboundByUser.map(r => [r.userId, r._max.createdAt]))

  // Último nudge de re-engagement por user — pra mostrar no admin que o
  // sistema tá trabalhando nos casos de risco (e contagem do lifetime cap).
  const allNudges = userIds.length > 0
    ? await prisma.reengagementNudge.findMany({
        where: { userId: { in: userIds } },
        orderBy: { sentAt: 'desc' },
        select: { userId: true, sentAt: true, status: true, engagementStatus: true },
      })
    : []
  const lastNudgeMap = new Map<string, { sentAt: Date; status: string; engagementStatus: string }>()
  const nudgeCountMap = new Map<string, number>()
  for (const n of allNudges) {
    if (!lastNudgeMap.has(n.userId)) {
      lastNudgeMap.set(n.userId, { sentAt: n.sentAt, status: n.status, engagementStatus: n.engagementStatus })
    }
    nudgeCountMap.set(n.userId, (nudgeCountMap.get(n.userId) || 0) + 1)
  }

  type EngagementStatus = 'engaged' | 'warning' | 'at-risk' | 'inactive' | 'new'
  function statusFor(daysSince: number | null, daysSinceCreation: number): EngagementStatus {
    // Usuários novos (<3 dias desde criação) começam como 'new' — não são
    // marcados como inativos só por não ter atividade ainda.
    if (daysSinceCreation < 3 && daysSince === null) return 'new'
    if (daysSince === null) return 'inactive'
    if (daysSince <= 3) return 'engaged'
    if (daysSince <= 9) return 'warning'
    if (daysSince <= 20) return 'at-risk'
    return 'inactive'
  }

  const dayMs = 1000 * 60 * 60 * 24
  const usersWithEngagement = users.map(u => {
    const txAt = txMap.get(u.id) || null
    const inboundAt = inboundMap.get(u.id) || null
    let lastActivityAt: Date | null = null
    if (txAt && inboundAt) lastActivityAt = txAt > inboundAt ? txAt : inboundAt
    else lastActivityAt = txAt || inboundAt

    const daysSinceLast = lastActivityAt
      ? Math.floor((now.getTime() - lastActivityAt.getTime()) / dayMs)
      : null
    const daysSinceCreation = Math.floor((now.getTime() - u.createdAt.getTime()) / dayMs)
    const engagementStatus = statusFor(daysSinceLast, daysSinceCreation)

    const lastNudge = lastNudgeMap.get(u.id)
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      plan: u.plan,
      createdAt: u.createdAt,
      transactions: u._count.transactions,
      accounts: u._count.accounts,
      botConnected: u._count.botConnections > 0,
      lastActivityAt: lastActivityAt?.toISOString() || null,
      daysSinceLast,
      engagementStatus,
      lastNudgeAt: lastNudge?.sentAt.toISOString() || null,
      lastNudgeStatus: lastNudge?.status || null,
      lastNudgeEngagementStatus: lastNudge?.engagementStatus || null,
      nudgeCount: nudgeCountMap.get(u.id) || 0,
    }
  })

  // Aggregate stats. proUsers conta APENAS PRO pagante; PRO_COURTESY e
  // MASTER ficam de fora pra não inflar conversionRate/MRR. Decisão
  // squad (Fader): cohorts heterogêneas destroem analytics — separar agora.
  const [totalUsers, proUsers, courtesyUsers, totalTransactions, newUsersThisMonth, newUsersThisWeek, totalAccounts] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { plan: 'PRO' } }),
    prisma.user.count({ where: { plan: 'PRO_COURTESY' } }),
    prisma.transaction.count(),
    prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.account.count(),
  ])

  // Quantos users em risco essa semana (warning + at-risk + inactive,
  // excluindo "new" — usuário criado há menos de 3 dias não é "em risco").
  const usersAtRisk = usersWithEngagement.filter(u =>
    u.engagementStatus === 'warning' ||
    u.engagementStatus === 'at-risk' ||
    u.engagementStatus === 'inactive',
  ).length

  // Monthly revenue: só PRO pagante. Cortesia/Master não contam.
  const monthlyRevenue = proUsers * 14.90

  return Response.json({
    data: {
      stats: {
        totalUsers,
        proUsers,
        courtesyUsers,
        freeUsers: totalUsers - proUsers - courtesyUsers,
        conversionRate: totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(1) : '0',
        totalTransactions,
        totalAccounts,
        newUsersThisMonth,
        newUsersThisWeek,
        monthlyRevenue,
        usersAtRisk,
      },
      users: usersWithEngagement,
    },
  })
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser()
  if (!user || !isAdmin(user.email)) {
    return Response.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { userId, plan } = await request.json()

  const VALID_PLANS = ['FREE', 'TRIAL', 'EXPIRED', 'PRO', 'PRO_COURTESY', 'MASTER']
  if (!userId || !VALID_PLANS.includes(plan)) {
    return Response.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: userId },
    data: { plan },
  })

  return Response.json({ data: { success: true } })
}
