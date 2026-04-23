"use client"

import { useState, useEffect, useCallback } from 'react'
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
import { formatCurrency } from '@/lib/utils'
import { ACCOUNT_TYPE_LABELS, COLORS } from '@/lib/constants'
import { Plus, Wallet, Trash2, Pencil, Star, FileText } from 'lucide-react'
import Link from 'next/link'
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
    setDialogOpen(true)
  }

  function openNew() {
    setEditingId(null)
    reset({ color: '#6366f1', icon: 'wallet', balance: 0, isDefault: false })
    setDialogOpen(true)
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

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contas</h1>
          <p className="text-sm text-muted-foreground">
            Saldo total: <span className="font-semibold text-foreground">{formatCurrency(totalBalance)}</span>
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
                <Select onValueChange={(v) => v && setValue('type', v as any)} value={watch('type')}>
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
              <Button type="submit" className="w-full gradient-primary shadow-md shadow-primary/25 border-0">
                {editingId ? 'Atualizar' : 'Criar Conta'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-12 w-12" />}
          title="Organize suas finanças em um só lugar"
          description="Adicione suas contas bancárias, cartões e carteiras para ter uma visão completa."
          action={<Button onClick={openNew}>Nova Conta</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id} className={`overflow-hidden ${!account.isActive ? 'opacity-50' : ''}`}>
              {/* Color bar on top */}
              <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${account.color}, ${account.color}88)` }} />
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md"
                    style={{ background: `linear-gradient(135deg, ${account.color}, ${account.color}cc)` }}
                  >
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-1.5">
                      {account.name}
                      {account.isDefault && (
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" aria-label="Conta principal" />
                      )}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {ACCOUNT_TYPE_LABELS[account.type]}
                      {account.isDefault && ' · Principal'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {!account.isDefault && account.type !== 'CREDIT_CARD' && (
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
                <p className="text-2xl font-bold">{formatCurrency(Number(account.balance))}</p>
                {account.type === 'CREDIT_CARD' && account.creditLimit && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Limite: {formatCurrency(Number(account.creditLimit))}
                  </p>
                )}
                {account.type === 'CREDIT_CARD' && openInvoices[account.id] && (
                  <Link
                    href={`/invoices/${openInvoices[account.id].id}`}
                    className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/40 hover:bg-muted/70 transition-colors px-3 py-2 text-xs"
                  >
                    <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        Fatura atual: {formatCurrency(Number(openInvoices[account.id].total))}
                      </p>
                      <p className="text-muted-foreground">
                        Vence {new Date(openInvoices[account.id].dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </p>
                    </div>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
