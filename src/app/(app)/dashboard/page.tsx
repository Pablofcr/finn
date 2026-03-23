"use client"

import { useState, useEffect, useCallback } from 'react'
import { BalanceCard } from '@/components/dashboard/balance-card'
import { MonthlyChart } from '@/components/dashboard/monthly-chart'
import { CategoryDonut } from '@/components/dashboard/category-donut'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { BudgetProgressList } from '@/components/dashboard/budget-progress-list'
import { PeriodSelector } from '@/components/dashboard/period-selector'
import { Skeleton } from '@/components/ui/skeleton'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia,'
  if (hour < 18) return 'Boa tarde,'
  return 'Boa noite,'
}

export default function DashboardPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/transactions/summary?month=${month + 1}&year=${year}`)
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
          <div>
            <Skeleton className="h-4 w-20 mb-1" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-10 w-48 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-2xl" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{getGreeting()}</p>
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
        <PeriodSelector month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
      </div>

      <BalanceCard
        totalBalance={data?.totalBalance ?? 0}
        income={data?.totalIncome ?? 0}
        expense={data?.totalExpense ?? 0}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <MonthlyChart data={data?.monthlyData ?? []} />
        <CategoryDonut data={data?.categoryData ?? []} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <RecentTransactions transactions={data?.recentTransactions ?? []} />
        <BudgetProgressList budgets={data?.budgetProgress ?? []} />
      </div>
    </div>
  )
}
