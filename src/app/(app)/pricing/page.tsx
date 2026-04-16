"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Check, X, Crown, Sparkles, MessageCircle, Mic, Camera,
  Lightbulb, BarChart3, Target, PieChart, Wallet, Download,
  Shield, Zap, ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'

const FEATURES = [
  { name: 'Dashboard completo', free: true, pro: true, icon: BarChart3 },
  { name: 'Transacoes por mes', free: '50', pro: 'Ilimitadas', icon: Wallet },
  { name: 'Contas bancarias', free: '2', pro: 'Ilimitadas', icon: Wallet },
  { name: 'Orcamentos', free: '3', pro: 'Ilimitados', icon: PieChart },
  { name: 'Metas financeiras', free: '1', pro: 'Ilimitadas', icon: Target },
  { name: 'Alertas de pagamento', free: '5 contas', pro: 'Ilimitados', icon: MessageCircle },
  { name: 'Bot Telegram — texto', free: true, pro: true, icon: MessageCircle },
  { name: 'Bot Telegram — audio', free: false, pro: true, icon: Mic },
  { name: 'Bot Telegram — foto de cupom', free: false, pro: true, icon: Camera },
  { name: 'Insights com IA', free: false, pro: true, icon: Lightbulb },
  { name: 'Categorizacao automatica', free: false, pro: true, icon: Sparkles },
  { name: 'Relatorios historicos (12 meses)', free: false, pro: true, icon: BarChart3 },
  { name: 'Exportar dados', free: false, pro: true, icon: Download },
  { name: 'Dados protegidos (LGPD)', free: true, pro: true, icon: Shield },
]

function FeatureValue({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="h-4 w-4 text-emerald-500" />
  if (value === false) return <X className="h-4 w-4 text-slate-300 dark:text-slate-600" />
  return <span className="text-sm font-medium">{value}</span>
}

export default function PricingPage() {
  const [plan, setPlan] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/user/plan')
      .then(r => r.json())
      .then(d => setPlan(d.data?.plan || 'FREE'))
      .catch(() => setPlan('FREE'))
  }, [])

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Escolha seu plano</h1>
        <p className="text-muted-foreground mt-2">
          Comece gratis. Evolua quando quiser.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Free */}
        <Card className={plan === 'FREE' ? 'ring-2 ring-primary' : ''}>
          <CardContent className="pt-6 pb-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold">Free</h2>
              <div className="mt-3">
                <span className="text-4xl font-extrabold">R$ 0</span>
                <span className="text-muted-foreground">/mes</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Para comecar a organizar</p>
            </div>
            {plan === 'FREE' ? (
              <Button disabled className="w-full" variant="outline">Plano atual</Button>
            ) : (
              <Button variant="outline" className="w-full">Plano Free</Button>
            )}
          </CardContent>
        </Card>

        {/* Pro */}
        <Card className={`relative ${plan === 'PRO' ? 'ring-2 ring-primary' : 'ring-2 ring-indigo-500 shadow-xl shadow-indigo-500/10'}`}>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 px-4 py-1 text-xs font-semibold shadow-lg">
              Mais popular
            </Badge>
          </div>
          <CardContent className="pt-8 pb-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Pro
              </h2>
              <div className="mt-3">
                <span className="text-4xl font-extrabold">R$ 14</span>
                <span className="text-xl font-bold">,90</span>
                <span className="text-muted-foreground">/mes</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Menos de R$ 0,50 por dia</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">Assistente financeiro com IA completa</p>
            </div>
            {plan === 'PRO' ? (
              <Button disabled className="w-full gradient-primary border-0">Plano atual</Button>
            ) : (
              <Button
                className="w-full gap-2 gradient-primary shadow-md shadow-primary/25 border-0"
                onClick={() => toast.info('Pagamento sera ativado em breve. Aguarde!')}
              >
                <Zap className="h-4 w-4" />
                Fazer upgrade
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feature comparison */}
      <Card>
        <CardContent className="pt-6 pb-6">
          <h3 className="font-bold text-center mb-6">Comparativo completo</h3>
          <div className="space-y-0">
            {/* Header */}
            <div className="grid grid-cols-3 gap-4 pb-3 border-b text-sm font-semibold text-muted-foreground">
              <span>Funcionalidade</span>
              <span className="text-center">Free</span>
              <span className="text-center">Pro</span>
            </div>
            {/* Rows */}
            {FEATURES.map((f) => (
              <div key={f.name} className="grid grid-cols-3 gap-4 py-3 border-b border-border/50 items-center">
                <span className="text-sm flex items-center gap-2">
                  <f.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  {f.name}
                </span>
                <span className="flex justify-center"><FeatureValue value={f.free} /></span>
                <span className="flex justify-center"><FeatureValue value={f.pro} /></span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottom CTA */}
      {plan !== 'PRO' && (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-4">
            O Finn Pro se paga sozinho. Um unico insight de economia ja cobre meses de assinatura.
          </p>
          <Button
            size="lg"
            className="gap-2 gradient-primary shadow-lg shadow-primary/25 border-0 px-8"
            onClick={() => toast.info('Pagamento sera ativado em breve. Aguarde!')}
          >
            <Crown className="h-5 w-5" />
            Comecar com o Pro
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
