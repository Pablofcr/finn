"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface BudgetProgress {
  id: string
  categoryName: string
  categoryColor: string
  budgetAmount: number
  spentAmount: number
  percentage: number
}

interface BudgetProgressListProps {
  budgets: BudgetProgress[]
}

function getProgressColor(percentage: number) {
  if (percentage <= 60) return 'progress-gradient-success'
  if (percentage <= 80) return 'progress-gradient-warning'
  return 'progress-gradient-danger'
}

function getBadgeStyle(percentage: number) {
  if (percentage <= 60) return 'bg-green-500/10 text-green-600'
  if (percentage <= 80) return 'bg-yellow-500/10 text-yellow-600'
  return 'bg-red-500/10 text-red-600'
}

export function BudgetProgressList({ budgets }: BudgetProgressListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Orçamentos</CardTitle>
      </CardHeader>
      <CardContent>
        {budgets.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Nenhum orçamento configurado
          </p>
        ) : (
          <div className="space-y-4">
            {budgets.map((b) => {
              const pct = Math.min(b.percentage, 100)
              return (
                <div key={b.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{b.categoryName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {formatCurrency(b.spentAmount)} / {formatCurrency(b.budgetAmount)}
                      </span>
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', getBadgeStyle(b.percentage))}>
                        {b.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', getProgressColor(b.percentage))}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
