import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const [accounts, categories, transactions, budgets, goals, recurringTransactions] =
    await Promise.all([
      prisma.account.findMany({
        where: { userId: user.id },
        select: { name: true, type: true, balance: true, color: true },
      }),
      prisma.category.findMany({
        where: { userId: user.id },
        select: { name: true, type: true, color: true },
      }),
      prisma.transaction.findMany({
        where: { userId: user.id },
        include: { category: true, account: true },
        orderBy: { date: 'desc' },
      }),
      prisma.budget.findMany({
        where: { userId: user.id },
        include: { category: true },
      }),
      prisma.goal.findMany({
        where: { userId: user.id },
        select: {
          name: true,
          targetAmount: true,
          currentAmount: true,
          deadline: true,
        },
      }),
      prisma.recurringTransaction.findMany({
        where: { userId: user.id },
        include: { category: true },
      }),
    ])

  const exportData = {
    exportDate: new Date().toISOString(),
    profile: {
      name: user.name,
      email: user.email,
      phone: user.phone,
      currency: user.defaultCurrency,
      timezone: user.timezone,
    },
    accounts,
    categories,
    transactions: transactions.map((t) => ({
      description: t.description,
      amount: t.amount,
      type: t.type,
      date: t.date,
      categoryName: t.category?.name ?? null,
      accountName: t.account?.name ?? null,
    })),
    budgets: budgets.map((b) => ({
      amount: b.amount,
      period: b.period,
      categoryName: b.category?.name ?? null,
    })),
    goals,
    recurringTransactions: recurringTransactions.map((r) => ({
      description: r.description,
      amount: r.amount,
      type: r.type,
      frequency: r.frequency,
      nextDueDate: r.nextDueDate,
      status: r.status,
    })),
  }

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="finn-dados-export.json"',
    },
  })
}
