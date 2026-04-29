"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { RECURRENCE_LABELS } from '@/lib/constants'
import {
  Repeat, Pencil, Trash2, Pause, Play, Sparkles, Plus, Banknote, Receipt,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { getCategoryIcon } from '@/lib/category-icon'

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ACTIVE: {
    label: 'Ativa',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20',
  },
  PAUSED: {
    label: 'Pausada',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20',
  },
  CANCELLED: {
    label: 'Cancelada',
    className: 'bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-inset ring-red-500/20',
  },
  COMPLETED: {
    label: 'Concluída',
    className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/20',
  },
}

interface Recurring {
  id: string
  description: string
  amount: number | string
  type: 'INCOME' | 'EXPENSE'
  frequency: string
  status: string
  autoConfirm: boolean
  nextDueDate: string
  startDate?: string
  endDate?: string
  categoryId?: string
  accountId?: string
  category?: { id: string; name: string; icon?: string; color?: string }
  account?: { id: string; name: string }
}

export function RecurringTab() {
  const [items, setItems] = useState<Recurring[]>([])
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string; type: string }>>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Optimistic delete (mesmo padrão da página de transações)
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set())
  const undoneRef = useRef<Set<string>>(new Set())

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
        fetch('/api/recurring').then((r) => r.json()),
        fetch('/api/accounts').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
      ])
      setItems(recurringRes.data || [])
      setAccounts(accountsRes.data || [])
      setCategories(categoriesRes.data || [])
    } catch {
      toast.error('Não rolou carregar agora. Tenta de novo em instantes.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredCategories = categories.filter((c) => c.type === type)

  function openEdit(item: Recurring) {
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
        toast.success('Recorrência atualizada.')
        setDialogOpen(false)
        resetForm()
        fetchData()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Não rolou salvar agora.')
      }
    } catch {
      toast.error('Não rolou salvar agora.')
    }
  }

  // Delete otimista com Undo (mesmo padrão da página /transactions)
  function handleDelete(id: string) {
    setPendingDeleteIds((prev) => new Set(prev).add(id))
    undoneRef.current.delete(id)

    toast('Recorrência removida', {
      action: {
        label: 'Desfazer',
        onClick: () => {
          undoneRef.current.add(id)
          setPendingDeleteIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        },
      },
      duration: 5000,
    })

    setTimeout(async () => {
      if (undoneRef.current.has(id)) {
        undoneRef.current.delete(id)
        return
      }
      try {
        const res = await fetch(`/api/recurring/${id}`, { method: 'DELETE' })
        if (res.ok) {
          fetchData()
        } else {
          setPendingDeleteIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
          toast.error('Não rolou. Voltei a recorrência.')
        }
      } catch {
        setPendingDeleteIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        toast.error('Não rolou. Voltei a recorrência.')
      }
    }, 5000)
  }

  async function handleTogglePause(item: Recurring) {
    const newStatus = item.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    try {
      const res = await fetch(`/api/recurring/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        toast.success(newStatus === 'PAUSED' ? 'Recorrência pausada.' : 'Recorrência retomada.')
        fetchData()
      }
    } catch {
      toast.error('Não rolou agora.')
    }
  }

  const selectedAccountName = accounts.find((a) => a.id === accountId)?.name
  const selectedCategoryName = filteredCategories.find((c) => c.id === categoryId)?.name

  // Lista visível: oculta os pendentes durante a janela de Undo
  const visibleItems = items.filter((i) => !pendingDeleteIds.has(i.id))

  return (
    <>
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar recorrência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            {/* Type Tabs */}
            <Tabs
              value={type}
              onValueChange={(v) => {
                if (v) {
                  setType(v as 'EXPENSE' | 'INCOME')
                  setCategoryId('')
                }
              }}
            >
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

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Netflix, Aluguel, Salário..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select value={frequency} onValueChange={(v) => v && setFrequency(v)}>
                <SelectTrigger className="h-11 rounded-xl w-full">
                  <span className="flex flex-1 text-left">{RECURRENCE_LABELS[frequency]}</span>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RECURRENCE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Conta (opcional)</Label>
              <Select value={accountId} onValueChange={(v) => v && setAccountId(v)}>
                <SelectTrigger className="h-11 rounded-xl w-full">
                  <span className="flex flex-1 text-left truncate">
                    {selectedAccountName || <span className="text-muted-foreground">Selecione</span>}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categoria (opcional)</Label>
              <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
                <SelectTrigger className="h-11 rounded-xl w-full">
                  <span className="flex flex-1 text-left truncate">
                    {selectedCategoryName || <span className="text-muted-foreground">Selecione</span>}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data de início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

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
                    hasEndDate ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  {hasEndDate ? 'Com data definida' : 'Sem data'}
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

            <div className="flex items-center justify-between">
              <div>
                <Label className="block">Confirmar automaticamente</Label>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Lança sozinho sem perguntar.
                </p>
              </div>
              <Switch checked={autoConfirm} onCheckedChange={setAutoConfirm} />
            </div>

            <Button className="w-full gradient-primary shadow-md shadow-primary/25 border-0" onClick={handleSubmit}>
              Salvar alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        /* Empty state — alinhado com /transactions (icon-tile, voz Finn) */
        <Card>
          <CardContent className="flex flex-col items-center text-center py-12 px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 ring-1 ring-inset ring-violet-500/15 mb-4">
              <Repeat className="h-6 w-6 text-violet-500" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium">Nada repetido por aqui ainda</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Cadastra suas contas fixas (aluguel, internet, assinaturas) e receitas recorrentes
              que eu te aviso antes de cada vencimento.
            </p>
            <Link href="/transactions/new" className="mt-5">
              <Button className="gap-2 gradient-primary shadow-md shadow-primary/25 border-0">
                <Plus className="h-4 w-4" />
                Nova recorrência
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleItems.map((item) => {
            const isIncome = item.type === 'INCOME'
            const hasCategory = !!item.category?.name
            const Icon = hasCategory
              ? getCategoryIcon(item.category!.icon)
              : isIncome
                ? Banknote
                : Receipt
            const color = hasCategory
              ? item.category!.color || '#64748b'
              : isIncome
                ? '#22c55e'
                : '#64748b'
            const statusBadge = STATUS_BADGE[item.status] || STATUS_BADGE.ACTIVE

            return (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  {/* Linha principal: icon-tile + info + valor */}
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ring-1 ring-inset ring-black/5 dark:ring-white/10"
                      style={{ backgroundColor: `${color}1a` }}
                    >
                      <Icon className="h-[18px] w-[18px]" style={{ color }} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium truncate">{item.description}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {item.category?.name || 'Sem categoria'}
                        {item.account?.name && (
                          <>
                            <span className="mx-1.5 text-muted-foreground/50">·</span>
                            <span>{item.account.name}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <p
                      className={cn(
                        'text-[14px] font-semibold tabular-nums shrink-0',
                        isIncome ? 'text-income' : 'text-expense',
                      )}
                    >
                      {isIncome ? '+' : '−'}
                      {formatCurrency(Number(item.amount))}
                    </p>
                  </div>

                  {/* Badges row: frequência + status (clicável) + lança sozinho */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/15">
                      {RECURRENCE_LABELS[item.frequency] || item.frequency}
                    </span>
                    {/* Status — clicável quando ACTIVE/PAUSED pra alternar */}
                    {(item.status === 'ACTIVE' || item.status === 'PAUSED') ? (
                      <button
                        type="button"
                        onClick={() => handleTogglePause(item)}
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors hover:opacity-80 cursor-pointer',
                          statusBadge.className,
                        )}
                        title={item.status === 'ACTIVE' ? 'Toca pra pausar' : 'Toca pra reativar'}
                      >
                        {statusBadge.label}
                      </button>
                    ) : (
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold', statusBadge.className)}>
                        {statusBadge.label}
                      </span>
                    )}
                    {item.autoConfirm && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-1 ring-inset ring-violet-500/20"
                        title="Lança sozinho todo período sem te perguntar antes."
                      >
                        <Sparkles className="h-2.5 w-2.5" strokeWidth={2.5} />
                        Lança sozinho
                      </span>
                    )}
                  </div>

                  {/* Rodapé: próxima data + ações */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    <span className="text-[11px] text-muted-foreground">
                      Próxima: <span className="font-medium text-foreground tabular-nums">{formatDate(item.nextDueDate)}</span>
                    </span>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(item)}
                        aria-label="Editar recorrência"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleTogglePause(item)}
                        aria-label={item.status === 'ACTIVE' ? 'Pausar recorrência' : 'Retomar recorrência'}
                      >
                        {item.status === 'ACTIVE' ? (
                          <Pause className="h-3.5 w-3.5" strokeWidth={1.75} />
                        ) : (
                          <Play className="h-3.5 w-3.5" strokeWidth={1.75} />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(item.id)}
                        aria-label="Excluir recorrência"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </Button>
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
