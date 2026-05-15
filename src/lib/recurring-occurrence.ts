import type { RecurrenceFrequency } from '@/generated/prisma/client'

/**
 * Avança uma data pelo intervalo da frequência da recorrência.
 *
 * Mantemos a hora/minuto/segundo do input — só mexemos no dia/mês/ano.
 * Pra recorrências mensais, a data preserva o dia (ex: dia 10 sempre);
 * meses curtos (28/30 dias) podem fazer o JS Date avançar pro mês seguinte
 * — comportamento intencional e consistente com nextDueDate atual do
 * webhook (`src/app/api/bot/whatsapp/webhook/route.ts:823-832`).
 */
export function advanceByFrequency(date: Date, frequency: RecurrenceFrequency): Date {
  const next = new Date(date)
  switch (frequency) {
    case 'DAILY':     next.setUTCDate(next.getUTCDate() + 1); break
    case 'WEEKLY':    next.setUTCDate(next.getUTCDate() + 7); break
    case 'BIWEEKLY':  next.setUTCDate(next.getUTCDate() + 14); break
    case 'MONTHLY':   next.setUTCMonth(next.getUTCMonth() + 1); break
    case 'QUARTERLY': next.setUTCMonth(next.getUTCMonth() + 3); break
    case 'YEARLY':    next.setUTCFullYear(next.getUTCFullYear() + 1); break
  }
  return next
}

/**
 * Gera todas as datas teóricas de vencimento de uma recorrência entre
 * `from` (inclusivo) e `to` (inclusivo), avançando por `frequency`.
 *
 * Caller passa `from = startDate da recorrência` (ou alguma data
 * intermediária), e `to = hoje + folga` (ex: hoje+7). Retorna lista
 * ordenada cronologicamente.
 *
 * Usado no backfill (gera occurrences históricas + pendentes existentes
 * teoricamente) e no cron (gera occurrences futuras à medida que dueDate
 * é alcançado).
 */
export function expectedDueDatesBetween(
  startDate: Date,
  frequency: RecurrenceFrequency,
  from: Date,
  to: Date,
): Date[] {
  const dates: Date[] = []
  let cursor = new Date(startDate)
  // Pula pra primeira data >= from. Avança em saltos da frequência —
  // pra recorrências antigas (anos atrás) isso pode ser lento, mas na
  // prática são poucas centenas de iterações no pior caso.
  while (cursor < from) {
    cursor = advanceByFrequency(cursor, frequency)
  }
  while (cursor <= to) {
    dates.push(new Date(cursor))
    cursor = advanceByFrequency(cursor, frequency)
  }
  return dates
}

/**
 * Soma um array de Decimals (representados como string ou number) e
 * retorna number. Útil pra "total devendo" das parcelas em aberto.
 */
export function sumAmounts(values: Array<string | number | { toString(): string }>): number {
  return values.reduce<number>((acc, v) => acc + Number(v.toString()), 0)
}

/**
 * Formata data UTC pra DD/MM/AAAA no padrão BR (usado nos templates HSM).
 */
export function formatBRDate(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(d)
}

/**
 * Formata valor numérico em BRL ("R$ 1.234,56"). Centraliza pra evitar
 * inconsistência entre callers.
 */
export function formatBRL(amount: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
}
