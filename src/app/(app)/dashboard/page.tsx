"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { MonthlyChart } from '@/components/dashboard/monthly-chart'
import { CategoryDonut } from '@/components/dashboard/category-donut'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { BudgetProgressList } from '@/components/dashboard/budget-progress-list'
import { PeriodSelector } from '@/components/dashboard/period-selector'
import { WeeklyInsightCard } from '@/components/dashboard/weekly-insight-card'
import { UpcomingBillsCard } from '@/components/dashboard/upcoming-bills-card'
import { AccountsBalanceCard } from '@/components/dashboard/accounts-balance-card'
import { ForecastCard } from '@/components/dashboard/forecast-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

function getGreeting(name: string) {
  const hour = new Date().getHours()
  const prefix = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  return `${prefix}, ${name}`
}

export default function DashboardPage() {
  const { user } = useAuth()
  const displayName = user?.user_metadata?.name?.split(' ')[0] || 'usuário'
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`/api/transactions/summary?month=${month + 1}&year=${year}`)
      if (res.ok) {
        const result = await res.json()
        setData(result.data)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
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
          <div>
            <Skeleton className="h-8 w-56 mb-1" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-48 rounded-xl" />
        </div>
        <Skeleton className="h-44 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="lg:col-span-2 h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <RefreshCw className="h-7 w-7 text-destructive" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold">Não foi possível carregar seus dados</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Verifique sua conexão e tente novamente. Seus dados estão seguros.
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{getGreeting(displayName)}</h1>
          <p className="text-sm text-muted-foreground">Seu panorama financeiro</p>
        </div>
        <PeriodSelector month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
      </div>

      {/* Insight da semana — hero da IA, no topo absoluto. Empty state evolui
          com base em tx desta semana + data do próximo cron domingo. */}
      <WeeklyInsightCard
        insight={data?.latestInsight ?? null}
        context={data?.insightContext}
      />

      {/* KPI Cards — 3 colunas (cortei "Taxa de Poupança") */}
      <KpiCards
        totalBalance={data?.totalBalance ?? 0}
        totalIncome={data?.totalIncome ?? 0}
        totalExpense={data?.totalExpense ?? 0}
        incomeChange={data?.incomeChange ?? 0}
        expenseChange={data?.expenseChange ?? 0}
        incomeSpark={data?.incomeSpark ?? []}
        expenseSpark={data?.expenseSpark ?? []}
      />

      {/* Forecast — onde o saldo termina o mês. Hidden quando amostra rasa
          ou faltam ≤3 dias. Só aparece pro mês corrente. */}
      <ForecastCard forecast={data?.forecast ?? null} />

      {/* Próximas contas + Saldo por conta — par acionável */}
      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingBillsCard
          bills={data?.upcomingBills ?? []}
          onPaid={fetchData}
        />
        <AccountsBalanceCard
          accounts={data?.accounts ?? []}
          totalBalance={data?.totalBalance ?? 0}
        />
      </div>

      {/* Charts — AreaChart 2/3 + Donut 1/3 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MonthlyChart
            data={data?.monthlyData ?? []}
            onMonthClick={(monthIndex) => { setMonth(monthIndex); }}
          />
        </div>
        <CategoryDonut data={data?.categoryData ?? []} />
      </div>

      {/* Transações 3/5 + Orçamentos 2/5 */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RecentTransactions transactions={data?.recentTransactions ?? []} />
        </div>
        <div className="lg:col-span-2">
          <BudgetProgressList budgets={data?.budgetProgress ?? []} />
        </div>
      </div>
    </div>
  )
}
