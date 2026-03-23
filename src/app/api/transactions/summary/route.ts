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

  // Get total balance from all accounts
  const accounts = await prisma.account.findMany({
    where: { userId: user.id, isActive: true },
    select: { balance: true },
  })
  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0)

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

  // Recent transactions
  const recentTransactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    include: {
      category: { select: { name: true, color: true } },
    },
    orderBy: { date: 'desc' },
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

  return Response.json({
    data: {
      totalBalance,
      totalIncome,
      totalExpense,
      categoryData: categorySummary,
      monthlyData,
      recentTransactions: recent,
      budgetProgress,
    },
  })
}
