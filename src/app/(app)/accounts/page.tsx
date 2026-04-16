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
import { Plus, Wallet, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
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
      const res = await fetch('/api/accounts')
      if (res.ok) {
        const result = await res.json()
        setAccounts(result.data || [])
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
      creditLimit: account.creditLimit ? Number(account.creditLimit) : undefined,
      closingDay: account.closingDay || undefined,
      dueDay: account.dueDay || undefined,
    })
    setDialogOpen(true)
  }

  function openNew() {
    setEditingId(null)
    reset({ color: '#6366f1', icon: 'wallet', balance: 0 })
    setDialogOpen(true)
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input placeholder="Ex: Nubank" className="h-11 rounded-xl" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select onValueChange={(v) => v && setValue('type', v as any)} value={watch('type')}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Saldo inicial (R$)</Label>
                <Input type="number" step="0.01" className="h-11 rounded-xl" {...register('balance', { valueAsNumber: true })} />
              </div>
              {accountType === 'CREDIT_CARD' && (
                <>
                  <div className="space-y-2">
                    <Label>Limite (R$)</Label>
                    <Input type="number" step="0.01" className="h-11 rounded-xl" {...register('creditLimit', { valueAsNumber: true })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Dia de fechamento</Label>
                      <Input type="number" min="1" max="31" className="h-11 rounded-xl" {...register('closingDay', { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Dia de vencimento</Label>
                      <Input type="number" min="1" max="31" className="h-11 rounded-xl" {...register('dueDay', { valueAsNumber: true })} />
                    </div>
                  </div>
                </>
              )}
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
                    <CardTitle className="text-base">{account.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {ACCOUNT_TYPE_LABELS[account.type]}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
