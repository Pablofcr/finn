"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCurrency, cn } from '@/lib/utils'
import { CreditCard, ChevronRight, ArrowRight, ChevronDown, AlertTriangle } from 'lucide-react'

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

function daysBetween(future: string, anchor: Date) {
  const f = new Date(future)
  const fUTC = Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate())
  const aUTC = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate())
  return Math.round((fUTC - aUTC) / 86_400_000)
}

function isThisMonth(iso: string, anchor: Date) {
  const d = new Date(iso)
  return d.getUTCFullYear() === anchor.getUTCFullYear() && d.getUTCMonth() === anchor.getUTCMonth()
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showPaid, setShowPaid] = useState(false)

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

  // ── Totals & spotlight ─────────────────────────────────────────────────
  const { openTotal, next7Total, paidMonthTotal, spotlight } = useMemo(() => {
    const now = new Date()
    let openTotal = 0
    let next7Total = 0
    let paidMonthTotal = 0
    let spotlight: Invoice | null = null

    for (const inv of invoices) {
      const total = Number(inv.total)
      const isUnpaid = inv.status !== 'PAID'

      if (isUnpaid) openTotal += total

      if (isUnpaid) {
        const days = daysBetween(inv.dueDate, now)
        if (days <= 7) next7Total += total
        // Spotlight = mais urgente: OVERDUE primeiro, depois menor daysUntil,
        // depois maior valor pra desempate.
        if (days <= 3 || inv.status === 'OVERDUE') {
          if (!spotlight) {
            spotlight = inv
          } else {
            const sDays = daysBetween(spotlight.dueDate, now)
            const sIsOverdue = spotlight.status === 'OVERDUE'
            const iIsOverdue = inv.status === 'OVERDUE'
            if (iIsOverdue && !sIsOverdue) spotlight = inv
            else if (iIsOverdue === sIsOverdue) {
              if (days < sDays) spotlight = inv
              else if (days === sDays && total > Number(spotlight.total)) spotlight = inv
            }
          }
        }
      }

      if (inv.status === 'PAID' && inv.paidAt && isThisMonth(inv.paidAt, now)) {
        paidMonthTotal += total
      }
    }

    return { openTotal, next7Total, paidMonthTotal, spotlight }
  }, [invoices])

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    )
  }

  // Split: ativas (não-pagas) vs pagas
  const activeInvoices = invoices.filter((i) => i.status !== 'PAID')
  const paidInvoices = invoices.filter((i) => i.status === 'PAID')

  // Group by card
  const groupByCard = (list: Invoice[]) =>
    list.reduce<Record<string, Invoice[]>>((acc, inv) => {
      ;(acc[inv.cardId] ||= []).push(inv)
      return acc
    }, {})

  const activeGrouped = groupByCard(activeInvoices)
  const paidGrouped = groupByCard(paidInvoices)

  // Ordenação dentro de cada grupo:
  // - Ativas: dueDate ascendente (mais próxima de vencer primeiro — quem
  //   vence amanhã fica mais visível que quem vence em janeiro do ano que vem)
  // - Pagas: dueDate descendente (histórico mais recente em cima)
  Object.values(activeGrouped).forEach((list) => {
    list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  })
  Object.values(paidGrouped).forEach((list) => {
    list.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
  })

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Faturas</h1>
        <p className="text-sm text-muted-foreground">Histórico e faturas em aberto dos seus cartões</p>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-12 w-12" />}
          title="Nenhuma fatura ainda"
          description="Faturas aparecem aqui automaticamente quando você registra compras no crédito em um cartão com dia de fechamento e vencimento configurados."
          action={
            <Link href="/accounts">
              <Button className="gradient-primary border-0 shadow-md shadow-primary/25">
                Adicionar cartão
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Totalizer strip */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Card>
              <CardContent className="p-3">
                <p className="text-[11px] text-muted-foreground font-medium">Em aberto</p>
                <p className={cn(
                  'text-base sm:text-lg font-semibold tabular-nums mt-1',
                  openTotal > 0 ? 'text-expense' : 'text-muted-foreground',
                )}>
                  {formatCurrency(openTotal)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[11px] text-muted-foreground font-medium">Vence em 7 dias</p>
                <p className={cn(
                  'text-base sm:text-lg font-semibold tabular-nums mt-1',
                  next7Total > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
                )}>
                  {formatCurrency(next7Total)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[11px] text-muted-foreground font-medium">Pagas no mês</p>
                <p className={cn(
                  'text-base sm:text-lg font-semibold tabular-nums mt-1',
                  paidMonthTotal > 0 ? 'text-income' : 'text-muted-foreground',
                )}>
                  {formatCurrency(paidMonthTotal)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Spotlight: fatura crítica (atrasada ou ≤3 dias) */}
          {spotlight && <SpotlightCard invoice={spotlight} />}

          {/* Faturas ativas por cartão */}
          {Object.entries(activeGrouped).map(([cardId, cardInvoices]) => (
            <CardInvoiceGroup key={cardId} cardInvoices={cardInvoices} spotlightId={spotlight?.id} />
          ))}

          {/* Pagas (toggle) */}
          {paidInvoices.length > 0 && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowPaid((s) => !s)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    showPaid ? 'rotate-0' : '-rotate-90',
                  )}
                />
                {showPaid ? 'Ocultar' : 'Ver'} pagas ({paidInvoices.length})
              </button>

              {showPaid &&
                Object.entries(paidGrouped).map(([cardId, cardInvoices]) => (
                  <CardInvoiceGroup key={cardId} cardInvoices={cardInvoices} muted />
                ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SpotlightCard({ invoice }: { invoice: Invoice }) {
  const days = daysBetween(invoice.dueDate, new Date())
  const isOverdue = invoice.status === 'OVERDUE' || days < 0
  const urgencyLabel = isOverdue
    ? 'Em atraso'
    : days === 0
      ? 'Vence hoje'
      : days === 1
        ? 'Vence amanhã'
        : `Vence em ${days} dias`

  return (
    <Card
      className={cn(
        'overflow-hidden border-2',
        isOverdue
          ? 'border-rose-300/60 dark:border-rose-500/40 bg-rose-50/40 dark:bg-rose-500/5'
          : 'border-amber-300/60 dark:border-amber-500/40 bg-amber-50/40 dark:bg-amber-500/5',
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className={cn(
              'flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl shrink-0',
              isOverdue
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
            )}
          >
            <AlertTriangle className="h-5 w-5" strokeWidth={2} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  'text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md',
                  isOverdue
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                )}
              >
                {urgencyLabel}
              </span>
            </div>
            <p className="text-base font-semibold truncate">
              Fatura {invoice.card.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Vencimento {new Date(invoice.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
              {' · '}
              {invoice._count.transactions} {invoice._count.transactions === 1 ? 'compra' : 'compras'}
            </p>
            <p className="text-2xl sm:text-3xl font-bold tabular-nums mt-2">
              {formatCurrency(Number(invoice.total))}
            </p>
          </div>
        </div>

        <Link href={`/invoices/${invoice.id}`}>
          <Button
            className={cn(
              'w-full mt-4 border-0 shadow-md',
              isOverdue
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25'
                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25',
            )}
          >
            Pagar fatura
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

function CardInvoiceGroup({
  cardInvoices,
  spotlightId,
  muted,
}: {
  cardInvoices: Invoice[]
  spotlightId?: string
  muted?: boolean
}) {
  const cardName = cardInvoices[0].card.name
  const cardColor = cardInvoices[0].card.color

  return (
    <Card className={cn('overflow-hidden', muted && 'opacity-75')}>
      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${cardColor}, ${cardColor}88)` }} />
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
          style={{ background: `linear-gradient(135deg, ${cardColor}, ${cardColor}cc)` }}
        >
          <CreditCard className="h-4 w-4" />
        </div>
        <p className="text-base font-semibold">{cardName}</p>
      </div>
      <CardContent className="p-0">
        <div className="divide-y">
          {cardInvoices.map((inv) => (
            <Link
              key={inv.id}
              href={`/invoices/${inv.id}`}
              className={cn(
                'flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors',
                spotlightId === inv.id && 'bg-muted/30',
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {new Date(inv.periodEnd).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
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
                <p className="text-sm font-bold tabular-nums">{formatCurrency(Number(inv.total))}</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
