"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { cn } from '@/lib/utils'
import {
  Lightbulb, Sparkles, TrendingUp, TrendingDown,
  PiggyBank, Target, AlertTriangle, Info,
  CheckCircle, Flame, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string }> = {
  spending: { icon: <TrendingDown className="h-4 w-4" />, label: 'Gastos' },
  saving: { icon: <PiggyBank className="h-4 w-4" />, label: 'Economia' },
  budget: { icon: <Flame className="h-4 w-4" />, label: 'Orçamento' },
  goal: { icon: <Target className="h-4 w-4" />, label: 'Meta' },
  trend: { icon: <TrendingUp className="h-4 w-4" />, label: 'Tendência' },
  tip: { icon: <Lightbulb className="h-4 w-4" />, label: 'Dica' },
}

const SEVERITY_STYLES: Record<string, { card: string; badge: string; icon: string }> = {
  info: {
    card: 'border-blue-200 dark:border-blue-900/30',
    badge: 'bg-blue-500/10 text-blue-600',
    icon: 'text-blue-600',
  },
  success: {
    card: 'border-green-200 dark:border-green-900/30',
    badge: 'bg-green-500/10 text-green-600',
    icon: 'text-green-600',
  },
  warning: {
    card: 'border-yellow-200 dark:border-yellow-900/30',
    badge: 'bg-yellow-500/10 text-yellow-600',
    icon: 'text-yellow-600',
  },
  alert: {
    card: 'border-red-200 dark:border-red-900/30',
    badge: 'bg-red-500/10 text-red-600',
    icon: 'text-red-600',
  },
}

function SeverityIcon({ severity }: { severity: string }) {
  const styles = SEVERITY_STYLES[severity] || SEVERITY_STYLES.info
  switch (severity) {
    case 'success': return <CheckCircle className={cn('h-5 w-5', styles.icon)} />
    case 'warning': return <AlertTriangle className={cn('h-5 w-5', styles.icon)} />
    case 'alert': return <AlertTriangle className={cn('h-5 w-5', styles.icon)} />
    default: return <Info className={cn('h-5 w-5', styles.icon)} />
  }
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const fetchInsights = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/insights')
      if (res.ok) {
        const result = await res.json()
        setInsights(result.data || [])
      }
    } catch {
      toast.error('Não conseguimos carregar seus insights. Tente novamente.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/insights/generate', { method: 'POST' })
      if (res.ok) {
        const result = await res.json()
        setInsights(result.data || [])
        toast.success('Pronto! Confira o que a IA encontrou sobre suas finanças.')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Não foi possível gerar os insights agora. Tente novamente em alguns minutos.')
      }
    } catch {
      toast.error('Não foi possível gerar os insights agora. Tente novamente em alguns minutos.')
    }
    setGenerating(false)
  }

  async function handleDismiss(id: string) {
    try {
      await fetch(`/api/insights/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDismissed: true }),
      })
      setInsights(prev => prev.filter(i => i.id !== id))
    } catch {
      // silently fail
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Insights</h1>
          <p className="text-sm text-muted-foreground">Descubra para onde seu dinheiro está indo</p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="gap-2 gradient-primary shadow-md shadow-primary/25 border-0"
        >
          {generating ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {generating ? 'Analisando...' : 'Analisar minhas finanças'}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4 stagger-children">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : insights.length === 0 ? (
        <EmptyState
          icon={<Lightbulb className="h-12 w-12" />}
          title="Seus insights estão a um clique"
          description="Deixe a IA analisar seus hábitos e revelar oportunidades de economia que você nem sabia que tinha."
          action={
            <Button onClick={handleGenerate} disabled={generating} className="gap-2">
              <Sparkles className="h-4 w-4" />
              {generating ? 'Analisando...' : 'Analisar minhas finanças'}
            </Button>
          }
        />
      ) : (
        <div className="space-y-4 stagger-children">
          {insights.map((insight) => {
            const severity = SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.info
            const typeConfig = TYPE_CONFIG[insight.type] || TYPE_CONFIG.tip
            return (
              <Card key={insight.id} className={cn('transition-all hover:shadow-md', severity.card)}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex gap-3">
                    <div className="shrink-0 mt-0.5">
                      <SeverityIcon severity={insight.severity} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{insight.title}</h3>
                        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1', severity.badge)}>
                          {typeConfig.icon}
                          {typeConfig.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{insight.body}</p>
                    </div>
                    <button
                      onClick={() => handleDismiss(insight.id)}
                      className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Entendi
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
