"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { BUDGET_PERIOD_LABELS } from '@/lib/constants'
import { Plus, PieChart, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orçamentos</h1>
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
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
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
        <div className="grid gap-4 sm:grid-cols-2">
          {budgets.map((b: any) => {
            const spent = Number(b.spent || 0)
            const percentage = Number(b.amount) > 0 ? Math.round((spent / Number(b.amount)) * 100) : 0
            const pct = Math.min(percentage, 100)
            return (
              <Card key={b.id} className="group">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{b.category?.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{BUDGET_PERIOD_LABELS[b.period]}</span>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(b)}
                          aria-label="Editar orçamento"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" aria-label="Excluir orçamento" />}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir orçamento de &ldquo;{b.category?.name}&rdquo;?</AlertDialogTitle>
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
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{formatCurrency(spent)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{formatCurrency(Number(b.amount))}</span>
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', getBadgeStyle(percentage))}>
                        {percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', getProgressColor(percentage))}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
