"use client"

import { useState, useEffect, useCallback, useMemo, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { formatCurrency, cn } from '@/lib/utils'
import { ArrowLeft, CreditCard, TrendingUp, TrendingDown, Layers, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { getCategoryIcon } from '@/lib/category-icon'

interface InvoiceDetail {
  id: string
  cardId: string
  periodStart: string
  periodEnd: string
  dueDate: string
  total: string
  status: 'OPEN' | 'CLOSED' | 'PAID' | 'OVERDUE'
  paidAt: string | null
  card: {
    id: string
    name: string
    color: string
    linkedAccountId: string | null
    closingDay: number | null
    dueDay: number | null
  }
  transactions: Array<{
    id: string
    description: string
    amount: string
    date: string
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
    category?: { id: string; name: string; icon?: string; color: string } | null
    installment?: { installmentNumber: number; totalInstallments: number } | null
  }>
}

interface InvoiceLite {
  id: string
  periodEnd: string
  total: string
  cardId: string
}

interface AccountLite {
  id: string
  name: string
  type: string
}

const STATUS_LABELS = { OPEN: 'Em aberto', CLOSED: 'Fechada', PAID: 'Paga', OVERDUE: 'Em atraso' } as const
const STATUS_STYLES = {
  OPEN: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
  CLOSED: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  PAID: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  OVERDUE: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
} as const

const FALLBACK_COLOR = '#64748b'

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [previousInvoice, setPreviousInvoice] = useState<InvoiceLite | null>(null)
  const [accounts, setAccounts] = useState<AccountLite[]>([])
  const [loading, setLoading] = useState(true)
  const [payOpen, setPayOpen] = useState(false)
  const [payingFrom, setPayingFrom] = useState<string>('')
  const [paying, setPaying] = useState(false)

  const fetchInvoice = useCallback(async () => {
    setLoading(true)
    try {
      const [invRes, accRes] = await Promise.all([
        fetch(`/api/invoices/${id}`).then(r => r.json()),
        fetch('/api/accounts').then(r => r.json()),
      ])
      if (invRes.data) {
        setInvoice(invRes.data)
        setPayingFrom(invRes.data.card.linkedAccountId || '')

        // Busca a fatura anterior do mesmo cartão pra comparação MoM
        const allRes = await fetch(`/api/invoices?cardId=${invRes.data.cardId}`).then(r => r.json())
        const all: InvoiceLite[] = allRes.data || []
        const currentEnd = new Date(invRes.data.periodEnd).getTime()
        const prev = all
          .filter((i) => i.id !== invRes.data.id && new Date(i.periodEnd).getTime() < currentEnd)
          .sort((a, b) => new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime())[0]
        setPreviousInvoice(prev || null)
      }
      if (accRes.data) {
        setAccounts(accRes.data.filter((a: AccountLite) => a.type !== 'CREDIT_CARD'))
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchInvoice()
  }, [fetchInvoice])

  // ── Breakdown por categoria ────────────────────────────────────────────
  const categoryBreakdown = useMemo(() => {
    if (!invoice) return [] as { id: string; name: string; icon?: string; color: string; total: number; pct: number }[]
    const totals = new Map<string, { id: string; name: string; icon?: string; color: string; total: number }>()
    let grand = 0
    for (const tx of invoice.transactions) {
      if (tx.type !== 'EXPENSE') continue
      const key = tx.category?.id || '__none__'
      const existing = totals.get(key)
      const amount = Number(tx.amount)
      grand += amount
      if (existing) existing.total += amount
      else totals.set(key, {
        id: key,
        name: tx.category?.name || 'Sem categoria',
        icon: tx.category?.icon,
        color: tx.category?.color || FALLBACK_COLOR,
        total: amount,
      })
    }
    if (grand === 0) return []
    return Array.from(totals.values())
      .map((c) => ({ ...c, pct: Math.round((c.total / grand) * 100) }))
      .sort((a, b) => b.total - a.total)
  }, [invoice])

  // Top 5 + "Outras" pra não poluir o donut
  const breakdownDisplay = useMemo(() => {
    if (categoryBreakdown.length <= 6) return categoryBreakdown
    const top5 = categoryBreakdown.slice(0, 5)
    const rest = categoryBreakdown.slice(5)
    const others = {
      id: '__others__',
      name: 'Outras',
      color: '#94a3b8',
      total: rest.reduce((sum, c) => sum + c.total, 0),
      pct: rest.reduce((sum, c) => sum + c.pct, 0),
    }
    return [...top5, others]
  }, [categoryBreakdown])

  // ── MoM evolution ──────────────────────────────────────────────────────
  const evolution = useMemo(() => {
    if (!invoice || !previousInvoice) return null
    const cur = Number(invoice.total)
    const prev = Number(previousInvoice.total)
    if (prev === 0) return null
    const delta = cur - prev
    const pct = (delta / prev) * 100
    return { delta, pct, prevTotal: prev }
  }, [invoice, previousInvoice])

  if (loading || !invoice) {
    return (
      <div className="space-y-4 animate-fade-in max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  async function handlePay() {
    if (!payingFrom) {
      toast.error('Escolha a conta de onde o valor vai sair.')
      return
    }
    setPaying(true)
    try {
      const res = await fetch(`/api/invoices/${id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromAccountId: payingFrom }),
      })
      const result = await res.json()
      if (res.ok) {
        toast.success('Fatura paga! Saldo da conta atualizado.')
        setPayOpen(false)
        fetchInvoice()
      } else {
        toast.error(result.error || 'Não foi possível pagar a fatura.')
      }
    } catch {
      toast.error('Não foi possível pagar a fatura.')
    }
    setPaying(false)
  }

  const canPay = invoice.status !== 'PAID' && Number(invoice.total) > 0

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Fatura · {invoice.card.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            Período {new Date(invoice.periodStart).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} – {new Date(invoice.periodEnd).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
          </p>
        </div>
      </div>

      {/* Total + status + evolução MoM + botão Pagar */}
      <Card className="overflow-hidden">
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${invoice.card.color}, ${invoice.card.color}88)` }} />
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground">Total da fatura</p>
              <p className="text-3xl font-bold tabular-nums">{formatCurrency(Number(invoice.total))}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className={STATUS_STYLES[invoice.status]}>
                  {STATUS_LABELS[invoice.status]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Vence {new Date(invoice.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                </span>
                {evolution && (
                  <EvolutionChip
                    pct={evolution.pct}
                    delta={evolution.delta}
                    prevTotal={evolution.prevTotal}
                  />
                )}
              </div>
              {invoice.paidAt && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5">
                  ✓ Paga em {new Date(invoice.paidAt).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
            {canPay && (
              <Dialog open={payOpen} onOpenChange={setPayOpen}>
                <DialogTrigger render={<Button className="gradient-primary border-0 shadow-md shadow-primary/25" />}>
                  Pagar fatura
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Pagar fatura</DialogTitle>
                    <DialogDescription>
                      Vamos registrar um débito no valor de <strong>{formatCurrency(Number(invoice.total))}</strong> na conta escolhida e zerar a fatura.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">De qual conta sai o pagamento?</label>
                    <Select onValueChange={(v) => v && setPayingFrom(v)} value={payingFrom}>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Selecione a conta">
                          {accounts.find((a) => a.id === payingFrom)?.name || <span className="text-muted-foreground">Selecione a conta</span>}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setPayOpen(false)} disabled={paying}>
                      Cancelar
                    </Button>
                    <Button onClick={handlePay} disabled={paying || !payingFrom} className="gradient-primary border-0">
                      {paying ? 'Pagando...' : 'Confirmar pagamento'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Breakdown por categoria */}
      {categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Onde gastou</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-[200px_1fr] items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={breakdownDisplay}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    dataKey="total"
                    nameKey="name"
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {breakdownDisplay.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {breakdownDisplay.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-medium tabular-nums">{formatCurrency(cat.total)}</span>
                      <span className="text-xs text-muted-foreground w-9 text-right tabular-nums">{cat.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compras nesta fatura — padrão icon-tile */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Compras nesta fatura ({invoice.transactions.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {invoice.transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-8 text-center">
              Nenhuma compra registrada nessa fatura.
            </p>
          ) : (
            <div className="divide-y">
              {invoice.transactions.map((tx) => {
                const hasCategory = !!tx.category?.name
                const Icon = hasCategory ? getCategoryIcon(tx.category!.icon) : Receipt
                const color = tx.category?.color || FALLBACK_COLOR
                const installment = tx.installment

                return (
                  <Link
                    key={tx.id}
                    href={`/transactions/new?edit=${tx.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ring-1 ring-inset ring-black/5 dark:ring-white/10"
                      style={{ backgroundColor: `${color}1a` }}
                    >
                      <Icon className="h-[18px] w-[18px]" style={{ color }} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium truncate">{tx.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        <span className="truncate">{tx.category?.name || 'Sem categoria'}</span>
                        <span className="text-muted-foreground/50">·</span>
                        <span>{new Date(tx.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                        {installment && installment.totalInstallments > 1 && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 tabular-nums"
                            title={`Parcela ${installment.installmentNumber} de ${installment.totalInstallments}`}
                          >
                            <Layers className="h-2.5 w-2.5" strokeWidth={2.5} />
                            {installment.installmentNumber}/{installment.totalInstallments}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className={cn(
                      'text-[14px] font-semibold shrink-0 tabular-nums',
                      tx.type === 'INCOME' ? 'text-income' : 'text-expense',
                    )}>
                      {tx.type === 'INCOME' ? '+' : '−'}{formatCurrency(Number(tx.amount))}
                    </p>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function EvolutionChip({ pct, delta, prevTotal }: { pct: number; delta: number; prevTotal: number }) {
  const isUp = delta > 0
  const isDown = delta < 0
  const flat = Math.abs(pct) < 0.5

  // Em fatura, subir é ruim (vermelho) e descer é bom (verde)
  const cls = flat
    ? 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'
    : isUp
      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'

  const Icon = flat ? null : isUp ? TrendingUp : TrendingDown
  const sign = isUp ? '+' : isDown ? '−' : ''
  const pctLabel = flat
    ? 'Igual à anterior'
    : `${sign}${Math.abs(pct).toFixed(0)}% vs. anterior`

  return (
    <span
      className={cn('inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md', cls)}
      title={`Fatura anterior: ${formatCurrency(prevTotal)}`}
    >
      {Icon && <Icon className="h-3 w-3" strokeWidth={2.5} />}
      {pctLabel}
    </span>
  )
}
