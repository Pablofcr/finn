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

  // Aggregate stats
  const [totalUsers, proUsers, totalTransactions, newUsersThisMonth, newUsersThisWeek, totalAccounts] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { plan: 'PRO' } }),
    prisma.transaction.count(),
    prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.account.count(),
  ])

  // Monthly revenue estimate
  const monthlyRevenue = proUsers * 14.90

  return Response.json({
    data: {
      stats: {
        totalUsers,
        proUsers,
        freeUsers: totalUsers - proUsers,
        conversionRate: totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(1) : '0',
        totalTransactions,
        totalAccounts,
        newUsersThisMonth,
        newUsersThisWeek,
        monthlyRevenue,
      },
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        plan: u.plan,
        createdAt: u.createdAt,
        transactions: u._count.transactions,
        accounts: u._count.accounts,
        botConnected: u._count.botConnections > 0,
      })),
    },
  })
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser()
  if (!user || !isAdmin(user.email)) {
    return Response.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { userId, plan } = await request.json()

  if (!userId || !['FREE', 'PRO'].includes(plan)) {
    return Response.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: userId },
    data: { plan },
  })

  return Response.json({ data: { success: true } })
}
