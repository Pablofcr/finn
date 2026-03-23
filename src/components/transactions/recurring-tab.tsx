"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { RECURRENCE_LABELS } from '@/lib/constants'
import { Repeat, Pencil, Trash2, Pause, Play, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'Ativo', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  PAUSED: { label: 'Pausado', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  CANCELLED: { label: 'Cancelado', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
  COMPLETED: { label: 'Concluído', className: 'bg-muted text-muted-foreground border-border' },
}

export function RecurringTab() {
  const [items, setItems] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState('MONTHLY')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [hasEndDate, setHasEndDate] = useState(false)
  const [autoConfirm, setAutoConfirm] = useState(false)

  const resetForm = useCallback(() => {
    setType('EXPENSE')
    setDescription('')
    setAmount('')
    setFrequency('MONTHLY')
    setCategoryId('')
    setAccountId('')
    setStartDate('')
    setEndDate('')
    setHasEndDate(false)
    setAutoConfirm(false)
    setEditingId(null)
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [recurringRes, accountsRes, categoriesRes] = await Promise.all([
        fetch('/api/recurring').then(r => r.json()),
        fetch('/api/accounts').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()),
      ])
      setItems(recurringRes.data || [])
      setAccounts(accountsRes.data || [])
      setCategories(categoriesRes.data || [])
    } catch {
      toast.error('Erro ao carregar dados')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredCategories = categories.filter((c: any) => c.type === type)

  function openEdit(item: any) {
    setEditingId(item.id)
    setType(item.type)
    setDescription(item.description)
    setAmount(String(Number(item.amount)))
    setFrequency(item.frequency)
    setCategoryId(item.categoryId || '')
    setAccountId(item.accountId || '')
    setStartDate(item.startDate ? item.startDate.slice(0, 10) : '')
    setHasEndDate(!!item.endDate)
    setEndDate(item.endDate ? item.endDate.slice(0, 10) : '')
    setAutoConfirm(item.autoConfirm)
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!description || !amount || !startDate) return
    const payload = {
      description,
      amount: parseFloat(amount),
      type,
      frequency,
      categoryId: categoryId || undefined,
      accountId: accountId || undefined,
      startDate,
      endDate: hasEndDate && endDate ? endDate : undefined,
      autoConfirm,
    }

    try {
      const res = await fetch(`/api/recurring/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success('Recorrência atualizada!')
        setDialogOpen(false)
        resetForm()
        fetchData()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erro ao salvar')
      }
    } catch {
      toast.error('Erro ao salvar recorrência')
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/recurring/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Recorrência excluída!')
        fetchData()
      }
    } catch {
      toast.error('Erro ao excluir')
    }
  }

  async function handleTogglePause(item: any) {
    const newStatus = item.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    try {
      const res = await fetch(`/api/recurring/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        toast.success(newStatus === 'PAUSED' ? 'Recorrência pausada' : 'Recorrência retomada')
        fetchData()
      }
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  const selectedAccountName = accounts.find(a => a.id === accountId)?.name
  const selectedCategoryName = filteredCategories.find((c: any) => c.id === categoryId)?.name

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Recorrência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            {/* Type Tabs */}
            <Tabs value={type} onValueChange={(v) => {
              if (v) {
                setType(v as 'EXPENSE' | 'INCOME')
                setCategoryId('')
              }
            }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="EXPENSE"
                  className={cn(type === 'EXPENSE' && 'data-[state=active]:bg-expense/10 data-[state=active]:text-expense')}
                >
                  Despesa
                </TabsTrigger>
                <TabsTrigger
                  value="INCOME"
                  className={cn(type === 'INCOME' && 'data-[state=active]:bg-income/10 data-[state=active]:text-income')}
                >
                  Receita
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Amount */}
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Netflix, Aluguel, Salário..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select value={frequency} onValueChange={(v) => v && setFrequency(v)}>
                <SelectTrigger className="h-11 rounded-xl w-full">
                  <span className="flex flex-1 text-left">{RECURRENCE_LABELS[frequency]}</span>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RECURRENCE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Account */}
            <div className="space-y-2">
              <Label>Conta (opcional)</Label>
              <Select value={accountId} onValueChange={(v) => v && setAccountId(v)}>
                <SelectTrigger className="h-11 rounded-xl w-full">
                  <span className="flex flex-1 text-left truncate">
                    {selectedAccountName || <span className="text-muted-foreground">Selecione</span>}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Categoria (opcional)</Label>
              <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
                <SelectTrigger className="h-11 rounded-xl w-full">
                  <span className="flex flex-1 text-left truncate">
                    {selectedCategoryName || <span className="text-muted-foreground">Selecione</span>}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label>Data de início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            {/* End Date toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Data de término</Label>
                <button
                  type="button"
                  onClick={() => {
                    setHasEndDate(!hasEndDate)
                    if (hasEndDate) setEndDate('')
                  }}
                  className={cn(
                    'text-xs font-medium px-2.5 py-1 rounded-lg transition-colors',
                    hasEndDate
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {hasEndDate ? 'Com data definida' : 'Indefinido'}
                </button>
              </div>
              {hasEndDate && (
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-11 rounded-xl"
                />
              )}
            </div>

            {/* Auto Confirm */}
            <div className="flex items-center justify-between">
              <Label>Confirmar automaticamente</Label>
              <Switch checked={autoConfirm} onCheckedChange={setAutoConfirm} />
            </div>

            {/* Submit */}
            <Button
              className="w-full gradient-primary shadow-md shadow-primary/25 border-0"
              onClick={handleSubmit}
            >
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Repeat className="h-12 w-12" />}
          title="Nenhuma recorrência cadastrada"
          description="Cadastre assinaturas, contas fixas e receitas recorrentes para acompanhar automaticamente."
          action={
            <Link href="/transactions/new">
              <Button>Nova Transação Recorrente</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item: any) => {
            const isIncome = item.type === 'INCOME'
            const barColor = isIncome ? '#22c55e' : '#ef4444'
            const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.ACTIVE
            const categoryIcon = item.category?.icon
            const categoryColor = item.category?.color || '#6366f1'

            return (
              <Card key={item.id} className="overflow-hidden">
                {/* Color bar */}
                <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${barColor}, ${barColor}88)` }} />

                <CardContent className="pt-4 space-y-3">
                  {/* Header row: icon + description + amount */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {categoryIcon ? (
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `${categoryColor}15`, color: categoryColor }}
                        >
                          <span className="text-lg">{categoryIcon}</span>
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                          <Repeat className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.description}</p>
                        <p className="text-xs text-muted-foreground">{item.category?.name || 'Sem categoria'}</p>
                      </div>
                    </div>
                    <span className={cn('text-base font-semibold whitespace-nowrap', isIncome ? 'text-income' : 'text-expense')}>
                      {isIncome ? '+' : '-'}{formatCurrency(Number(item.amount))}
                    </span>
                  </div>

                  {/* Badges row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {RECURRENCE_LABELS[item.frequency] || item.frequency}
                    </Badge>
                    <Badge variant="outline" className={cn('text-xs', statusCfg.className)}>
                      {statusCfg.label}
                    </Badge>
                    {item.autoConfirm && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>

                  {/* Next due date + actions */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Próxima: {formatDate(item.nextDueDate)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleTogglePause(item)}
                      >
                        {item.status === 'ACTIVE' ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir recorrência?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Essa ação não pode ser desfeita. A recorrência &quot;{item.description}&quot; será removida permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDelete(item.id)}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
