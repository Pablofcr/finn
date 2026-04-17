"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface MonthlyData {
  month: string
  income: number
  expense: number
}

interface MonthlyChartProps {
  data: MonthlyData[]
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

export function MonthlyChart({ data }: MonthlyChartProps) {
  const [showIncome, setShowIncome] = useState(true)
  const [showExpense, setShowExpense] = useState(true)

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
        <ResponsiveContainer width="100%" height={280}>
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
      </CardContent>
    </Card>
  )
}
