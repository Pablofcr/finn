"use client"

import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, cn } from '@/lib/utils'

type ForecastSeverity = 'positive' | 'tight' | 'negative'

interface Forecast {
  expected: number
  severity: ForecastSeverity
  daysRemaining: number
  remainingBills: number
  eomDate: string
}

interface ForecastCardProps {
  forecast: Forecast | null
}

const CHIP_LABEL: Record<ForecastSeverity, string> = {
  positive: 'Você termina o mês no azul',
  tight: 'Vai ficar apertado',
  negative: 'Você fecha o mês no vermelho',
}

const CHIP_CLASS: Record<ForecastSeverity, string> = {
  positive: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20',
  tight: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20',
  negative: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/20',
}

const VALUE_CLASS: Record<ForecastSeverity, string> = {
  positive: 'text-foreground',
  tight: 'text-amber-600 dark:text-amber-400',
  negative: 'text-rose-600 dark:text-rose-400',
}

function formatEomDate(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getUTCDate()).padStart(2, '0')
  const monthNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
  return `${day}/${monthNames[d.getUTCMonth()]}`
}

export function ForecastCard({ forecast }: ForecastCardProps) {
  if (!forecast) return null

  const { expected, severity, daysRemaining, remainingBills, eomDate } = forecast

  // Action line: só mencionamos contas a pagar se houver
  const actionLine = remainingBills > 0
    ? `Faltam ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'} e ${formatCurrency(remainingBills)} em contas pra pagar.`
    : `Faltam ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'} pro fim do mês.`

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        {/* Chip de severidade no topo */}
        <span
          className={cn(
            'inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ring-1 ring-inset',
            CHIP_CLASS[severity],
          )}
        >
          {CHIP_LABEL[severity]}
        </span>

        {/* Sub-label + headline number */}
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mt-3">
          Saldo previsto em {formatEomDate(eomDate)}
        </p>
        <p className={cn('text-3xl sm:text-4xl font-bold tabular-nums mt-1', VALUE_CLASS[severity])}>
          {expected < 0 ? '−' : ''}{formatCurrency(Math.abs(expected))}
        </p>

        {/* Frase acionável */}
        <p className="text-sm text-muted-foreground mt-2">{actionLine}</p>

        {/* Footnote */}
        <p className="text-[10px] text-muted-foreground/70 italic mt-4 pt-3 border-t border-border/50">
          Estimativa baseada nos seus gastos recentes. Pode mudar conforme o mês avança.
        </p>
      </CardContent>
    </Card>
  )
}
