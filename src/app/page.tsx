import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  BarChart3, PieChart, Target, Lightbulb, ArrowLeftRight, Wallet,
  MessageCircle, Mic, Camera, Bell, Shield, Lock, Eye, ChevronRight,
  Check, Star, Sparkles, CircleDollarSign, Layers, Brain,
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
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-indigo-50 dark:from-emerald-950/20 dark:via-[#0f0f12] dark:to-indigo-950/20" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-r from-emerald-400/20 to-indigo-400/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm font-medium mb-8">
            <MessageCircle className="h-4 w-4" />
            Agora com assistente conversacional no WhatsApp
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-6">
            Converse com seu dinheiro{' '}
            <span className="bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
              direto no WhatsApp.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            O Finn é um app de finanças com inteligência artificial integrada ao WhatsApp.
            Pergunte em linguagem natural, registre por áudio, mande foto do cupom e dê baixa em
            recorrências só dizendo &ldquo;paguei o condomínio&rdquo;. Tudo isso e muito mais — começando grátis.
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
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> Dados protegidos (LGPD)</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> Instale como app no celular</span>
          </div>
        </div>
      </section>

      {/* WhatsApp AI Assistant — Hero Feature */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/30 dark:from-emerald-950/20 dark:via-[#0f0f12] dark:to-emerald-950/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-300/10 dark:bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm font-medium mb-6">
              <Brain className="h-4 w-4" />
              Inteligência artificial conversacional
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
              Não é um bot.{' '}
              <span className="bg-gradient-to-r from-emerald-500 to-indigo-500 bg-clip-text text-transparent">
                É um consultor financeiro
              </span>{' '}
              que responde no seu WhatsApp.
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
              Esqueça menus engessados e palavras-chave. O Finn entende como você fala —
              em texto, áudio ou foto — e responde com dados reais da sua vida financeira.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Left — WhatsApp chat mockup */}
            <div className="relative">
              <div className="bg-white dark:bg-[#1a1a22] rounded-3xl shadow-2xl shadow-emerald-500/10 border border-slate-200/50 dark:border-white/10 overflow-hidden">
                {/* Chat header */}
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <img src="/icons/icon-192.svg" alt="Finn" className="h-7 w-7 rounded-full" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">Finn Finanças</p>
                    <p className="text-white/80 text-xs">online · responde na hora</p>
                  </div>
                </div>

                {/* Chat messages */}
                <div className="p-5 space-y-3 bg-[#ECE5DD] dark:bg-[#0b141a] min-h-[440px]">
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md px-3.5 py-2 bg-[#DCF8C6] dark:bg-emerald-900/40 text-slate-900 dark:text-emerald-100 text-sm shadow-sm">
                      Quanto gastei com mercado em abril?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-md px-3.5 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm shadow-sm border border-slate-100 dark:border-white/5">
                      Em abril você gastou <strong>R$ 1.247,80</strong> em mercado (somando Mercado e Hortifruti). Foi 12% a mais que março. 🛒
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md px-3.5 py-2 bg-[#DCF8C6] dark:bg-emerald-900/40 text-slate-900 dark:text-emerald-100 text-sm shadow-sm">
                      Os dois condomínios foram pagos
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-md px-3.5 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm shadow-sm border border-slate-100 dark:border-white/5">
                      ✅ Registrei:<br />
                      🏠 <strong>Condomínio Zen</strong> — <strong>R$ 620,00</strong> na conta <strong>Itaú</strong> · <em>débito</em><br />
                      🏠 <strong>Condomínio Terras 2</strong> — <strong>R$ 1.070,00</strong> na conta <strong>Nubank</strong> · <em>débito</em><br /><br />
                      Se pagou em outra conta, é só me dizer que eu corrijo.
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md px-3.5 py-2 bg-[#DCF8C6] dark:bg-emerald-900/40 text-slate-900 dark:text-emerald-100 text-sm shadow-sm">
                      🎙 Áudio · 0:04
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-md px-3.5 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm shadow-sm border border-slate-100 dark:border-white/5">
                      🎙 Entendi: <em>&ldquo;celular três mil em dez vezes no nubank&rdquo;</em><br /><br />
                      💳 <strong>Celular</strong> — <strong>R$ 3.000,00</strong><br />
                      🔢 10x de R$ 300,00 · <strong>Cartão Nubank</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — Capabilities list */}
            <div className="space-y-6">
              {[
                {
                  icon: Brain,
                  title: 'Pergunte em linguagem natural',
                  desc: '&ldquo;Quanto gastei com delivery?&rdquo;, &ldquo;Como tá meu orçamento de transporte?&rdquo;, &ldquo;Falta quanto pra meta de viagem?&rdquo; — o Finn entende contexto e responde com seus dados reais.',
                  color: 'text-violet-500',
                  bg: 'bg-violet-50 dark:bg-violet-500/10',
                },
                {
                  icon: Mic,
                  title: 'Mande áudio que ele transcreve',
                  desc: 'Grave uma mensagem de voz descrevendo o gasto. A IA transcreve, identifica valor, categoria, forma de pagamento e parcelas — tudo automaticamente.',
                  color: 'text-purple-500',
                  bg: 'bg-purple-50 dark:bg-purple-500/10',
                },
                {
                  icon: Camera,
                  title: 'Foto do cupom fiscal',
                  desc: 'Tire foto da nota e o Finn extrai estabelecimento, valor, data e classifica na categoria certa. Sem digitar nada.',
                  color: 'text-cyan-500',
                  bg: 'bg-cyan-50 dark:bg-cyan-500/10',
                },
                {
                  icon: Sparkles,
                  title: 'Dê baixa por conversa',
                  desc: '&ldquo;O condomínio foi pago&rdquo;, &ldquo;quitei a fatura do Nubank&rdquo;, &ldquo;paguei a internet ontem&rdquo;. O Finn marca a recorrência como paga e atualiza o saldo.',
                  color: 'text-emerald-500',
                  bg: 'bg-emerald-50 dark:bg-emerald-500/10',
                },
                {
                  icon: Bell,
                  title: 'Alertas inteligentes antes do vencimento',
                  desc: 'Lembretes 3 dias antes, 1 dia antes e no dia. Confirme com um toque. Nunca mais pague juros por esquecimento.',
                  color: 'text-amber-500',
                  bg: 'bg-amber-50 dark:bg-amber-500/10',
                },
              ].map((f) => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${f.bg} shrink-0`}>
                    <f.icon className={`h-6 w-6 ${f.color}`} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white mb-1">{f.title}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: f.desc }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Mais do que um app —{' '}
              <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                um sistema completo
              </span>
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Tudo o que você precisa pra ter clareza total sobre seu dinheiro.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: BarChart3, title: 'Painel inteligente', desc: 'Saldo total, receitas, despesas, faturas a pagar e próximos vencimentos — tudo num único olhar.', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
              { icon: ArrowLeftRight, title: 'Transações sem limites', desc: 'Receitas, despesas, transferências, parcelados, recorrências, faturas de cartão — registre por app, voz ou foto.', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
              { icon: Layers, title: 'Categorias hierárquicas', desc: 'Alimentação se desdobra em Mercado, Restaurante, Delivery e Lanche. Saúde em Farmácia, Consulta e Plano. Análise no nível certo de detalhe.', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
              { icon: Wallet, title: 'Bancos com logo de verdade', desc: 'Nubank, Itaú, Bradesco, Inter, C6, Mercado Pago, Caixa e mais 20 — com as logomarcas reais. Cadastro em 2 toques.', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
              { icon: PieChart, title: 'Orçamento visual', desc: 'Defina limites por categoria e veja o progresso em barras. O Finn avisa pelo WhatsApp quando passa de 80%.', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
              { icon: Target, title: 'Metas com prazo', desc: 'Crie objetivos com data-limite. O Finn calcula quanto você precisa guardar por mês pra chegar lá.', color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
              { icon: Lightbulb, title: 'Insights semanais com IA', desc: 'A IA analisa seus gastos, identifica padrões e sugere onde economizar — toda semana, automaticamente.', color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-500/10' },
              { icon: Bell, title: 'Recorrências e faturas', desc: 'Cadastre o aluguel, condomínio, internet — o Finn cria as transações futuras e te lembra antes do vencimento.', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
              { icon: Brain, title: 'Auto-classificação', desc: 'Você escreve "ifood" e o Finn classifica em Delivery. "Posto" vai pra Combustível. Aprende com seus padrões.', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-500/10' },
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
      <section className="py-20 lg:py-28 bg-slate-50/50 dark:bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Comece em menos de 2 minutos
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Sem planilha. Sem extrato manual. Sem complicação.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '1', title: 'Crie sua conta grátis', desc: 'Cadastro com Google ou e-mail. Sem cartão de crédito, sem instalação.', icon: CircleDollarSign },
              { step: '2', title: 'Conecte o WhatsApp', desc: 'Mande um código pra +55 85 98794-2255 e o Finn vira seu assistente. Levam 30 segundos.', icon: MessageCircle },
              { step: '3', title: 'Converse com o Finn', desc: 'Registre por texto, áudio ou foto. Pergunte sobre seus gastos. Receba alertas. Tudo no chat.', icon: Sparkles },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-indigo-500 text-white text-2xl font-bold mx-auto mb-5 shadow-lg shadow-emerald-500/25">
                  {s.step}
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Insights — Real examples */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-6">
              <Lightbulb className="h-4 w-4" />
              Insights automáticos
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
              Toda semana, a IA te entrega{' '}
              <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                3 a 5 descobertas
              </span>{' '}
              sobre o seu dinheiro.
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
              Sem você precisar perguntar. Os mais críticos chegam direto no seu WhatsApp.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {[
              {
                emoji: '🟡',
                title: 'Gastos com delivery subiram 40%',
                body: 'Você gastou R$ 680 com delivery este mês, contra R$ 485 no mês passado. Cozinhar 2x na semana economizaria ~R$ 200/mês.',
                border: 'border-amber-200 dark:border-amber-900/30',
                bg: 'bg-amber-50/50 dark:bg-amber-500/5',
              },
              {
                emoji: '🔴',
                title: 'Orçamento de transporte a 92%',
                body: 'Restam apenas R$ 48 do seu limite de R$ 600. Faltam 12 dias pro fim do mês — considere reduzir Uber.',
                border: 'border-red-200 dark:border-red-900/30',
                bg: 'bg-red-50/50 dark:bg-red-500/5',
              },
              {
                emoji: '🟢',
                title: 'Meta "Viagem" progredindo bem',
                body: 'Você já juntou R$ 3.200 de R$ 5.000. No ritmo atual, atinge a meta em 2 meses — antes do prazo.',
                border: 'border-emerald-200 dark:border-emerald-900/30',
                bg: 'bg-emerald-50/50 dark:bg-emerald-500/5',
              },
              {
                emoji: '💡',
                title: '3 assinaturas que você esqueceu',
                body: 'Identifiquei R$ 95/mês em assinaturas que não tiveram uso ativo no app. Vale revisar Disney+, HBO e Apple One.',
                border: 'border-violet-200 dark:border-violet-900/30',
                bg: 'bg-violet-50/50 dark:bg-violet-500/5',
              },
              {
                emoji: '📊',
                title: 'Alimentação representa 38% dos gastos',
                body: 'É a maior categoria do mês. A média do app é 22%. Olhar pra esse grupo destrava muita economia.',
                border: 'border-blue-200 dark:border-blue-900/30',
                bg: 'bg-blue-50/50 dark:bg-blue-500/5',
              },
              {
                emoji: '⚡',
                title: 'Conta de luz cresceu 31% em 3 meses',
                body: 'Pode ser sazonalidade ou aparelho consumindo demais. Vale checar o consumo no app da Enel.',
                border: 'border-orange-200 dark:border-orange-900/30',
                bg: 'bg-orange-50/50 dark:bg-orange-500/5',
              },
            ].map((card) => (
              <div key={card.title} className={`p-5 rounded-2xl border ${card.border} ${card.bg}`}>
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-xl shrink-0">{card.emoji}</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{card.title}</p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed ml-9">{card.body}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-slate-400 mt-8 italic">
            Exemplos reais de insights gerados pela IA do Finn
          </p>
        </div>
      </section>

      {/* Security */}
      <section className="py-20 lg:py-28 bg-slate-50/50 dark:bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Seus dados são seus. Ponto final.
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Privacidade é princípio aqui — não promessa de marketing.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: Lock, title: 'Criptografia bancária', desc: 'TLS 1.3 em trânsito, senhas hasheadas com algoritmo irreversível. O mesmo padrão usado por bancos.' },
              { icon: Shield, title: 'Conformidade LGPD', desc: 'Você tem direito de acessar, exportar e excluir seus dados a qualquer momento, direto nas Configurações.' },
              { icon: Eye, title: 'Zero compartilhamento', desc: 'Seus dados financeiros nunca são vendidos, compartilhados ou usados pra publicidade. Nem com investidores.' },
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
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Comece grátis.{' '}
              <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                Evolua quando quiser.
              </span>
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400">
              Sem surpresas. Sem taxas escondidas. Sem cartão pra começar.
            </p>
          </div>

          <LandingPricing />

          <p className="text-center text-sm text-slate-400 mt-8">
            Um único insight de economia já cobre meses de assinatura.
          </p>
        </div>
      </section>

      {/* Finn se paga — Financial Examples */}
      <section className="py-20 lg:py-28 bg-slate-50/50 dark:bg-white/[0.02]">
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
                conclusion: 'O Finn te avisa antes do vencimento pelo WhatsApp. Você paga em dia e não perde nada.',
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
                saving: 'R$ 30,00/mês — 2x o custo do app. Em 1 ano são R$ 360.',
                color: 'from-emerald-500 to-teal-500',
                bg: 'bg-emerald-50/50 dark:bg-emerald-500/5',
                border: 'border-emerald-200 dark:border-emerald-900/30',
              },
              {
                emoji: '💳',
                scenario: 'Você perde a data de vencimento da fatura do cartão de R$ 2.500.',
                math: 'Multa por atraso: R$ 40,00 + juros rotativos ~14% ao mês: R$ 350,00. Prejuízo: R$ 390,00.',
                conclusion: 'Os alertas do Finn no WhatsApp garantem que você nunca mais pague juros por esquecimento.',
                saving: 'R$ 390,00 salvos — 26 meses de Finn (mais de 2 anos!).',
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
                quote: 'Eu achava que controlar finanças era coisa de planilha chata. Em dois meses, juntei meu primeiro fundo de emergência só conversando com o Finn no WhatsApp.',
                name: 'Camila Rezende',
                role: 'Designer, Belo Horizonte',
              },
              {
                quote: 'O assistente é absurdo. Mando áudio na correria, foto da nota no almoço, e tá tudo organizado. Pergunto "quanto gastei com mercado?" e ele responde na hora.',
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
      <section className="py-20 lg:py-28 bg-gradient-to-br from-slate-900 via-emerald-950 to-indigo-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_100%,rgba(102,126,234,0.15),transparent_60%)]" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Pare de gerenciar seu dinheiro sozinho.<br />
            <span className="bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
              Tenha um assistente.
            </span>
          </h2>
          <p className="text-lg text-slate-300 mb-10 max-w-lg mx-auto">
            Plano gratuito, conexão com WhatsApp em 30 segundos, dados protegidos pela LGPD.
            Não custa nada começar.
          </p>
          <Link href="/register" className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-indigo-500 text-white font-semibold text-lg shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 transition-all">
            Criar minha conta grátis
            <ChevronRight className="h-5 w-5" />
          </Link>
          <p className="text-xs text-slate-400 mt-6">
            Sem cartão · Sem compromisso · Cancele quando quiser
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-950 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <img src="/icons/icon-192.svg" alt="Finn" className="h-8 w-8 rounded-lg" />
              <span className="font-bold text-white">Finn</span>
              <span className="text-sm">— Inteligência financeira no seu WhatsApp.</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacidade</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Termos</Link>
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
