"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { formatCurrency, groupByDate, cn } from '@/lib/utils'
import { Plus, SearchX, Trash2, Pencil, ArrowLeftRight, Banknote, Receipt } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { RecurringTab } from '@/components/transactions/recurring-tab'
import {
  TransactionFilters,
  EMPTY_FILTERS,
  type TransactionFiltersValue,
} from '@/components/transactions/transaction-filters'
import { getCategoryIcon } from '@/lib/category-icon'

const INCOME_FALLBACK_COLOR = '#22c55e'
const EXPENSE_FALLBACK_COLOR = '#64748b'
const TRANSFER_FALLBACK_COLOR = '#3b82f6'

interface Transaction {
  id: string
  description: string
  amount: number | string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  date: string
  category?: { id: string; name: string; icon?: string; color?: string }
  account?: { id: string; name: string; type?: string; color?: string }
}

function TransactionRow({ t, onDelete }: { t: Transaction; onDelete: () => void }) {
  const hasCategory = !!t.category?.name
  const isIncome = t.type === 'INCOME'
  const isExpense = t.type === 'EXPENSE'
  const isTransfer = t.type === 'TRANSFER'

  // Pick icon: category icon if present, else type-based fallback (mesma lógica do RecentTransactions do dashboard)
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
    <div className="group flex items-center justify-between gap-3 rounded-lg p-2 -mx-2 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ring-1 ring-inset ring-black/5 dark:ring-white/10"
          style={{ backgroundColor: `${color}1a` }}
        >
          <Icon className="h-[18px] w-[18px]" style={{ color }} strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium truncate">{t.description}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            <span>{t.category?.name || 'Sem categoria'}</span>
            <span className="mx-1.5 text-muted-foreground/50">·</span>
            <span>{t.account?.name}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <p className={cn(
          'text-[14px] font-semibold tabular-nums',
          isIncome ? 'text-income' : isExpense ? 'text-expense' : 'text-muted-foreground',
        )}>
          {isIncome ? '+' : isExpense ? '−' : ''}
          {formatCurrency(Number(t.amount))}
        </p>

        <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
          <Link href={`/transactions/new?edit=${t.id}`}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Editar lançamento"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger render={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                aria-label="Excluir lançamento"
              />
            }>
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir esse lançamento?</AlertDialogTitle>
                <AlertDialogDescription>
                  Some daqui e dos relatórios. Não dá pra desfazer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Manter</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
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

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totals, setTotals] = useState<Totals>({ income: 0, expense: 0, net: 0 })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<TransactionFiltersValue>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: '20' })
    if (filters.search) params.set('search', filters.search)
    if (filters.type !== 'all') params.set('type', filters.type)
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)
    if (filters.accountIds.length > 0) params.set('accountIds', filters.accountIds.join(','))
    if (filters.categoryIds.length > 0) params.set('categoryIds', filters.categoryIds.join(','))
    if (filters.valueMin) params.set('valueMin', filters.valueMin)
    if (filters.valueMax) params.set('valueMax', filters.valueMax)

    try {
      const res = await fetch(`/api/transactions?${params}`)
      if (res.ok) {
        const result = await res.json()
        setTransactions(result.data)
        setTotalPages(result.totalPages)
        setTotals(result.totals || { income: 0, expense: 0, net: 0 })
      }
    } catch {
      toast.error('Não conseguimos carregar suas transações. Verifique sua conexão e tente novamente.')
    }
    setLoading(false)
  }, [page, filters])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // Reset pra página 1 sempre que mudam os filtros
  function handleFiltersChange(v: TransactionFiltersValue) {
    setFilters(v)
    setPage(1)
  }

  function clearAllFilters() {
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Pronto, lançamento removido.')
        fetchTransactions()
      } else {
        toast.error('Não rolou agora. Tenta de novo em instantes.')
      }
    } catch {
      toast.error('Não rolou agora. Tenta de novo em instantes.')
    }
  }

  // Agrupa por dia e calcula subtotal de cada grupo
  const groupedWithSubtotals = useMemo(() => {
    const groups = groupByDate(transactions as any)
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
  }, [transactions])

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transações</h1>
        <Link href="/transactions/new">
          <Button className="gap-2 gradient-primary shadow-md shadow-primary/25 border-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova Transação</span>
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList className="grid w-full grid-cols-2 sm:w-[300px]">
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="recurring">Recorrentes</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <div className="space-y-5 pt-4">
            {/* Totalizer — receitas + despesas + saldo do filtro atual */}
            {!loading && (transactions.length > 0 || hasFilters) && <TotalizerStrip totals={totals} />}

            {/* Filtros (busca + tipo + filtros avançados em sheet + chips ativos) */}
            <TransactionFilters value={filters} onChange={handleFiltersChange} />

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
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
                            onDelete={() => handleDelete(t.id)}
                          />
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                ))}

                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Anterior
                    </Button>
                    <span className="flex items-center text-sm text-muted-foreground">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
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
    </div>
  )
}
