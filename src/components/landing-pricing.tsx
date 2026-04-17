"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Check, Sparkles } from 'lucide-react'

export function LandingPricing() {
  const [selected, setSelected] = useState('PRO')

  return (
    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
      {/* Free */}
      <button type="button" onClick={() => setSelected('FREE')} className="text-left w-full">
        <div className={`p-7 rounded-2xl bg-white dark:bg-white/5 flex flex-col h-full transition-all duration-200 cursor-pointer ${
          selected === 'FREE'
            ? 'ring-2 ring-slate-400 shadow-xl scale-[1.02]'
            : 'border border-slate-200 dark:border-white/10 hover:shadow-lg hover:scale-[1.01]'
        }`}>
          <div className="pt-3">
            <h3 className="text-xl font-bold mb-2">Free</h3>
            <div className="mb-1">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white">R$ 0</span>
              <span className="text-slate-400">/mês</span>
            </div>
            <p className="text-xs text-transparent font-medium mb-4 select-none" aria-hidden="true">&nbsp;</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Para começar a organizar suas finanças</p>
            <Link href="/register" className="block w-full text-center py-3 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
              Começar grátis
            </Link>
          </div>
          <ul className="mt-6 space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
            {['Dashboard completo', '40 transações/mês', '1 conta bancária', '2 orçamentos', '1 meta financeira', 'Bot por texto, 2 áudios e 2 fotos/mês', '5 alertas de pagamento', 'Dados protegidos (LGPD)'].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </button>

      {/* Pro */}
      <button type="button" onClick={() => setSelected('PRO')} className="text-left w-full pt-3">
        <div className={`p-7 pt-10 rounded-2xl bg-white dark:bg-white/5 flex flex-col h-full transition-all duration-200 cursor-pointer overflow-visible ${
          selected === 'PRO'
            ? 'ring-2 ring-indigo-500 shadow-xl shadow-indigo-500/10 scale-[1.02]'
            : 'border border-slate-200 dark:border-white/10 hover:shadow-lg hover:scale-[1.01]'
        }`}>
          <div className="flex justify-center -mt-10 mb-3">
            <span className="inline-flex items-center gap-1 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-semibold shadow-lg">
              <Sparkles className="h-3 w-3" />
              Mais popular
            </span>
          </div>
          <div className="pt-0">
            <h3 className="text-xl font-bold mb-2">Pro</h3>
            <div className="mb-1">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white">R$ 14</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">,90</span>
              <span className="text-slate-400">/mês</span>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-4">Menos de R$ 0,50 por dia</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Assistente financeiro com IA completa</p>
            <Link href="/register" className="block w-full text-center py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all">
              Começar com o Pro
            </Link>
          </div>
          <ul className="mt-6 space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
            {['Tudo do Free, mais:', 'Transações ilimitadas', 'Contas e orçamentos ilimitados', 'Metas ilimitadas', 'Bot por áudio e foto de cupom', 'Insights com inteligência artificial', 'Categorização automática', 'Relatórios históricos (12 meses)', 'Exportação de dados', 'Alertas ilimitados'].map((item, i) => (
              <li key={item} className={`flex items-center gap-2 ${i === 0 ? 'font-semibold text-slate-900 dark:text-white' : ''}`}>
                {i === 0 ? <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" /> : <Check className="h-4 w-4 text-indigo-500 shrink-0" />}
                {item}
              </li>
            ))}
          </ul>
        </div>
      </button>

      {/* Família */}
      <button type="button" onClick={() => setSelected('FAMILIA')} className="text-left w-full pt-3">
        <div className={`p-7 pt-10 rounded-2xl bg-white dark:bg-white/5 flex flex-col h-full transition-all duration-200 cursor-pointer overflow-visible ${
          selected === 'FAMILIA'
            ? 'ring-2 ring-amber-500 shadow-xl shadow-amber-500/10 scale-[1.02]'
            : 'border border-slate-200 dark:border-white/10 hover:shadow-lg hover:scale-[1.01]'
        }`}>
          <div className="flex justify-center -mt-10 mb-3">
            <span className="inline-flex items-center gap-1 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold shadow-lg">
              Melhor custo-benefício
            </span>
          </div>
          <div className="pt-0">
            <h3 className="text-xl font-bold mb-2">Família</h3>
            <div className="mb-1">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white">R$ 34</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">,90</span>
              <span className="text-slate-400">/mês</span>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-4">Até 5 pessoas — R$ 6,98 por pessoa</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Toda a família com controle financeiro</p>
            <Link href="/register" className="block w-full text-center py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] transition-all">
              Começar com Família
            </Link>
          </div>
          <ul className="mt-6 space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
            {['Tudo do Pro, mais:', 'Até 5 membros da família', 'Cada um com login próprio', 'Cada um com dados privados', 'Dashboard familiar consolidado', 'Metas compartilhadas em grupo', 'Controle dos gastos em conjunto', 'Relatórios individuais e da família', 'Economize em relação a 5 planos Pro'].map((item, i) => (
              <li key={item} className={`flex items-center gap-2 ${i === 0 ? 'font-semibold text-slate-900 dark:text-white' : ''}`}>
                {i === 0 ? <Sparkles className="h-4 w-4 text-amber-500 shrink-0" /> : <Check className="h-4 w-4 text-amber-500 shrink-0" />}
                {item}
              </li>
            ))}
          </ul>
        </div>
      </button>
    </div>
  )
}
