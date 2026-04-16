"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Shield, ChevronRight, ChevronLeft, X, Lock, Sparkles } from 'lucide-react'

const TUTORIAL_STEPS = [
  {
    title: 'Bem-vindo ao Finn!',
    description:
      'Que bom ter você aqui! Antes de tudo, uma informação importante: seus dados financeiros são 100% criptografados e privados. Nem mesmo nós, desenvolvedores, conseguimos acessá-los. Você está em um ambiente completamente seguro.',
    trustBadge: 'Criptografia de ponta a ponta — seus dados são só seus.',
    icon: '👋',
    highlight: null,
  },
  {
    title: 'Seu painel financeiro',
    description:
      'Aqui você acompanha tudo de um relance: saldo atual, receitas, despesas e gráficos que mostram pra onde seu dinheiro está indo. Tudo atualizado em tempo real.',
    trustBadge: null,
    icon: '📊',
    highlight: '/dashboard',
  },
  {
    title: 'Registre suas movimentações',
    description:
      'Adicione receitas e despesas em segundos. E se preferir, registre pelo nosso bot no Telegram — por texto, áudio ou até foto do cupom fiscal. Rápido e prático!',
    trustBadge: null,
    icon: '💰',
    highlight: '/transactions',
  },
  {
    title: 'Controle seus gastos',
    description:
      'Defina limites de gastos por categoria e o Finn avisa quando você estiver chegando perto. Sem sustos no fim do mês.',
    trustBadge: null,
    icon: '📋',
    highlight: '/budgets',
  },
  {
    title: 'Crie metas e realize sonhos',
    description:
      'Quer viajar, trocar de carro ou juntar uma reserva? Crie uma meta, defina o valor e acompanhe seu progresso dia a dia.',
    trustBadge: null,
    icon: '🎯',
    highlight: '/goals',
  },
  {
    title: 'Insights inteligentes com IA',
    description:
      'Nossa inteligência artificial analisa seus hábitos e sugere formas de economizar. É como ter um consultor financeiro pessoal no seu bolso.',
    trustBadge: null,
    icon: '🧠',
    highlight: '/insights',
  },
  {
    title: 'Tudo pronto! Bora começar?',
    description:
      'Agora é com você! Comece registrando sua primeira transação. Lembre-se: tudo aqui é protegido e privado — somente você tem acesso aos seus dados financeiros. Ninguém mais.',
    trustBadge: 'Seus dados são criptografados e nunca compartilhados com terceiros.',
    icon: '🚀',
    highlight: null,
  },
]

export function AppTutorial() {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const seen = localStorage.getItem('finn-tutorial-completed')
    if (!seen) {
      // Small delay so the app loads first
      const timer = setTimeout(() => setShow(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  function handleNext() {
    if (step < TUTORIAL_STEPS.length - 1) {
      setStep(step + 1)
    } else {
      handleComplete()
    }
  }

  function handleBack() {
    if (step > 0) setStep(step - 1)
  }

  function handleComplete() {
    setShow(false)
    localStorage.setItem('finn-tutorial-completed', 'true')
  }

  if (!show) return null

  const current = TUTORIAL_STEPS[step]
  const isFirst = step === 0
  const isLast = step === TUTORIAL_STEPS.length - 1
  const progress = ((step + 1) / TUTORIAL_STEPS.length) * 100

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Tutorial card */}
      <div className="relative w-full max-w-md animate-fade-in-scale">
        <div className="bg-white dark:bg-[#1a1a22] rounded-3xl shadow-2xl overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-slate-100 dark:bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header with icon */}
          <div className="pt-8 pb-2 text-center">
            <div className="text-5xl mb-4">{current.icon}</div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white px-6">
              {current.title}
            </h2>
          </div>

          {/* Content */}
          <div className="px-6 pb-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed text-center">
              {current.description}
            </p>

            {/* Trust badge */}
            {current.trustBadge && (
              <div className="mt-4 flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl px-4 py-3">
                <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  {current.trustBadge}
                </p>
              </div>
            )}

            {/* Feature highlight badge */}
            {current.highlight && (
              <div className="mt-4 flex items-center justify-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                  <Sparkles className="h-3 w-3" />
                  Acesse pelo menu lateral
                </span>
              </div>
            )}
          </div>

          {/* Step indicator */}
          <div className="flex justify-center gap-1.5 pb-4">
            {TUTORIAL_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-6 bg-indigo-500'
                    : i < step
                      ? 'w-1.5 bg-indigo-300'
                      : 'w-1.5 bg-slate-200 dark:bg-white/10'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex items-center justify-between gap-3">
            {isFirst ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleComplete}
                className="text-xs text-slate-400"
              >
                Pular tutorial
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="gap-1 text-slate-500"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </Button>
            )}

            <span className="text-xs text-slate-400">
              {step + 1} de {TUTORIAL_STEPS.length}
            </span>

            <Button
              size="sm"
              onClick={handleNext}
              className="gap-1 gradient-primary shadow-md shadow-primary/25 border-0"
            >
              {isLast ? 'Começar a usar!' : 'Próximo'}
              {!isLast && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
