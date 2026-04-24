"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Bot, Send, CheckCircle, Copy, ExternalLink,
  Bell, Shield, MessageCircle, Unplug,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/contexts/auth-context'
import { isAdmin } from '@/lib/admin'

interface ConnectionStatus {
  connected: boolean
  platformUserId?: string
  verificationCode?: string | null
}

function ChatBubble({
  from,
  children,
  delay = 0,
}: {
  from: 'bot' | 'user'
  children: React.ReactNode
  delay?: number
}) {
  return (
    <div
      className={cn(
        'flex animate-fade-in',
        from === 'user' ? 'justify-end' : 'justify-start'
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          from === 'bot'
            ? 'bg-muted text-foreground rounded-bl-md'
            : 'gradient-primary text-white rounded-br-md'
        )}
      >
        {children}
      </div>
    </div>
  )
}

function TutorialChat({ botUsername, verificationCode }: { botUsername: string; verificationCode: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Como conectar — passo a passo</p>
        </div>

        <div className="space-y-3">
          <ChatBubble from="bot" delay={0}>
            Olá! Eu sou o <strong>Finn</strong> 🤖<br />
            Vou te ajudar a nunca esquecer um pagamento!
          </ChatBubble>

          <ChatBubble from="bot" delay={100}>
            <strong>Passo 1:</strong> Abra o Telegram e pesquise por:<br />
            <code className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono">@{botUsername}</code>
          </ChatBubble>

          <ChatBubble from="bot" delay={200}>
            <strong>Passo 2:</strong> Envie esta mensagem para o bot:
            <div className="mt-2 flex items-center gap-2 bg-black/10 dark:bg-white/10 rounded-lg px-3 py-2">
              <code className="font-mono text-xs flex-1">/start {verificationCode}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`/start ${verificationCode}`)
                  toast.success('Comando copiado!')
                }}
                className="p-1 hover:bg-black/10 rounded transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </ChatBubble>

          <ChatBubble from="user" delay={300}>
            /start {verificationCode}
          </ChatBubble>

          <ChatBubble from="bot" delay={400}>
            <strong>✅ Conectado com sucesso!</strong><br />
            A partir de agora você vai receber lembretes de pagamento aqui!
          </ChatBubble>

          <ChatBubble from="bot" delay={500}>
            <strong>Exemplo de lembrete:</strong><br /><br />
            🔔 <strong>Lembrete de pagamento</strong><br />
            <strong>Condomínio</strong><br />
            💰 R$ 620,00<br />
            📅 Vence amanhã<br /><br />
            <span className="inline-flex gap-2 mt-1">
              <span className="bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-xs font-medium">✅ Paguei</span>
              <span className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded text-xs font-medium">⏰ Lembrar amanhã</span>
            </span>
          </ChatBubble>
        </div>

        <div className="mt-5 pt-4 border-t">
          <a
            href={`https://t.me/${botUsername}?start=${verificationCode}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="w-full gap-2 gradient-primary shadow-md shadow-primary/25 border-0">
              <Send className="h-4 w-4" />
              Abrir no Telegram
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </a>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Ou pesquise <strong>@{botUsername}</strong> no Telegram
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ConnectedState({ onDisconnect }: { onDisconnect: () => void }) {
  return (
    <div className="space-y-6">
      {/* Status banner */}
      <Card className="border-green-200 dark:border-green-900/30 bg-green-50/50 dark:bg-green-500/5">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="font-semibold">Telegram conectado e ativo!</p>
                <p className="text-sm text-muted-foreground">
                  Seu assistente financeiro está funcionando 24 horas por dia.
                </p>
              </div>
            </div>
            <Badge className="bg-green-500/10 text-green-600 border-0 text-xs">Ativo</Badge>
          </div>
        </CardContent>
      </Card>

      {/* All capabilities */}
      <div>
        <h2 className="text-lg font-bold mb-4">O que você pode fazer pelo Telegram</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              icon: Send,
              title: 'Registrar por texto',
              desc: 'Escreva naturalmente e o Finn entende. Exemplo: "Gastei 50 no mercado".',
              color: 'text-blue-500',
              bg: 'bg-blue-50 dark:bg-blue-500/10',
            },
            {
              icon: Bell,
              title: 'Registrar por áudio',
              desc: 'Grave um áudio descrevendo a transação e a IA transcreve e registra tudo.',
              color: 'text-purple-500',
              bg: 'bg-purple-50 dark:bg-purple-500/10',
            },
            {
              icon: CheckCircle,
              title: 'Ler cupons fiscais',
              desc: 'Envie uma foto do cupom ou nota fiscal e o Finn extrai os dados automaticamente.',
              color: 'text-cyan-500',
              bg: 'bg-cyan-50 dark:bg-cyan-500/10',
            },
            {
              icon: Bell,
              title: 'Alertas de vencimento',
              desc: 'Receba lembretes 3 dias antes, 1 dia antes e no dia do vencimento das suas contas.',
              color: 'text-amber-500',
              bg: 'bg-amber-50 dark:bg-amber-500/10',
            },
            {
              icon: CheckCircle,
              title: 'Confirmar com um toque',
              desc: 'Ao receber um alerta, toque em "Paguei" e a transação é registrada e o saldo atualizado.',
              color: 'text-emerald-500',
              bg: 'bg-emerald-50 dark:bg-emerald-500/10',
            },
            {
              icon: Bell,
              title: 'Insights semanais da IA',
              desc: 'Toda semana você recebe análises inteligentes dos seus gastos com dicas personalizadas.',
              color: 'text-indigo-500',
              bg: 'bg-indigo-50 dark:bg-indigo-500/10',
            },
            {
              icon: Shield,
              title: 'Transações recorrentes',
              desc: 'Diga "Condomínio 620 todo mês" e o Finn cria a transação e a recorrência automática.',
              color: 'text-rose-500',
              bg: 'bg-rose-50 dark:bg-rose-500/10',
            },
            {
              icon: CheckCircle,
              title: 'Entende datas',
              desc: '"Ontem gastei 30 na farmácia" — o Finn reconhece a data e registra corretamente.',
              color: 'text-teal-500',
              bg: 'bg-teal-50 dark:bg-teal-500/10',
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 rounded-xl border border-border/50 p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.bg} shrink-0`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold mb-0.5">{item.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Examples */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <h3 className="font-semibold mb-3">Exemplos de mensagens que o bot entende:</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              'Gastei 50 no mercado',
              'Recebi 3000 de salário',
              'Ontem paguei 120 de luz',
              'Condomínio 800 todo mês',
              'Assinatura Netflix 44,90',
              'Paulo me pagou 200 reais',
            ].map((ex) => (
              <div key={ex} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                <Send className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <code className="text-xs">{ex}</code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Disconnect */}
      <div className="pt-2">
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" />}>
            <Unplug className="h-4 w-4" />
            Desconectar Telegram
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desconectar Telegram?</AlertDialogTitle>
              <AlertDialogDescription>
                Você deixará de receber alertas de pagamento, insights e não poderá registrar transações pelo chat. Pode reconectar a qualquer momento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onDisconnect}>
                Desconectar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

function WhatsAppBubble({
  from,
  children,
  delay = 0,
}: {
  from: 'bot' | 'user'
  children: React.ReactNode
  delay?: number
}) {
  return (
    <div
      className={cn('flex animate-fade-in', from === 'user' ? 'justify-end' : 'justify-start')}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
          from === 'bot'
            ? 'bg-white dark:bg-muted text-foreground rounded-bl-md border border-border/50'
            : 'bg-[#DCF8C6] dark:bg-green-900/40 text-foreground dark:text-green-100 rounded-br-md'
        )}
      >
        {children}
      </div>
    </div>
  )
}

function WhatsAppTutorialChat({
  whatsappNumber,
  verificationCode,
}: {
  whatsappNumber: string
  verificationCode: string
}) {
  const displayNumber = whatsappNumber || '+55 85 98794-2255'
  const waLinkNumber = displayNumber.replace(/\D/g, '')
  const waLink = `https://wa.me/${waLinkNumber}?text=${encodeURIComponent(verificationCode)}`

  return (
    <Card className="border-dashed border-green-300 dark:border-green-900/50 bg-gradient-to-b from-green-50/40 to-transparent dark:from-green-500/5">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">
            Como conectar o WhatsApp — passo a passo
          </p>
        </div>

        <div className="space-y-3">
          <WhatsAppBubble from="bot" delay={0}>
            Olá! Eu sou o <strong>Finn</strong> 💚<br />
            Vou te ajudar a registrar e acompanhar suas finanças pelo WhatsApp.
          </WhatsAppBubble>

          <WhatsAppBubble from="bot" delay={100}>
            <strong>Passo 1:</strong> Toque no botão abaixo &mdash; vai abrir o WhatsApp já com a conversa pronta.
          </WhatsAppBubble>

          <WhatsAppBubble from="bot" delay={200}>
            <strong>Passo 2:</strong> Envie esta mensagem com seu código de verificação:
            <div className="mt-2 flex items-center gap-2 bg-black/5 dark:bg-white/10 rounded-lg px-3 py-2">
              <code className="font-mono text-xs flex-1">{verificationCode}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(verificationCode)
                  toast.success('Código copiado!')
                }}
                className="p-1 hover:bg-black/10 rounded transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </WhatsAppBubble>

          <WhatsAppBubble from="user" delay={300}>
            {verificationCode}
          </WhatsAppBubble>

          <WhatsAppBubble from="bot" delay={400}>
            <strong>✅ Conectado com sucesso!</strong><br />
            A partir de agora você pode registrar transações por aqui.
          </WhatsAppBubble>

          <WhatsAppBubble from="bot" delay={500}>
            <strong>Exemplos do que você pode me enviar:</strong>
            <ul className="mt-1.5 space-y-0.5">
              <li>• "Gastei 50 no mercado"</li>
              <li>• Foto do cupom fiscal 📷</li>
              <li>• Áudio: "paguei 120 de luz ontem" 🎙️</li>
            </ul>
          </WhatsAppBubble>
        </div>

        <div className="mt-5 pt-4 border-t">
          <a href={waLink} target="_blank" rel="noopener noreferrer">
            <Button className="w-full gap-2 bg-[#25D366] hover:bg-[#20bf5b] text-white shadow-md shadow-green-500/25 border-0">
              <Send className="h-4 w-4" />
              Abrir no WhatsApp
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </a>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Ou envie manualmente <strong>{displayNumber}</strong> · código <strong>{verificationCode}</strong>
          </p>
          <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Aguardando sua mensagem…
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function AdminWhatsAppTool() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [connecting, setConnecting] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/bot/whatsapp/connect')
      if (res.ok) {
        const result = await res.json()
        setStatus(result.data)
        if (result.data.whatsappNumber) setWhatsappNumber(result.data.whatsappNumber)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  useEffect(() => {
    if (!status?.verificationCode || status.connected) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/bot/whatsapp/connect')
        if (res.ok) {
          const result = await res.json()
          if (result.data.connected) {
            setStatus(result.data)
            toast.success('WhatsApp conectado! 🎉')
            clearInterval(interval)
          }
        }
      } catch { /* ignore */ }
    }, 3000)
    return () => clearInterval(interval)
  }, [status?.verificationCode, status?.connected])

  async function handleConnect() {
    setConnecting(true)
    try {
      const res = await fetch('/api/bot/whatsapp/connect', { method: 'POST' })
      if (res.ok) {
        const result = await res.json()
        setStatus({ connected: false, verificationCode: result.data.verificationCode })
        setWhatsappNumber(result.data.whatsappNumber)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Falha ao gerar código.')
      }
    } catch {
      toast.error('Falha ao gerar código.')
    }
    setConnecting(false)
  }

  async function handleDisconnect() {
    try {
      const res = await fetch('/api/bot/whatsapp/connect', { method: 'DELETE' })
      if (res.ok) {
        setStatus({ connected: false })
        toast.success('WhatsApp desconectado.')
      }
    } catch {
      toast.error('Falha ao desconectar.')
    }
  }

  return (
    <div className="mt-10 pt-6 border-t border-dashed">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Admin · Teste WhatsApp
        </p>
      </div>

      {status?.connected ? (
        <Card className="border-green-200 dark:border-green-900/30 bg-green-50/50 dark:bg-green-500/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">WhatsApp conectado</p>
                  <p className="text-xs text-muted-foreground">
                    Número vinculado: <code className="text-xs">{status.platformUserId}</code>
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleDisconnect}>
                <Unplug className="h-3.5 w-3.5 mr-1" />
                Desconectar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : status?.verificationCode ? (
        <WhatsAppTutorialChat
          whatsappNumber={whatsappNumber}
          verificationCode={status.verificationCode}
        />
      ) : (
        <Button variant="outline" size="sm" onClick={handleConnect} disabled={connecting} className="gap-2">
          <MessageCircle className="h-3.5 w-3.5" />
          {connecting ? 'Gerando código…' : 'Conectar WhatsApp'}
        </Button>
      )}
    </div>
  )
}

export default function BotPage() {
  const { user } = useAuth()
  const userIsAdmin = isAdmin(user?.email)
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [botUsername, setBotUsername] = useState('FinnFinancasBot')

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/bot/telegram/connect')
      if (res.ok) {
        const result = await res.json()
        setStatus(result.data)
      }
    } catch {
      toast.error('Não foi possível verificar a conexão.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  async function handleConnect() {
    setConnecting(true)
    try {
      const res = await fetch('/api/bot/telegram/connect', { method: 'POST' })
      if (res.ok) {
        const result = await res.json()
        setStatus({ connected: false, verificationCode: result.data.verificationCode })
        setBotUsername(result.data.botUsername)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Não foi possível iniciar a conexão.')
      }
    } catch {
      toast.error('Não foi possível iniciar a conexão. Tente novamente.')
    }
    setConnecting(false)
  }

  async function handleDisconnect() {
    try {
      const res = await fetch('/api/bot/telegram/connect', { method: 'DELETE' })
      if (res.ok) {
        setStatus({ connected: false })
        toast.success('Telegram desconectado.')
      }
    } catch {
      toast.error('Não foi possível desconectar. Tente novamente.')
    }
  }

  // Poll for connection verification
  useEffect(() => {
    if (!status?.verificationCode || status.connected) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/bot/telegram/connect')
        if (res.ok) {
          const result = await res.json()
          if (result.data.connected) {
            setStatus(result.data)
            toast.success('Telegram conectado com sucesso! 🎉')
            clearInterval(interval)
          }
        }
      } catch { /* ignore polling errors */ }
    }, 3000)

    return () => clearInterval(interval)
  }, [status?.verificationCode, status?.connected])

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Assistente Finn</h1>
        <p className="text-sm text-muted-foreground">
          Seu assistente financeiro no Telegram — registre, acompanhe e nunca perca um vencimento.
        </p>
      </div>

      {status?.connected ? (
        <ConnectedState onDisconnect={handleDisconnect} />
      ) : status?.verificationCode ? (
        <TutorialChat
          botUsername={botUsername}
          verificationCode={status.verificationCode}
        />
      ) : (
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex flex-col items-center text-center space-y-5 py-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                <Bot className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2 max-w-md">
                <h2 className="text-xl font-bold">Nunca mais esqueça um pagamento</h2>
                <p className="text-sm text-muted-foreground">
                  Conecte seu Telegram e receba lembretes automáticos antes do vencimento.
                  Confirme pagamentos com um toque e o Finn dá baixa na transação.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left">
                {[
                  { icon: Bell, title: 'Lembrete automático', desc: 'Alertas 3 dias antes e no dia' },
                  { icon: CheckCircle, title: 'Um toque para pagar', desc: 'Confirme direto no Telegram' },
                  { icon: Shield, title: 'Saldo atualizado', desc: 'Tudo sincronizado com o app' },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl border border-border/50 p-3">
                    <item.icon className="h-5 w-5 text-primary mb-2" />
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full sm:w-auto gap-2 gradient-primary shadow-md shadow-primary/25 border-0"
              >
                <Send className="h-4 w-4" />
                {connecting ? 'Gerando código...' : 'Conectar Telegram'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {userIsAdmin && <AdminWhatsAppTool />}
    </div>
  )
}
