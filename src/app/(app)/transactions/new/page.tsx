"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { transactionSchema, type TransactionInput } from '@/lib/validations/transaction'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { RECURRENCE_LABELS } from '@/lib/constants'

function formatCurrencyInput(cents: number): string {
  const value = (cents / 100).toFixed(2)
  const [intPart, decPart] = value.split('.')
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formatted},${decPart}`
}

function parseCurrencyInput(display: string): number {
  const digits = display.replace(/\D/g, '')
  return parseInt(digits || '0', 10)
}

export default function NewTransactionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const [accounts, setAccounts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  // Currency input state (stored as cents)
  const [amountCents, setAmountCents] = useState(0)
  const amountDisplay = formatCurrencyInput(amountCents)

  // Category suggestion state
  const [suggestionMsg, setSuggestionMsg] = useState('')
  const suggestionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Recurring state
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState('MONTHLY')
  const [hasEndDate, setHasEndDate] = useState(false)
  const [endDate, setEndDate] = useState('')
  const [autoConfirm, setAutoConfirm] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'EXPENSE',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
    },
  })

  function onError(fieldErrors: any) {
    const firstError = Object.values(fieldErrors)[0] as any
    toast.error(firstError?.message || 'Preencha todos os campos obrigatórios')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const type = watch('type')
  const accountId = watch('accountId')
  const categoryId = watch('categoryId')

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    const cents = parseInt(raw || '0', 10)
    setAmountCents(cents)
    setValue('amount', cents / 100, { shouldValidate: true })
  }

  const suggestCategory = useCallback(async (desc: string) => {
    if (!desc || desc.trim().length < 3) return
    // Only suggest if no category is selected yet
    if (watch('categoryId')) return
    if (type === 'TRANSFER') return

    try {
      const res = await fetch(`/api/categories/suggest?description=${encodeURIComponent(desc)}`)
      const json = await res.json()
      if (json.data?.categoryId) {
        setValue('categoryId', json.data.categoryId, { shouldValidate: true })
        setSuggestionMsg('Categoria sugerida automaticamente')
        if (fadeTimer.current) clearTimeout(fadeTimer.current)
        fadeTimer.current = setTimeout(() => setSuggestionMsg(''), 3000)
      }
    } catch {
      // Silently ignore suggestion errors
    }
  }, [type, setValue, watch])

  function handleDescriptionChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Let react-hook-form handle the value via register
    if (suggestionTimer.current) clearTimeout(suggestionTimer.current)
    suggestionTimer.current = setTimeout(() => {
      suggestCategory(e.target.value)
    }, 500)
  }

  function handleDescriptionBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (suggestionTimer.current) clearTimeout(suggestionTimer.current)
    suggestCategory(e.target.value)
  }

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
            const amt = Number(t.amount)
            setAmountCents(Math.round(amt * 100))
            reset({
              type: t.type,
              amount: amt,
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
      if (isRecurring && !editId) {
        const recurringPayload = {
          description: data.description,
          amount: data.amount,
          type: data.type,
          frequency,
          categoryId: data.categoryId || undefined,
          accountId: data.accountId || undefined,
          startDate: data.date,
          endDate: hasEndDate && endDate ? endDate : undefined,
          autoConfirm,
        }
        const res = await fetch('/api/recurring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recurringPayload),
        })
        if (res.ok) {
          toast.success('Recorrência criada!')
          router.push('/transactions')
        } else {
          const err = await res.json()
          toast.error(err.error || 'Erro ao salvar')
        }
      } else {
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
      }
    } catch {
      toast.error('Erro ao salvar')
    }
    setSaving(false)
  }

  const filteredCategories = categories.filter((c: any) =>
    type === 'TRANSFER' ? false : c.type === type
  )

  const selectedAccountName = accounts.find(a => a.id === accountId)?.name
  const selectedCategoryName = filteredCategories.find((c: any) => c.id === categoryId)?.name
  const selectedCategoryColor = filteredCategories.find((c: any) => c.id === categoryId)?.color

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
          <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4">
            <div>
              <Tabs value={type} onValueChange={(v) => v && setValue('type', v as any, { shouldValidate: true })}>
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
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground pointer-events-none">
                  R$
                </span>
                <Input
                  id="amount"
                  type="text"
                  inputMode="numeric"
                  value={amountDisplay}
                  onChange={handleAmountChange}
                  className="text-right text-3xl font-bold border-0 bg-muted/30 h-16 focus-visible:ring-1 focus-visible:ring-primary rounded-xl pl-14 pr-4"
                />
              </div>
              {errors.amount && <p className="text-xs text-destructive text-center">{errors.amount.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Ex: Almoço no restaurante"
                className="h-11 rounded-xl"
                {...register('description', {
                  onChange: handleDescriptionChange,
                  onBlur: handleDescriptionBlur,
                })}
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
              {suggestionMsg && (
                <p className="text-xs text-muted-foreground animate-fade-in">{suggestionMsg}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">{isRecurring ? 'Data de início' : 'Data'}</Label>
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
              <Select onValueChange={(v) => v && setValue('accountId', v, { shouldValidate: true })} value={accountId}>
                <SelectTrigger className="h-11 rounded-xl">
                  <span className="flex flex-1 text-left truncate">
                    {selectedAccountName || <span className="text-muted-foreground">Selecione a conta</span>}
                  </span>
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
                <Select onValueChange={(v) => v && setValue('toAccountId', v, { shouldValidate: true })} value={watch('toAccountId')}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <span className="flex flex-1 text-left truncate">
                      {accounts.find(a => a.id === watch('toAccountId'))?.name || <span className="text-muted-foreground">Selecione a conta destino</span>}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter((a: any) => a.id !== accountId).map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {type !== 'TRANSFER' && (
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select onValueChange={(v) => v && setValue('categoryId', v, { shouldValidate: true })} value={categoryId}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <span className="flex flex-1 text-left truncate">
                      {selectedCategoryName ? (
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: selectedCategoryColor }} />
                          {selectedCategoryName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Selecione a categoria</span>
                      )}
                    </span>
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

            {/* Recurring toggle - only for new non-transfer transactions */}
            {!editId && type !== 'TRANSFER' && (
              <div className="space-y-4 rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Recorrente</Label>
                    <p className="text-xs text-muted-foreground">Repetir automaticamente</p>
                  </div>
                  <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                </div>

                {isRecurring && (
                  <div className="space-y-4 pt-2 border-t">
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

                    <div className="flex items-center justify-between">
                      <Label>Confirmar automaticamente</Label>
                      <Switch checked={autoConfirm} onCheckedChange={setAutoConfirm} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {!editId && type === 'EXPENSE' && !isRecurring && (
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
                {saving ? 'Salvando...' : editId ? 'Atualizar' : isRecurring ? 'Criar Recorrência' : 'Criar Transação'}
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
