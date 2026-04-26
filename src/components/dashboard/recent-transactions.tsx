"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowRight, Banknote, Receipt } from 'lucide-react'
import Link from 'next/link'
import { getCategoryIcon } from '@/lib/category-icon'

interface RecentTransaction {
  id: string
  description: string
  amount: number
  type: string
  date: string
  categoryName?: string
  categoryColor?: string
  categoryIcon?: string
}

interface RecentTransactionsProps {
  transactions: RecentTransaction[]
}

// Fallback icons for transactions with no category set
const INCOME_FALLBACK_COLOR = '#22c55e' // green
const EXPENSE_FALLBACK_COLOR = '#64748b' // slate

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Transações Recentes</CardTitle>
        <Link href="/transactions">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            Ver todas
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Nenhuma transação registrada
          </p>
        ) : (
          <div className="space-y-1">
            {transactions.map((t) => {
              const hasCategory = !!t.categoryName
              const isIncome = t.type === 'INCOME'

              // Pick icon: category icon if present, else type-based fallback.
              const Icon = hasCategory
                ? getCategoryIcon(t.categoryIcon)
                : isIncome
                  ? Banknote
                  : Receipt

              const color = hasCategory
                ? (t.categoryColor || '#64748b')
                : isIncome
                  ? INCOME_FALLBACK_COLOR
                  : EXPENSE_FALLBACK_COLOR

              return (
                <div key={t.id} className="flex items-center justify-between hover:bg-muted/50 rounded-lg transition-colors p-2 -mx-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ring-1 ring-inset ring-black/5 dark:ring-white/10"
                      style={{ backgroundColor: `${color}1a` }}
                    >
                      <Icon className="h-4 w-4" style={{ color }} strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.categoryName || 'Sem categoria'} · {formatDate(t.date)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      isIncome ? 'text-income' : 'text-expense'
                    }`}
                  >
                    {isIncome ? '+' : '-'}
                    {formatCurrency(Number(t.amount))}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
