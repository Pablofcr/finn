import prisma from '@/lib/prisma'
import type { TransactionType, PaymentMethod } from '@/generated/prisma/enums'

// ============================================================
// Output types — all JSON-safe (no Prisma Decimal, no Date objects)
// ============================================================

export type TransactionSummary = {
  id: string
  date: string // ISO
  description: string
  amount: number
  type: TransactionType
  paymentMethod: PaymentMethod
  categoryName: string | null
  accountName: string
}

export type PendingBill = {
  source: 'recurring' | 'invoice'
  id: string
  description: string
  amount: number
  dueDate: string // ISO
  daysUntilDue: number
  categoryName: string | null
  accountName: string | null
}

export type CategorySpend = {
  categoryId: string | null
  categoryName: string
  total: number
  count: number
  percentage: number // 0-100
}

export type AccountBalance = {
  id: string
  name: string
  type: string
  balance: number
  creditLimit: number | null
  isDefault: boolean
}

export type MonthSummary = {
  year: number
  month: number // 1-12
  totalIncome: number
  totalExpense: number
  balance: number
  transactionCount: number
  topCategories: CategorySpend[] // top 3 expense categories
}

export type PeriodComparison = {
  periodA: { start: string; end: string; income: number; expense: number; balance: number }
  periodB: { start: string; end: string; income: number; expense: number; balance: number }
  incomeChange: number // %
  expenseChange: number // %
  balanceChange: number // absolute
}

export type BudgetStatus = {
  budgetId: string
  categoryId: string
  categoryName: string
  limit: number
  spent: number
  remaining: number
  percentageUsed: number
  period: 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  alertTriggered: boolean
}

export type GoalProgress = {
  goalId: string
  name: string
  targetAmount: number
  currentAmount: number
  percentageComplete: number
  remainingAmount: number
  deadline: string | null // ISO
  daysUntilDeadline: number | null
  isCompleted: boolean
}

// ============================================================
// Helpers
// ============================================================

function toNumber(d: unknown): number {
  if (d === null || d === undefined) return 0
  if (typeof d === 'number') return d
  return Number(d.toString())
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

// ============================================================
// Tools
// ============================================================

/**
 * Contas/compromissos a pagar: recurring transactions ativas + faturas de cartão abertas.
 */
export async function getPendingBills(
  userId: string,
  untilDate?: Date
): Promise<PendingBill[]> {
  const now = new Date()
  const cutoff = untilDate ?? new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const [recurring, invoices] = await Promise.all([
    prisma.recurringTransaction.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        type: 'EXPENSE',
        nextDueDate: { lte: cutoff },
      },
      include: {
        category: { select: { name: true } },
        account: { select: { name: true } },
      },
      orderBy: { nextDueDate: 'asc' },
    }),
    prisma.invoice.findMany({
      where: {
        userId,
        status: { in: ['OPEN', 'CLOSED', 'OVERDUE'] },
        dueDate: { lte: cutoff },
      },
      include: { card: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
    }),
  ])

  const bills: PendingBill[] = []

  for (const r of recurring) {
    bills.push({
      source: 'recurring',
      id: r.id,
      description: r.description,
      amount: toNumber(r.amount),
      dueDate: r.nextDueDate.toISOString(),
      daysUntilDue: daysBetween(now, r.nextDueDate),
      categoryName: r.category?.name ?? null,
      accountName: r.account?.name ?? null,
    })
  }

  for (const inv of invoices) {
    const invoiceTotal = toNumber(inv.total)
    if (invoiceTotal <= 0) continue
    bills.push({
      source: 'invoice',
      id: inv.id,
      description: `Fatura ${inv.card.name}`,
      amount: invoiceTotal,
      dueDate: inv.dueDate.toISOString(),
      daysUntilDue: daysBetween(now, inv.dueDate),
      categoryName: null,
      accountName: inv.card.name,
    })
  }

  bills.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  return bills
}

/**
 * Transações num período com filtros opcionais.
 * Se categoryIds for passado, filtra por qualquer categoria da lista — útil
 * pra rollup de categoria pai + suas subcategorias.
 */
export async function getTransactionsByPeriod(
  userId: string,
  start: Date,
  end: Date,
  opts: { type?: TransactionType; categoryIds?: string[]; limit?: number } = {}
): Promise<TransactionSummary[]> {
  const txs = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: start, lte: end },
      ...(opts.type ? { type: opts.type } : {}),
      ...(opts.categoryIds && opts.categoryIds.length > 0
        ? { categoryId: { in: opts.categoryIds } }
        : {}),
    },
    include: {
      category: { select: { name: true } },
      account: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
    take: opts.limit ?? 50,
  })

  return txs.map((t) => ({
    id: t.id,
    date: t.date.toISOString(),
    description: t.description,
    amount: toNumber(t.amount),
    type: t.type,
    paymentMethod: t.paymentMethod,
    categoryName: t.category?.name ?? null,
    accountName: t.account?.name ?? '',
  }))
}

/**
 * Resumo mensal: entradas, saídas, saldo, top 3 categorias.
 */
export async function getMonthSummary(
  userId: string,
  year: number,
  month: number // 1-12
): Promise<MonthSummary> {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59)

  const txs = await prisma.transaction.findMany({
    where: { userId, date: { gte: start, lte: end } },
    select: { type: true, amount: true, categoryId: true },
  })

  const totalIncome = txs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + toNumber(t.amount), 0)
  const totalExpense = txs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + toNumber(t.amount), 0)

  const categorySpend = await getSpendingByCategory(userId, start, end)
  const topCategories = categorySpend.slice(0, 3)

  return {
    year,
    month,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    transactionCount: txs.length,
    topCategories,
  }
}

/**
 * Gastos agregados por categoria num período.
 */
export async function getSpendingByCategory(
  userId: string,
  start: Date,
  end: Date
): Promise<CategorySpend[]> {
  const grouped = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      userId,
      type: 'EXPENSE',
      date: { gte: start, lte: end },
    },
    _sum: { amount: true },
    _count: true,
    orderBy: { _sum: { amount: 'desc' } },
  })

  const categoryIds = grouped.map((g) => g.categoryId).filter((id): id is string => !!id)
  const categories = categoryIds.length
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      })
    : []
  const nameById = new Map(categories.map((c) => [c.id, c.name]))

  const grandTotal = grouped.reduce((s, g) => s + toNumber(g._sum.amount), 0)

  return grouped.map((g) => ({
    categoryId: g.categoryId,
    categoryName: g.categoryId ? (nameById.get(g.categoryId) ?? 'Sem categoria') : 'Sem categoria',
    total: toNumber(g._sum.amount),
    count: g._count,
    percentage: grandTotal > 0 ? Math.round((toNumber(g._sum.amount) / grandTotal) * 100) : 0,
  }))
}

/**
 * Saldo de uma conta específica ou de todas as contas ativas.
 */
export async function getAccountBalance(
  userId: string,
  accountId?: string
): Promise<AccountBalance[]> {
  const accounts = await prisma.account.findMany({
    where: {
      userId,
      isActive: true,
      ...(accountId ? { id: accountId } : {}),
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })

  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    balance: toNumber(a.balance),
    creditLimit: a.creditLimit ? toNumber(a.creditLimit) : null,
    isDefault: a.isDefault,
  }))
}

/**
 * Maiores gastos do período.
 */
export async function getTopExpenses(
  userId: string,
  start: Date,
  end: Date,
  limit: number = 5
): Promise<TransactionSummary[]> {
  const txs = await prisma.transaction.findMany({
    where: {
      userId,
      type: 'EXPENSE',
      date: { gte: start, lte: end },
    },
    include: {
      category: { select: { name: true } },
      account: { select: { name: true } },
    },
    orderBy: { amount: 'desc' },
    take: limit,
  })

  return txs.map((t) => ({
    id: t.id,
    date: t.date.toISOString(),
    description: t.description,
    amount: toNumber(t.amount),
    type: t.type,
    paymentMethod: t.paymentMethod,
    categoryName: t.category?.name ?? null,
    accountName: t.account?.name ?? '',
  }))
}

/**
 * Compara entrada/saída/saldo de dois períodos.
 */
export async function comparePeriods(
  userId: string,
  periodA: { start: Date; end: Date },
  periodB: { start: Date; end: Date }
): Promise<PeriodComparison> {
  const [a, b] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: periodA.start, lte: periodA.end } },
      select: { type: true, amount: true },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: periodB.start, lte: periodB.end } },
      select: { type: true, amount: true },
    }),
  ])

  const totalsA = {
    income: a.filter((t) => t.type === 'INCOME').reduce((s, t) => s + toNumber(t.amount), 0),
    expense: a.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + toNumber(t.amount), 0),
  }
  const totalsB = {
    income: b.filter((t) => t.type === 'INCOME').reduce((s, t) => s + toNumber(t.amount), 0),
    expense: b.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + toNumber(t.amount), 0),
  }

  const balanceA = totalsA.income - totalsA.expense
  const balanceB = totalsB.income - totalsB.expense

  return {
    periodA: {
      start: periodA.start.toISOString(),
      end: periodA.end.toISOString(),
      income: totalsA.income,
      expense: totalsA.expense,
      balance: balanceA,
    },
    periodB: {
      start: periodB.start.toISOString(),
      end: periodB.end.toISOString(),
      income: totalsB.income,
      expense: totalsB.expense,
      balance: balanceB,
    },
    incomeChange: totalsA.income > 0 ? Math.round(((totalsB.income - totalsA.income) / totalsA.income) * 100) : 0,
    expenseChange: totalsA.expense > 0 ? Math.round(((totalsB.expense - totalsA.expense) / totalsA.expense) * 100) : 0,
    balanceChange: balanceB - balanceA,
  }
}

/**
 * Status de orçamentos (todos ou de uma categoria específica) no mês corrente.
 */
export async function getBudgetStatus(
  userId: string,
  categoryId?: string
): Promise<BudgetStatus[]> {
  const budgets = await prisma.budget.findMany({
    where: {
      userId,
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
    },
    include: { category: { select: { name: true } } },
  })

  if (budgets.length === 0) return []

  const now = new Date()

  const results: BudgetStatus[] = []
  for (const b of budgets) {
    let start: Date, end: Date
    if (b.period === 'WEEKLY') {
      const day = now.getDay()
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - day), 23, 59, 59)
    } else if (b.period === 'YEARLY') {
      start = new Date(now.getFullYear(), 0, 1)
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    }

    const agg = await prisma.transaction.aggregate({
      where: {
        userId,
        type: 'EXPENSE',
        categoryId: b.categoryId,
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    })

    const limit = toNumber(b.amount)
    const spent = toNumber(agg._sum.amount)
    const percentageUsed = limit > 0 ? Math.round((spent / limit) * 100) : 0

    results.push({
      budgetId: b.id,
      categoryId: b.categoryId,
      categoryName: b.category.name,
      limit,
      spent,
      remaining: limit - spent,
      percentageUsed,
      period: b.period,
      alertTriggered: percentageUsed >= b.alertAt,
    })
  }

  return results
}

/**
 * Progresso de metas (todas ou uma específica).
 */
export async function getGoalProgress(
  userId: string,
  goalId?: string
): Promise<GoalProgress[]> {
  const goals = await prisma.goal.findMany({
    where: {
      userId,
      ...(goalId ? { id: goalId } : {}),
    },
    orderBy: [{ isCompleted: 'asc' }, { deadline: 'asc' }],
  })

  const now = new Date()

  return goals.map((g) => {
    const target = toNumber(g.targetAmount)
    const current = toNumber(g.currentAmount)
    return {
      goalId: g.id,
      name: g.name,
      targetAmount: target,
      currentAmount: current,
      percentageComplete: target > 0 ? Math.round((current / target) * 100) : 0,
      remainingAmount: Math.max(target - current, 0),
      deadline: g.deadline?.toISOString() ?? null,
      daysUntilDeadline: g.deadline ? daysBetween(now, g.deadline) : null,
      isCompleted: g.isCompleted,
    }
  })
}

/**
 * Busca transações por texto em description (case-insensitive), com período opcional.
 */
export async function searchTransactions(
  userId: string,
  query: string,
  opts: { start?: Date; end?: Date; limit?: number } = {}
): Promise<TransactionSummary[]> {
  if (!query.trim()) return []

  const txs = await prisma.transaction.findMany({
    where: {
      userId,
      description: { contains: query, mode: 'insensitive' },
      ...(opts.start && opts.end ? { date: { gte: opts.start, lte: opts.end } } : {}),
    },
    include: {
      category: { select: { name: true } },
      account: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
    take: opts.limit ?? 20,
  })

  return txs.map((t) => ({
    id: t.id,
    date: t.date.toISOString(),
    description: t.description,
    amount: toNumber(t.amount),
    type: t.type,
    paymentMethod: t.paymentMethod,
    categoryName: t.category?.name ?? null,
    accountName: t.account?.name ?? '',
  }))
}
