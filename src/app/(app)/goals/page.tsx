"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Target } from 'lucide-react'
import { toast } from 'sonner'

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [deadline, setDeadline] = useState('')

  const fetchGoals = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/goals')
      if (res.ok) {
        const result = await res.json()
        setGoals(result.data || [])
      }
    } catch {
      toast.error('Não conseguimos carregar suas metas. Tente novamente em instantes.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  async function handleCreate() {
    if (!name || !targetAmount) return
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          targetAmount: parseFloat(targetAmount),
          deadline: deadline || undefined,
          icon: 'target',
          color: '#10b981',
        }),
      })
      if (res.ok) {
        toast.success('Meta criada! Agora acompanhe seu progresso por aqui.')
        setDialogOpen(false)
        setName('')
        setTargetAmount('')
        setDeadline('')
        fetchGoals()
      }
    } catch {
      toast.error('Não foi possível criar a meta. Tente novamente em instantes.')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Metas</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button className="gap-2 gradient-primary shadow-md shadow-primary/25 border-0" />}>
              <Plus className="h-4 w-4" />
              Nova Meta
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Meta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input placeholder="Ex: Viagem para Europa" value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Valor alvo (R$)</Label>
                <Input type="number" step="0.01" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Prazo (opcional)</Label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <Button className="w-full gradient-primary shadow-md shadow-primary/25 border-0" onClick={handleCreate}>Criar Meta</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="space-y-6">
          {/* Explicação didática */}
          <Card className="border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-500/5">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 shrink-0">
                  <Target className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="font-bold text-base mb-2">O que são metas?</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    Metas são <strong>objetivos financeiros</strong> que você quer alcançar.
                    Defina um nome, um valor e um prazo — o Finn mostra seu progresso e te motiva a chegar lá.
                  </p>
                  <div className="bg-background/80 rounded-xl p-4 space-y-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Exemplos práticos:</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">✈️ Viagem para o Nordeste</span>
                        <span className="text-muted-foreground">R$ 3.200 de R$ 5.000</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: '64%' }} />
                      </div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">🎉 64% alcançado! No ritmo atual, você chega lá em 2 meses.</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">🛡️ Reserva de emergência</span>
                        <span className="text-muted-foreground">R$ 4.500 de R$ 15.000</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500" style={{ width: '30%' }} />
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400">💪 30% alcançado — cada passo conta. Continue firme!</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <EmptyState
            icon={<Target className="h-12 w-12" />}
            title="Transforme sonhos em metas com prazo"
            description="Quer viajar, trocar de carro ou criar uma reserva? Defina o valor, o prazo, e acompanhe cada real que te aproxima da conquista."
            action={<Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Criar minha primeira meta</Button>}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((g: any) => {
            const target = Number(g.targetAmount)
            const current = Number(g.currentAmount)
            const percentage = target > 0 ? Math.round((current / target) * 100) : 0
            const pct = Math.min(percentage, 100)
            const goalColor = g.color || '#10b981'
            return (
              <Card key={g.id} className="overflow-hidden">
                {/* Color bar on top */}
                <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${goalColor}, ${goalColor}88)` }} />
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${goalColor}15`, color: goalColor }}
                    >
                      <Target className="h-4 w-4" />
                    </div>
                    {g.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{formatCurrency(current)}</span>
                    <span className="text-muted-foreground">de {formatCurrency(target)}</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${goalColor}, ${goalColor}cc)`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span style={{ color: goalColor, fontWeight: 600 }}>{percentage}% completo</span>
                    {g.deadline && <span>Prazo: {formatDate(g.deadline)}</span>}
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
