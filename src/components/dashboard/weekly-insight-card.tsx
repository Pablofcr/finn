"use client"

import { Card, CardContent } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  buildEvolvingCopy,
  formatRelative,
  getSeverityTheme,
  type InsightContext,
} from '@/lib/insight-theme'
import { AskFinnButton } from './ask-finn-button'

interface Insight {
  id: string
  title: string
  body: string
  severity: string
  type: string
  createdAt: string
}

interface WeeklyInsightCardProps {
  insight: Insight | null
  context?: InsightContext
}

export function WeeklyInsightCard({ insight, context }: WeeklyInsightCardProps) {
  // Empty state evolutivo — copy muda conforme o user registra. Sem barra
  // (antipattern por gamificação), sem "em breve" (vago demais).
  // Mostra data concreta do próximo domingo + reflexão do que já foi visto.
  if (!insight) {
    const copy = context
      ? buildEvolvingCopy(context)
      : {
          line1: 'Tô conhecendo seus hábitos.',
          line2: 'Conforme você registra transações, descubro padrões e te aviso aqui toda semana.',
        }

    return (
      <Card className="relative overflow-hidden border-dashed border-violet-200/60 dark:border-violet-500/20 bg-violet-50/30 dark:bg-violet-500/5">
        <CardContent className="flex items-start gap-3 py-5 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 shrink-0">
            <Sparkles className="h-5 w-5 text-violet-500" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
              {copy.line1}
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {copy.line2}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const theme = getSeverityTheme(insight.severity)

  // Pergunta pré-populada pra AskFinnButton — usa contexto do insight
  const askQuestion = `Sobre o insight "${insight.title}" — me explica melhor o que tá acontecendo e o que eu deveria fazer?`

  return (
    <Card className={cn('relative overflow-hidden bg-gradient-to-br', theme.borderClass, theme.bgClass)}>
      {/* Glow decorativo — sinaliza "AI" sem gritar */}
      <div
        className={cn(
          'pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl bg-gradient-to-br',
          theme.glowClass,
        )}
      />

      <CardContent className="relative p-6 lg:p-7">
        {/* Header — AI badge + tempo */}
        <div className="flex items-center justify-between mb-4">
          <div
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ring-1 ring-inset',
              theme.accentBg,
              theme.accentRing,
            )}
          >
            <Sparkles className={cn('h-3 w-3', theme.accentText)} />
            <span className={cn('text-[11px] font-semibold uppercase tracking-wide', theme.accentText)}>
              Insight da semana
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {formatRelative(insight.createdAt)}
          </span>
        </div>

        {/* Corpo */}
        <div className="flex items-start gap-4 mb-5">
          <span className="text-3xl shrink-0 leading-none">{theme.emoji}</span>
          <div className="min-w-0">
            <h3 className="text-lg font-bold leading-snug text-slate-900 dark:text-white mb-1.5">
              {insight.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {insight.body}
            </p>
          </div>
        </div>

        {/* Footer com CTA — manda direto pra conversar com o Finn */}
        <div className="flex items-center gap-2 pl-12">
          <AskFinnButton question={askQuestion} variant="whatsapp" />
        </div>

        {/* Attribution sutil */}
        <p
          className={cn(
            'mt-4 pt-3 border-t text-[10px] text-muted-foreground/80 italic',
            theme.borderDivider,
          )}
        >
          Gerado pela IA do Finn · você pode discordar e me ensinar a melhorar
        </p>
      </CardContent>
    </Card>
  )
}
