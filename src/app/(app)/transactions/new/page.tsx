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
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn, formatLocalDate } from '@/lib/utils'
import { RECURRENCE_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/constants'

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

  // Progressive disclosure pra Local + Observações (UX review: mass-market
  // BR foge de form longo, esconder por trás de "Mais detalhes" reduz
  // cognitive load no caminho default).
  const [showMoreDetails, setShowMoreDetails] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'EXPENSE',
      date: formatLocalDate(),  // data local — não UTC (evita "amanhã" à noite)
      amount: 0,
      paymentMethod: 'DEBIT',
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
  const paymentMethod = watch('paymentMethod')

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
      const fetchedAccounts = accRes.data || []
      setAccounts(fetchedAccounts)
      setCategories(catRes.data || [])

      // Pre-select default account if creating new (not editing)
      if (!editId) {
        const defaultAccount = fetchedAccounts.find((a: any) => a.isDefault && a.type !== 'CREDIT_CARD')
          || fetchedAccounts.find((a: any) => a.type !== 'CREDIT_CARD')
        if (defaultAccount) {
          setValue('accountId', defaultAccount.id)
        }
      }
    })
  }, [editId, setValue])

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
              date: formatLocalDate(new Date(t.date)),
              accountId: t.accountId,
              categoryId: t.categoryId || undefined,
              paymentMethod: t.paymentMethod || 'DEBIT',
              location: t.location || undefined,
              notes: t.notes || undefined,
            })
            // Em modo edição, se tem Local ou Observações, abre o
            // "Mais detalhes" pra usuário ver/editar.
            if (t.location || t.notes) setShowMoreDetails(true)
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
                  aria-invalid={!!errors.amount}
                  aria-describedby={errors.amount ? 'amount-error' : undefined}
                  className="text-right text-3xl font-bold border-0 bg-muted/30 h-16 focus-visible:ring-1 focus-visible:ring-primary rounded-xl pl-14 pr-4"
                />
              </div>
              {errors.amount && (
                <p id="amount-error" className="text-xs text-destructive text-center">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder={type === 'INCOME' ? 'Ex: Salário, Freelance, Aluguel recebido' : type === 'TRANSFER' ? 'Ex: Transferência pra reserva' : 'Ex: Almoço no restaurante'}
                className="h-11 rounded-xl"
                aria-invalid={!!errors.description}
                aria-describedby={errors.description ? 'description-error' : undefined}
                {...register('description', {
                  onChange: handleDescriptionChange,
                  onBlur: handleDescriptionBlur,
                })}
              />
              {errors.description && (
                <p id="description-error" className="text-xs text-destructive">{errors.description.message}</p>
              )}
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

            {/* Conta (de origem). Filtros por tipo:
                - TRANSFER: todas as contas (origem)
                - INCOME: exclui cartão de crédito (não recebe receita em cartão)
                - EXPENSE com paymentMethod=CRÉDITO: só cartões
                - EXPENSE com outros métodos: exclui cartões */}
            <div className="space-y-2">
              <Label htmlFor="account-select">
                {type === 'EXPENSE' && paymentMethod === 'CREDIT' ? 'Cartão' : 'Conta'}
              </Label>
              <Select
                onValueChange={(v) => v && setValue('accountId', v, { shouldValidate: true })}
                value={accountId}
              >
                <SelectTrigger
                  id="account-select"
                  className="h-11 rounded-xl"
                  aria-invalid={!!errors.accountId}
                  aria-describedby={errors.accountId ? 'account-error' : undefined}
                >
                  <span className="flex flex-1 text-left truncate">
                    {selectedAccountName || <span className="text-muted-foreground">
                      {type === 'EXPENSE' && paymentMethod === 'CREDIT' ? 'Selecione o cartão' : 'Selecione a conta'}
                    </span>}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {(type === 'TRANSFER'
                    ? accounts
                    : type === 'INCOME'
                      ? accounts.filter((a: any) => a.type !== 'CREDIT_CARD')
                      : paymentMethod === 'CREDIT'
                        ? accounts.filter((a: any) => a.type === 'CREDIT_CARD')
                        : accounts.filter((a: any) => a.type !== 'CREDIT_CARD')
                  ).map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}{a.isDefault ? ' ★' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.accountId && (
                <p id="account-error" className="text-xs text-destructive">{errors.accountId.message}</p>
              )}
              {type === 'EXPENSE' && paymentMethod === 'CREDIT' && accounts.filter((a: any) => a.type === 'CREDIT_CARD').length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Você ainda não cadastrou cartão de crédito. Adicione um em Contas para usar essa opção.
                </p>
              )}
            </div>

            {/* Conta destino — só em transferência */}
            {type === 'TRANSFER' && (
              <div className="space-y-2">
                <Label htmlFor="dest-account-select">Conta destino</Label>
                <Select onValueChange={(v) => v && setValue('toAccountId', v, { shouldValidate: true })} value={watch('toAccountId')}>
                  <SelectTrigger id="dest-account-select" className="h-11 rounded-xl">
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

            {/* Forma de pagamento — só em despesa. Em receita não faz sentido
                (receita cai numa conta — info importante é a conta), em
                transferência também não (já é entre contas). */}
            {type === 'EXPENSE' && (
              <div className="space-y-2">
                <Label htmlFor="pm-select">Forma de pagamento</Label>
                <Select
                  onValueChange={(v) => {
                    if (!v) return
                    setValue('paymentMethod', v as any, { shouldValidate: true })
                    // Switch CRÉDITO ↔ outros: troca a conta automaticamente
                    const current = accounts.find(a => a.id === accountId)
                    if (v === 'CREDIT' && current?.type !== 'CREDIT_CARD') {
                      const firstCard = accounts.find(a => a.type === 'CREDIT_CARD')
                      setValue('accountId', firstCard?.id || '', { shouldValidate: true })
                    } else if (v !== 'CREDIT' && current?.type === 'CREDIT_CARD') {
                      const defaultAcc = accounts.find(a => a.isDefault && a.type !== 'CREDIT_CARD')
                        || accounts.find(a => a.type !== 'CREDIT_CARD')
                      setValue('accountId', defaultAcc?.id || '', { shouldValidate: true })
                    }
                  }}
                  value={paymentMethod}
                >
                  <SelectTrigger id="pm-select" className="h-11 rounded-xl">
                    <span className="flex flex-1 text-left truncate">
                      {PAYMENT_METHOD_LABELS[paymentMethod || 'DEBIT']}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_LABELS)
                      .filter(([key]) => key !== 'TRANSFER')
                      .map(([key, label]) => {
                        const noCreditCardAccounts = accounts.filter((a: any) => a.type === 'CREDIT_CARD').length === 0
                        const disabled = key === 'CREDIT' && noCreditCardAccounts
                        return (
                          <SelectItem key={key} value={key} disabled={disabled}>
                            {label}{disabled ? ' (sem cartão cadastrado)' : ''}
                          </SelectItem>
                        )
                      })}
                  </SelectContent>
                </Select>
                {paymentMethod === 'CREDIT' && (
                  <p className="text-xs text-muted-foreground">
                    Valor vai pra fatura do cartão — saldo da conta bancária só muda quando você pagar.
                  </p>
                )}
              </div>
            )}

            {/* Categoria — só em despesa e receita (transferência não tem) */}
            {type !== 'TRANSFER' && (
              <div className="space-y-2">
                <Label htmlFor="cat-select">Categoria</Label>
                <Select onValueChange={(v) => v && setValue('categoryId', v, { shouldValidate: true })} value={categoryId}>
                  <SelectTrigger id="cat-select" className="h-11 rounded-xl">
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

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <Label className="block">Lançar sozinho na data</Label>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                          Lançar automático no vencimento — eu te aviso pelo WhatsApp.
                        </p>
                      </div>
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

            {/* Progressive disclosure: Local (só EXPENSE) + Observações (todos
                os tipos). UX review: mass-market BR foge de form longo. Em
                edição abre por padrão se já tem valor preenchido. */}
            <div>
              <button
                type="button"
                onClick={() => setShowMoreDetails((s) => !s)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                aria-expanded={showMoreDetails}
                aria-controls="more-details"
              >
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    showMoreDetails ? 'rotate-0' : '-rotate-90',
                  )}
                />
                Mais detalhes (opcional)
              </button>

              {showMoreDetails && (
                <div id="more-details" className="space-y-4 pt-3">
                  {type === 'EXPENSE' && (
                    <div className="space-y-2">
                      <Label htmlFor="location">Local</Label>
                      <Input
                        id="location"
                        placeholder="Ex: Shopping Center"
                        className="h-11 rounded-xl"
                        {...register('location')}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Input
                      id="notes"
                      placeholder="Notas adicionais"
                      className="h-11 rounded-xl"
                      {...register('notes')}
                    />
                  </div>
                </div>
              )}
            </div>

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
