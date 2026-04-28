"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Sparkles, X, RefreshCw, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import {
  buildEvolvingCopy,
  formatRelative,
  formatNextSunday,
  getSeverityTheme,
  type InsightContext,
} from '@/lib/insight-theme'
import { AskFinnButton } from '@/components/dashboard/ask-finn-button'

interface Insight {
  id: string
  title: string
  body: string
  severity: string
  type: string
  createdAt: string
}

const TYPE_LABEL: Record<string, string> = {
  spending: 'Gastos',
  saving: 'Economia',
  budget: 'Orçamento',
  goal: 'Meta',
  trend: 'Tendência',
  tip: 'Dica',
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [context, setContext] = useState<InsightContext | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchInsights = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/insights')
      if (res.ok) {
        const result = await res.json()
        setInsights(result.data || [])
        setContext(result.context)
        // Mark all as read
        fetch('/api/insights/mark-read', { method: 'POST' }).catch(() => {})
      }
    } catch {
      toast.error('Não conseguimos carregar seus insights. Tente novamente.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  // "Atualizar agora" — gera nova rodada de insights via /api/insights/generate
  // (reutiliza endpoint existente, mas reframado: não é o caminho principal,
  // só um ghost button discreto pra quem quer forçar release antes do domingo).
  async function handleRefresh() {
    setRefreshing(true)
    try {
      const res = await fetch('/api/insights/generate', { method: 'POST' })
      if (res.ok) {
        const result = await res.json()
        setInsights(result.data || [])
        toast.success('Análise atualizada com base nos seus dados mais recentes.')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Não foi possível atualizar agora. Tente em alguns minutos.')
      }
    } catch {
      toast.error('Não foi possível atualizar agora. Tente em alguns minutos.')
    }
    setRefreshing(false)
  }

  async function handleDismiss(id: string) {
    try {
      await fetch(`/api/insights/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDismissed: true }),
      })
      setInsights((prev) => prev.filter((i) => i.id !== id))
    } catch {
      // silently fail
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Insights</h1>
          <p className="text-sm text-muted-foreground">
            O que a IA do Finn descobriu sobre os seus gastos
          </p>
        </div>
      </div>

      {/* Chip "próxima análise" + ghost refresh — sem mais botão grande de "analisar" */}
      {context && (
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-violet-50/60 dark:bg-violet-500/10 ring-1 ring-inset ring-violet-500/15">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
            <p className="text-xs text-slate-700 dark:text-slate-200">
              <span className="font-medium">Próxima análise:</span>{' '}
              <span className="text-violet-600 dark:text-violet-400 font-semibold">
                {formatNextSunday(context.nextInsightDate)}
              </span>
              <span className="text-muted-foreground hidden sm:inline"> — rodo automaticamente toda semana</span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-7 px-2.5 text-xs gap-1.5 shrink-0 text-violet-600 dark:text-violet-400 hover:bg-violet-500/15"
          >
            <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin')} />
            {refreshing ? 'Atualizando...' : 'Atualizar agora'}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4 stagger-children">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : insights.length === 0 ? (
        <EvolvingEmptyState context={context} onRefresh={handleRefresh} refreshing={refreshing} />
      ) : (
        <div className="space-y-4 stagger-children">
          {insights.map((insight) => (
            <InsightItem
              key={insight.id}
              insight={insight}
              onDismiss={() => handleDismiss(insight.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function InsightItem({ insight, onDismiss }: { insight: Insight; onDismiss: () => void }) {
  const theme = getSeverityTheme(insight.severity)
  const typeLabel = TYPE_LABEL[insight.type] || 'Insight'
  const askQuestion = `Sobre o insight "${insight.title}" — me explica melhor o que tá acontecendo e o que eu deveria fazer?`

  return (
    <Card
      className={cn(
        'relative overflow-hidden bg-gradient-to-br',
        theme.borderClass,
        theme.bgClass,
      )}
    >
      {/* Glow decorativo da IA — só sutil */}
      <div
        className={cn(
          'pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full blur-3xl bg-gradient-to-br',
          theme.glowClass,
        )}
      />

      <CardContent className="relative p-5">
        {/* Header — badge severity + tempo + dismiss */}
        <div className="flex items-center justify-between mb-3">
          <div
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ring-1 ring-inset',
              theme.accentBg,
              theme.accentRing,
            )}
          >
            <Sparkles className={cn('h-3 w-3', theme.accentText)} />
            <span className={cn('text-[10px] font-semibold uppercase tracking-wide', theme.accentText)}>
              {typeLabel}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground">
              {formatRelative(insight.createdAt)}
            </span>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dispensar insight"
              className="text-muted-foreground/70 hover:text-foreground transition-colors p-1 -m-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Corpo */}
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl shrink-0 leading-none">{theme.emoji}</span>
          <div className="min-w-0">
            <h3 className="text-base font-bold leading-snug text-slate-900 dark:text-white mb-1">
              {insight.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {insight.body}
            </p>
          </div>
        </div>

        {/* CTA — manda pra conversa no WhatsApp */}
        <div className="flex items-center gap-2 pl-9">
          <AskFinnButton question={askQuestion} variant="whatsapp" />
        </div>
      </CardContent>
    </Card>
  )
}

function EvolvingEmptyState({
  context,
  onRefresh,
  refreshing,
}: {
  context: InsightContext | undefined
  onRefresh: () => void
  refreshing: boolean
}) {
  const copy = context
    ? buildEvolvingCopy(context)
    : {
        line1: 'Tô conhecendo seus hábitos.',
        line2: 'Conforme você registra transações, descubro padrões e te aviso aqui toda semana.',
      }

  return (
    <Card className="relative overflow-hidden border-dashed border-violet-200/60 dark:border-violet-500/20 bg-violet-50/30 dark:bg-violet-500/5">
      <CardContent className="flex flex-col sm:flex-row items-start gap-4 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 shrink-0">
          <Sparkles className="h-6 w-6 text-violet-500" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-snug">
            {copy.line1}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
            {copy.line2}
          </p>
          {context && context.weeklyTxCount >= 5 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={refreshing}
              className="mt-3 h-7 px-2.5 text-xs gap-1.5 text-violet-600 dark:text-violet-400 hover:bg-violet-500/15"
            >
              <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin')} />
              {refreshing ? 'Analisando...' : 'Não quer esperar? Tentar agora'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
