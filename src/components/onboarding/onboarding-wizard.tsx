"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ACCOUNT_TYPE_LABELS, TRANSACTION_TYPE_LABELS, RECURRENCE_LABELS, COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Wallet,
  ArrowLeftRight,
  LayoutDashboard,
  PieChart,
  Target,
  BarChart3,
  Lightbulb,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  CircleDollarSign,
  Repeat,
} from 'lucide-react'

const STEPS = [
  { title: 'Boas-vindas', icon: Sparkles },
  { title: 'Criar conta', icon: Wallet },
  { title: 'Primeira transação', icon: ArrowLeftRight },
  { title: 'Conheça o Finn', icon: LayoutDashboard },
  { title: 'Tudo pronto!', icon: Check },
]

interface Category {
  id: string
  name: string
  icon: string
  type: string
}

function NativeSelect({
  value,
  onChange,
  options,
  placeholder,
  id,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  id?: string
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm transition-all outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 dark:bg-input/30"
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  // Step 1 - Account form
  const [accountName, setAccountName] = useState('')
  const [accountType, setAccountType] = useState('CHECKING')
  const [accountBalance, setAccountBalance] = useState('')
  const [createdAccountId, setCreatedAccountId] = useState<string | null>(null)

  // Step 2 - Transaction form
  const [txType, setTxType] = useState('EXPENSE')
  const [txAmount, setTxAmount] = useState('')
  const [txDescription, setTxDescription] = useState('')
  const [txCategoryId, setTxCategoryId] = useState('')
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0])
  const [txRecurring, setTxRecurring] = useState(false)
  const [txFrequency, setTxFrequency] = useState('MONTHLY')
  const [categories, setCategories] = useState<Category[]>([])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      if (data.data) setCategories(data.data)
    } catch {
      // Categories are optional
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const handleCreateAccount = async () => {
    if (!accountName.trim()) {
      toast.error('Informe o nome da conta')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: accountName.trim(),
          type: accountType,
          balance: parseFloat(accountBalance) || 0,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          icon: 'wallet',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar conta')
      setCreatedAccountId(data.data.id)
      toast.success('Conta criada com sucesso!')
      setStep(2)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTransaction = async () => {
    if (!txDescription.trim()) {
      toast.error('Informe a descrição')
      return
    }
    if (!txAmount || parseFloat(txAmount) <= 0) {
      toast.error('Informe um valor válido')
      return
    }
    if (!txDate) {
      toast.error('Informe a data')
      return
    }

    setLoading(true)
    try {
      // Create the transaction
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: txType,
          amount: parseFloat(txAmount),
          description: txDescription.trim(),
          date: new Date(txDate).toISOString(),
          accountId: createdAccountId,
          categoryId: txCategoryId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar transação')

      // If recurring, also create recurring transaction
      if (txRecurring) {
        await fetch('/api/recurring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: txType,
            amount: parseFloat(txAmount),
            description: txDescription.trim(),
            frequency: txFrequency,
            startDate: txDate,
            accountId: createdAccountId,
            categoryId: txCategoryId || undefined,
            autoConfirm: true,
          }),
        })
      }

      toast.success('Transação registrada!')
      setStep(3)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFinish = () => {
    onComplete()
    router.push('/dashboard')
  }

  const userName = user?.user_metadata?.name?.split(' ')[0] || 'usuário'

  const filteredCategories = categories.filter((c) =>
    txType === 'INCOME' ? c.type === 'INCOME' : c.type === 'EXPENSE'
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-y-auto py-8">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center px-4">
        {/* Progress indicator */}
        <div className="mb-8 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all duration-300 ${
                  i < step
                    ? 'bg-primary text-primary-foreground'
                    : i === step
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`hidden h-0.5 w-6 sm:block transition-colors duration-300 ${
                    i < step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <Card className="w-full animate-fade-in-scale">
          <CardContent className="pt-2">
            {/* Step 0 - Welcome */}
            {step === 0 && (
              <div className="flex flex-col items-center text-center space-y-6 py-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl gradient-primary animate-gradient">
                  <CircleDollarSign className="h-10 w-10 text-white" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold">
                    Olá, {userName}!
                  </h1>
                  <p className="text-muted-foreground">
                    Bem-vindo ao <span className="font-semibold text-primary">Finn</span> — sua gestão financeira pessoal inteligente.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Vamos configurar tudo em poucos passos para que você comece a ter total controle das suas finanças.
                </p>
                <Button onClick={() => setStep(1)} className="w-full">
                  Começar
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 1 - Create Account */}
            {step === 1 && (
              <div className="space-y-5 py-2">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold">Crie sua primeira conta</h2>
                  <p className="text-sm text-muted-foreground">
                    Adicione sua conta bancária principal para começar a registrar transações.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="account-name">Nome da conta</Label>
                    <Input
                      id="account-name"
                      placeholder="Ex: Nubank, Itaú, Carteira..."
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-type">Tipo</Label>
                    <NativeSelect
                      id="account-type"
                      value={accountType}
                      onChange={setAccountType}
                      options={Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-balance">Saldo inicial</Label>
                    <Input
                      id="account-balance"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={accountBalance}
                      onChange={(e) => setAccountBalance(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(0)}
                    className="flex-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Voltar
                  </Button>
                  <Button
                    onClick={handleCreateAccount}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? 'Criando...' : 'Criar conta'}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2 - Create Transaction */}
            {step === 2 && (
              <div className="space-y-5 py-2">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold">Registre uma transação</h2>
                  <p className="text-sm text-muted-foreground">
                    Adicione sua primeira receita ou despesa para começar o controle.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['INCOME', 'EXPENSE'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => { setTxType(type); setTxCategoryId('') }}
                          className={`rounded-xl border p-3 text-sm font-medium transition-all ${
                            txType === type
                              ? type === 'INCOME'
                                ? 'border-income bg-income/10 text-income'
                                : 'border-expense bg-expense/10 text-expense'
                              : 'border-border hover:bg-muted'
                          }`}
                        >
                          {TRANSACTION_TYPE_LABELS[type]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tx-amount">Valor</Label>
                    <Input
                      id="tx-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0,00"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tx-description">Descrição</Label>
                    <Input
                      id="tx-description"
                      placeholder="Ex: Salário, Mercado, Aluguel..."
                      value={txDescription}
                      onChange={(e) => setTxDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tx-date">Data</Label>
                    <Input
                      id="tx-date"
                      type="date"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                    />
                  </div>
                  {filteredCategories.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="tx-category">Categoria (opcional)</Label>
                      <NativeSelect
                        id="tx-category"
                        value={txCategoryId}
                        onChange={setTxCategoryId}
                        placeholder="Selecione..."
                        options={filteredCategories.map((cat) => ({
                          value: cat.id,
                          label: cat.name,
                        }))}
                      />
                    </div>
                  )}
                  {/* Recurrence toggle */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setTxRecurring(!txRecurring)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border p-3 text-sm transition-all',
                        txRecurring
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:bg-muted'
                      )}
                    >
                      <Repeat className="h-4 w-4" />
                      <span className="font-medium">Transação recorrente</span>
                    </button>
                    {txRecurring && (
                      <div className="space-y-2 animate-fade-in">
                        <Label htmlFor="tx-frequency">Frequência</Label>
                        <NativeSelect
                          id="tx-frequency"
                          value={txFrequency}
                          onChange={setTxFrequency}
                          options={Object.entries(RECURRENCE_LABELS).map(([value, label]) => ({
                            value,
                            label,
                          }))}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setStep(3)}
                    className="text-muted-foreground"
                  >
                    Pular
                  </Button>
                  <Button
                    onClick={handleCreateTransaction}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? 'Registrando...' : 'Registrar'}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3 - Explore Features */}
            {step === 3 && (
              <div className="space-y-5 py-2">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold">Conheça o Finn</h2>
                  <p className="text-sm text-muted-foreground">
                    Explore tudo o que o Finn oferece para organizar suas finanças.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 stagger-children">
                  {[
                    {
                      icon: LayoutDashboard,
                      title: 'Dashboard',
                      desc: 'Visão geral das suas finanças',
                      color: 'text-primary',
                      bg: 'bg-primary/10',
                    },
                    {
                      icon: PieChart,
                      title: 'Orçamentos',
                      desc: 'Controle seus gastos por categoria',
                      color: 'text-chart-2',
                      bg: 'bg-chart-2/10',
                    },
                    {
                      icon: Target,
                      title: 'Metas',
                      desc: 'Defina e acompanhe objetivos',
                      color: 'text-chart-3',
                      bg: 'bg-chart-3/10',
                    },
                    {
                      icon: BarChart3,
                      title: 'Relatórios',
                      desc: 'Análises detalhadas',
                      color: 'text-chart-4',
                      bg: 'bg-chart-4/10',
                    },
                    {
                      icon: Lightbulb,
                      title: 'Insights',
                      desc: 'Dicas inteligentes com IA',
                      color: 'text-chart-5',
                      bg: 'bg-chart-5/10',
                    },
                    {
                      icon: ArrowLeftRight,
                      title: 'Transações',
                      desc: 'Registre receitas e despesas',
                      color: 'text-info',
                      bg: 'bg-info/10',
                    },
                  ].map((feature) => (
                    <div
                      key={feature.title}
                      className="flex flex-col gap-2 rounded-xl border border-border/50 p-3"
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${feature.bg}`}>
                        <feature.icon className={`h-4.5 w-4.5 ${feature.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{feature.title}</p>
                        <p className="text-xs text-muted-foreground">{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button onClick={() => setStep(4)} className="w-full">
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 4 - All Done */}
            {step === 4 && (
              <div className="flex flex-col items-center text-center space-y-6 py-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
                  <Check className="h-10 w-10 text-success" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Tudo pronto!</h2>
                  <p className="text-muted-foreground">
                    Seu Finn está configurado. Comece agora a ter total controle das suas finanças pessoais.
                  </p>
                </div>
                <div className="w-full space-y-3">
                  <Button onClick={handleFinish} className="w-full">
                    Ir para o Dashboard
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step label */}
        <p className="mt-4 text-xs text-muted-foreground">
          {STEPS[step].title} — Passo {step + 1} de {STEPS.length}
        </p>
      </div>
    </div>
  )
}
