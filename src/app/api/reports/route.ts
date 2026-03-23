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

  // Previous month for comparison
  const prevStartDate = new Date(year, month - 2, 1)
  const prevEndDate = new Date(year, month - 1, 0, 23, 59, 59)

  // Current month transactions
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      date: { gte: startDate, lte: endDate },
    },
    include: {
      category: { select: { id: true, name: true, color: true, icon: true } },
      account: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
  })

  const totalIncome = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalExpense = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const balance = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0

  // Previous month totals for comparison
  const prevTransactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      date: { gte: prevStartDate, lte: prevEndDate },
    },
    select: { type: true, amount: true },
  })

  const prevIncome = prevTransactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const prevExpense = prevTransactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  // Monthly evolution (last 12 months)
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const monthlyEvolution = []
  for (let i = 11; i >= 0; i--) {
    const mDate = new Date(year, month - 1 - i, 1)
    const mEnd = new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0, 23, 59, 59)

    const mTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: mDate, lte: mEnd },
      },
      select: { type: true, amount: true },
    })

    const mIncome = mTransactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0)
    const mExpense = mTransactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)

    monthlyEvolution.push({
      month: `${monthNames[mDate.getMonth()]}/${String(mDate.getFullYear()).slice(2)}`,
      income: mIncome,
      expense: mExpense,
      balance: mIncome - mExpense,
    })
  }

  // Category breakdown (all expense categories)
  const categoryBreakdown = await prisma.transaction.groupBy({
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
  })

  const categoryIds = categoryBreakdown.map((c) => c.categoryId).filter(Boolean) as string[]
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true, color: true, icon: true },
  })
  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  const categoryData = categoryBreakdown.map((c) => {
    const cat = categoryMap.get(c.categoryId!)
    const total = Number(c._sum.amount)
    return {
      categoryId: c.categoryId!,
      categoryName: cat?.name || 'Sem categoria',
      categoryColor: cat?.color || '#94a3b8',
      categoryIcon: cat?.icon || 'tag',
      total,
      percentage: totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0,
      count: c._count,
    }
  })

  // Daily spending trend
  const daysInMonth = new Date(year, month, 0).getDate()
  const dailyData = []
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStart = new Date(year, month - 1, day)
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59)

    const dayExpense = transactions
      .filter((t) => t.type === 'EXPENSE' && t.date >= dayStart && t.date <= dayEnd)
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const dayIncome = transactions
      .filter((t) => t.type === 'INCOME' && t.date >= dayStart && t.date <= dayEnd)
      .reduce((sum, t) => sum + Number(t.amount), 0)

    dailyData.push({
      day,
      label: `${day}`,
      expense: dayExpense,
      income: dayIncome,
    })
  }

  // Top expenses
  const topExpenses = transactions
    .filter((t) => t.type === 'EXPENSE')
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 10)
    .map((t) => ({
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      date: t.date.toISOString(),
      categoryName: t.category?.name || 'Sem categoria',
      categoryColor: t.category?.color || '#94a3b8',
      accountName: t.account?.name || '',
    }))

  // Income by category
  const incomeBreakdown = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      userId: user.id,
      type: 'INCOME',
      date: { gte: startDate, lte: endDate },
      categoryId: { not: null },
    },
    _sum: { amount: true },
    _count: true,
    orderBy: { _sum: { amount: 'desc' } },
  })

  const incomeCatIds = incomeBreakdown.map((c) => c.categoryId).filter(Boolean) as string[]
  const incomeCategories = await prisma.category.findMany({
    where: { id: { in: incomeCatIds } },
    select: { id: true, name: true, color: true },
  })
  const incomeCatMap = new Map(incomeCategories.map((c) => [c.id, c]))

  const incomeData = incomeBreakdown.map((c) => {
    const cat = incomeCatMap.get(c.categoryId!)
    const total = Number(c._sum.amount)
    return {
      categoryName: cat?.name || 'Sem categoria',
      categoryColor: cat?.color || '#94a3b8',
      total,
      percentage: totalIncome > 0 ? Math.round((total / totalIncome) * 100) : 0,
    }
  })

  return Response.json({
    data: {
      summary: {
        totalIncome,
        totalExpense,
        balance,
        savingsRate,
        transactionCount: transactions.length,
        prevIncome,
        prevExpense,
        incomeChange: prevIncome > 0 ? Math.round(((totalIncome - prevIncome) / prevIncome) * 100) : 0,
        expenseChange: prevExpense > 0 ? Math.round(((totalExpense - prevExpense) / prevExpense) * 100) : 0,
      },
      monthlyEvolution,
      categoryData,
      incomeData,
      dailyData,
      topExpenses,
    },
  })
}
