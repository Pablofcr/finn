"use client"

import { useState, useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { formatCurrency, groupByDate, cn } from '@/lib/utils'
import {
  Plus, SearchX, ArrowLeftRight, Banknote, Receipt,
  Repeat, Layers, Download,
} from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import Link from 'next/link'
import { toast } from 'sonner'
import { RecurringTab } from '@/components/transactions/recurring-tab'
import {
  TransactionFilters,
  EMPTY_FILTERS,
  type TransactionFiltersValue,
} from '@/components/transactions/transaction-filters'
import { TransactionDetailSheet } from '@/components/transactions/transaction-detail-sheet'
import { getCategoryIcon } from '@/lib/category-icon'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'

const INCOME_FALLBACK_COLOR = '#22c55e'
const EXPENSE_FALLBACK_COLOR = '#64748b'
const TRANSFER_FALLBACK_COLOR = '#3b82f6'

type PaymentMethod = 'PIX' | 'DEBIT' | 'CREDIT' | 'CASH' | 'BOLETO' | 'TRANSFER'

interface Transaction {
  id: string
  description: string
  amount: number | string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  date: string
  paymentMethod?: PaymentMethod
  invoiceId?: string | null
  recurringTransactionId?: string | null
  installment?: {
    installmentNumber: number
    totalInstallments: number
    groupId: string
  } | null
  category?: { id: string; name: string; icon?: string; color?: string }
  account?: { id: string; name: string; type?: string; color?: string }
}

// Cor de cada método — neutro pra não competir com sinal+cor do valor
const METHOD_BADGE_STYLE: Record<PaymentMethod, string> = {
  PIX: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  DEBIT: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  CREDIT: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  CASH: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  BOLETO: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  TRANSFER: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
}

function TransactionRow({ t, onOpen }: { t: Transaction; onOpen: () => void }) {
  const hasCategory = !!t.category?.name
  const isIncome = t.type === 'INCOME'
  const isExpense = t.type === 'EXPENSE'
  const isTransfer = t.type === 'TRANSFER'
  const isRecurring = !!t.recurringTransactionId
  const installment = t.installment

  // Pick icon: category icon if present, else type-based fallback
  const Icon = hasCategory
    ? getCategoryIcon(t.category!.icon)
    : isIncome
      ? Banknote
      : isTransfer
        ? ArrowLeftRight
        : Receipt

  const color = hasCategory
    ? (t.category!.color || '#64748b')
    : isIncome
      ? INCOME_FALLBACK_COLOR
      : isTransfer
        ? TRANSFER_FALLBACK_COLOR
        : EXPENSE_FALLBACK_COLOR

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full text-left flex items-center justify-between gap-3 rounded-lg p-2 -mx-2 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      aria-label={`Ver detalhes de ${t.description}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ring-1 ring-inset ring-black/5 dark:ring-white/10"
          style={{ backgroundColor: `${color}1a` }}
        >
          <Icon className="h-[18px] w-[18px]" style={{ color }} strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          {/* Linha 1: descrição + indicators essenciais inline */}
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-[14px] font-medium truncate">{t.description}</p>
            {isRecurring && (
              <span
                className="inline-flex items-center justify-center h-4 w-4 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0"
                title="Lançamento recorrente"
                aria-label="Lançamento recorrente"
              >
                <Repeat className="h-2.5 w-2.5" strokeWidth={2.5} />
              </span>
            )}
          </div>
          {/* Linha 2: categoria · conta · método · parcela */}
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground flex-wrap">
            <span className="truncate">{t.category?.name || 'Sem categoria'}</span>
            <span className="text-muted-foreground/50">·</span>
            <span className="truncate">{t.account?.name}</span>
            {t.paymentMethod && t.paymentMethod !== 'DEBIT' && (
              <span
                className={cn(
                  'inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold',
                  METHOD_BADGE_STYLE[t.paymentMethod] || METHOD_BADGE_STYLE.DEBIT,
                )}
              >
                {PAYMENT_METHOD_LABELS[t.paymentMethod]}
              </span>
            )}
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
      </div>

      <p className={cn(
        'text-[14px] font-semibold tabular-nums shrink-0',
        isIncome ? 'text-income' : isExpense ? 'text-expense' : 'text-muted-foreground',
      )}>
        {isIncome ? '+' : isExpense ? '−' : ''}
        {formatCurrency(Number(t.amount))}
      </p>
    </button>
  )
}

interface Totals {
  income: number
  expense: number
  net: number
}

function TotalizerStrip({ totals }: { totals: Totals }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <Card>
        <CardContent className="p-3">
          <p className="text-[11px] text-muted-foreground font-medium">Receitas</p>
          <p className="text-base sm:text-lg font-semibold tabular-nums text-income mt-1">
            +{formatCurrency(totals.income)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <p className="text-[11px] text-muted-foreground font-medium">Despesas</p>
          <p className="text-base sm:text-lg font-semibold tabular-nums text-expense mt-1">
            −{formatCurrency(totals.expense)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <p className="text-[11px] text-muted-foreground font-medium">Saldo</p>
          <p className={cn(
            'text-base sm:text-lg font-semibold tabular-nums mt-1',
            totals.net >= 0 ? 'text-income' : 'text-expense',
          )}>
            {totals.net >= 0 ? '+' : '−'}{formatCurrency(Math.abs(totals.net))}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

const PAGE_SIZE = 20

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totals, setTotals] = useState<Totals>({ income: 0, expense: 0, net: 0 })
  const [totalCount, setTotalCount] = useState(0) // total no filtro atual (pra export label + confirm)
  const [loading, setLoading] = useState(true) // primeira carga ou troca de filtro
  const [loadingMore, setLoadingMore] = useState(false) // páginas seguintes (infinite scroll)
  const [error, setError] = useState(false) // primeira carga falhou — distingue de "lista vazia"
  const [filters, setFilters] = useState<TransactionFiltersValue>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  // Bumpa esse contador pra forçar re-fetch (botão "Tentar novamente")
  const [retryTick, setRetryTick] = useState(0)
  // Confirma export quando >1000 linhas (UX: evita clique acidental num CSV gigante)
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false)

  // Optimistic delete — IDs sumindo da UI durante a janela de Undo (8s).
  // Se Undo for clicado, removemos do set; se 8s passarem, dispara DELETE de fato.
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set())
  const undoneRef = useRef<Set<string>>(new Set())

  // Detail sheet — transação selecionada (PR2 do wave 2)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)

  // Sentinel pro IntersectionObserver carregar próxima página
  const sentinelRef = useRef<HTMLDivElement>(null)

  function buildSearchParams(pageNum: number): URLSearchParams {
    const params = new URLSearchParams({ page: String(pageNum), pageSize: String(PAGE_SIZE) })
    if (filters.search) params.set('search', filters.search)
    if (filters.type !== 'all') params.set('type', filters.type)
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)
    if (filters.accountIds.length > 0) params.set('accountIds', filters.accountIds.join(','))
    if (filters.categoryIds.length > 0) params.set('categoryIds', filters.categoryIds.join(','))
    if (filters.valueMin) params.set('valueMin', filters.valueMin)
    if (filters.valueMax) params.set('valueMax', filters.valueMax)
    if (filters.includeFuture) params.set('includeFuture', 'true')
    return params
  }

  // Reset + carrega página 1 quando filtro muda. Roda também na carga inicial.
  useEffect(() => {
    let cancelled = false
    setPage(1)
    setLoading(true)
    setError(false)
    const params = buildSearchParams(1)
    fetch(`/api/transactions?${params}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(result => {
        if (cancelled) return
        setTransactions(result.data)
        setTotals(result.totals || { income: 0, expense: 0, net: 0 })
        setHasMore(result.page < result.totalPages)
        setTotalCount(result.total ?? 0)
      })
      .catch(() => {
        if (cancelled) return
        setError(true)
        toast.error('Não conseguimos carregar suas transações. Verifique sua conexão e tente novamente.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, retryTick])

  // Carrega páginas seguintes (append). Disparado pelo IntersectionObserver.
  useEffect(() => {
    if (page === 1) return // página 1 é responsabilidade do effect acima
    let cancelled = false
    setLoadingMore(true)
    const params = buildSearchParams(page)
    fetch(`/api/transactions?${params}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(result => {
        if (cancelled) return
        setTransactions(prev => [...prev, ...result.data])
        setHasMore(result.page < result.totalPages)
      })
      .catch(() => {
        if (!cancelled) toast.error('Não rolou carregar mais. Tenta de novo.')
      })
      .finally(() => {
        if (!cancelled) setLoadingMore(false)
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  // IntersectionObserver no sentinel — carrega próxima página quando ele
  // chega 400px antes do viewport. Reseta a cada mudança nas deps.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || loading || loadingMore) return

    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setPage(p => p + 1)
    }, { rootMargin: '400px' })

    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [hasMore, loading, loadingMore])

  function handleFiltersChange(v: TransactionFiltersValue) {
    setFilters(v)
  }

  function clearAllFilters() {
    setFilters(EMPTY_FILTERS)
  }

  // Export CSV: dispara download direto. Se >1000 linhas, pede confirm primeiro.
  function triggerExport() {
    const params = buildSearchParams(1)
    params.delete('page')
    params.delete('pageSize')
    // Trigger download via navegação direta — o endpoint manda Content-Disposition
    window.location.href = `/api/transactions/export?${params}`
  }
  function handleExportClick() {
    if (totalCount === 0) {
      toast.error('Nenhuma transação pra exportar com esses filtros.')
      return
    }
    if (totalCount > 1000) {
      setExportConfirmOpen(true)
      return
    }
    triggerExport()
  }

  /**
   * Delete optimista com Undo (Aza Raskin pattern).
   * Esconde a transação imediatamente, mostra toast "Lançamento removido"
   * com botão "DESFAZER" (CAPS) por 8s. Se clicar Desfazer, restaura. Se
   * 8s passarem sem ação, manda DELETE de verdade.
   * — janela de 8s + CAPS é recomendação do design-squad/ux-designer pra
   * mass-market non-tech parsear o undo sem ansiedade.
   */
  function handleDelete(id: string) {
    // Marca como pendente — some da UI imediatamente
    setPendingDeleteIds((prev) => new Set(prev).add(id))
    undoneRef.current.delete(id)

    toast('Lançamento removido', {
      action: {
        label: 'DESFAZER',
        onClick: () => {
          undoneRef.current.add(id)
          setPendingDeleteIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        },
      },
      duration: 8000,
    })

    // Após 8s, commita o delete se não foi desfeito
    setTimeout(async () => {
      if (undoneRef.current.has(id)) {
        undoneRef.current.delete(id)
        return
      }
      try {
        const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
        if (res.ok) {
          // Remove de fato do array + ajusta totais localmente, sem perder
          // scroll position. A próxima troca de filtro re-busca tudo.
          const deleted = transactions.find((t) => t.id === id)
          setTransactions((prev) => prev.filter((t) => t.id !== id))
          setPendingDeleteIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
          if (deleted) {
            const amt = Number(deleted.amount)
            setTotals((prev) => {
              if (deleted.type === 'INCOME') {
                return { income: prev.income - amt, expense: prev.expense, net: prev.net - amt }
              }
              if (deleted.type === 'EXPENSE') {
                return { income: prev.income, expense: prev.expense - amt, net: prev.net + amt }
              }
              return prev
            })
          }
        } else {
          // Restaura visualmente em caso de falha
          setPendingDeleteIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
          toast.error('Não rolou. Voltei o lançamento.')
        }
      } catch {
        setPendingDeleteIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        toast.error('Não rolou. Voltei o lançamento.')
      }
    }, 8000)
  }

  // Lista visível: oculta os IDs em pendingDelete (durante a janela de Undo)
  const visibleTransactions = useMemo(
    () => transactions.filter((t) => !pendingDeleteIds.has(t.id)),
    [transactions, pendingDeleteIds],
  )

  // Agrupa visível por dia e calcula subtotal de cada grupo
  const groupedWithSubtotals = useMemo(() => {
    const groups = groupByDate(visibleTransactions as any)
    return groups.map((g) => {
      const groupItems = g.items as unknown as Transaction[]
      const dayIncome = groupItems
        .filter((t) => t.type === 'INCOME')
        .reduce((s, t) => s + Number(t.amount), 0)
      const dayExpense = groupItems
        .filter((t) => t.type === 'EXPENSE')
        .reduce((s, t) => s + Number(t.amount), 0)
      const net = dayIncome - dayExpense
      return { label: g.label, items: groupItems, count: groupItems.length, net }
    })
  }, [visibleTransactions])

  const hasFilters =
    !!filters.search ||
    filters.type !== 'all' ||
    filters.period !== 'all' ||
    filters.accountIds.length > 0 ||
    filters.categoryIds.length > 0 ||
    !!filters.valueMin ||
    !!filters.valueMax

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Transações</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportClick}
            disabled={loading || totalCount === 0}
            className="gap-2"
            title={totalCount === 0 ? 'Nada pra exportar' : `Exportar ${totalCount} ${totalCount === 1 ? 'transação' : 'transações'}`}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
          <Link href="/transactions/new">
            <Button className="gap-2 gradient-primary shadow-md shadow-primary/25 border-0">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova Transação</span>
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList className="grid w-full grid-cols-2 sm:w-[300px]">
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="recurring">Recorrentes</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <div className="space-y-5 pt-4">
            {/* Totalizer — receitas + despesas + saldo do filtro atual */}
            {!loading && (visibleTransactions.length > 0 || hasFilters) && <TotalizerStrip totals={totals} />}

            {/* Filtros (busca + tipo + filtros avançados em sheet + chips ativos) */}
            <TransactionFilters value={filters} onChange={handleFiltersChange} />

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : error ? (
              /* Error state — fetch falhou. Distingue de "lista vazia". */
              <Card>
                <CardContent className="flex flex-col items-center text-center py-10 px-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 mb-3">
                    <SearchX className="h-6 w-6 text-rose-500" strokeWidth={1.75} />
                  </div>
                  <p className="text-sm font-medium">Não rolou carregar suas transações</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Pode ser conexão ou a gente tá fora do ar. Tenta de novo.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRetryTick((n) => n + 1)}
                    className="mt-4 gap-1.5 text-xs"
                  >
                    Tentar novamente
                  </Button>
                </CardContent>
              </Card>
            ) : visibleTransactions.length === 0 ? (
              hasFilters ? (
                /* Empty state — filtro vazio (compacto, recovery) */
                <Card>
                  <CardContent className="flex flex-col items-center text-center py-10 px-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted mb-3">
                      <SearchX className="h-6 w-6 text-muted-foreground" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium">Nada por aqui com esses filtros</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Afrouxa um pouco que a gente acha.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="mt-3 text-xs"
                    >
                      Limpar filtros
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                /* Empty state — usuário novo (hero, 2 CTAs principais) */
                <Card>
                  <CardContent className="flex flex-col items-center text-center py-12 px-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-inset ring-primary/15 mb-4">
                      <ArrowLeftRight className="h-6 w-6 text-primary" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium">Tua vida financeira começa aqui</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      Cada lançamento vira clareza no fim do mês. Registra a primeira pra começar.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 mt-5 w-full sm:w-auto">
                      <Link href="/transactions/new" className="w-full sm:w-auto">
                        <Button className="gap-2 w-full gradient-primary shadow-md shadow-primary/25 border-0">
                          <Plus className="h-4 w-4" />
                          Lançar agora
                        </Button>
                      </Link>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-4">
                      Ou manda &ldquo;<span className="font-medium">almoço 32 no crédito</span>&rdquo; pelo WhatsApp e eu cuido.
                    </p>
                  </CardContent>
                </Card>
              )
            ) : (
              <div className="space-y-5">
                {groupedWithSubtotals.map((group) => (
                  <div key={group.label}>
                    {/* Header com subtotal do grupo */}
                    <div className="flex items-baseline justify-between mb-2 px-1">
                      <h3 className="text-xs font-semibold text-muted-foreground">
                        {group.label}
                      </h3>
                      <div className="flex items-center gap-3 text-[11px] tabular-nums text-muted-foreground">
                        <span className="hidden sm:inline">
                          {group.count} {group.count === 1 ? 'transação' : 'transações'}
                        </span>
                        <span className={cn(
                          'font-semibold',
                          group.net >= 0 ? 'text-income/80' : 'text-expense/80',
                        )}>
                          {group.net >= 0 ? '+' : '−'}{formatCurrency(Math.abs(group.net))}
                        </span>
                      </div>
                    </div>
                    <Card>
                      <CardContent className="p-2 divide-y divide-border/40">
                        {group.items.map((t) => (
                          <TransactionRow
                            key={t.id}
                            t={t}
                            onOpen={() => setSelectedTx(t)}
                          />
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                ))}

                {/* Skeleton rows enquanto carrega próxima página — mesma altura
                    das reais (h-16) pra não causar reflow */}
                {loadingMore && (
                  <Card>
                    <CardContent className="p-2 divide-y divide-border/40">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 py-2.5 px-2">
                          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-3.5 w-2/3" />
                            <Skeleton className="h-3 w-1/3" />
                          </div>
                          <Skeleton className="h-4 w-20 shrink-0" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Sentinel: IntersectionObserver ativa próxima página
                    quando ele entra a 400px do viewport */}
                {hasMore && !loadingMore && (
                  <div ref={sentinelRef} className="h-1" aria-hidden="true" />
                )}

                {/* Fim da lista — só mostra se já carregou pelo menos 1 página
                    e não há mais. Sutil, sem call-to-action. */}
                {!hasMore && transactions.length >= PAGE_SIZE && (
                  <p className="text-center text-[11px] text-muted-foreground/70 py-4">
                    Você chegou no fim
                  </p>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="recurring">
          <div className="pt-4">
            <RecurringTab />
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail sheet — abre ao tocar numa transação. Inclui Editar, Excluir,
          Ver fatura (se invoice-linked). PR2 do wave 2 transactions. */}
      <TransactionDetailSheet
        transaction={selectedTx}
        onOpenChange={(open) => { if (!open) setSelectedTx(null) }}
        onDelete={handleDelete}
      />

      {/* Confirm de export pra > 1000 linhas — guardrail anti-clique-acidental */}
      <AlertDialog open={exportConfirmOpen} onOpenChange={setExportConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Exportar {totalCount.toLocaleString('pt-BR')} transações como CSV?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vai gerar um arquivo grande. Confirma se é isso mesmo? Você pode
              estreitar com filtros (período, conta, categoria) e baixar bem
              menos linhas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setExportConfirmOpen(false)
                triggerExport()
              }}
            >
              Exportar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
