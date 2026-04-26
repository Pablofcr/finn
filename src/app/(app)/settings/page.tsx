"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { getInitials, formatPhone } from '@/lib/utils'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { User, Bell, Globe, LogOut, Save, Download, Trash2, Shield } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const CURRENCIES = [
  { value: 'BRL', label: 'Real (R$)' },
  { value: 'USD', label: 'Dólar (US$)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'Libra (£)' },
]

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Belem', label: 'Belém (GMT-3)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
  { value: 'America/Recife', label: 'Recife (GMT-3)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
]

interface NotificationSettings {
  emailNotifications: boolean
  pushNotifications: boolean
  budgetAlerts: boolean
  goalAlerts: boolean
  weeklyReport: boolean
  monthlyReport: boolean
  botConfirmations: boolean
  autoInsights: boolean
  telegramInsights: boolean
  telegramAlerts: boolean
  eveningPaymentReminder: boolean
}

export default function SettingsPage() {
  const { user: authUser, signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Profile
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [currency, setCurrency] = useState('BRL')
  const [timezone, setTimezone] = useState('America/Sao_Paulo')

  // Notifications
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    budgetAlerts: true,
    goalAlerts: true,
    weeklyReport: true,
    monthlyReport: true,
    botConfirmations: true,
    autoInsights: true,
    telegramInsights: true,
    telegramAlerts: true,
    eveningPaymentReminder: true,
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [userRes, notifRes] = await Promise.all([
        fetch('/api/user').then(r => r.json()),
        fetch('/api/settings/notifications').then(r => r.json()),
      ])

      if (userRes.data) {
        setName(userRes.data.name || '')
        setEmail(userRes.data.email || '')
        setPhone(userRes.data.phone || '')
        setAvatarUrl(userRes.data.avatarUrl || '')
        setCurrency(userRes.data.defaultCurrency || 'BRL')
        setTimezone(userRes.data.timezone || 'America/Sao_Paulo')
      }

      if (notifRes.data) {
        setNotifications({
          emailNotifications: notifRes.data.emailNotifications,
          pushNotifications: notifRes.data.pushNotifications,
          budgetAlerts: notifRes.data.budgetAlerts,
          goalAlerts: notifRes.data.goalAlerts,
          weeklyReport: notifRes.data.weeklyReport,
          monthlyReport: notifRes.data.monthlyReport,
          botConfirmations: notifRes.data.botConfirmations,
          autoInsights: notifRes.data.autoInsights ?? true,
          telegramInsights: notifRes.data.telegramInsights ?? true,
          telegramAlerts: notifRes.data.telegramAlerts ?? true,
          eveningPaymentReminder: notifRes.data.eveningPaymentReminder ?? true,
        })
      }
    } catch {
      toast.error('Não conseguimos carregar suas configurações. Tente novamente em instantes.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleSaveProfile() {
    setSaving(true)
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone: phone || null, defaultCurrency: currency, timezone }),
      })
      if (res.ok) {
        toast.success('Perfil atualizado! Suas alterações já estão valendo.')
      } else {
        toast.error('Não foi possível salvar o perfil. Verifique os dados e tente novamente.')
      }
    } catch {
      toast.error('Não foi possível salvar o perfil. Tente novamente em instantes.')
    }
    setSaving(false)
  }

  async function handleSaveNotifications() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifications),
      })
      if (res.ok) {
        toast.success('Notificações atualizadas! Você receberá alertas conforme configurado.')
      } else {
        toast.error('Não foi possível salvar as notificações. Tente novamente.')
      }
    } catch {
      toast.error('Não foi possível salvar as notificações. Tente novamente em instantes.')
    }
    setSaving(false)
  }

  function toggleNotification(key: keyof NotificationSettings) {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (loading) {
    return (
      <div className="space-y-6 stagger-children">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold">Configurações</h1>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar size="lg" className="h-16 w-16">
              {avatarUrl && <AvatarImage src={avatarUrl} />}
              <AvatarFallback className="text-lg">{getInitials(name || 'U')}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{name}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} disabled className="h-11 rounded-xl opacity-60" />
            <p className="text-xs text-muted-foreground">O email não pode ser alterado aqui.</p>
          </div>

          <Button onClick={handleSaveProfile} disabled={saving} className="gap-2 gradient-primary shadow-md shadow-primary/25 border-0">
            <Save className="h-4 w-4" />
            Salvar Perfil
          </Button>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Preferências
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Moeda Padrão</Label>
              <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue>
                    {CURRENCIES.find((c) => c.value === currency)?.label || ''}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fuso Horário</Label>
              <Select value={timezone} onValueChange={(v) => v && setTimezone(v)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue>
                    {TIMEZONES.find((tz) => tz.value === timezone)?.label || ''}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSaveProfile} disabled={saving} className="gap-2 gradient-primary shadow-md shadow-primary/25 border-0">
            <Save className="h-4 w-4" />
            Salvar Preferências
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'emailNotifications' as const, label: 'Notificações por email', desc: 'Receba alertas e resumos por email' },
            { key: 'pushNotifications' as const, label: 'Notificações push', desc: 'Notificações no navegador' },
            { key: 'budgetAlerts' as const, label: 'Alertas de orçamento', desc: 'Aviso quando atingir o limite do orçamento' },
            { key: 'goalAlerts' as const, label: 'Alertas de metas', desc: 'Notificação quando alcançar uma meta' },
            { key: 'weeklyReport' as const, label: 'Resumo semanal', desc: 'Resumo financeiro toda semana' },
            { key: 'monthlyReport' as const, label: 'Resumo mensal', desc: 'Relatório completo todo mês' },
            { key: 'botConfirmations' as const, label: 'Confirmações do bot', desc: 'Confirmar transações criadas pelo assistente' },
            { key: 'autoInsights' as const, label: 'Insights automáticos', desc: 'Gerar análises financeiras semanalmente com IA' },
            { key: 'telegramInsights' as const, label: 'Insights pelo Telegram', desc: 'Receber insights importantes no Telegram' },
            { key: 'telegramAlerts' as const, label: 'Alertas pelo Telegram', desc: 'Receber lembretes de vencimento no Telegram' },
            { key: 'eveningPaymentReminder' as const, label: 'Lembrete de fim de dia', desc: 'Reenvio às 18h no vencimento se ainda não foi marcado como pago' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={notifications[item.key]}
                onCheckedChange={() => toggleNotification(item.key)}
              />
            </div>
          ))}

          <Button onClick={handleSaveNotifications} disabled={saving} className="gap-2 gradient-primary shadow-md shadow-primary/25 border-0">
            <Save className="h-4 w-4" />
            Salvar Notificações
          </Button>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Privacidade e Dados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export data */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium">Exportar meus dados</p>
              <p className="text-xs text-muted-foreground">Baixe todas as suas informações financeiras em formato JSON.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={async () => {
                toast.info('Preparando seus dados...')
                try {
                  const res = await fetch('/api/user/export')
                  if (!res.ok) throw new Error()
                  const blob = await res.blob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'finn-dados-export.json'
                  a.click()
                  URL.revokeObjectURL(url)
                  toast.success('Dados exportados com sucesso!')
                } catch {
                  toast.error('Não foi possível exportar seus dados. Tente novamente.')
                }
              }}
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>

          {/* Install app */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium">Instalar o Finn</p>
              <p className="text-xs text-muted-foreground">Adicione o Finn na tela inicial do seu celular.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                localStorage.removeItem('finn-installed')
                window.location.reload()
              }}
            >
              <Download className="h-4 w-4" />
              Instalar
            </Button>
          </div>

          {/* Privacy policy link */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium">Política de Privacidade</p>
              <p className="text-xs text-muted-foreground">Veja como tratamos e protegemos seus dados.</p>
            </div>
            <Link href="/privacy">
              <Button variant="outline" size="sm" className="gap-2">
                <Shield className="h-4 w-4" />
                Ver política
              </Button>
            </Link>
          </div>

          {/* Security page link */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium">Sua Segurança</p>
              <p className="text-xs text-muted-foreground">Entenda como protegemos suas informações.</p>
            </div>
            <Link href="/security">
              <Button variant="outline" size="sm" className="gap-2">
                <Shield className="h-4 w-4" />
                Ver segurança
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card className="border-red-200 dark:border-red-900/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sair da conta</p>
              <p className="text-xs text-muted-foreground">Você será redirecionado para a tela de login.</p>
            </div>
            <Button variant="outline" onClick={signOut} className="gap-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-950/20">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete account */}
      <Card className="border-red-200 dark:border-red-900/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-destructive">Excluir minha conta</p>
              <p className="text-xs text-muted-foreground">
                Todos os seus dados serão removidos permanentemente. Esta ação não pode ser desfeita.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="outline" size="sm" className="gap-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-950/20" />}>
                <Trash2 className="h-4 w-4" />
                Excluir
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza que deseja excluir sua conta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é permanente e irreversível. Todos os seus dados financeiros,
                    transações, contas, metas e configurações serão excluídos definitivamente.
                    Recomendamos exportar seus dados antes de continuar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={async () => {
                      toast.info('Excluindo sua conta...')
                      try {
                        const res = await fetch('/api/user/delete', { method: 'DELETE' })
                        if (!res.ok) throw new Error()
                        toast.success('Conta excluída. Sentiremos sua falta.')
                        signOut()
                      } catch {
                        toast.error('Não foi possível excluir a conta. Tente novamente.')
                      }
                    }}
                  >
                    Sim, excluir tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
