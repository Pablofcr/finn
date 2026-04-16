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
import { Plus, PieChart } from 'lucide-react'
import { toast } from 'sonner'

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

  async function handleCreate() {
    if (!categoryId || !amount) return
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          amount: parseFloat(amount),
          period,
          alertAt: 80,
        }),
      })
      if (res.ok) {
        toast.success('Orçamento criado! Acompanhe seus gastos por aqui.')
        setDialogOpen(false)
        setCategoryId('')
        setAmount('')
        fetchData()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Não foi possível criar o orçamento. Verifique os dados e tente novamente.')
      }
    } catch {
      toast.error('Não foi possível criar o orçamento. Tente novamente em instantes.')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orçamentos</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button className="gap-2 gradient-primary shadow-md shadow-primary/25 border-0" />}>
              <Plus className="h-4 w-4" />
              Novo Orçamento
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Orçamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Selecione" />
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
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BUDGET_PERIOD_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full gradient-primary shadow-md shadow-primary/25 border-0" onClick={handleCreate}>Criar Orçamento</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={<PieChart className="h-12 w-12" />}
          title="Comece a controlar seus gastos"
          description="Crie seu primeiro orçamento e acompanhe para onde seu dinheiro está indo."
          action={<Button onClick={() => setDialogOpen(true)}>Novo Orçamento</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {budgets.map((b: any) => {
            const spent = Number(b.spent || 0)
            const percentage = Number(b.amount) > 0 ? Math.round((spent / Number(b.amount)) * 100) : 0
            const pct = Math.min(percentage, 100)
            return (
              <Card key={b.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{b.category?.name}</CardTitle>
                    <span className="text-xs text-muted-foreground">{BUDGET_PERIOD_LABELS[b.period]}</span>
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
