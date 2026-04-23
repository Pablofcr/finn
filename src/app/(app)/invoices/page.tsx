"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCurrency } from '@/lib/utils'
import { CreditCard, ChevronRight } from 'lucide-react'

interface Invoice {
  id: string
  cardId: string
  periodStart: string
  periodEnd: string
  dueDate: string
  total: string
  status: 'OPEN' | 'CLOSED' | 'PAID' | 'OVERDUE'
  paidAt: string | null
  card: { id: string; name: string; color: string }
  _count: { transactions: number }
}

const STATUS_LABELS: Record<Invoice['status'], string> = {
  OPEN: 'Em aberto',
  CLOSED: 'Fechada',
  PAID: 'Paga',
  OVERDUE: 'Em atraso',
}

const STATUS_STYLES: Record<Invoice['status'], string> = {
  OPEN: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30',
  CLOSED: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  OVERDUE: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30',
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/invoices')
      if (res.ok) {
        const result = await res.json()
        setInvoices(result.data || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    )
  }

  const grouped = invoices.reduce<Record<string, Invoice[]>>((acc, inv) => {
    (acc[inv.cardId] ||= []).push(inv)
    return acc
  }, {})

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Faturas</h1>
        <p className="text-sm text-muted-foreground">Histórico e faturas em aberto dos seus cartões</p>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-12 w-12" />}
          title="Nenhuma fatura ainda"
          description="Faturas aparecem aqui automaticamente quando você registra compras no crédito em um cartão com dia de fechamento e vencimento configurados."
        />
      ) : (
        Object.entries(grouped).map(([cardId, cardInvoices]) => {
          const cardName = cardInvoices[0].card.name
          const cardColor = cardInvoices[0].card.color
          return (
            <Card key={cardId} className="overflow-hidden">
              <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${cardColor}, ${cardColor}88)` }} />
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                    style={{ background: `linear-gradient(135deg, ${cardColor}, ${cardColor}cc)` }}
                  >
                    <CreditCard className="h-4 w-4" />
                  </div>
                  {cardName}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {cardInvoices.map(inv => (
                    <Link
                      key={inv.id}
                      href={`/invoices/${inv.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            Fatura {new Date(inv.periodEnd).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                          </span>
                          <Badge variant="outline" className={STATUS_STYLES[inv.status]}>
                            {STATUS_LABELS[inv.status]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Vence {new Date(inv.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} · {inv._count.transactions} {inv._count.transactions === 1 ? 'compra' : 'compras'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p className="text-sm font-bold">{formatCurrency(Number(inv.total))}</p>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
