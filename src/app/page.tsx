import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  BarChart3, PieChart, Target, Lightbulb, ArrowLeftRight, Wallet,
  MessageCircle, Mic, Camera, Bell, Shield, Lock, Eye, ChevronRight,
  Check, Star, Sparkles, CircleDollarSign,
} from 'lucide-react'

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
              Criar conta gratis
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
            Comece gratis — com inteligencia artificial
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
            Finn organiza suas financas, alerta sobre vencimentos e mostra exatamente para onde cada real vai — com inteligencia artificial e plano gratuito para comecar.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 transition-all">
              Comecar agora — e gratis
              <ChevronRight className="h-5 w-5" />
            </Link>
            <Link href="/login" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
              Ja tenho conta
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-slate-400">
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> Sem cartao</span>
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
              Tudo o que voce precisa para{' '}
              <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                dominar suas financas
              </span>
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Ferramentas poderosas em uma interface simples. Sem complicacao.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: BarChart3, title: 'Painel Inteligente', desc: 'Visualize saldo, receitas e despesas em graficos claros que atualizam em tempo real.', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
              { icon: ArrowLeftRight, title: 'Transacoes Completas', desc: 'Registre ganhos, gastos, transferencias, parcelas e recorrencias em segundos.', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
              { icon: PieChart, title: 'Orcamento Visual', desc: 'Defina limites por categoria e acompanhe seu progresso com barras visuais.', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
              { icon: Target, title: 'Metas com Prazo', desc: 'Crie objetivos financeiros com data-limite e veja quanto falta para chegar la.', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
              { icon: Lightbulb, title: 'Insights com IA', desc: 'A inteligencia artificial analisa seus habitos e sugere onde voce pode economizar.', color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
              { icon: Wallet, title: 'Relatorios Detalhados', desc: 'Evolucao mensal, gastos por categoria e tendencias — tudo num so lugar.', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
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
              { step: '1', title: 'Conecte sua rotina', desc: 'Crie sua conta gratuita e registre suas primeiras transacoes em instantes.', icon: CircleDollarSign },
              { step: '2', title: 'Acompanhe tudo', desc: 'Veja seu dinheiro se organizar com dashboards, orcamentos e metas que fazem sentido.', icon: BarChart3 },
              { step: '3', title: 'Receba orientacao', desc: 'A IA do Finn identifica padroes e entrega dicas personalizadas para voce economizar.', icon: Lightbulb },
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
              O bot do Finn no Telegram transforma qualquer conversa em controle financeiro. Registre transacoes do jeito que for mais facil.
            </p>

            <div className="grid sm:grid-cols-3 gap-6">
              {[
                { icon: MessageCircle, title: 'Por Texto', desc: 'Digite "almoco 32 reais" e pronto, esta registrado.' },
                { icon: Mic, title: 'Por Voz', desc: 'Grave um audio descrevendo o gasto e a IA transcreve e categoriza.' },
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
              Bonus: Receba alertas de vencimento direto no Telegram. Nunca mais pague juros por esquecimento.
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Seus dados sao seus. Ponto final.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: Lock, title: 'Criptografia de ponta', desc: 'Todas as informacoes sao protegidas com criptografia em transito. O mesmo padrao usado por bancos.' },
              { icon: Shield, title: 'Conformidade LGPD', desc: 'Finn segue rigorosamente a Lei Geral de Protecao de Dados. Voce decide o que compartilha.' },
              { icon: Eye, title: 'Privacidade por principio', desc: 'Seus dados financeiros nunca sao vendidos, compartilhados ou usados para publicidade. Zero.' },
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
              Comece gratis.{' '}
              <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                Evolua quando quiser.
              </span>
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400">
              Sem surpresas. Sem taxas escondidas.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free */}
            <div className="p-8 pt-11 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <h3 className="text-xl font-bold mb-2">Free</h3>
              <div className="mb-1">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">R$ 0</span>
                <span className="text-slate-400">/mes</span>
              </div>
              <p className="text-xs text-transparent font-medium mb-4 select-none" aria-hidden="true">.</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Para comecar a organizar suas financas</p>
              <Link href="/register" className="block w-full text-center py-3 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                Comecar gratis
              </Link>
              <ul className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-400">
                {['Dashboard completo', '50 transacoes/mes', '2 contas bancarias', '3 orcamentos', '1 meta financeira', 'Bot Telegram por texto', '5 alertas de pagamento', 'Dados protegidos (LGPD)'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro */}
            <div className="relative p-8 rounded-2xl bg-white dark:bg-white/5 border-2 border-indigo-500 shadow-xl shadow-indigo-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-semibold shadow-lg">
                  <Sparkles className="h-3 w-3" />
                  Mais popular
                </span>
              </div>
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                Pro
              </h3>
              <div className="mb-1">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">R$ 14</span>
                <span className="text-xl font-bold text-slate-900 dark:text-white">,90</span>
                <span className="text-slate-400">/mes</span>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-4">Menos de R$ 0,50 por dia</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Seu assistente financeiro com IA completa</p>
              <Link href="/register" className="block w-full text-center py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all">
                Comecar com o Pro
              </Link>
              <ul className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-400">
                {['Tudo do Free, mais:', 'Transacoes ilimitadas', 'Contas e orcamentos ilimitados', 'Metas ilimitadas', 'Bot por audio e foto de cupom', 'Insights com inteligencia artificial', 'Categorizacao automatica', 'Relatorios historicos (12 meses)', 'Exportacao de dados', 'Alertas ilimitados'].map((item, i) => (
                  <li key={item} className={`flex items-center gap-2 ${i === 0 ? 'font-semibold text-slate-900 dark:text-white' : ''}`}>
                    {i === 0 ? <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" /> : <Check className="h-4 w-4 text-indigo-500 shrink-0" />}
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-center text-sm text-slate-400 mt-8">
            Um unico insight de economia ja cobre meses de assinatura.
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
                quote: 'Eu achava que controlar financas era coisa de planilha chata. O Finn mudou isso. Em dois meses, consegui juntar meu primeiro fundo de emergencia.',
                name: 'Camila Rezende',
                role: 'Designer, Belo Horizonte',
              },
              {
                quote: 'O bot do Telegram e absurdo. Tiro foto da nota, mando um audio, e ta tudo la organizado. Nunca mais esqueci de registrar um gasto.',
                name: 'Rafael Tanaka',
                role: 'Autonomo, Sao Paulo',
              },
              {
                quote: 'A IA me mostrou que eu gastava quase R$ 900 por mes com delivery sem perceber. So com esse insight, economizei o suficiente pra minha viagem.',
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
            Seu dinheiro merece atencao.<br />
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Comece agora.
            </span>
          </h2>
          <p className="text-lg text-slate-400 mb-10 max-w-lg mx-auto">
            Finn e gratuito, seguro e leva menos de dois minutos para comecar. Sem cartao. Sem pegadinha.
          </p>
          <Link href="/register" className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 transition-all">
            Criar minha conta gratis
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
              <span className="text-sm">— Inteligencia financeira para quem quer viver melhor.</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacidade</Link>
              <Link href="/security" className="hover:text-white transition-colors">Seguranca</Link>
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
