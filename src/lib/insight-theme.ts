/**
 * Tema visual compartilhado pra qualquer UI relacionada a insights de IA.
 * Garante coerência entre o WeeklyInsightCard (dashboard) e a página /insights
 * sem duplicação. Plus: empty state evolutivo + helpers temporais.
 *
 * Princípio: violet = AI base (info), severities mais quentes pra success/
 * warning/alert. Dashboard squad e retention specialist convergiram nessa
 * escolha — ver:
 *   - src/components/dashboard/weekly-insight-card.tsx (origem)
 *   - squad audit de /insights (audit recomenda centralizar aqui)
 */

export type InsightSeverity = 'info' | 'success' | 'warning' | 'alert'

export interface InsightSeverityTheme {
  borderClass: string
  bgClass: string         // gradient classes pra `bg-gradient-to-br`
  glowClass: string       // gradient classes pro glow blur decorativo
  accentText: string
  accentBg: string
  accentRing: string
  borderDivider: string
  emoji: string
}

export const severityTheme: Record<InsightSeverity, InsightSeverityTheme> = {
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

/** Resolve severity desconhecida pra info, com cast seguro. */
export function getSeverityTheme(severity: string): InsightSeverityTheme {
  if (severity in severityTheme) {
    return severityTheme[severity as InsightSeverity]
  }
  return severityTheme.info
}

/** "há 3 dias" / "ontem" / "hoje" — tempo desde a geração do insight. */
export function formatRelative(dateStr: string): string {
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

/** "domingo 03/05" — data formatada do próximo domingo (dia da próxima leitura). */
export function formatNextSunday(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `domingo ${day}/${month}`
}

/**
 * Empty state evolutivo — copy muda conforme atividade do usuário na semana.
 * Sem gamificação (sem barra de progresso, sem badges).
 */
export interface InsightContext {
  weeklyTxCount: number
  weeklyDays: number
  topCategoryName: string | null
  nextInsightDate: string  // ISO
}

export function buildEvolvingCopy(ctx: InsightContext): { line1: string; line2: string } {
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
