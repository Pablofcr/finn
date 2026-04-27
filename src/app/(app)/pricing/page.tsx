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
  { name: 'Assistente WhatsApp — texto', free: true, pro: true, familia: true, icon: MessageCircle },
  { name: 'Assistente WhatsApp — áudio', free: '2/mês', pro: 'Ilimitados', familia: 'Ilimitados', icon: Mic },
  { name: 'Assistente WhatsApp — foto de cupom', free: '2/mês', pro: 'Ilimitadas', familia: 'Ilimitadas', icon: Camera },
  { name: 'Conversa em linguagem natural com IA', free: false, pro: true, familia: true, icon: Sparkles },
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
  if (value === true) return <Check className="h-5 w-5 text-emerald-500 mx-auto" />
  if (value === false) return <X className="h-5 w-5 text-slate-300 dark:text-slate-600 mx-auto" />
  return <span className="text-sm font-semibold">{value}</span>
}

export default function PricingPage() {
  const [plan, setPlan] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/user/plan')
      .then(r => r.json())
      .then(d => {
        const p = d.data?.plan || 'FREE'
        setPlan(p)
        setSelected(p)
      })
      .catch(() => { setPlan('FREE'); setSelected('FREE') })
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

      {/* Plan cards — 3 columns, selectable */}
      <div className="grid md:grid-cols-3 gap-5">
        {/* Free */}
        <button type="button" onClick={() => setSelected('FREE')} className="text-left">
          <Card className={`h-full transition-all duration-200 hover:shadow-lg cursor-pointer ${selected === 'FREE' ? 'ring-2 ring-primary shadow-lg scale-[1.02]' : 'hover:scale-[1.01]'}`}>
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
                <div className="w-full py-2.5 rounded-xl border text-center text-sm font-semibold text-muted-foreground">Plano atual</div>
              ) : (
                <div className="w-full py-2.5 rounded-xl border text-center text-sm font-semibold">Plano Free</div>
              )}
            </CardContent>
          </Card>
        </button>

        {/* Pro */}
        <button type="button" onClick={() => setSelected('PRO')} className="text-left">
          <Card className={`h-full transition-all duration-200 hover:shadow-lg cursor-pointer ${selected === 'PRO' ? 'ring-2 ring-indigo-500 shadow-xl shadow-indigo-500/10 scale-[1.02]' : 'hover:scale-[1.01]'}`}>
            <CardContent className="pt-6 pb-6 flex flex-col h-full">
              <div className="flex justify-center mb-3">
                <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 px-4 py-1 text-xs font-semibold">
                  Mais popular
                </Badge>
              </div>
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
                <div className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-center text-sm font-semibold">Plano atual</div>
              ) : (
                <div className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-center text-sm font-semibold flex items-center justify-center gap-1.5" onClick={upgradeMsg}>
                  <Zap className="h-4 w-4" />
                  Fazer upgrade
                </div>
              )}
            </CardContent>
          </Card>
        </button>

        {/* Família */}
        <button type="button" onClick={() => setSelected('FAMILIA')} className="text-left">
          <Card className={`h-full transition-all duration-200 hover:shadow-lg cursor-pointer ${selected === 'FAMILIA' ? 'ring-2 ring-amber-500 shadow-xl shadow-amber-500/10 scale-[1.02]' : 'hover:scale-[1.01]'}`}>
            <CardContent className="pt-6 pb-6 flex flex-col h-full">
              <div className="flex justify-center mb-3">
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-4 py-1 text-xs font-semibold">
                  Melhor custo-benefício
                </Badge>
              </div>
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
              <div className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-center text-sm font-semibold flex items-center justify-center gap-1.5" onClick={upgradeMsg}>
                <Users className="h-4 w-4" />
                Escolher Família
              </div>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Feature comparison — 4 columns */}
      <Card>
        <CardContent className="pt-8 pb-8">
          <h3 className="text-xl font-bold text-center mb-8">Comparativo completo</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2">
                  <th className="text-left pb-4 text-base font-semibold text-muted-foreground w-[40%]">Funcionalidade</th>
                  <th className="text-center pb-4 text-base font-semibold text-muted-foreground w-[20%]">Free</th>
                  <th className="text-center pb-4 text-base font-semibold w-[20%]">
                    <span className="text-indigo-600 dark:text-indigo-400">Pro</span>
                  </th>
                  <th className="text-center pb-4 text-base font-semibold w-[20%]">
                    <span className="text-amber-600 dark:text-amber-400">Família</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f, i) => (
                  <tr key={f.name} className={`border-b border-border/50 ${i % 2 === 0 ? 'bg-muted/20' : ''}`}>
                    <td className="py-4 px-2">
                      <span className="flex items-center gap-2.5 text-sm font-medium">
                        <f.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                        {f.name}
                      </span>
                    </td>
                    <td className="py-4 text-center"><FeatureValue value={f.free} /></td>
                    <td className="py-4 text-center bg-indigo-50/30 dark:bg-indigo-500/5"><FeatureValue value={f.pro} /></td>
                    <td className="py-4 text-center bg-amber-50/30 dark:bg-amber-500/5"><FeatureValue value={f.familia} /></td>
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
