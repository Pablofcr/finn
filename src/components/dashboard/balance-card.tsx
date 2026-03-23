"use client"

import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'

interface BalanceCardProps {
  totalBalance: number
  income: number
  expense: number
}

export function BalanceCard({ totalBalance, income, expense }: BalanceCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl gradient-primary animate-gradient p-6 text-white">
      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/5" />
      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />
      <div className="absolute top-1/2 right-1/4 h-20 w-20 rounded-full bg-white/5" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 text-white/70 text-sm">
          <Wallet className="h-4 w-4" />
          Saldo Total
        </div>
        <p className="text-4xl font-bold mt-1">
          {formatCurrency(totalBalance)}
        </p>
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/25">
              <TrendingUp className="h-5 w-5 text-green-300" />
            </div>
            <div>
              <p className="text-xs text-white/70">Receitas</p>
              <p className="text-sm font-semibold">{formatCurrency(income)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/25">
              <TrendingDown className="h-5 w-5 text-red-300" />
            </div>
            <div>
              <p className="text-xs text-white/70">Despesas</p>
              <p className="text-sm font-semibold">{formatCurrency(expense)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
