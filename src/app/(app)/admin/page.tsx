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
} from 'lucide-react'
import { toast } from 'sonner'

interface UserData {
  id: string
  email: string
  name: string
  plan: string
  createdAt: string
  transactions: number
  accounts: number
  botConnected: boolean
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
}

export default function AdminPage() {
  const { user: authUser } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

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

  useEffect(() => {
    if (authorized) fetchData()
    else setLoading(false)
  }, [authorized, fetchData])

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
      <div>
        <h1 className="text-2xl font-bold">Painel Admin</h1>
        <p className="text-sm text-muted-foreground">Visão geral do Finn</p>
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
            { icon: Wallet, label: 'Contas bancárias', value: stats.totalAccounts, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
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

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuários ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usuário</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plano</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Transações</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Contas</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Bot</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cadastro</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          u.plan === 'PRO'
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-0'
                        }
                      >
                        {u.plan === 'PRO' ? '👑 Pro' : 'Free'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">{u.transactions}</td>
                    <td className="px-4 py-3 text-center">{u.accounts}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
