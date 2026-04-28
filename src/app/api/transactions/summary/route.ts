import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59)

  // Get accounts with all info needed for "Saldo por conta" card
  const accountsRaw = await prisma.account.findMany({
    where: { userId: user.id, isActive: true },
    select: {
      id: true, name: true, type: true, balance: true, color: true, icon: true,
      creditLimit: true, closingDay: true, dueDay: true,
    },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })

  const totalBalance = accountsRaw.reduce(
    (sum, acc) => acc.type === 'CREDIT_CARD' ? sum : sum + Number(acc.balance),
    0,
  )

  // For credit cards, fetch the latest open invoice to compute utilization.
  const cardIds = accountsRaw.filter((a) => a.type === 'CREDIT_CARD').map((a) => a.id)
  const cardInvoices = cardIds.length > 0
    ? await prisma.invoice.findMany({
        where: { cardId: { in: cardIds }, status: { in: ['OPEN', 'CLOSED', 'OVERDUE'] } },
        select: { cardId: true, total: true, status: true, dueDate: true, periodEnd: true },
        orderBy: { periodEnd: 'desc' },
      })
    : []
  const latestInvoiceByCard = new Map<string, typeof cardInvoices[number]>()
  for (const inv of cardInvoices) {
    if (!latestInvoiceByCard.has(inv.cardId)) latestInvoiceByCard.set(inv.cardId, inv)
  }

  const accounts = accountsRaw.map((a) => {
    const isCard = a.type === 'CREDIT_CARD'
    const inv = isCard ? latestInvoiceByCard.get(a.id) : null
    const limit = isCard ? Number(a.creditLimit ?? 0) : null
    const used = inv ? Number(inv.total) : 0
    const utilizationPct = limit && limit > 0 ? Math.round((used / limit) * 100) : null
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      balance: Number(a.balance),
      color: a.color,
      icon: a.icon,
      // credit card extras
      creditLimit: limit,
      currentInvoice: isCard ? used : null,
      utilizationPct,
      closingDay: a.closingDay,
      dueDay: a.dueDay,
    }
  })

  // Get income and expense totals for the period
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      date: { gte: startDate, lte: endDate },
    },
    select: { type: true, amount: true },
  })

  const totalIncome = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalExpense = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  // Category breakdown for expenses
  const categoryData = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      userId: user.id,
      type: 'EXPENSE',
      date: { gte: startDate, lte: endDate },
      categoryId: { not: null },
    },
    _sum: { amount: true },
    _count: true,
    orderBy: { _sum: { amount: 'desc' } },
    take: 5,
  })

  const categoryIds = categoryData.map((c) => c.categoryId).filter(Boolean) as string[]
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true, icon: true, color: true },
  })

  const categoryMap = new Map(categories.map((c) => [c.id, c]))
  const categorySummary = categoryData.map((c) => {
    const cat = categoryMap.get(c.categoryId!)
    const total = Number(c._sum.amount)
    return {
      categoryId: c.categoryId!,
      categoryName: cat?.name || 'Sem categoria',
      categoryIcon: cat?.icon || 'tag',
      categoryColor: cat?.color || '#94a3b8',
      total,
      percentage: totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0,
      count: c._count,
    }
  })

  // Monthly data for last 6 months
  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const mDate = new Date(year, month - 1 - i, 1)
    const mEnd = new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0, 23, 59, 59)
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

    const mTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: mDate, lte: mEnd },
      },
      select: { type: true, amount: true },
    })

    monthlyData.push({
      month: monthNames[mDate.getMonth()],
      income: mTransactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0),
      expense: mTransactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0),
    })
  }

  // Recent transactions — only past/today, never future installments,
  // so the feed reflects what actually happened (not projected parcels).
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)
  const recentTransactions = await prisma.transaction.findMany({
    where: { userId: user.id, date: { lte: todayEnd } },
    include: {
      category: { select: { name: true, color: true, icon: true } },
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: 5,
  })

  const recent = recentTransactions.map((t) => ({
    id: t.id,
    description: t.description,
    amount: Number(t.amount),
    type: t.type,
    date: t.date.toISOString(),
    categoryName: t.category?.name,
    categoryColor: t.category?.color,
    categoryIcon: t.category?.icon,
  }))

  // Budget progress
  const budgets = await prisma.budget.findMany({
    where: { userId: user.id, isActive: true },
    include: { category: { select: { id: true, name: true, color: true } } },
  })

  const budgetProgress = await Promise.all(
    budgets.map(async (b) => {
      const spent = await prisma.transaction.aggregate({
        where: {
          userId: user.id,
          categoryId: b.categoryId,
          type: 'EXPENSE',
          date: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      })
      const spentAmount = Number(spent._sum.amount || 0)
      const budgetAmount = Number(b.amount)
      return {
        id: b.id,
        categoryName: b.category.name,
        categoryColor: b.category.color,
        budgetAmount,
        spentAmount,
        percentage: budgetAmount > 0 ? Math.round((spentAmount / budgetAmount) * 100) : 0,
      }
    })
  )

  // Upcoming bills — recurrings + invoices in next 7 days
  const now = new Date()
  const sevenDaysOut = new Date(now)
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7)
  sevenDaysOut.setHours(23, 59, 59, 999)

  const [upcomingRecurrings, upcomingInvoices] = await Promise.all([
    prisma.recurringTransaction.findMany({
      where: {
        userId: user.id,
        status: 'ACTIVE',
        nextDueDate: { lte: sevenDaysOut },
      },
      include: { category: { select: { name: true, icon: true, color: true } } },
      orderBy: { nextDueDate: 'asc' },
      take: 10,
    }),
    prisma.invoice.findMany({
      where: {
        userId: user.id,
        status: { in: ['OPEN', 'CLOSED', 'OVERDUE'] },
        dueDate: { lte: sevenDaysOut },
        total: { gt: 0 },
      },
      include: { card: { select: { id: true, name: true, color: true, icon: true } } },
      orderBy: { dueDate: 'asc' },
      take: 5,
    }),
  ])

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  function daysUntil(date: Date): number {
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const upcomingBills = [
    ...upcomingRecurrings.map((r) => ({
      id: r.id,
      kind: 'recurring' as const,
      description: r.description,
      amount: Number(r.amount),
      dueDate: r.nextDueDate.toISOString(),
      daysUntil: daysUntil(r.nextDueDate),
      categoryName: r.category?.name,
      categoryIcon: r.category?.icon,
      categoryColor: r.category?.color,
    })),
    ...upcomingInvoices.map((inv) => ({
      id: inv.id,
      kind: 'invoice' as const,
      description: `Fatura ${inv.card.name}`,
      amount: Number(inv.total),
      dueDate: inv.dueDate.toISOString(),
      daysUntil: daysUntil(inv.dueDate),
      categoryName: 'Cartão de Crédito',
      categoryIcon: inv.card.icon || 'credit-card',
      categoryColor: inv.card.color || '#6366f1',
    })),
  ].sort((a, b) => a.daysUntil - b.daysUntil)

  // Latest active insight (priority: alert > warning > success > info, then most recent)
  const insights = await prisma.insight.findMany({
    where: { userId: user.id, isDismissed: false },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  const severityRank: Record<string, number> = { alert: 0, warning: 1, success: 2, info: 3 }
  const sortedInsights = insights.sort((a, b) => {
    const sa = severityRank[a.severity] ?? 4
    const sb = severityRank[b.severity] ?? 4
    if (sa !== sb) return sa - sb
    return b.createdAt.getTime() - a.createdAt.getTime()
  })
  const latestInsight = sortedInsights[0]
    ? {
        id: sortedInsights[0].id,
        title: sortedInsights[0].title,
        body: sortedInsights[0].body,
        severity: sortedInsights[0].severity,
        type: sortedInsights[0].type,
        createdAt: sortedInsights[0].createdAt.toISOString(),
      }
    : null

  // Calculate deltas vs previous month
  const prevMonth = monthlyData.length >= 2 ? monthlyData[monthlyData.length - 2] : null
  const currentMonth = monthlyData[monthlyData.length - 1]

  const incomeChange = prevMonth && prevMonth.income > 0
    ? Math.round(((currentMonth.income - prevMonth.income) / prevMonth.income) * 100)
    : 0
  const expenseChange = prevMonth && prevMonth.expense > 0
    ? Math.round(((currentMonth.expense - prevMonth.expense) / prevMonth.expense) * 100)
    : 0
  const savingsRate = totalIncome > 0
    ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100)
    : 0

  // Sparkline data (6 months)
  const incomeSpark = monthlyData.map(m => ({ v: m.income }))
  const expenseSpark = monthlyData.map(m => ({ v: m.expense }))

  return Response.json({
    data: {
      totalBalance,
      totalIncome,
      totalExpense,
      incomeChange,
      expenseChange,
      savingsRate,
      incomeSpark,
      expenseSpark,
      categoryData: categorySummary,
      monthlyData,
      recentTransactions: recent,
      budgetProgress,
      // novos campos pra os 3 cards do dashboard
      accounts,
      upcomingBills,
      latestInsight,
    },
  })
}
