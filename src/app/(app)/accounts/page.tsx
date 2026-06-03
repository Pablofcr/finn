"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { accountSchema, type AccountInput } from '@/lib/validations/account'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCurrency, cn } from '@/lib/utils'
import { ACCOUNT_TYPE_LABELS, COLORS } from '@/lib/constants'
import { Plus, Wallet, Trash2, Pencil, Star, FileText, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { BankIcon } from '@/components/bank-icon'
import { BankPicker } from '@/components/bank-picker'
import { detectBankFromName } from '@/lib/bank-info'
import { defaultsForAccountType, type AccountTypeKey } from '@/lib/account-presets'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [openInvoices, setOpenInvoices] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  // Two-step flow: false = picker (after type chosen), true = full form
  const [pickerSkipped, setPickerSkipped] = useState(false)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<AccountInput>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      color: '#6366f1',
      icon: 'wallet',
      balance: 0,
    },
  })

  const accountType = watch('type')

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const [accRes, invRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/invoices?status=OPEN'),
      ])
      if (accRes.ok) {
        const result = await accRes.json()
        setAccounts(result.data || [])
      }
      if (invRes.ok) {
        const invData = await invRes.json()
        const map: Record<string, any> = {}
        for (const inv of invData.data || []) {
          // Keep the nearest-due open invoice per card
          const existing = map[inv.cardId]
          if (!existing || new Date(inv.dueDate) < new Date(existing.dueDate)) {
            map[inv.cardId] = inv
          }
        }
        setOpenInvoices(map)
      }
    } catch {
      toast.error('Não conseguimos carregar suas contas. Tente novamente em instantes.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  function openEdit(account: any) {
    setEditingId(account.id)
    reset({
      name: account.name,
      type: account.type,
      balance: Number(account.balance),
      color: account.color,
      icon: account.icon,
      isDefault: !!account.isDefault,
      creditLimit: account.creditLimit ? Number(account.creditLimit) : undefined,
      closingDay: account.closingDay || undefined,
      dueDay: account.dueDay || undefined,
      linkedAccountId: account.linkedAccountId || null,
    })
    setPickerSkipped(true) // editing existing → no picker, go straight to form
    setDialogOpen(true)
  }

  function openNew() {
    setEditingId(null)
    reset({ color: '#6366f1', icon: 'wallet', balance: 0, isDefault: false })
    setPickerSkipped(false)
    setDialogOpen(true)
  }

  function handlePickBrand(brandName: string) {
    const bank = detectBankFromName(brandName)
    const type = watch('type') as AccountTypeKey
    const defaults = defaultsForAccountType(type)
    setValue('name', brandName)
    if (bank) setValue('color', bank.bgColor)
    if (defaults.closingDay) setValue('closingDay', defaults.closingDay)
    if (defaults.dueDay) setValue('dueDay', defaults.dueDay)
    setPickerSkipped(true)
  }

  async function setAsDefault(id: string) {
    try {
      const account = accounts.find(a => a.id === id)
      if (!account) return
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: account.name,
          type: account.type,
          balance: Number(account.balance),
          color: account.color,
          icon: account.icon,
          isDefault: true,
          creditLimit: account.creditLimit ? Number(account.creditLimit) : undefined,
          closingDay: account.closingDay || undefined,
          dueDay: account.dueDay || undefined,
          linkedAccountId: account.linkedAccountId || null,
        }),
      })
      if (res.ok) {
        toast.success(`${account.name} agora é sua conta principal.`)
        fetchAccounts()
      }
    } catch {
      toast.error('Não foi possível definir a conta principal.')
    }
  }

  async function onSubmit(data: AccountInput) {
    try {
      const url = editingId ? `/api/accounts/${editingId}` : '/api/accounts'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        toast.success(editingId ? 'Conta atualizada! Suas alterações já estão valendo.' : 'Conta criada! Agora você pode registrar transações nela.')
        setDialogOpen(false)
        fetchAccounts()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Não foi possível salvar a conta. Verifique os dados e tente novamente.')
      }
    } catch {
      toast.error('Não foi possível salvar a conta. Tente novamente em instantes.')
    }
  }

  async function handleReactivate(id: string) {
    try {
      const account = accounts.find(a => a.id === id)
      if (!account) return
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: account.name,
          type: account.type,
          balance: Number(account.balance),
          color: account.color,
          icon: account.icon,
          isDefault: !!account.isDefault,
          creditLimit: account.creditLimit ? Number(account.creditLimit) : undefined,
          closingDay: account.closingDay || undefined,
          dueDay: account.dueDay || undefined,
          linkedAccountId: account.linkedAccountId || null,
          isActive: true,
        }),
      })
      if (res.ok) {
        toast.success(`${account.name} reativada.`)
        fetchAccounts()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Não foi possível reativar a conta.')
      }
    } catch {
      toast.error('Não foi possível reativar a conta. Tente novamente.')
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Conta excluída e saldos atualizados.')
        fetchAccounts()
      }
    } catch {
      toast.error('Não foi possível excluir a conta. Tente novamente em instantes.')
    }
  }

  // ── KPIs (excluem contas inativas e somam ativos vs passivos separadamente) ──
  const kpis = useMemo(() => {
    const active = accounts.filter((a) => a.isActive !== false)
    const nonCardActive = active.filter((a) => a.type !== 'CREDIT_CARD')
    const cardsActive = active.filter((a) => a.type === 'CREDIT_CARD')

    const inAccounts = nonCardActive.reduce((sum, a) => sum + Math.max(Number(a.balance), 0), 0)

    // Soma de fatura em aberto por cartão (a mais próxima do vencimento)
    let openInvoicesTotal = 0
    let openInvoicesCount = 0
    for (const inv of Object.values(openInvoices)) {
      openInvoicesTotal += Number(inv.total)
      openInvoicesCount++
    }

    // Disponível em cartões: soma de (limite − fatura em aberto), com floor em 0 por cartão
    const availableOnCards = cardsActive.reduce((sum, c) => {
      const limit = Number(c.creditLimit || 0)
      const used = Number(openInvoices[c.id]?.total || 0)
      return sum + Math.max(limit - used, 0)
    }, 0)

    return {
      inAccounts,
      inAccountsCount: nonCardActive.length,
      openInvoicesTotal,
      openInvoicesCount,
      availableOnCards,
      cardsCount: cardsActive.length,
    }
  }, [accounts, openInvoices])

  // Ordenação: ativos primeiro (não-cartão antes de cartão), inativos por último
  const sortedAccounts = useMemo(() => {
    const score = (a: any) => {
      const inactivePenalty = a.isActive === false ? 100 : 0
      const cardPenalty = a.type === 'CREDIT_CARD' ? 10 : 0
      return inactivePenalty + cardPenalty
    }
    return [...accounts].sort((a, b) => score(a) - score(b))
  }, [accounts])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contas</h1>
          <p className="text-sm text-muted-foreground">
            Suas contas, cartões e carteiras em um só lugar
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button className="gap-2 gradient-primary shadow-md shadow-primary/25 border-0" onClick={openNew} />}>
              <Plus className="h-4 w-4" />
              Nova Conta
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de conta</Label>
                <Select
                  onValueChange={(v) => {
                    if (!v) return
                    setValue('type', v as any)
                    // changing type re-opens the picker if it makes sense for that type
                    setPickerSkipped(false)
                  }}
                  value={watch('type')}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <span className="flex flex-1 text-left truncate">
                      {watch('type')
                        ? ACCOUNT_TYPE_LABELS[watch('type') as string]
                        : <span className="text-muted-foreground">Selecione o tipo</span>}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Brand picker — shown when a type is selected and user hasn't picked yet */}
              {watch('type') && !pickerSkipped && watch('type') !== 'CASH' && !editingId && (
                <BankPicker
                  accountType={watch('type') as AccountTypeKey}
                  onPick={handlePickBrand}
                  onCustom={() => setPickerSkipped(true)}
                />
              )}

              {/* Form fields — hidden until picker is dismissed (picked a tile or chose Outros) */}
              {(pickerSkipped || watch('type') === 'CASH' || editingId) && (
              <>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  placeholder={accountType === 'CREDIT_CARD' ? 'Ex: Nubank Ultravioleta' : 'Ex: Nubank'}
                  className="h-11 rounded-xl"
                  {...register('name')}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              {accountType !== 'CREDIT_CARD' && (
                <div className="space-y-2">
                  <Label>Saldo atual (R$)</Label>
                  <Input type="number" step="0.01" className="h-11 rounded-xl" {...register('balance', { valueAsNumber: true })} />
                </div>
              )}
              {accountType === 'CREDIT_CARD' && (
                <>
                  <div className="space-y-2">
                    <Label>Limite do cartão (R$)</Label>
                    <Input type="number" step="0.01" placeholder="Ex: 5000" className="h-11 rounded-xl" {...register('creditLimit', { valueAsNumber: true })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Dia de fechamento</Label>
                      <Input type="number" min="1" max="31" placeholder="Ex: 10" className="h-11 rounded-xl" {...register('closingDay', { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Dia de vencimento</Label>
                      <Input type="number" min="1" max="31" placeholder="Ex: 20" className="h-11 rounded-xl" {...register('dueDay', { valueAsNumber: true })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Conta onde a fatura é paga</Label>
                    <Select
                      onValueChange={(v) => setValue('linkedAccountId', v === '__none__' ? null : v)}
                      value={watch('linkedAccountId') || '__none__'}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <span className="flex flex-1 text-left truncate">
                          {(() => {
                            const linkedId = watch('linkedAccountId')
                            if (!linkedId) return 'Nenhuma (definir depois)'
                            const match = accounts.find(a => a.id === linkedId)
                            return match?.name || 'Nenhuma (definir depois)'
                          })()}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhuma (definir depois)</SelectItem>
                        {accounts
                          .filter(a => a.type !== 'CREDIT_CARD' && a.id !== editingId)
                          .map(a => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Quando você pagar a fatura, o valor sai dessa conta.
                    </p>
                  </div>
                </>
              )}
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                <input
                  id="isDefault"
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  {...register('isDefault')}
                />
                <label htmlFor="isDefault" className="text-sm font-medium cursor-pointer select-none">
                  Definir como conta principal
                </label>
              </div>
              {/* Color picker — only when name doesn't match a known brand */}
              {!detectBankFromName(watch('name') || '') && (
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`h-7 w-7 rounded-full border-2 transition-all ${watch('color') === color ? 'border-foreground scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setValue('color', color)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {detectBankFromName(watch('name') || '') && (
                <p className="text-xs text-muted-foreground">
                  💡 Cor e logo da marca já aplicados automaticamente.
                </p>
              )}
              <Button type="submit" className="w-full gradient-primary shadow-md shadow-primary/25 border-0">
                {editingId ? 'Atualizar' : 'Criar Conta'}
              </Button>
              </>
              )}
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </>
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-12 w-12" />}
          title="Organize suas finanças em um só lugar"
          description="Adicione suas contas bancárias, cartões e carteiras para ter uma visão completa."
          action={<Button onClick={openNew}>Nova Conta</Button>}
        />
      ) : (
        <>
          {/* KPI strip — 3 KPIs concretos. Disponível em cartões só aparece se tem cartão. */}
          <div className={cn(
            'grid gap-2 sm:gap-3',
            kpis.cardsCount > 0 ? 'grid-cols-3' : 'grid-cols-2',
          )}>
            <KpiCard
              label="Em contas"
              title="Soma do saldo positivo nas suas contas correntes, poupança, dinheiro, carteiras digitais e investimentos (exclui cartões)."
              value={kpis.inAccounts}
              tone={kpis.inAccounts > 0 ? 'income' : 'muted'}
              hint={`${kpis.inAccountsCount} ${kpis.inAccountsCount === 1 ? 'conta' : 'contas'}`}
            />
            <KpiCard
              label="Em fatura"
              title="Soma das faturas em aberto dos seus cartões (a mais próxima de vencer por cartão)."
              value={kpis.openInvoicesTotal}
              tone={kpis.openInvoicesTotal > 0 ? 'expense' : 'muted'}
              hint={kpis.openInvoicesCount === 0
                ? 'Nenhuma fatura aberta'
                : `${kpis.openInvoicesCount} ${kpis.openInvoicesCount === 1 ? 'fatura' : 'faturas'}`}
            />
            {kpis.cardsCount > 0 && (
              <KpiCard
                label="Disp. em cartões"
                title="Soma do limite disponível nos seus cartões (limite − fatura em aberto). Cartões estourados contam como zero."
                value={kpis.availableOnCards}
                tone={kpis.availableOnCards > 0 ? 'income' : 'expense'}
                hint={`${kpis.cardsCount} ${kpis.cardsCount === 1 ? 'cartão' : 'cartões'}`}
              />
            )}
          </div>

          {/* Grid de cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedAccounts.map((account) => {
              const inactive = account.isActive === false
              const isCard = account.type === 'CREDIT_CARD'
              const openInv = openInvoices[account.id]

              return (
                <Card key={account.id} className={cn('overflow-hidden', inactive && 'opacity-60')}>
                  <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${account.color}, ${account.color}88)` }} />
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div className="flex items-center gap-3">
                      <BankIcon
                        accountName={account.name}
                        accountType={account.type}
                        fallbackColor={account.color}
                        size="lg"
                      />
                      <div>
                        <CardTitle className="text-base flex items-center gap-1.5">
                          {account.name}
                          {account.isDefault && (
                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" aria-label="Conta principal" />
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <p className="text-xs text-muted-foreground">
                            {ACCOUNT_TYPE_LABELS[account.type]}
                            {account.isDefault && ' · Principal'}
                          </p>
                          {inactive && (
                            <button
                              type="button"
                              onClick={() => handleReactivate(account.id)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-500/15 text-slate-600 dark:text-slate-400 hover:bg-emerald-500/15 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                              title="Toca pra reativar"
                            >
                              Inativa · toca pra reativar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {!account.isDefault && !isCard && !inactive && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setAsDefault(account.id)}
                          title="Definir como principal"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(account)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" />}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se houver transações vinculadas, a conta será apenas desativada.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(account.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isCard
                      ? <CreditCardBody account={account} openInvoice={openInv} />
                      : <RegularAccountBody account={account} />
                    }
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

// ─── Subcomponentes ─────────────────────────────────────────────────────

function KpiCard({
  label,
  title,
  value,
  tone,
  hint,
}: {
  label: string
  title: string
  value: number
  tone: 'income' | 'expense' | 'muted'
  hint: string
}) {
  const valueClass =
    tone === 'income' ? 'text-income' : tone === 'expense' ? 'text-expense' : 'text-muted-foreground'

  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[11px] text-muted-foreground font-medium" title={title}>
          {label}
        </p>
        <p className={cn('text-base sm:text-lg font-semibold tabular-nums mt-1', valueClass)}>
          {formatCurrency(value)}
        </p>
        <p className="text-[10px] text-muted-foreground/80 mt-0.5">{hint}</p>
      </CardContent>
    </Card>
  )
}

function RegularAccountBody({ account }: { account: any }) {
  const balance = Number(account.balance)
  const isNegative = balance < 0
  return (
    <p className={cn(
      'text-2xl font-bold tabular-nums',
      isNegative && 'text-expense',
    )}>
      {isNegative ? '−' : ''}{formatCurrency(Math.abs(balance))}
    </p>
  )
}

function CreditCardBody({ account, openInvoice }: { account: any; openInvoice?: any }) {
  const limit = Number(account.creditLimit || 0)
  const used = Number(openInvoice?.total || 0)
  const hasLimit = limit > 0
  const overLimit = used > limit && hasLimit
  const usagePct = hasLimit ? Math.min(Math.round((used / limit) * 100), 100) : 0
  const available = Math.max(limit - used, 0)

  // Severidade pela % de uso. Acima de 100% = "Limite estourado" (rose).
  const sev = overLimit
    ? { color: '#e11d48', label: 'Limite estourado' as const, badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400' }
    : usagePct >= 80
      ? { color: '#e11d48', label: null, badgeClass: '' }
      : usagePct >= 50
        ? { color: '#f59e0b', label: null, badgeClass: '' }
        : { color: '#10b981', label: null, badgeClass: '' }

  return (
    <div className="space-y-3">
      {/* Valor + chip de status */}
      <div className="flex items-baseline gap-2 flex-wrap">
        <p className={cn('text-2xl font-bold tabular-nums', overLimit && 'text-rose-600 dark:text-rose-400')}>
          {formatCurrency(used)}
        </p>
        {hasLimit && (
          <span className="text-xs text-muted-foreground tabular-nums">
            de {formatCurrency(limit)}
          </span>
        )}
        {overLimit && (
          <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md', sev.badgeClass)}>
            <AlertTriangle className="h-3 w-3" strokeWidth={2.5} />
            {sev.label}
          </span>
        )}
      </div>

      {/* Barra de progresso de limite (só se tem limite definido) */}
      {hasLimit && (
        <div className="space-y-1">
          <div
            className="h-2 w-full rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={usagePct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Limite usado: ${usagePct}%`}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${usagePct}%`, backgroundColor: sev.color }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {usagePct}% usado · {formatCurrency(available)} disponível
          </p>
        </div>
      )}

      {/* Pill de fatura — severity por daysUntilDue, label varia por status */}
      {openInvoice && (
        <InvoicePill invoice={openInvoice} />
      )}
    </div>
  )
}

function InvoicePill({ invoice }: { invoice: any }) {
  const now = new Date()
  const due = new Date(invoice.dueDate)
  const dueUTC = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate())
  const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const days = Math.round((dueUTC - nowUTC) / 86_400_000)

  const statusLabel = invoice.status === 'CLOSED' ? 'Próxima fatura' : 'Fatura aberta'

  let chipLabel = ''
  let chipClass = 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'
  if (days < 0) {
    chipLabel = 'Em atraso'
    chipClass = 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
  } else if (days === 0) {
    chipLabel = 'Vence hoje'
    chipClass = 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
  } else if (days === 1) {
    chipLabel = 'Vence amanhã'
    chipClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
  } else if (days <= 3) {
    chipLabel = `Em ${days} dias`
    chipClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
  } else if (days <= 7) {
    chipLabel = `Em ${days} dias`
  } else {
    chipLabel = `Em ${days} dias`
  }

  return (
    <Link
      href={`/invoices/${invoice.id}`}
      className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors px-3 py-2 text-xs"
    >
      <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-medium truncate">{statusLabel}</p>
          <span className={cn('inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md', chipClass)}>
            {chipLabel}
          </span>
        </div>
        <p className="text-muted-foreground tabular-nums mt-0.5">
          {formatCurrency(Number(invoice.total))} · vence {new Date(invoice.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
        </p>
      </div>
    </Link>
  )
}
