"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { transactionSchema, type TransactionInput } from '@/lib/validations/transaction'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function NewTransactionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const [accounts, setAccounts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'EXPENSE',
      date: new Date().toISOString().split('T')[0],
    },
  })

  const type = watch('type')

  useEffect(() => {
    Promise.all([
      fetch('/api/accounts').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
    ]).then(([accRes, catRes]) => {
      setAccounts(accRes.data || [])
      setCategories(catRes.data || [])
    })
  }, [])

  useEffect(() => {
    if (editId) {
      fetch(`/api/transactions/${editId}`)
        .then(r => r.json())
        .then(res => {
          if (res.data) {
            const t = res.data
            reset({
              type: t.type,
              amount: Number(t.amount),
              description: t.description,
              date: new Date(t.date).toISOString().split('T')[0],
              accountId: t.accountId,
              categoryId: t.categoryId || undefined,
              location: t.location || undefined,
              notes: t.notes || undefined,
            })
          }
        })
    }
  }, [editId, reset])

  async function onSubmit(data: TransactionInput) {
    setSaving(true)
    try {
      const url = editId ? `/api/transactions/${editId}` : '/api/transactions'
      const method = editId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        toast.success(editId ? 'Transação atualizada!' : 'Transação criada!')
        router.push('/transactions')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erro ao salvar')
      }
    } catch {
      toast.error('Erro ao salvar transação')
    }
    setSaving(false)
  }

  const filteredCategories = categories.filter((c: any) =>
    type === 'TRANSFER' ? false : c.type === type
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link href="/transactions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">
          {editId ? 'Editar Transação' : 'Nova Transação'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhes da transação</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Tabs value={type} onValueChange={(v) => v && setValue('type', v as any)}>
                <TabsList className="grid w-full grid-cols-3">
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
                  <TabsTrigger
                    value="TRANSFER"
                    className={cn(type === 'TRANSFER' && 'data-[state=active]:bg-transfer/10 data-[state=active]:text-transfer')}
                  >
                    Transferência
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                className="text-center text-4xl font-bold border-0 bg-transparent h-16 focus-visible:ring-0"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && <p className="text-xs text-destructive text-center">{errors.amount.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Ex: Almoço no restaurante"
                className="h-11 rounded-xl"
                {...register('description')}
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                className="h-11 rounded-xl"
                {...register('date')}
              />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Conta</Label>
              <Select onValueChange={(v) => v && setValue('accountId', v)} value={watch('accountId')}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.accountId && <p className="text-xs text-destructive">{errors.accountId.message}</p>}
            </div>

            {type === 'TRANSFER' && (
              <div className="space-y-2">
                <Label>Conta destino</Label>
                <Select onValueChange={(v) => v && setValue('toAccountId', v)} value={watch('toAccountId')}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Selecione a conta destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter((a: any) => a.id !== watch('accountId')).map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {type !== 'TRANSFER' && (
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select onValueChange={(v) => v && setValue('categoryId', v)} value={watch('categoryId')}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="location">Local (opcional)</Label>
              <Input
                id="location"
                placeholder="Ex: Shopping Center"
                className="h-11 rounded-xl"
                {...register('location')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Input
                id="notes"
                placeholder="Notas adicionais"
                className="h-11 rounded-xl"
                {...register('notes')}
              />
            </div>

            {!editId && type === 'EXPENSE' && (
              <div className="space-y-2">
                <Label htmlFor="installments">Parcelas (opcional)</Label>
                <Input
                  id="installments"
                  type="number"
                  min="1"
                  max="48"
                  placeholder="1"
                  className="h-11 rounded-xl"
                  {...register('installments', { valueAsNumber: true })}
                />
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1 gradient-primary shadow-md shadow-primary/25 border-0" disabled={saving}>
                {saving ? 'Salvando...' : editId ? 'Atualizar' : 'Criar Transação'}
              </Button>
              <Link href="/transactions">
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
