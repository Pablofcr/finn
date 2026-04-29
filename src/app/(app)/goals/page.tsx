"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Plus, Target, Pencil, Trash2, ChevronDown, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface Goal {
  id: string
  name: string
  targetAmount: string | number
  currentAmount: string | number
  deadline: string | null
  color?: string
  icon?: string
  isCompleted: boolean
  createdAt: string
}

type PaceTone = 'on-track' | 'speed-up' | 'at-risk' | 'no-deadline' | 'past-deadline' | 'completed'

interface PaceInfo {
  tone: PaceTone
  label: string
  // mensagem curta abaixo da barra (ex: "Faltam R$ 1.200 · em ~3 meses")
  hint: string
}

function paceInfoFor(goal: Goal): PaceInfo {
  const target = Number(goal.targetAmount)
  const current = Number(goal.currentAmount)
  const remaining = Math.max(target - current, 0)

  if (goal.isCompleted || current >= target) {
    return { tone: 'completed', label: 'Conquistada', hint: '🎉 Meta alcançada!' }
  }

  // Sem prazo: ritmo histórico só dá projeção, não cria ansiedade
  const created = new Date(goal.createdAt)
  const now = new Date()
  const monthsSinceCreated = Math.max(
    (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
    0.5,
  )
  const monthlyPace = current / monthsSinceCreated // R$/mês médio histórico

  if (!goal.deadline) {
    if (monthlyPace > 0) {
      const monthsToTarget = remaining / monthlyPace
      const monthsRounded = Math.max(Math.round(monthsToTarget), 1)
      return {
        tone: 'no-deadline',
        label: 'Sem prazo',
        hint: `Faltam ${formatCurrency(remaining)} · no ritmo atual, ~${monthsRounded} ${monthsRounded === 1 ? 'mês' : 'meses'}`,
      }
    }
    return {
      tone: 'no-deadline',
      label: 'Sem prazo',
      hint: `Faltam ${formatCurrency(remaining)}`,
    }
  }

  const deadline = new Date(goal.deadline)
  const monthsToDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44)

  if (monthsToDeadline <= 0) {
    return {
      tone: 'past-deadline',
      label: 'Prazo passou',
      hint: `Faltam ${formatCurrency(remaining)} · prazo era ${formatDate(goal.deadline)}`,
    }
  }

  const requiredPace = remaining / monthsToDeadline // R$/mês necessário
  const ratio = monthlyPace / requiredPace

  let tone: PaceTone
  let label: string
  if (ratio >= 1) {
    tone = 'on-track'
    label = 'No ritmo'
  } else if (ratio >= 0.6) {
    tone = 'speed-up'
    label = 'Acelere'
  } else {
    tone = 'at-risk'
    label = 'Em risco'
  }

  const monthsRounded = Math.max(Math.ceil(monthsToDeadline), 1)
  const requiredRounded = Math.ceil(requiredPace)

  return {
    tone,
    label,
    hint: `Faltam ${formatCurrency(remaining)} · ${formatCurrency(requiredRounded)}/mês em ${monthsRounded} ${monthsRounded === 1 ? 'mês' : 'meses'}`,
  }
}

function paceChipClass(tone: PaceTone): string {
  switch (tone) {
    case 'on-track': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    case 'speed-up': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    case 'at-risk': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
    case 'past-deadline': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    case 'no-deadline': return 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'
    case 'completed': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  }
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)

  // Quick-add aporte
  const [contribOpen, setContribOpen] = useState(false)
  const [contribGoal, setContribGoal] = useState<Goal | null>(null)
  const [contribValue, setContribValue] = useState('')
  const [contribSubmitting, setContribSubmitting] = useState(false)

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

  function openCreate() {
    setEditId(null)
    setName('')
    setTargetAmount('')
    setCurrentAmount('')
    setDeadline('')
    setDialogOpen(true)
  }

  function openEdit(g: Goal) {
    setEditId(g.id)
    setName(g.name)
    setTargetAmount(String(Number(g.targetAmount)))
    setCurrentAmount(String(Number(g.currentAmount)))
    setDeadline(g.deadline ? g.deadline.split('T')[0] : '')
    setDialogOpen(true)
  }

  function openContribute(g: Goal) {
    setContribGoal(g)
    setContribValue('')
    setContribOpen(true)
  }

  async function handleContribute() {
    if (!contribGoal || !contribValue) return
    const value = parseFloat(contribValue)
    if (isNaN(value) || value <= 0) {
      toast.error('Informe um valor válido.')
      return
    }
    setContribSubmitting(true)
    const newCurrent = Number(contribGoal.currentAmount) + value
    const willComplete = newCurrent >= Number(contribGoal.targetAmount)
    try {
      const res = await fetch(`/api/goals/${contribGoal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentAmount: newCurrent }),
      })
      if (res.ok) {
        toast.success(
          willComplete
            ? `🎉 Conquistou! ${contribGoal.name} foi alcançada.`
            : `Aporte de ${formatCurrency(value)} adicionado em ${contribGoal.name}.`,
        )
        setContribOpen(false)
        fetchGoals()
      } else {
        toast.error('Não foi possível registrar o aporte.')
      }
    } catch {
      toast.error('Não foi possível registrar o aporte.')
    }
    setContribSubmitting(false)
  }

  async function handleSave() {
    if (!name || !targetAmount) return
    try {
      const url = editId ? `/api/goals/${editId}` : '/api/goals'
      const method = editId ? 'PUT' : 'POST'
      const body: any = {
        name,
        targetAmount: parseFloat(targetAmount),
        deadline: deadline || undefined,
        icon: 'target',
        color: '#10b981',
      }
      if (editId) {
        body.currentAmount = parseFloat(currentAmount) || 0
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success(editId ? 'Meta atualizada!' : 'Meta criada! Agora acompanhe seu progresso por aqui.')
        setDialogOpen(false)
        fetchGoals()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Não foi possível salvar a meta.')
      }
    } catch {
      toast.error('Não foi possível salvar a meta. Tente novamente em instantes.')
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Meta excluída.')
        fetchGoals()
      } else {
        toast.error('Não foi possível excluir a meta.')
      }
    } catch {
      toast.error('Não foi possível excluir a meta.')
    }
  }

  // ── KPIs e ordenação ──────────────────────────────────────────────────
  const { kpis, activeGoals, completedGoals } = useMemo(() => {
    let conquered = 0
    let toGoActive = 0
    const active: Goal[] = []
    const completed: Goal[] = []

    for (const g of goals) {
      const target = Number(g.targetAmount)
      const current = Number(g.currentAmount)
      conquered += current
      const isCompleted = g.isCompleted || current >= target
      if (isCompleted) {
        completed.push(g)
      } else {
        active.push(g)
        toGoActive += Math.max(target - current, 0)
      }
    }

    // Ativas: prazo mais próximo primeiro, sem prazo por último
    active.sort((a, b) => {
      const aDue = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY
      const bDue = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY
      return aDue - bDue
    })

    return {
      kpis: {
        inProgress: active.length,
        conquered,
        toGo: toGoActive,
      },
      activeGoals: active,
      completedGoals: completed,
    }
  }, [goals])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Metas</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button className="gap-2 gradient-primary shadow-md shadow-primary/25 border-0" onClick={openCreate} />}>
              <Plus className="h-4 w-4" />
              Nova Meta
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input placeholder="Ex: Viagem para Europa" value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Valor alvo (R$)</Label>
                  <Input type="number" step="0.01" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} className="h-11 rounded-xl" />
                </div>
                {editId && (
                  <div className="space-y-2">
                    <Label>Valor atual (R$)</Label>
                    <Input type="number" step="0.01" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} className="h-11 rounded-xl" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Prazo (opcional)</Label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <Button className="w-full gradient-primary shadow-md shadow-primary/25 border-0" onClick={handleSave}>
                {editId ? 'Salvar alterações' : 'Criar Meta'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Modal Quick-add aporte */}
      <Dialog open={contribOpen} onOpenChange={setContribOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Adicionar aporte {contribGoal && `· ${contribGoal.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Quanto você guardou?</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={contribValue}
                onChange={(e) => setContribValue(e.target.value)}
                className="h-11 rounded-xl"
                autoFocus
              />
              {contribGoal && (
                <p className="text-xs text-muted-foreground">
                  Atual: {formatCurrency(Number(contribGoal.currentAmount))} de {formatCurrency(Number(contribGoal.targetAmount))}
                </p>
              )}
            </div>
            <Button
              className="w-full gradient-primary shadow-md shadow-primary/25 border-0"
              onClick={handleContribute}
              disabled={contribSubmitting || !contribValue}
            >
              {contribSubmitting ? 'Adicionando...' : 'Adicionar aporte'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
          </div>
        </>
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
            action={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Criar minha primeira meta</Button>}
          />
        </div>
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Card>
              <CardContent className="p-3">
                <p className="text-[11px] text-muted-foreground font-medium" title="Quantas metas ainda não foram conquistadas">
                  Em progresso
                </p>
                <p className="text-base sm:text-lg font-semibold tabular-nums mt-1">
                  {kpis.inProgress}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                  {kpis.inProgress === 1 ? 'meta ativa' : 'metas ativas'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[11px] text-muted-foreground font-medium" title="Soma do valor já guardado em todas as metas (incluindo as conquistadas)">
                  Conquistado
                </p>
                <p className={cn(
                  'text-base sm:text-lg font-semibold tabular-nums mt-1',
                  kpis.conquered > 0 ? 'text-income' : 'text-muted-foreground',
                )}>
                  {formatCurrency(kpis.conquered)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[11px] text-muted-foreground font-medium" title="Soma do que falta guardar para concluir as metas em progresso">
                  Falta juntar
                </p>
                <p className="text-base sm:text-lg font-semibold tabular-nums mt-1 text-muted-foreground">
                  {formatCurrency(kpis.toGo)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Metas ativas */}
          <div className="grid gap-4 sm:grid-cols-2">
            {activeGoals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                onEdit={() => openEdit(g)}
                onDelete={() => handleDelete(g.id)}
                onContribute={() => openContribute(g)}
              />
            ))}
          </div>

          {/* Concluídas em toggle */}
          {completedGoals.length > 0 && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowCompleted((s) => !s)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    showCompleted ? 'rotate-0' : '-rotate-90',
                  )}
                />
                {showCompleted ? 'Ocultar' : 'Ver'} conquistadas ({completedGoals.length})
              </button>
              {showCompleted && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {completedGoals.map((g) => (
                    <GoalCard
                      key={g.id}
                      goal={g}
                      onEdit={() => openEdit(g)}
                      onDelete={() => handleDelete(g.id)}
                      onContribute={() => openContribute(g)}
                      muted
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function GoalCard({
  goal,
  onEdit,
  onDelete,
  onContribute,
  muted,
}: {
  goal: Goal
  onEdit: () => void
  onDelete: () => void
  onContribute: () => void
  muted?: boolean
}) {
  const target = Number(goal.targetAmount)
  const current = Number(goal.currentAmount)
  const percentage = target > 0 ? Math.round((current / target) * 100) : 0
  const pct = Math.min(percentage, 100)
  const goalColor = goal.color || '#10b981'
  const pace = paceInfoFor(goal)
  const isCompleted = pace.tone === 'completed'

  return (
    <Card className={cn('overflow-hidden', muted && 'opacity-75')}>
      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${goalColor}, ${goalColor}88)` }} />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2 min-w-0">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ring-1 ring-inset ring-black/5 dark:ring-white/10"
              style={{ backgroundColor: `${goalColor}1a` }}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-[18px] w-[18px]" style={{ color: goalColor }} strokeWidth={2} />
              ) : (
                <Target className="h-[18px] w-[18px]" style={{ color: goalColor }} strokeWidth={2} />
              )}
            </div>
            <span className="truncate">{goal.name}</span>
          </CardTitle>
          <div className="flex gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onEdit} aria-label="Editar meta">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Excluir meta" />}>
                <Trash2 className="h-3.5 w-3.5" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir meta &quot;{goal.name}&quot;?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O progresso desta meta será perdido.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between text-sm flex-wrap gap-2">
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="font-semibold">{formatCurrency(current)}</span>
            <span className="text-muted-foreground text-xs">de {formatCurrency(target)}</span>
          </div>
          <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-md', paceChipClass(pace.tone))}>
            {pace.label} · {percentage}%
          </span>
        </div>
        <div
          className="h-2.5 w-full rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${goalColor}, ${goalColor}cc)`,
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] gap-2">
          <p className="text-muted-foreground tabular-nums truncate">{pace.hint}</p>
          {goal.deadline && !isCompleted && (
            <span className="text-muted-foreground/70 shrink-0">
              {formatDate(goal.deadline)}
            </span>
          )}
        </div>
        {!isCompleted && (
          <Button
            onClick={onContribute}
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar aporte
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
