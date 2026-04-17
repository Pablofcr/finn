import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  BarChart3, PieChart, Target, Lightbulb, ArrowLeftRight, Wallet,
  MessageCircle, Mic, Camera, Bell, Shield, Lock, Eye, ChevronRight,
  Check, Star, Sparkles, CircleDollarSign,
} from 'lucide-react'
import { LandingPricing } from '@/components/landing-pricing'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f12]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#0f0f12]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <img src="/icons/icon-192.svg" alt="Finn" className="h-9 w-9 rounded-xl shadow-md" />
            <span className="text-xl font-extrabold tracking-tight">Finn</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              Entrar
            </Link>
            <Link href="/register" className="text-sm font-semibold px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 transition-all">
              Criar conta grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/20 dark:via-[#0f0f12] dark:to-purple-950/20" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-r from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-8">
            <Sparkles className="h-4 w-4" />
            Comece grátis — com inteligência artificial
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-6">
            Sua vida financeira{' '}
            <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
              no controle.
            </span>
            <br />
            De verdade.
          </h1>

          <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Finn organiza suas finanças, alerta sobre vencimentos e mostra exatamente para onde cada real vai — com inteligência artificial e plano gratuito para começar.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 transition-all">
              Começar agora — é grátis
              <ChevronRight className="h-5 w-5" />
            </Link>
            <Link href="/login" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
              Já tenho conta
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-slate-400">
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> Sem cartão</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> Sem pegadinha</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> Dados protegidos</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> Instale como app no celular</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 lg:py-28 bg-slate-50/50 dark:bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Tudo o que você precisa para{' '}
              <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                dominar suas finanças
              </span>
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Ferramentas poderosas em uma interface simples. Sem complicação.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: BarChart3, title: 'Painel Inteligente', desc: 'Visualize saldo, receitas e despesas em gráficos claros que atualizam em tempo real.', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
              { icon: ArrowLeftRight, title: 'Transações Completas', desc: 'Registre ganhos, gastos, transferências, parcelas e recorrências em segundos.', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
              { icon: PieChart, title: 'Orçamento Visual', desc: 'Defina limites por categoria e acompanhe seu progresso com barras visuais.', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
              { icon: Target, title: 'Metas com Prazo', desc: 'Crie objetivos financeiros com data-limite e veja quanto falta para chegar lá.', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
              { icon: Lightbulb, title: 'Insights com IA', desc: 'A inteligência artificial analisa seus hábitos e sugere onde você pode economizar.', color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
              { icon: Wallet, title: 'Relatórios Detalhados', desc: 'Evolução mensal, gastos por categoria e tendências — tudo num só lugar.', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
            ].map((f) => (
              <div key={f.title} className="group p-6 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none hover:-translate-y-1 transition-all">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${f.bg} mb-4`}>
                  <f.icon className={`h-6 w-6 ${f.color}`} />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Comece em menos de 2 minutos
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '1', title: 'Conecte sua rotina', desc: 'Crie sua conta gratuita e registre suas primeiras transações em instantes.', icon: CircleDollarSign },
              { step: '2', title: 'Acompanhe tudo', desc: 'Veja seu dinheiro se organizar com dashboards, orçamentos e metas que fazem sentido.', icon: BarChart3 },
              { step: '3', title: 'Receba orientação', desc: 'A IA do Finn identifica padrões e entrega dicas personalizadas para você economizar.', icon: Lightbulb },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-2xl font-bold mx-auto mb-5 shadow-lg shadow-indigo-500/25">
                  {s.step}
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Assistant Section */}
      <section className="py-20 lg:py-28 bg-slate-50/50 dark:bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left — Copy */}
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-6">
                  <Sparkles className="h-4 w-4" />
                  Inteligência artificial integrada
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                  Um consultor financeiro{' '}
                  <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                    que trabalha pra você
                  </span>{' '}
                  24 horas por dia.
                </h2>
                <p className="text-lg text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                  A IA do Finn analisa seus hábitos financeiros em tempo real, identifica onde você está gastando demais e entrega recomendações personalizadas para economizar — tudo de forma automática, sem você precisar pedir.
                </p>
                <div className="space-y-4">
                  {[
                    { icon: '🔍', text: 'Analisa seus gastos por categoria e compara mês a mês' },
                    { icon: '🚨', text: 'Alerta quando um orçamento está prestes a estourar' },
                    { icon: '💡', text: 'Sugere cortes inteligentes que você nem percebeu' },
                    { icon: '📈', text: 'Acompanha suas metas e celebra cada conquista' },
                    { icon: '📲', text: 'Envia os insights mais importantes direto no seu Telegram' },
                  ].map((item) => (
                    <div key={item.text} className="flex items-start gap-3">
                      <span className="text-lg shrink-0 mt-0.5">{item.icon}</span>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — Visual example */}
              <div className="space-y-4">
                {/* Simulated insight cards */}
                {[
                  {
                    severity: 'warning',
                    emoji: '🟡',
                    title: 'Gastos com delivery subiram 40%',
                    body: 'Você gastou R$ 680 com delivery este mês, contra R$ 485 no mês passado. Considere cozinhar mais em casa.',
                    border: 'border-amber-200 dark:border-amber-900/30',
                    bg: 'bg-amber-50/50 dark:bg-amber-500/5',
                  },
                  {
                    severity: 'alert',
                    emoji: '🔴',
                    title: 'Orçamento de transporte a 92%',
                    body: 'Restam apenas R$ 48 do seu limite de R$ 600. Faltam 12 dias para o fim do mês.',
                    border: 'border-red-200 dark:border-red-900/30',
                    bg: 'bg-red-50/50 dark:bg-red-500/5',
                  },
                  {
                    severity: 'success',
                    emoji: '🟢',
                    title: 'Meta "Viagem" progredindo bem!',
                    body: 'Você já juntou R$ 3.200 de R$ 5.000. No ritmo atual, vai atingir a meta em 2 meses.',
                    border: 'border-emerald-200 dark:border-emerald-900/30',
                    bg: 'bg-emerald-50/50 dark:bg-emerald-500/5',
                  },
                ].map((card) => (
                  <div key={card.title} className={`p-4 rounded-xl border ${card.border} ${card.bg}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-lg shrink-0">{card.emoji}</span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{card.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{card.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-slate-400 text-center italic">
                  Exemplos reais de insights gerados pela IA do Finn
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Telegram Bot */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-indigo-500 to-purple-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.05),transparent_50%)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white/90 text-sm font-medium mb-8 backdrop-blur-sm">
              <MessageCircle className="h-4 w-4" />
              Integrado com Telegram
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Registre despesas sem abrir o app.<br />Basta uma mensagem.
            </h2>

            <p className="text-lg text-white/80 mb-12 max-w-xl mx-auto">
              O bot do Finn no Telegram transforma qualquer conversa em controle financeiro. Registre transações do jeito que for mais fácil.
            </p>

            <div className="grid sm:grid-cols-3 gap-6">
              {[
                { icon: MessageCircle, title: 'Por Texto', desc: 'Digite "almoço 32 reais" e pronto, está registrado.' },
                { icon: Mic, title: 'Por Voz', desc: 'Grave um áudio descrevendo o gasto e a IA transcreve e categoriza.' },
                { icon: Camera, title: 'Por Foto', desc: 'Tire uma foto do cupom fiscal e o Finn extrai os dados automaticamente.' },
              ].map((item) => (
                <div key={item.title} className="p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                  <item.icon className="h-8 w-8 mb-4 text-white/90" />
                  <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-white/70 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-sm">
              <Bell className="h-4 w-4" />
              Bônus: Receba alertas de vencimento direto no Telegram. Nunca mais pague juros por esquecimento.
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Seus dados são seus. Ponto final.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: Lock, title: 'Criptografia de ponta', desc: 'Todas as informações são protegidas com criptografia em trânsito. O mesmo padrão usado por bancos.' },
              { icon: Shield, title: 'Conformidade LGPD', desc: 'Finn segue rigorosamente a Lei Geral de Proteção de Dados. Você decide o que compartilha.' },
              { icon: Eye, title: 'Privacidade por princípio', desc: 'Seus dados financeiros nunca são vendidos, compartilhados ou usados para publicidade. Zero.' },
            ].map((item) => (
              <div key={item.title} className="text-center p-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 mx-auto mb-5">
                  <item.icon className="h-7 w-7 text-emerald-500" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 lg:py-28 bg-slate-50/50 dark:bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Comece grátis.{' '}
              <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                Evolua quando quiser.
              </span>
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400">
              Sem surpresas. Sem taxas escondidas.
            </p>
          </div>

          <LandingPricing />

          <p className="text-center text-sm text-slate-400 mt-8">
            Um único insight de economia já cobre meses de assinatura.
          </p>
        </div>
      </section>

      {/* Finn se paga — Financial Examples */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              R$ 14,90 que{' '}
              <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                se pagam sozinhos.
              </span>
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              Veja como um único descuido financeiro custa mais do que meses inteiros de Finn.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {[
              {
                emoji: '🏠',
                scenario: 'Você esquece de pagar o condomínio de R$ 800 e percebe 5 dias depois.',
                math: 'Multa de 2% (R$ 16,00) + juros de 1% ao dia por 5 dias (R$ 40,00) = R$ 56,00 jogados fora.',
                conclusion: 'O Finn te avisa antes do vencimento pelo Telegram. Você paga em dia e não perde nada.',
                saving: 'R$ 56,00 economizados — paga quase 4 meses de Finn.',
                color: 'from-red-500 to-rose-500',
                bg: 'bg-red-50/50 dark:bg-red-500/5',
                border: 'border-red-200 dark:border-red-900/30',
              },
              {
                emoji: '💰',
                scenario: 'Você ganha R$ 3.000 por mês e nunca sobra nada no fim do mês.',
                math: 'A IA identifica R$ 30/mês em gastos que podem ser cortados — apenas 1% do seu salário.',
                conclusion: 'Finn mostra exatamente onde seu dinheiro está indo e sugere cortes que você nem percebeu.',
                saving: 'R$ 30,00/mês de economia — 2x o custo do app. Em 1 ano, são R$ 360.',
                color: 'from-emerald-500 to-teal-500',
                bg: 'bg-emerald-50/50 dark:bg-emerald-500/5',
                border: 'border-emerald-200 dark:border-emerald-900/30',
              },
              {
                emoji: '💳',
                scenario: 'Você perde a data de vencimento do cartão de crédito com fatura de R$ 2.500.',
                math: 'Multa por atraso: R$ 40,00 + juros rotativos de ~14% ao mês: R$ 350,00. Total: R$ 390,00 de prejuízo.',
                conclusion: 'Os alertas do Finn garantem que você nunca mais pague um centavo de juros por esquecimento.',
                saving: 'R$ 390,00 salvos — isso paga 26 meses de Finn (mais de 2 anos!).',
                color: 'from-amber-500 to-orange-500',
                bg: 'bg-amber-50/50 dark:bg-amber-500/5',
                border: 'border-amber-200 dark:border-amber-900/30',
              },
              {
                emoji: '📱',
                scenario: 'Você nem percebe quanto gasta com delivery e assinaturas que não usa mais.',
                math: 'iFood: R$ 480/mês + 3 streamings esquecidos: R$ 95/mês = R$ 575/mês no automático.',
                conclusion: 'A IA do Finn identifica esses gastos invisíveis e te mostra o impacto real no seu bolso.',
                saving: 'Cortar 30% disso = R$ 172/mês — 11x o custo do Finn.',
                color: 'from-indigo-500 to-purple-500',
                bg: 'bg-indigo-50/50 dark:bg-indigo-500/5',
                border: 'border-indigo-200 dark:border-indigo-900/30',
              },
            ].map((example) => (
              <div key={example.scenario} className={`p-6 rounded-2xl border ${example.border} ${example.bg} space-y-3`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">{example.emoji}</span>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">{example.scenario}</p>
                </div>
                <div className="ml-11 space-y-2">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <span className="font-semibold text-red-600 dark:text-red-400">A conta: </span>
                    {example.math}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Com o Finn: </span>
                    {example.conclusion}
                  </p>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r ${example.color} text-white text-xs font-bold shadow-sm`}>
                    {example.saving}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-10 max-w-lg mx-auto">
            Cada real que o Finn te impede de perder é um real que volta pro seu bolso. A assinatura se paga no primeiro mês.
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Quem usa, recomenda
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                quote: 'Eu achava que controlar finanças era coisa de planilha chata. O Finn mudou isso. Em dois meses, consegui juntar meu primeiro fundo de emergência.',
                name: 'Camila Rezende',
                role: 'Designer, Belo Horizonte',
              },
              {
                quote: 'O bot do Telegram é absurdo. Tiro foto da nota, mando um áudio, e tá tudo lá organizado. Nunca mais esqueci de registrar um gasto.',
                name: 'Rafael Tanaka',
                role: 'Autônomo, São Paulo',
              },
              {
                quote: 'A IA me mostrou que eu gastava quase R$ 900 por mês com delivery sem perceber. Só com esse insight, economizei o suficiente pra minha viagem.',
                name: 'Juliana Moreira',
                role: 'Analista, Curitiba',
              },
            ].map((t) => (
              <div key={t.name} className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-slate-900 to-indigo-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(102,126,234,0.15),transparent_60%)]" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Seu dinheiro merece atenção.<br />
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Comece agora.
            </span>
          </h2>
          <p className="text-lg text-slate-400 mb-10 max-w-lg mx-auto">
            Finn tem plano gratuito, é seguro e leva menos de dois minutos para começar. Sem cartão. Sem pegadinha.
          </p>
          <Link href="/register" className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 transition-all">
            Criar minha conta grátis
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-950 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <img src="/icons/icon-192.svg" alt="Finn" className="h-8 w-8 rounded-lg" />
              <span className="font-bold text-white">Finn</span>
              <span className="text-sm">— Inteligência financeira para quem quer viver melhor.</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacidade</Link>
              <Link href="/security" className="hover:text-white transition-colors">Segurança</Link>
              <Link href="/login" className="hover:text-white transition-colors">Entrar</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/5 text-center text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Finn. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}
