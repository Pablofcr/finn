"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { ChevronLeft } from 'lucide-react'

interface MonthlyData {
  month: string
  income: number
  expense: number
  // Daily breakdown (when drilling into a month)
  dailyData?: { day: string; income: number; expense: number }[]
}

interface MonthlyChartProps {
  data: MonthlyData[]
  onMonthClick?: (monthIndex: number) => void
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null
  return (
    <div className="bg-popover text-popover-foreground rounded-xl shadow-xl border p-3 text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function MonthlyChart({ data, onMonthClick }: MonthlyChartProps) {
  const [showIncome, setShowIncome] = useState(true)
  const [showExpense, setShowExpense] = useState(true)
  const [drillMonth, setDrillMonth] = useState<string | null>(null)
  const [drillData, setDrillData] = useState<MonthlyData | null>(null)

  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">Fluxo de Caixa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
            Sem dados para exibir
          </div>
        </CardContent>
      </Card>
    )
  }

  function handleChartClick(chartData: any) {
    if (drillMonth || !chartData?.activePayload?.[0]) return
    const clicked = chartData.activePayload[0].payload as MonthlyData
    if (!clicked) return

    setDrillMonth(clicked.month)
    setDrillData(clicked)

    // Also trigger parent callback to update period selector
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const idx = monthNames.indexOf(clicked.month)
    if (idx >= 0 && onMonthClick) {
      onMonthClick(idx)
    }
  }

  function handleBack() {
    setDrillMonth(null)
    setDrillData(null)
  }

  // Drill-down view — show income vs expense as bar comparison for that month
  if (drillMonth && drillData) {
    const barData = [
      { name: 'Receitas', value: drillData.income, fill: '#22c55e' },
      { name: 'Despesas', value: drillData.expense, fill: '#ef4444' },
      { name: 'Saldo', value: drillData.income - drillData.expense, fill: drillData.income - drillData.expense >= 0 ? '#6366f1' : '#f59e0b' },
    ]

    const savingsRate = drillData.income > 0
      ? Math.round(((drillData.income - drillData.expense) / drillData.income) * 100)
      : 0

    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleBack} className="h-7 w-7 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-base">Detalhes — {drillMonth}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3 text-center">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">Receitas</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(drillData.income)}</p>
            </div>
            <div className="rounded-xl bg-red-50 dark:bg-red-500/10 p-3 text-center">
              <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Despesas</p>
              <p className="text-lg font-bold text-red-700 dark:text-red-300">{formatCurrency(drillData.expense)}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${drillData.income >= drillData.expense ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'bg-amber-50 dark:bg-amber-500/10'}`}>
              <p className={`text-xs font-medium mb-1 ${drillData.income >= drillData.expense ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'}`}>
                Saldo ({savingsRate}%)
              </p>
              <p className={`text-lg font-bold ${drillData.income >= drillData.expense ? 'text-indigo-700 dark:text-indigo-300' : 'text-amber-700 dark:text-amber-300'}`}>
                {formatCurrency(drillData.income - drillData.expense)}
              </p>
            </div>
          </div>

          {/* Bar chart comparison */}
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} className="text-xs" tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" className="text-xs" tickLine={false} axisLine={false} width={70} />
              <Tooltip
                formatter={(value: any) => formatCurrency(Number(value))}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} animationDuration={600}>
                {barData.map((entry, i) => (
                  <Bar key={i} dataKey="value" fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <p className="text-xs text-muted-foreground text-center mt-3">
            Clique em ← para voltar à visão geral
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Fluxo de Caixa</CardTitle>
          <div className="flex gap-1">
            <Button
              variant={showIncome ? 'default' : 'outline'}
              size="sm"
              className={`text-xs h-7 px-2.5 ${showIncome ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-0' : ''}`}
              onClick={() => setShowIncome(!showIncome)}
            >
              Receitas
            </Button>
            <Button
              variant={showExpense ? 'default' : 'outline'}
              size="sm"
              className={`text-xs h-7 px-2.5 ${showExpense ? 'bg-red-500 hover:bg-red-600 text-white border-0' : ''}`}
              onClick={() => setShowExpense(!showExpense)}
            >
              Despesas
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="incomeArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
            <XAxis dataKey="month" className="text-xs" tickLine={false} axisLine={false} />
            <YAxis
              className="text-xs"
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tickFormatter={(v) => {
                if (v >= 1000) return `R$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`
                return `R$${v}`
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            {showIncome && (
              <Area
                type="monotone"
                dataKey="income"
                name="Receitas"
                stroke="#22c55e"
                strokeWidth={2.5}
                fill="url(#incomeArea)"
                activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                animationDuration={800}
                animationEasing="ease-out"
              />
            )}
            {showExpense && (
              <Area
                type="monotone"
                dataKey="expense"
                name="Despesas"
                stroke="#ef4444"
                strokeWidth={2.5}
                fill="url(#expenseArea)"
                activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                animationDuration={800}
                animationEasing="ease-out"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>

        {/* Clickable month buttons */}
        <div className="flex justify-between mt-2 px-6">
          {data.map((item, i) => (
            <button
              key={item.month}
              type="button"
              onClick={() => {
                setDrillMonth(item.month)
                setDrillData(item)
                const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
                const idx = monthNames.indexOf(item.month)
                if (idx >= 0 && onMonthClick) onMonthClick(idx)
              }}
              className="text-xs font-medium text-primary hover:text-primary/80 hover:bg-primary/10 px-2 py-1 rounded-lg transition-all"
            >
              Ver {item.month}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
