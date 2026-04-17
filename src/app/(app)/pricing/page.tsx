"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Check, X, Crown, Sparkles, MessageCircle, Mic, Camera,
  Lightbulb, BarChart3, Target, PieChart, Wallet, Download,
  Shield, Zap, ArrowRight, Users,
} from 'lucide-react'
import { toast } from 'sonner'

const FEATURES: { name: string; free: boolean | string; pro: boolean | string; familia: boolean | string; icon: any }[] = [
  { name: 'Dashboard completo', free: true, pro: true, familia: true, icon: BarChart3 },
  { name: 'Transações por mês', free: '40', pro: 'Ilimitadas', familia: 'Ilimitadas', icon: Wallet },
  { name: 'Contas bancárias', free: '1', pro: 'Ilimitadas', familia: 'Ilimitadas', icon: Wallet },
  { name: 'Orçamentos', free: '2', pro: 'Ilimitados', familia: 'Ilimitados', icon: PieChart },
  { name: 'Metas financeiras', free: '1', pro: 'Ilimitadas', familia: 'Ilimitadas', icon: Target },
  { name: 'Alertas de pagamento', free: '5 contas', pro: 'Ilimitados', familia: 'Ilimitados', icon: MessageCircle },
  { name: 'Bot Telegram — texto', free: true, pro: true, familia: true, icon: MessageCircle },
  { name: 'Bot Telegram — áudio', free: '2/mês', pro: 'Ilimitados', familia: 'Ilimitados', icon: Mic },
  { name: 'Bot Telegram — foto de cupom', free: '2/mês', pro: 'Ilimitadas', familia: 'Ilimitadas', icon: Camera },
  { name: 'Insights com IA', free: false, pro: true, familia: true, icon: Lightbulb },
  { name: 'Categorização automática', free: false, pro: true, familia: true, icon: Sparkles },
  { name: 'Relatórios históricos', free: false, pro: true, familia: true, icon: BarChart3 },
  { name: 'Exportar dados', free: false, pro: true, familia: true, icon: Download },
  { name: 'Membros da família', free: '1', pro: '1', familia: 'Até 5', icon: Users },
  { name: 'Dashboard familiar', free: false, pro: false, familia: true, icon: BarChart3 },
  { name: 'Metas compartilhadas', free: false, pro: false, familia: true, icon: Target },
  { name: 'Dados protegidos (LGPD)', free: true, pro: true, familia: true, icon: Shield },
]

function FeatureValue({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="h-4 w-4 text-emerald-500" />
  if (value === false) return <X className="h-4 w-4 text-slate-300 dark:text-slate-600" />
  return <span className="text-xs font-medium">{value}</span>
}

export default function PricingPage() {
  const [plan, setPlan] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/user/plan')
      .then(r => r.json())
      .then(d => setPlan(d.data?.plan || 'FREE'))
      .catch(() => setPlan('FREE'))
  }, [])

  const upgradeMsg = () => toast.info('Pagamento será ativado em breve. Aguarde!')

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Escolha seu plano</h1>
        <p className="text-muted-foreground mt-2">
          Comece grátis. Evolua quando quiser.
        </p>
      </div>

      {/* Plan cards — 3 columns */}
      <div className="grid md:grid-cols-3 gap-5">
        {/* Free */}
        <Card className={plan === 'FREE' ? 'ring-2 ring-primary' : ''}>
          <CardContent className="pt-8 pb-6 flex flex-col h-full">
            <div className="text-center flex-1">
              <h2 className="text-lg font-bold mb-3">Free</h2>
              <div className="mb-1">
                <span className="text-4xl font-extrabold">R$ 0</span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
              <p className="text-xs text-transparent select-none mb-3" aria-hidden="true">&nbsp;</p>
              <p className="text-sm text-muted-foreground mb-6">Para começar a organizar</p>
            </div>
            {plan === 'FREE' ? (
              <Button disabled className="w-full" variant="outline">Plano atual</Button>
            ) : (
              <Button variant="outline" className="w-full">Plano Free</Button>
            )}
          </CardContent>
        </Card>

        {/* Pro */}
        <Card className={`relative ${plan === 'PRO' || plan === 'MASTER' ? 'ring-2 ring-primary' : 'ring-2 ring-indigo-500 shadow-xl shadow-indigo-500/10'}`}>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 px-4 py-1 text-xs font-semibold shadow-lg">
              Mais popular
            </Badge>
          </div>
          <CardContent className="pt-8 pb-6 flex flex-col h-full">
            <div className="text-center flex-1">
              <h2 className="text-lg font-bold flex items-center justify-center gap-1.5 mb-3">
                <Crown className="h-4 w-4 text-amber-500" />
                Pro
              </h2>
              <div className="mb-1">
                <span className="text-4xl font-extrabold">R$ 14</span>
                <span className="text-xl font-bold">,90</span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-3">Menos de R$ 0,50 por dia</p>
              <p className="text-sm text-muted-foreground mb-6">Assistente financeiro com IA</p>
            </div>
            {plan === 'PRO' || plan === 'MASTER' ? (
              <Button disabled className="w-full gradient-primary border-0">Plano atual</Button>
            ) : (
              <Button className="w-full gap-2 gradient-primary shadow-md shadow-primary/25 border-0" onClick={upgradeMsg}>
                <Zap className="h-4 w-4" />
                Fazer upgrade
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Família */}
        <Card className="relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-4 py-1 text-xs font-semibold shadow-lg">
              Melhor custo-benefício
            </Badge>
          </div>
          <CardContent className="pt-8 pb-6 flex flex-col h-full">
            <div className="text-center flex-1">
              <h2 className="text-lg font-bold flex items-center justify-center gap-1.5 mb-3">
                <Users className="h-4 w-4 text-amber-500" />
                Família
              </h2>
              <div className="mb-1">
                <span className="text-4xl font-extrabold">R$ 34</span>
                <span className="text-xl font-bold">,90</span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-3">R$ 6,98 por pessoa (até 5)</p>
              <p className="text-sm text-muted-foreground mb-6">Toda a família no controle</p>
            </div>
            <Button className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-md shadow-amber-500/25" onClick={upgradeMsg}>
              <Users className="h-4 w-4" />
              Escolher Família
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Feature comparison — 4 columns */}
      <Card>
        <CardContent className="pt-6 pb-6">
          <h3 className="font-bold text-center mb-6">Comparativo completo</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-3 font-semibold text-muted-foreground">Funcionalidade</th>
                  <th className="text-center pb-3 font-semibold text-muted-foreground w-24">Free</th>
                  <th className="text-center pb-3 font-semibold text-muted-foreground w-24">Pro</th>
                  <th className="text-center pb-3 font-semibold text-muted-foreground w-24">Família</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f) => (
                  <tr key={f.name} className="border-b border-border/50">
                    <td className="py-3 flex items-center gap-2">
                      <f.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      {f.name}
                    </td>
                    <td className="py-3 text-center"><FeatureValue value={f.free} /></td>
                    <td className="py-3 text-center"><FeatureValue value={f.pro} /></td>
                    <td className="py-3 text-center"><FeatureValue value={f.familia} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bottom CTA */}
      {plan !== 'PRO' && plan !== 'MASTER' && (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-4">
            O Finn Pro se paga sozinho. Um único insight de economia já cobre meses de assinatura.
          </p>
          <Button size="lg" className="gap-2 gradient-primary shadow-lg shadow-primary/25 border-0 px-8" onClick={upgradeMsg}>
            <Crown className="h-5 w-5" />
            Começar com o Pro
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
