"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, Check, CheckCircle2, Loader2 } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { getCategoryIcon } from '@/lib/category-icon'
import { toast } from 'sonner'

interface UpcomingBill {
  id: string
  kind: 'recurring' | 'invoice'
  description: string
  amount: number
  dueDate: string
  daysUntil: number
  categoryName?: string
  categoryIcon?: string
  categoryColor?: string
}

interface UpcomingBillsCardProps {
  bills: UpcomingBill[]
  onPaid?: () => void
}

function severityFor(daysUntil: number): {
  label: string
  chipClass: string
  ringClass: string
} {
  if (daysUntil <= 0) {
    return {
      label: 'Vence hoje',
      chipClass: 'bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-inset ring-red-500/20',
      ringClass: 'ring-2 ring-red-500/40',
    }
  }
  if (daysUntil === 1) {
    return {
      label: 'Vence amanhã',
      chipClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-1 ring-inset ring-orange-500/20',
      ringClass: 'ring-1 ring-inset ring-black/5 dark:ring-white/10',
    }
  }
  if (daysUntil <= 3) {
    return {
      label: `Em ${daysUntil} dias`,
      chipClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      ringClass: 'ring-1 ring-inset ring-black/5 dark:ring-white/10',
    }
  }
  return {
    label: `Em ${daysUntil} dias`,
    chipClass: 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400',
    ringClass: 'ring-1 ring-inset ring-black/5 dark:ring-white/10',
  }
}

export function UpcomingBillsCard({ bills, onPaid }: UpcomingBillsCardProps) {
  const [paying, setPaying] = useState<string | null>(null)
  const [paid, setPaid] = useState<Set<string>>(new Set())

  async function handleMarkPaid(bill: UpcomingBill) {
    if (bill.kind === 'invoice') {
      // Invoices precisam de fluxo de pagamento mais rico — manda pra página
      window.location.href = `/invoices/${bill.id}`
      return
    }
    setPaying(bill.id)
    try {
      const res = await fetch(`/api/recurring/${bill.id}/mark-paid`, { method: 'POST' })
      if (res.ok) {
        setPaid((prev) => new Set(prev).add(bill.id))
        toast.success(`${bill.description} marcada como paga.`)
        onPaid?.()
      } else {
        toast.error('Não foi possível marcar como paga. Tenta de novo.')
      }
    } catch {
      toast.error('Erro de conexão. Tenta de novo.')
    }
    setPaying(null)
  }

  const visibleBills = bills.filter((b) => !paid.has(b.id))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Próximas contas</CardTitle>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500">
            7 dias
          </span>
        </div>
        <Link href="/transactions">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            Ver todas
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {visibleBills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 mb-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium">Nada vencendo nos próximos 7 dias</p>
            <p className="text-xs text-muted-foreground mt-1">
              Você está em dia. Volte aqui na próxima semana.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {visibleBills.map((bill) => {
              const sev = severityFor(bill.daysUntil)
              const Icon = getCategoryIcon(bill.categoryIcon)
              const color = bill.categoryColor || '#64748b'
              const isPaying = paying === bill.id

              return (
                <div
                  key={bill.id}
                  className="group flex items-center gap-3 rounded-xl p-2 -mx-2 transition-colors hover:bg-muted/50"
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl shrink-0',
                      sev.ringClass,
                    )}
                    style={{ backgroundColor: `${color}1a` }}
                  >
                    <Icon className="h-4 w-4" style={{ color }} strokeWidth={1.75} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{bill.description}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={cn('text-[11px] font-semibold px-1.5 py-0.5 rounded-md', sev.chipClass)}>
                        {sev.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCurrency(bill.amount)}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMarkPaid(bill)}
                      disabled={isPaying}
                      className="h-8 px-2.5 text-xs sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 transition-opacity hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
                    >
                      {isPaying ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Paguei
                        </>
                      )}
                    </Button>
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
