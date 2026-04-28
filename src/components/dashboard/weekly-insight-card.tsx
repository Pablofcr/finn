"use client"

import { Card, CardContent } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AskFinnButton } from './ask-finn-button'

interface Insight {
  id: string
  title: string
  body: string
  severity: string
  type: string
  createdAt: string
}

interface InsightContext {
  weeklyTxCount: number
  weeklyDays: number
  topCategoryName: string | null
  nextInsightDate: string  // ISO
}

interface WeeklyInsightCardProps {
  insight: Insight | null
  context?: InsightContext
}

type Severity = 'info' | 'success' | 'warning' | 'alert'

const severityTheme: Record<Severity, {
  borderClass: string
  bgClass: string
  glowClass: string
  accentText: string
  accentBg: string
  accentRing: string
  borderDivider: string
  emoji: string
}> = {
  info: {
    borderClass: 'border-violet-200/60 dark:border-violet-500/20',
    bgClass: 'from-violet-50 via-white to-indigo-50 dark:from-violet-500/10 dark:via-slate-900 dark:to-indigo-500/10',
    glowClass: 'from-violet-400/30 to-indigo-400/20',
    accentText: 'text-violet-600 dark:text-violet-400',
    accentBg: 'bg-violet-500/10',
    accentRing: 'ring-violet-500/20',
    borderDivider: 'border-violet-200/40 dark:border-violet-500/10',
    emoji: '🔵',
  },
  success: {
    borderClass: 'border-emerald-200/60 dark:border-emerald-500/20',
    bgClass: 'from-emerald-50 via-white to-teal-50 dark:from-emerald-500/10 dark:via-slate-900 dark:to-teal-500/10',
    glowClass: 'from-emerald-400/30 to-teal-400/20',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    accentBg: 'bg-emerald-500/10',
    accentRing: 'ring-emerald-500/20',
    borderDivider: 'border-emerald-200/40 dark:border-emerald-500/10',
    emoji: '🟢',
  },
  warning: {
    borderClass: 'border-amber-200/60 dark:border-amber-500/20',
    bgClass: 'from-amber-50 via-white to-orange-50 dark:from-amber-500/10 dark:via-slate-900 dark:to-orange-500/10',
    glowClass: 'from-amber-400/30 to-orange-400/20',
    accentText: 'text-amber-600 dark:text-amber-400',
    accentBg: 'bg-amber-500/10',
    accentRing: 'ring-amber-500/20',
    borderDivider: 'border-amber-200/40 dark:border-amber-500/10',
    emoji: '🟡',
  },
  alert: {
    borderClass: 'border-red-200/60 dark:border-red-500/20',
    bgClass: 'from-red-50 via-white to-rose-50 dark:from-red-500/10 dark:via-slate-900 dark:to-rose-500/10',
    glowClass: 'from-red-400/30 to-rose-400/20',
    accentText: 'text-red-600 dark:text-red-400',
    accentBg: 'bg-red-500/10',
    accentRing: 'ring-red-500/20',
    borderDivider: 'border-red-200/40 dark:border-red-500/10',
    emoji: '🔴',
  },
}

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'hoje'
  if (diffDays === 1) return 'ontem'
  if (diffDays < 7) return `há ${diffDays} dias`
  if (diffDays < 30) return `há ${Math.floor(diffDays / 7)} semanas`
  return `há ${Math.floor(diffDays / 30)} meses`
}

function formatNextSunday(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `domingo ${day}/${month}`
}

function buildEvolvingCopy(ctx: InsightContext): { line1: string; line2: string } {
  const sunday = formatNextSunday(ctx.nextInsightDate)
  const n = ctx.weeklyTxCount

  // Estado 0 — nenhuma tx essa semana
  if (n === 0) {
    return {
      line1: 'Me conta o que rolou hoje.',
      line2: `Manda os gastos pelo WhatsApp ou registra no app. No ${sunday} eu fecho a leitura e te trago a primeira análise da semana.`,
    }
  }

  // Estado 1-4 — alguma atividade, ainda pouco pra ler padrão
  if (n <= 4) {
    if (ctx.topCategoryName) {
      return {
        line1: `Já registrei ${n} ${n === 1 ? 'lançamento' : 'lançamentos'} essa semana, com ${ctx.topCategoryName} liderando.`,
        line2: `No ${sunday} fecho a leitura e te trago o primeiro insight de verdade — comparando com o que vier nas próximas semanas.`,
      }
    }
    return {
      line1: `Já registrei ${n} ${n === 1 ? 'lançamento' : 'lançamentos'} essa semana.`,
      line2: `No ${sunday} eu fecho a leitura e te trago a primeira análise.`,
    }
  }

  // Estado 5+ — bom volume, criando expectativa pro domingo
  return {
    line1: `Tô vendo movimento bom essa semana — ${n} lançamentos.`,
    line2: `No ${sunday} às 9h o primeiro insight cai aqui. Vai valer a leitura.`,
  }
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

  const severity = (insight.severity as Severity) in severityTheme
    ? (insight.severity as Severity)
    : 'info'
  const theme = severityTheme[severity]

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
