"use client"

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

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
  // No dashboard mostro só os críticos (≥80%) — squad: parede de 12 budgets vira ruído.
  // Se nenhum estiver crítico, mostra os 4 mais altos como "tudo sob controle".
  const critical = budgets.filter((b) => b.percentage >= 80)
  const sorted = [...budgets].sort((a, b) => b.percentage - a.percentage)
  const displayed = critical.length > 0 ? critical.slice(0, 4) : sorted.slice(0, 4)
  const allUnderControl = critical.length === 0 && budgets.length > 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">
          {critical.length > 0 ? 'Orçamentos no limite' : 'Orçamentos'}
        </CardTitle>
        <Link href="/budgets">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            Ver todos
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {budgets.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Nenhum orçamento configurado
          </p>
        ) : (
          <>
            {allUnderControl && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-500/10 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                  Todos os orçamentos sob controle
                </span>
              </div>
            )}
            <div className="space-y-4">
              {displayed.map((b) => {
                const pct = Math.min(b.percentage, 100)
                return (
                  <div key={b.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{b.categoryName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground tabular-nums">
                          {formatCurrency(b.spentAmount)} / {formatCurrency(b.budgetAmount)}
                        </span>
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums', getBadgeStyle(b.percentage))}>
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
            {budgets.length > displayed.length && (
              <Link
                href="/budgets"
                className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground py-2 mt-3 border-t pt-3"
              >
                Ver todos os {budgets.length} orçamentos
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
