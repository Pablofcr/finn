import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { getTodayInTimezone, daysUntilInTimezone, endOfTodayInTimezone } from '@/lib/date-tz'

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const userTz = user.timezone || 'America/Sao_Paulo'
  const todayInTz = getTodayInTimezone(userTz)

  const { searchParams } = request.nextUrl
  const month = parseInt(searchParams.get('month') || String(todayInTz.getUTCMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(todayInTz.getUTCFullYear()))

  const startDate = new Date(Date.UTC(year, month - 1, 1))
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59))

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
  const todayEnd = endOfTodayInTimezone(userTz)
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

  // Upcoming bills — recurrings + invoices in next 7 days. Janela respeita a
  // tz do user: o "agora" é o midnight local convertido pra UTC, e os 7 dias
  // são contados em dias-calendário do user, não em horas UTC.
  const sevenDaysOut = new Date(todayInTz.getTime() + 8 * 24 * 60 * 60 * 1000 - 1)
  const now = new Date()

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

  function daysUntil(date: Date): number {
    return daysUntilInTimezone(date, userTz)
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

  // Weekly stats — pra alimentar o empty state evolutivo do insight card
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // domingo passado
  weekStart.setHours(0, 0, 0, 0)

  const weeklyTxs = await prisma.transaction.findMany({
    where: { userId: user.id, date: { gte: weekStart, lte: now } },
    select: { categoryId: true, amount: true, type: true, date: true },
  })

  const weeklyTxCount = weeklyTxs.length
  const weeklyDays = new Set(weeklyTxs.map((t) => t.date.toISOString().slice(0, 10))).size

  // Categoria que mais apareceu (por contagem) — usada na cópia "X liderando"
  const weeklyCategoryCounts: Record<string, number> = {}
  for (const t of weeklyTxs) {
    if (t.categoryId && t.type === 'EXPENSE') {
      weeklyCategoryCounts[t.categoryId] = (weeklyCategoryCounts[t.categoryId] || 0) + 1
    }
  }
  const topCatId = Object.entries(weeklyCategoryCounts).sort(([, a], [, b]) => b - a)[0]?.[0]
  const topCat = topCatId ? await prisma.category.findUnique({
    where: { id: topCatId },
    select: { name: true },
  }) : null

  // Próximo domingo às 9h (quando o cron de insights costuma rodar)
  const nextSunday = new Date(now)
  const daysToSunday = (7 - nextSunday.getDay()) % 7 || 7 // se hoje é domingo, próxima semana
  nextSunday.setDate(nextSunday.getDate() + daysToSunday)
  nextSunday.setHours(9, 0, 0, 0)

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

  // ── Forecast probabilístico de saldo (Wave 2) ──────────────────────────
  // Pergunta: "onde meu saldo termina o mês?" Math é determinístico
  // (recorrentes + faturas) + estocástico (média móvel de 30 dias × dias
  // restantes). Só rodamos pro mês CORRENTE. Se for mês passado/futuro,
  // forecast vem null (UI esconde o card).
  const isCurrentMonth = year === now.getFullYear() && month - 1 === now.getMonth()
  let forecast: any = null

  if (isCurrentMonth) {
    const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const eomMid = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    const daysRemaining = Math.max(
      Math.ceil((eomMid.getTime() - todayMid.getTime()) / (1000 * 60 * 60 * 24)),
      0,
    )

    // ── Determinístico: recorrentes vencendo de hoje até fim do mês ──
    // Pulamos recorrentes vinculadas a CARTÃO DE CRÉDITO (vão pra fatura,
    // não saem da conta agora — a fatura é tratada separadamente abaixo).
    const remainingRecurrings = await prisma.recurringTransaction.findMany({
      where: {
        userId: user.id,
        status: 'ACTIVE',
        nextDueDate: { gte: todayMid, lte: eomMid },
      },
      select: {
        type: true,
        amount: true,
        account: { select: { type: true } },
      },
    })
    let remainingIncome = 0
    let remainingExpense = 0
    for (const r of remainingRecurrings) {
      if (r.account?.type === 'CREDIT_CARD') continue // vai pra fatura, não impacta saldo
      const v = Number(r.amount)
      if (r.type === 'INCOME') remainingIncome += v
      else if (r.type === 'EXPENSE') remainingExpense += v
    }

    // ── Determinístico: faturas vencendo de hoje até fim do mês ──
    const remainingInvoices = await prisma.invoice.findMany({
      where: {
        userId: user.id,
        status: { in: ['OPEN', 'CLOSED', 'OVERDUE'] },
        dueDate: { gte: todayMid, lte: eomMid },
      },
      select: { total: true },
    })
    const remainingInvoiceTotal = remainingInvoices.reduce((s, i) => s + Number(i.total), 0)

    // ── Estocástico: média diária de gastos NÃO-recorrentes em CASH ──
    // (não-recorrentes = sem recurringTransactionId; cash = sem invoiceId,
    // pois faturas já são contadas como pagamentos determinísticos)
    const thirtyDaysAgo = new Date(todayMid)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const past30CashExpenses = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: 'EXPENSE',
        date: { gte: thirtyDaysAgo, lte: now },
        recurringTransactionId: null,
        invoiceId: null,
      },
      select: { amount: true },
    })
    const past30Total = past30CashExpenses.reduce((s, t) => s + Number(t.amount), 0)
    const dailyMean = past30Total / 30
    const expectedSpend = dailyMean * daysRemaining

    // Esperado (central): saldo + receitas determinísticas − despesas
    // determinísticas − faturas vencendo − gasto não-recorrente projetado
    const expected = totalBalance + remainingIncome - remainingExpense - remainingInvoiceTotal - expectedSpend

    // Pessimista (interno, pro chip): assume +30% acima da média de gasto.
    // Não exibimos esse número. Só usamos pra decidir severity:
    //   rose: esperado < 0       → "fecha o mês no vermelho"
    //   amber: pessimista < 0    → "vai ficar apertado"
    //   emerald: pessimista ≥ 0  → "termina o mês no azul"
    const pessimistic = expected - dailyMean * 0.3 * daysRemaining

    let severity: 'positive' | 'tight' | 'negative'
    if (expected < 0) severity = 'negative'
    else if (pessimistic < 0) severity = 'tight'
    else severity = 'positive'

    // Esconde quando: amostra muito rasa OU mês quase acabou
    const shouldShow = past30CashExpenses.length >= 10 && daysRemaining > 3

    forecast = shouldShow ? {
      expected,
      severity,
      daysRemaining,
      // Pra frase acionável: total de contas/faturas pra pagar restantes
      remainingBills: remainingExpense + remainingInvoiceTotal,
      eomDate: eomMid.toISOString(),
    } : null
  }

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
      forecast,
      latestInsight,
      // contexto pra empty state evolutivo do insight
      insightContext: {
        weeklyTxCount,
        weeklyDays,
        topCategoryName: topCat?.name || null,
        nextInsightDate: nextSunday.toISOString(),
      },
    },
  })
}
