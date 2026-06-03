/**
 * Helpers de timezone pra usar a tz do user em vez do UTC do servidor.
 *
 * Vercel server roda em UTC. O usuário pensa em Brasília (ou outra tz
 * configurada). Quando às 22h Brasília o servidor calcula `new Date()`,
 * ele já passou pra dia seguinte UTC — daí "vence hoje" vira "venceu
 * ontem" e badges como "Em N dias" erram por 1.
 *
 * Padrão de uso:
 *
 *   const tz = user.timezone  // 'America/Sao_Paulo', 'Europe/Lisbon', etc
 *   const today = getTodayInTimezone(tz)
 *   const diff = daysUntilInTimezone(occurrence.dueDate, tz)
 *
 * `today` é uma `Date` representando midnight (00:00) UTC, mas calculado
 * a partir do "qual dia é hoje na tz do user". Comparações com `dueDate`
 * (que tipicamente vêm como midnight UTC no Prisma) funcionam.
 */
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

/**
 * Retorna a `Date` que representa "00:00 de hoje na tz do user", expressa
 * em UTC. Útil pra comparar com `dueDate` armazenadas como midnight UTC.
 *
 * Ex: às 22h Brasília (01h UTC do dia seguinte), getTodayInTimezone('America/Sao_Paulo')
 *     retorna o midnight UTC do MESMO dia local que o user está vendo,
 *     não o midnight UTC do servidor (que já avançou).
 */
export function getTodayInTimezone(timezone: string): Date {
  // 1. Pega o "agora" do servidor (UTC) e converte pra ver que horas/dia
  //    é na tz do user.
  const now = new Date()
  const localNow = toZonedTime(now, timezone)

  // 2. Constrói meio-noite local "hoje" (na tz do user) a partir dos
  //    componentes Y/M/D extraídos.
  const localMidnight = new Date(
    localNow.getFullYear(),
    localNow.getMonth(),
    localNow.getDate(),
    0, 0, 0, 0,
  )

  // 3. Reconverte midnight LOCAL pra UTC, pra poder comparar com dueDates
  //    do banco (que são midnight UTC dos dias-calendário).
  return fromZonedTime(localMidnight, timezone)
}

/**
 * Diferença em dias-calendário entre `targetDate` e "hoje na tz do user".
 * Retorna negativo se vencido, 0 se vence hoje, positivo se futuro.
 *
 * IMPORTANTE: assumimos que `targetDate` armazena uma DATA (dia-calendário)
 * como midnight UTC — convenção comum no Prisma quando o tipo é `DateTime`
 * mas semanticamente é uma data. Não convertemos a tz dele; lemos só os
 * componentes UTC (Y/M/D). Caso contrário, em GMT-3, midnight UTC = 21h
 * do dia anterior local, e a contagem erra por 1 dia.
 *
 * "Hoje na tz do user" SIM passa por conversão de timezone (porque vem do
 * relógio do servidor em UTC e queremos saber qual dia-calendário é pro user).
 */
export function daysUntilInTimezone(targetDate: Date, timezone: string): number {
  // "Hoje" como dia-calendário na tz do user
  const localNow = toZonedTime(new Date(), timezone)
  const todayCalendar = Date.UTC(
    localNow.getFullYear(),
    localNow.getMonth(),
    localNow.getDate(),
  )

  // "Target" como dia-calendário — leitura DIRETA dos componentes UTC do
  // dueDate, sem conversão de tz (o dueDate é midnight UTC mas representa
  // um dia, não um instante).
  const targetCalendar = Date.UTC(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth(),
    targetDate.getUTCDate(),
  )

  const dayMs = 1000 * 60 * 60 * 24
  return Math.round((targetCalendar - todayCalendar) / dayMs)
}
