"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { PeriodSelector } from '@/components/dashboard/period-selector'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, AreaChart, Area,
  ComposedChart, Line, LineChart, ReferenceLine,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, Layers,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react'
import { getCategoryIcon } from '@/lib/category-icon'
import { ResponsiveCalendar } from '@nivo/calendar'
import { ResponsiveTreeMap } from '@nivo/treemap'

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0) return <Minus className="h-3 w-3 text-muted-foreground" />
  if (value > 0) return (
    <span className="flex items-center text-xs text-green-600">
      <ArrowUpRight className="h-3 w-3" />
      {value}%
    </span>
  )
  return (
    <span className="flex items-center text-xs text-red-600">
      <ArrowDownRight className="h-3 w-3" />
      {Math.abs(value)}%
    </span>
  )
}

function ExpenseChangeIndicator({ value }: { value: number }) {
  if (value === 0) return <Minus className="h-3 w-3 text-muted-foreground" />
  if (value > 0) return (
    <span className="flex items-center text-xs text-red-600">
      <ArrowUpRight className="h-3 w-3" />
      {value}%
    </span>
  )
  return (
    <span className="flex items-center text-xs text-green-600">
      <ArrowDownRight className="h-3 w-3" />
      {Math.abs(value)}%
    </span>
  )
}

/** Sparkline minimalista pra colocar no fundo dos KPI cards. */
function MiniSparkline({ data, color }: { data: { v: number }[]; color: string }) {
  if (!data || data.length < 2) return null
  return (
    <div className="absolute bottom-2 right-3 w-20 h-9 opacity-50 pointer-events-none">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function ReportsPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?month=${month + 1}&year=${year}`)
      if (res.ok) {
        const result = await res.json()
        setData(result.data)
      }
    } catch {
      // silently fail
    }
    setLoading(false)
  }, [month, year])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="space-y-6 stagger-children">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-48 rounded-xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-80" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  const summary = data?.summary || {}
  const monthlyEvolution = data?.monthlyEvolution || []
  const categoryData = data?.categoryData || []
  const categoryTree = data?.categoryTree || { name: 'Despesas', color: '#6366f1', children: [] }
  const incomeData = data?.incomeData || []
  const dailyData = data?.dailyData || []
  const topExpenses = data?.topExpenses || []

  // "Maior categoria" — substitui o KPI "Taxa de Economia" (squad: abstrato pra usuário BR)
  const topCategory = categoryData[0] as { categoryName: string; total: number; percentage: number; categoryIcon?: string; categoryColor?: string } | undefined

  // Sparklines — últimos 6 meses por métrica, do monthlyEvolution
  const last6 = (monthlyEvolution as Array<{ income: number; expense: number; balance: number }>).slice(-6)
  const incomeSpark = last6.map((m) => ({ v: m.income }))
  const expenseSpark = last6.map((m) => ({ v: m.expense }))
  const balanceSpark = last6.map((m) => ({ v: m.balance }))

  // Composed chart data — barras divergentes (receita +, despesa -) + saldo acumulado
  let cumulative = 0
  const composedData = (monthlyEvolution as Array<{ month: string; income: number; expense: number; balance: number }>).map((m) => {
    cumulative += m.balance
    return {
      month: m.month,
      income: m.income,
      expenseNeg: -m.expense, // valor negativo pra plotar pra baixo (divergente)
      expense: m.expense,     // valor real pro tooltip
      balance: m.balance,
      accumulated: cumulative,
    }
  })

  // Calendar heatmap data — uma célula por dia do mês selecionado, intensidade = despesa
  const monthStr = String(month + 1).padStart(2, '0')
  const calendarData = (dailyData as Array<{ day: number; expense: number; income: number }>)
    .filter((d) => d.expense > 0)
    .map((d) => ({
      day: `${year}-${monthStr}-${String(d.day).padStart(2, '0')}`,
      value: Math.round(d.expense),
    }))
  const calendarFrom = `${year}-${monthStr}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const calendarTo = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`
  const calendarMaxValue = calendarData.length > 0
    ? Math.max(...calendarData.map((d) => d.value))
    : 100

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <PeriodSelector month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Receitas</p>
                <p className="text-xl font-bold text-green-600 tabular-nums">{formatCurrency(summary.totalIncome)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="rounded-lg bg-green-500/10 p-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <ChangeIndicator value={summary.incomeChange} />
              </div>
            </div>
            <MiniSparkline data={incomeSpark} color="#22c55e" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Despesas</p>
                <p className="text-xl font-bold text-red-600 tabular-nums">{formatCurrency(summary.totalExpense)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="rounded-lg bg-red-500/10 p-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </div>
                <ExpenseChangeIndicator value={summary.expenseChange} />
              </div>
            </div>
            <MiniSparkline data={expenseSpark} color="#ef4444" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Saldo do Mês</p>
                <p className={cn('text-xl font-bold tabular-nums', summary.balance >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatCurrency(summary.balance)}
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
            </div>
            <MiniSparkline data={balanceSpark} color="#6366f1" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Maior categoria</p>
                {topCategory ? (
                  <>
                    <p className="text-xl font-bold truncate" title={topCategory.categoryName}>
                      {topCategory.categoryName}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {formatCurrency(topCategory.total)} · {topCategory.percentage}% do total
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold text-muted-foreground/60">—</p>
                    <p className="text-[11px] text-muted-foreground">Sem dados no período</p>
                  </>
                )}
              </div>
              <div
                className="rounded-lg p-2 shrink-0 ring-1 ring-inset ring-black/5 dark:ring-white/10"
                style={topCategory ? { backgroundColor: `${topCategory.categoryColor}1a` } : { backgroundColor: 'rgba(99,102,241,0.1)' }}
              >
                <Layers
                  className="h-4 w-4"
                  style={topCategory ? { color: topCategory.categoryColor } : undefined}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Evolution — barras divergentes + linha de saldo acumulado */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Evolução Mensal (12 meses)</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Receitas pra cima, despesas pra baixo. A linha violeta mostra o saldo acumulado.
          </p>
        </CardHeader>
        <CardContent>
          {composedData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
              Sem dados para exibir
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={composedData} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="rIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#16a34a" stopOpacity={0.75} />
                  </linearGradient>
                  <linearGradient id="rExpenseGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0.75} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" vertical={false} />
                <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  className="text-xs"
                  tickFormatter={(v) => {
                    const a = Math.abs(v)
                    if (a >= 1000) return `R$${(v / 1000).toFixed(0)}k`
                    return `R$${v}`
                  }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value, name) => {
                    const v = Math.abs(Number(value))
                    if (name === 'income') return [formatCurrency(v), 'Receitas']
                    if (name === 'expenseNeg') return [formatCurrency(v), 'Despesas']
                    if (name === 'accumulated') return [formatCurrency(Number(value)), 'Saldo acumulado']
                    return [formatCurrency(Number(value)), String(name)]
                  }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    padding: '8px 12px',
                  }}
                />
                <Legend
                  formatter={(value) =>
                    value === 'income' ? 'Receitas'
                      : value === 'expenseNeg' ? 'Despesas'
                      : 'Saldo acumulado'
                  }
                />
                <ReferenceLine y={0} stroke="currentColor" className="text-muted-foreground/30" />
                <Bar dataKey="income" fill="url(#rIncomeGrad)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenseNeg" fill="url(#rExpenseGrad)" radius={[0, 0, 6, 6]} />
                <Line
                  type="monotone"
                  dataKey="accumulated"
                  stroke="#7c3aed"
                  strokeWidth={2.25}
                  dot={{ fill: '#7c3aed', r: 3, strokeWidth: 2, stroke: 'white' }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'white' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown + Daily Trend */}
      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Por Categoria</TabsTrigger>
          <TabsTrigger value="daily">Tendência Diária</TabsTrigger>
          <TabsTrigger value="top">Maiores Gastos</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <div className="grid gap-6 md:grid-cols-2 mt-4">
            {/* Expense Treemap — hierárquico (subcategorias agrupadas dentro do pai) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Despesas por Categoria</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Tamanho = quanto gastou. Subcategorias ficam dentro da categoria-pai.
                </p>
              </CardHeader>
              <CardContent>
                {categoryData.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">Sem despesas neste período</p>
                ) : (
                  <div style={{ height: 280 }}>
                    <ResponsiveTreeMap
                      data={categoryTree}
                      identity="name"
                      value="value"
                      valueFormat={(v) => formatCurrency(Number(v))}
                      nodeOpacity={0.95}
                      borderColor={{ from: 'color', modifiers: [['darker', 1.2]] }}
                      borderWidth={2}
                      labelSkipSize={20}
                      label={(node) => `${node.id}`}
                      labelTextColor={{ from: 'color', modifiers: [['darker', 3]] }}
                      parentLabelTextColor="#ffffff"
                      parentLabelSize={14}
                      parentLabelPosition="top"
                      parentLabelPadding={6}
                      colors={(node: any) => node.data?.color || '#94a3b8'}
                      tooltip={({ node }: any) => (
                        <div className="bg-popover text-popover-foreground rounded-xl shadow-xl border px-3 py-2 text-sm">
                          <p className="font-semibold">{node.id}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {formatCurrency(Number(node.value))}
                          </p>
                        </div>
                      )}
                      animate={true}
                      motionConfig="gentle"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Income Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Receitas por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                {incomeData.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">Sem receitas neste período</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={incomeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={85}
                          dataKey="total"
                          nameKey="categoryName"
                          paddingAngle={2}
                          strokeWidth={0}
                        >
                          {incomeData.map((entry: any, index: number) => (
                            <Cell key={index} fill={entry.categoryColor} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {incomeData.map((cat: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: cat.categoryColor }} />
                            <span className="truncate">{cat.categoryName}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{formatCurrency(cat.total)}</span>
                            <span className="text-xs text-muted-foreground w-8 text-right">{cat.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="daily">
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Mapa de calor diário</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Cada quadradinho é um dia do mês. Mais escuro = gastou mais. Revela seus dias de pico, fins de semana, e os dias quietos.
              </p>
            </CardHeader>
            <CardContent>
              {calendarData.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
                  Sem despesas no período pra desenhar o mapa
                </div>
              ) : (
                <>
                  <div style={{ height: 220 }}>
                    <ResponsiveCalendar
                      data={calendarData}
                      from={calendarFrom}
                      to={calendarTo}
                      maxValue={calendarMaxValue}
                      emptyColor="#f1f5f9"
                      colors={['#fee2e2', '#fca5a5', '#f87171', '#ef4444', '#b91c1c']}
                      margin={{ top: 20, right: 20, bottom: 12, left: 20 }}
                      yearSpacing={40}
                      monthBorderColor="#ffffff"
                      dayBorderWidth={2}
                      dayBorderColor="#ffffff"
                      tooltip={(d) => (
                        <div className="bg-popover text-popover-foreground rounded-xl shadow-xl border px-3 py-2 text-sm">
                          <p className="font-semibold tabular-nums">{formatCurrency(Number(d.value))}</p>
                          <p className="text-xs text-muted-foreground">{d.day}</p>
                        </div>
                      )}
                    />
                  </div>
                  {/* Legenda manual de intensidade — Nivo legends ficam pequenos demais */}
                  <div className="flex items-center justify-end gap-2 mt-2 px-2">
                    <span className="text-[11px] text-muted-foreground">Menos</span>
                    {['#f1f5f9', '#fee2e2', '#fca5a5', '#f87171', '#ef4444', '#b91c1c'].map((c) => (
                      <span key={c} className="h-3 w-3 rounded-sm" style={{ backgroundColor: c }} />
                    ))}
                    <span className="text-[11px] text-muted-foreground">Mais</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Top 10 Maiores Gastos</CardTitle>
            </CardHeader>
            <CardContent>
              {topExpenses.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Sem despesas neste período</p>
              ) : (
                <div className="space-y-1">
                  {topExpenses.map((t: any, i: number) => {
                    const Icon = getCategoryIcon(t.categoryIcon)
                    const color = t.categoryColor || '#64748b'
                    return (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 hover:bg-muted/50 rounded-lg transition-colors p-2 -mx-2"
                      >
                        <span className="text-xs text-muted-foreground w-5 text-right font-medium tabular-nums">
                          {i + 1}
                        </span>
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ring-1 ring-inset ring-black/5 dark:ring-white/10"
                          style={{ backgroundColor: `${color}1a` }}
                        >
                          <Icon className="h-4 w-4" style={{ color }} strokeWidth={1.75} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.categoryName} · {formatDate(t.date)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400 shrink-0 tabular-nums">
                          {formatCurrency(t.amount)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
