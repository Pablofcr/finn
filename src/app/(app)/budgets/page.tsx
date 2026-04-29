"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCurrency, cn } from '@/lib/utils'
import { BUDGET_PERIOD_LABELS } from '@/lib/constants'
import { Plus, PieChart, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getCategoryIcon } from '@/lib/category-icon'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const FALLBACK_CATEGORY_COLOR = '#64748b'

type Severity = 'healthy' | 'warning' | 'overrun'

function severityFor(percentage: number): Severity {
  if (percentage > 100) return 'overrun'
  if (percentage >= 80) return 'warning'
  return 'healthy'
}

function severityScore(s: Severity): number {
  return s === 'overrun' ? 0 : s === 'warning' ? 1 : 2
}

function severityLabel(s: Severity): string {
  return s === 'overrun' ? 'Estourado' : s === 'warning' ? 'Atenção' : 'Saudável'
}

function severityChipClass(s: Severity): string {
  if (s === 'overrun') return 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
  if (s === 'warning') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
  return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
}

function severityBarColor(s: Severity): string {
  if (s === 'overrun') return '#e11d48'
  if (s === 'warning') return '#f59e0b'
  return '#10b981'
}

// Dias restantes até o fim do período (mensal/semanal/anual)
function daysRemainingFor(period: string): number {
  const now = new Date()
  let end: Date
  if (period === 'WEEKLY') {
    const day = now.getDay()
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - day), 23, 59, 59)
  } else if (period === 'YEARLY') {
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
  } else {
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  }
  const diff = (end.getTime() - now.getTime()) / 86_400_000
  return Math.max(Math.ceil(diff), 0)
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [period, setPeriod] = useState('MONTHLY')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [budgetRes, catRes] = await Promise.all([
        fetch('/api/budgets').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()),
      ])
      setBudgets(budgetRes.data || [])
      setCategories((catRes.data || []).filter((c: any) => c.type === 'EXPENSE'))
    } catch {
      toast.error('Não conseguimos carregar seus orçamentos. Tente novamente em instantes.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function openNew() {
    setEditingId(null)
    setCategoryId('')
    setAmount('')
    setPeriod('MONTHLY')
    setDialogOpen(true)
  }

  function openEdit(b: any) {
    setEditingId(b.id)
    setCategoryId(b.categoryId)
    setAmount(String(b.amount))
    setPeriod(b.period)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!categoryId || !amount) return
    try {
      const url = editingId ? `/api/budgets/${editingId}` : '/api/budgets'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          amount: parseFloat(amount),
          period,
          alertAt: 80,
        }),
      })
      if (res.ok) {
        toast.success(editingId ? 'Orçamento atualizado.' : 'Orçamento criado! Acompanhe seus gastos por aqui.')
        setDialogOpen(false)
        setEditingId(null)
        setCategoryId('')
        setAmount('')
        fetchData()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Não foi possível salvar o orçamento. Verifique os dados e tente novamente.')
      }
    } catch {
      toast.error('Não foi possível salvar o orçamento. Tente novamente em instantes.')
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/budgets/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Orçamento excluído.')
        fetchData()
      } else {
        toast.error('Não foi possível excluir o orçamento.')
      }
    } catch {
      toast.error('Não foi possível excluir o orçamento.')
    }
  }

  const selectedCategoryName = categories.find((c) => c.id === categoryId)?.name

  // ── KPIs e ordenação ──────────────────────────────────────────────────
  // Estamos em um único período visualmente. Se houver mistura (mensal +
  // semanal), o KPI strip continua somando (mostramos a granularidade no
  // chip do card).
  const { kpis, sortedBudgets } = useMemo(() => {
    let totalLimit = 0
    let totalSpent = 0
    for (const b of budgets) {
      totalLimit += Number(b.amount)
      totalSpent += Number(b.spent || 0)
    }
    const available = totalLimit - totalSpent
    const totalPct = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0

    const sortedBudgets = [...budgets].sort((a, b) => {
      const aPct = Number(a.amount) > 0 ? (Number(a.spent || 0) / Number(a.amount)) * 100 : 0
      const bPct = Number(b.amount) > 0 ? (Number(b.spent || 0) / Number(b.amount)) * 100 : 0
      const aSev = severityFor(aPct)
      const bSev = severityFor(bPct)
      if (aSev !== bSev) return severityScore(aSev) - severityScore(bSev)
      // dentro do mesmo bucket, maior % primeiro
      return bPct - aPct
    })

    return {
      kpis: { totalLimit, totalSpent, available, totalPct },
      sortedBudgets,
    }
  }, [budgets])

  const allMonthly = budgets.length > 0 && budgets.every((b: any) => b.period === 'MONTHLY')
  const monthlyDaysRemaining = daysRemainingFor('MONTHLY')

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orçamentos</h1>
          {budgets.length > 0 && allMonthly && (
            <p className="text-sm text-muted-foreground">
              Mês atual · faltam {monthlyDaysRemaining} {monthlyDaysRemaining === 1 ? 'dia' : 'dias'}
            </p>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingId(null) }}>
          <DialogTrigger render={<Button className="gap-2 gradient-primary shadow-md shadow-primary/25 border-0" onClick={openNew} />}>
              <Plus className="h-4 w-4" />
              Novo Orçamento
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Orçamento' : 'Novo Orçamento'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Selecione">
                      {selectedCategoryName || <span className="text-muted-foreground">Selecione</span>}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Limite (R$)</Label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={period} onValueChange={(v) => v && setPeriod(v)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Selecione">{BUDGET_PERIOD_LABELS[period] || period}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BUDGET_PERIOD_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full gradient-primary shadow-md shadow-primary/25 border-0" onClick={handleSave}>
                {editingId ? 'Salvar Alterações' : 'Criar Orçamento'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </>
      ) : budgets.length === 0 ? (
        <div className="space-y-6">
          {/* Explicação didática */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 shrink-0">
                  <PieChart className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-base mb-2">O que são orçamentos?</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    Orçamentos são <strong>limites de gastos</strong> que você define por categoria.
                    O Finn acompanha quanto você já gastou e avisa quando estiver chegando perto do limite — para que você nunca ultrapasse sem perceber.
                  </p>
                  <div className="bg-background/80 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Exemplo prático:</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">🍔 Alimentação</span>
                        <span className="text-muted-foreground">R$ 420 de R$ 600</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full progress-gradient-warning" style={{ width: '70%' }} />
                      </div>
                      <p className="text-xs text-amber-600 dark:text-amber-400">⚠️ Você já usou 70% do seu limite — restam R$ 180 para o mês.</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">🚗 Transporte</span>
                        <span className="text-muted-foreground">R$ 150 de R$ 400</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full progress-gradient-success" style={{ width: '37%' }} />
                      </div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">✅ Tudo sob controle — você usou apenas 37%.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <EmptyState
            icon={<PieChart className="h-12 w-12" />}
            title="Defina seu primeiro limite de gastos"
            description="Escolha uma categoria (ex: Alimentação), defina um valor máximo por mês e o Finn cuida do resto. Simples assim."
            action={<Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Criar meu primeiro orçamento</Button>}
          />
        </div>
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Card>
              <CardContent className="p-3">
                <p className="text-[11px] text-muted-foreground font-medium" title="Soma dos limites de todos os orçamentos">
                  Orçado
                </p>
                <p className="text-base sm:text-lg font-semibold tabular-nums mt-1">
                  {formatCurrency(kpis.totalLimit)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[11px] text-muted-foreground font-medium" title="Soma dos gastos no período de cada orçamento">
                  Gasto
                </p>
                <p className={cn(
                  'text-base sm:text-lg font-semibold tabular-nums mt-1',
                  kpis.totalPct > 100 ? 'text-rose-600 dark:text-rose-400'
                    : kpis.totalPct >= 80 ? 'text-amber-600 dark:text-amber-400'
                    : 'text-foreground',
                )}>
                  {formatCurrency(kpis.totalSpent)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[11px] text-muted-foreground font-medium" title="Orçado − Gasto. Se negativo, você estourou o total.">
                  Disponível
                </p>
                <p className={cn(
                  'text-base sm:text-lg font-semibold tabular-nums mt-1',
                  kpis.available < 0 ? 'text-rose-600 dark:text-rose-400'
                    : kpis.available > 0 ? 'text-income'
                    : 'text-muted-foreground',
                )}>
                  {kpis.available < 0 ? '−' : ''}{formatCurrency(Math.abs(kpis.available))}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Lista de cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {sortedBudgets.map((b: any) => {
              const limit = Number(b.amount)
              const spent = Number(b.spent || 0)
              const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0
              const pct = Math.min(percentage, 100)
              const sev = severityFor(percentage)

              const remaining = limit - spent
              const days = daysRemainingFor(b.period)
              const dailyAllowance = remaining > 0 && days > 0 ? remaining / days : 0
              const showDailyHint = (sev === 'warning' || sev === 'overrun') && days > 0

              const cat = b.category
              const Icon = getCategoryIcon(cat?.icon)
              const color = cat?.color || FALLBACK_CATEGORY_COLOR

              return (
                <Card key={b.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ring-1 ring-inset ring-black/5 dark:ring-white/10"
                          style={{ backgroundColor: `${color}1a` }}
                        >
                          <Icon className="h-[18px] w-[18px]" style={{ color }} strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">{cat?.name || 'Categoria'}</CardTitle>
                          <p className="text-xs text-muted-foreground truncate">
                            {BUDGET_PERIOD_LABELS[b.period]}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(b)}
                          aria-label="Editar orçamento"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Excluir orçamento" />}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir orçamento de &ldquo;{cat?.name}&rdquo;?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Suas transações continuam preservadas — só o limite de gastos será removido.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(b.id)}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-baseline justify-between text-sm flex-wrap gap-2">
                      <div className="flex items-baseline gap-1.5 tabular-nums">
                        <span className="font-semibold">{formatCurrency(spent)}</span>
                        <span className="text-muted-foreground text-xs">de {formatCurrency(limit)}</span>
                      </div>
                      <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-md', severityChipClass(sev))}>
                        {severityLabel(sev)} · {percentage}%
                      </span>
                    </div>
                    <div
                      className="h-2.5 w-full rounded-full bg-muted overflow-hidden"
                      role="progressbar"
                      aria-valuenow={percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: severityBarColor(sev) }}
                      />
                    </div>
                    {showDailyHint && (
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {sev === 'overrun'
                          ? `Estourou em ${formatCurrency(spent - limit)} · faltam ${days} ${days === 1 ? 'dia' : 'dias'}`
                          : `Sobram ${formatCurrency(remaining)} para ${days} ${days === 1 ? 'dia' : 'dias'} · ${formatCurrency(dailyAllowance)}/dia`
                        }
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
