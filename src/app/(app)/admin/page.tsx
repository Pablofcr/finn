"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { isAdmin } from '@/lib/admin'
import {
  Users, Crown, TrendingUp, ArrowLeftRight, Wallet,
  DollarSign, UserPlus, MessageCircle, ShieldAlert,
  Clock, CheckCircle2, XCircle, PlayCircle, Presentation, ExternalLink,
  Megaphone,
} from 'lucide-react'
import { toast } from 'sonner'

type EngagementStatus = 'engaged' | 'warning' | 'at-risk' | 'inactive' | 'new'

interface UserData {
  id: string
  email: string
  name: string
  plan: string
  createdAt: string
  transactions: number
  accounts: number
  botConnected: boolean
  lastActivityAt: string | null
  daysSinceLast: number | null
  engagementStatus: EngagementStatus
  lastNudgeAt: string | null
  lastNudgeStatus: string | null
  lastNudgeEngagementStatus: string | null
  nudgeCount: number
}

interface Stats {
  totalUsers: number
  proUsers: number
  freeUsers: number
  conversionRate: string
  totalTransactions: number
  totalAccounts: number
  newUsersThisMonth: number
  newUsersThisWeek: number
  monthlyRevenue: number
  usersAtRisk: number
}

// Pills de engajamento — recomendação UX: severity colors do app + tooltip
// com dias. Sort default por urgência de ação (at-risk primeiro).
const ENGAGEMENT_PILL: Record<EngagementStatus, { label: string; class: string }> = {
  engaged:    { label: 'Engajado',  class: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  warning:    { label: 'Atenção',   class: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  'at-risk':  { label: 'Em risco',  class: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  inactive:   { label: 'Inativo',   class: 'bg-slate-500/15 text-slate-600 dark:text-slate-400' },
  new:        { label: 'Novo',      class: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
}

// Ordem de urgência: at-risk (salvar agora) > warning > inactive > engaged > new
const ENGAGEMENT_SORT: Record<EngagementStatus, number> = {
  'at-risk': 0,
  warning: 1,
  inactive: 2,
  engaged: 3,
  new: 4,
}

function engagementTooltip(status: EngagementStatus, days: number | null): string {
  if (status === 'new') return 'Cadastrado há poucos dias — em período de adaptação'
  if (days === null) return 'Sem atividade registrada'
  if (status === 'engaged') return days === 0 ? 'Ativo hoje' : `Ativo há ${days} ${days === 1 ? 'dia' : 'dias'}`
  if (status === 'warning') return `${days} dias sem atividade — atenção`
  if (status === 'at-risk') return `${days} dias sem atividade — precisa de contato`
  return `${days} dias sem atividade — provavelmente abandonado`
}

interface CronRun {
  id: string
  jobName: string
  startedAt: string
  finishedAt: string
  durationMs: number
  status: string
  checked: number
  sent: number
  skipped: number
  failed: number
  errorMsg: string | null
}

export default function AdminPage() {
  const { user: authUser } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [cronRuns, setCronRuns] = useState<CronRun[]>([])
  const [triggeringCron, setTriggeringCron] = useState(false)

  const userEmail = authUser?.email
  const authorized = isAdmin(userEmail)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin')
      if (res.status === 403) return
      if (res.ok) {
        const result = await res.json()
        setStats(result.data.stats)
        setUsers(result.data.users)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  const fetchCronRuns = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cron-runs')
      if (res.ok) {
        const result = await res.json()
        setCronRuns(result.data || [])
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (authorized) {
      fetchData()
      fetchCronRuns()
    } else {
      setLoading(false)
    }
  }, [authorized, fetchData, fetchCronRuns])

  async function triggerCron() {
    setTriggeringCron(true)
    try {
      const res = await fetch('/api/admin/cron-runs/trigger', { method: 'POST' })
      if (res.ok) {
        const result = await res.json()
        const { alertsSent, alertsSkipped, checked } = result.data
        toast.success(`Cron executado: ${alertsSent} enviados, ${alertsSkipped} pulados, ${checked} verificados.`)
        fetchCronRuns()
      } else {
        toast.error('Falha ao disparar o cron.')
      }
    } catch {
      toast.error('Falha ao disparar o cron.')
    }
    setTriggeringCron(false)
  }

  async function handleChangePlan(userId: string, newPlan: string) {
    setUpdating(userId)
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, plan: newPlan }),
      })
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlan } : u))
        toast.success(`Plano alterado para ${newPlan}`)
      }
    } catch {
      toast.error('Não foi possível alterar o plano.')
    }
    setUpdating(null)
  }

  if (!authorized) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-fade-in">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h2 className="text-lg font-semibold">Acesso restrito</h2>
        <p className="text-sm text-muted-foreground">Esta página é exclusiva para administradores.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6 stagger-children">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Painel Admin</h1>
          <p className="text-sm text-muted-foreground">Visão geral do Finn</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/marketing.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-semibold px-4 py-2.5 shadow-md shadow-emerald-500/30 transition"
            title="Plano de marketing 30 dias com calendário diário, hooks, DM script e estratégia de canais"
          >
            <Megaphone className="h-4 w-4" />
            Plano de marketing
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </a>
          <a
            href="/pitch.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white text-sm font-semibold px-4 py-2.5 shadow-md shadow-violet-500/30 transition"
            title="Abre o pitch deck pra investidores e potenciais compradores em nova aba"
          >
            <Presentation className="h-4 w-4" />
            Pitch deck
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </a>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Users, label: 'Total de usuários', value: stats.totalUsers, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
            { icon: Crown, label: 'Usuários Pro', value: stats.proUsers, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
            { icon: Users, label: 'Usuários Free', value: stats.freeUsers, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-500/10' },
            { icon: TrendingUp, label: 'Taxa de conversão', value: `${stats.conversionRate}%`, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
            { icon: ArrowLeftRight, label: 'Transações totais', value: stats.totalTransactions, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
            { icon: ShieldAlert, label: 'Em risco esta semana', value: stats.usersAtRisk, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
            { icon: UserPlus, label: 'Novos esta semana', value: stats.newUsersThisWeek, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
            { icon: DollarSign, label: 'Receita mensal (est.)', value: `R$ ${stats.monthlyRevenue.toFixed(2)}`, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg} shrink-0`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-lg font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cron Runs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Execuções do cron (últimos 50)
          </CardTitle>
          <Button
            size="sm"
            onClick={triggerCron}
            disabled={triggeringCron}
            className="gap-2"
          >
            <PlayCircle className="h-4 w-4" />
            {triggeringCron ? 'Executando...' : 'Disparar agora'}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {cronRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-6 text-center">
              Nenhuma execução registrada ainda. O cron roda diariamente às 06:00 BRT. Use &quot;Disparar agora&quot; pra testar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Job</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Quando</th>
                    <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                    <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Enviados</th>
                    <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Pulados</th>
                    <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Falhas</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Duração</th>
                  </tr>
                </thead>
                <tbody>
                  {cronRuns.map((run) => (
                    <tr key={run.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-mono text-xs">{run.jobName}</td>
                      <td className="px-4 py-2.5 text-xs">
                        {new Date(run.startedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {run.status === 'success' ? (
                          <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-300 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> ok
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-rose-600 border-rose-300 dark:text-rose-400">
                            <XCircle className="h-3 w-3" /> erro
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">{run.sent}</td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">{run.skipped}</td>
                      <td className={`px-4 py-2.5 text-center ${run.failed > 0 ? 'text-rose-600 font-semibold' : 'text-muted-foreground'}`}>
                        {run.failed}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">{run.durationMs}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Table — sorted por urgência de engajamento (at-risk primeiro) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuários ({users.length})
            <span className="text-xs text-muted-foreground font-normal ml-2">
              ordenados por urgência de engajamento
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usuário</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Engajamento</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Último nudge</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plano</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Transações</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Bot</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cadastro</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {[...users].sort((a, b) =>
                  ENGAGEMENT_SORT[a.engagementStatus] - ENGAGEMENT_SORT[b.engagementStatus],
                ).map((u) => {
                  const pill = ENGAGEMENT_PILL[u.engagementStatus]
                  return (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md ${pill.class}`}
                        title={engagementTooltip(u.engagementStatus, u.daysSinceLast)}
                      >
                        {pill.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.lastNudgeAt ? (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                            u.lastNudgeStatus === 'sent'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                          title={`Status no envio: ${u.lastNudgeEngagementStatus} · Total enviados: ${u.nudgeCount}/3`}
                        >
                          {u.lastNudgeStatus === 'sent' ? '✓' : '✗'}{' '}
                          {new Date(u.lastNudgeAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          {u.nudgeCount > 1 && <span className="opacity-70">({u.nudgeCount}x)</span>}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          u.plan === 'MASTER'
                            ? 'bg-gradient-to-r from-amber-500 to-red-500 text-white border-0'
                            : u.plan === 'PRO'
                              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-0'
                        }
                      >
                        {u.plan === 'MASTER' ? '⚡ Master' : u.plan === 'PRO' ? '👑 Pro' : 'Free'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">{u.transactions}</td>
                    <td className="px-4 py-3 text-center">
                      {u.botConnected ? (
                        <MessageCircle className="h-4 w-4 text-emerald-500 mx-auto" />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.plan === 'FREE' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          disabled={updating === u.id}
                          onClick={() => handleChangePlan(u.id, 'PRO')}
                        >
                          {updating === u.id ? '...' : 'Ativar Pro'}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground"
                          disabled={updating === u.id}
                          onClick={() => handleChangePlan(u.id, 'FREE')}
                        >
                          {updating === u.id ? '...' : 'Rebaixar'}
                        </Button>
                      )}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
