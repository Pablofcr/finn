"use client"

import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  delta?: number | null
  sparkData?: { v: number }[]
  iconColor: string
  iconBg: string
  sparkColor: string
}

function KpiCard({ icon: Icon, label, value, delta, sparkData, iconColor, iconBg, sparkColor }: KpiCardProps) {
  return (
    <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          {delta !== null && delta !== undefined && (
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
              delta >= 0
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/10 text-red-600 dark:text-red-400'
            }`}>
              {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {delta >= 0 ? '+' : ''}{delta}%
            </span>
          )}
        </div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wide">{label}</p>

        {/* Sparkline — sutil mas legível (squad: opacity 60% melhor que 30%) */}
        {sparkData && sparkData.length > 0 && (
          <div className="absolute bottom-1 right-2 opacity-60 w-16 h-8 pointer-events-none">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={sparkColor}
                  strokeWidth={1.75}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface KpiCardsProps {
  totalBalance: number
  totalIncome: number
  totalExpense: number
  incomeChange: number
  expenseChange: number
  incomeSpark: { v: number }[]
  expenseSpark: { v: number }[]
}

export function KpiCards({
  totalBalance, totalIncome, totalExpense,
  incomeChange, expenseChange,
  incomeSpark, expenseSpark,
}: KpiCardsProps) {
  // 3 KPIs (cortei "Taxa de Poupança" — abstrato pro brasileiro médio).
  // Saldo por conta vira card próprio, mais informativo.
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
      <KpiCard
        icon={Wallet}
        label="Saldo Total"
        value={formatCurrency(totalBalance)}
        delta={null}
        iconColor="text-indigo-500"
        iconBg="bg-indigo-50 dark:bg-indigo-500/10"
        sparkColor="#6366f1"
      />
      <KpiCard
        icon={TrendingUp}
        label="Receitas"
        value={formatCurrency(totalIncome)}
        delta={incomeChange}
        sparkData={incomeSpark}
        iconColor="text-emerald-500"
        iconBg="bg-emerald-50 dark:bg-emerald-500/10"
        sparkColor="#22c55e"
      />
      <KpiCard
        icon={TrendingDown}
        label="Despesas"
        value={formatCurrency(totalExpense)}
        delta={expenseChange}
        sparkData={expenseSpark}
        iconColor="text-red-500"
        iconBg="bg-red-50 dark:bg-red-500/10"
        sparkColor="#ef4444"
      />
    </div>
  )
}
