import prisma from '@/lib/prisma'
import type { Subscription } from '@/generated/prisma/client'

/**
 * Estado efetivo da assinatura, computado a partir do registro do banco.
 * Consolida a interpretação do (status, datas) num único enum simples
 * que callers podem comparar sem precisar reaplicar a lógica de janelas.
 */
export type EffectiveStatus =
  | 'TRIAL_ACTIVE'      // dentro do trial, tem acesso completo
  | 'TRIAL_EXPIRED'     // trial venceu, sem conversão — paywall
  | 'PAID_ACTIVE'       // pagante ativo
  | 'PAID_CANCELLED'    // cancelou mas ainda em período pago
  | 'PAID_EXPIRED'      // assinatura expirou e não renovou
  | 'PAST_DUE'          // pagamento falhou, em recuperação
  | 'NO_SUBSCRIPTION'   // sem registro (não deveria acontecer pós-backfill)

/**
 * Retorna a subscription do usuário, ou null se não existir.
 */
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  return prisma.subscription.findUnique({ where: { userId } })
}

/**
 * Calcula o estado efetivo da assinatura com base no estado armazenado
 * + datas. Não atualiza o banco — só interpreta. O cron diário
 * (/api/cron/subscription-tick) é responsável por persistir as
 * transições (TRIAL → EXPIRED quando trialEndsAt passa, etc).
 */
export function computeEffectiveStatus(sub: Subscription | null): EffectiveStatus {
  if (!sub) return 'NO_SUBSCRIPTION'

  const now = new Date()

  if (sub.status === 'TRIAL') {
    return sub.trialEndsAt > now ? 'TRIAL_ACTIVE' : 'TRIAL_EXPIRED'
  }

  if (sub.status === 'EXPIRED') {
    // pode ser trial expirado OU subscription paga que não renovou.
    // distinguimos pelo plan: se é TRIAL, é o primeiro caso.
    return sub.plan === 'TRIAL' ? 'TRIAL_EXPIRED' : 'PAID_EXPIRED'
  }

  if (sub.status === 'CANCELLED') {
    if (sub.currentPeriodEnd && sub.currentPeriodEnd > now) {
      return 'PAID_CANCELLED'
    }
    return 'PAID_EXPIRED'
  }

  if (sub.status === 'PAST_DUE') return 'PAST_DUE'

  if (sub.status === 'ACTIVE') {
    // ACTIVE com currentPeriodEnd no passado = lapsa, deveria ser
    // marcado como EXPIRED pelo cron mas damos veredito conservador.
    if (sub.currentPeriodEnd && sub.currentPeriodEnd < now) {
      return 'PAID_EXPIRED'
    }
    return 'PAID_ACTIVE'
  }

  return 'NO_SUBSCRIPTION'
}

/**
 * Decide se o usuário pode acessar features pagas (= todas, no plano novo).
 * TRIAL_ACTIVE, PAID_ACTIVE e PAID_CANCELLED (até fim do período) têm acesso;
 * o resto cai no paywall.
 */
export function hasAppAccess(status: EffectiveStatus): boolean {
  return (
    status === 'TRIAL_ACTIVE' ||
    status === 'PAID_ACTIVE' ||
    status === 'PAID_CANCELLED'
  )
}

/**
 * Conveniência: busca a subscription e já retorna `{ status, hasAccess }`.
 * Usa em route handlers, server components, etc.
 */
export async function getAccessState(userId: string): Promise<{
  status: EffectiveStatus
  hasAccess: boolean
  subscription: Subscription | null
}> {
  const subscription = await getUserSubscription(userId)
  const status = computeEffectiveStatus(subscription)
  return { status, hasAccess: hasAppAccess(status), subscription }
}

/**
 * Quantos dias restam no trial. Retorna null se não tá em TRIAL_ACTIVE.
 * Útil pra UI mostrar "X dias restantes do Diagnóstico".
 */
export function trialDaysRemaining(sub: Subscription | null): number | null {
  if (!sub || sub.status !== 'TRIAL') return null
  const now = new Date()
  if (sub.trialEndsAt <= now) return 0
  const ms = sub.trialEndsAt.getTime() - now.getTime()
  return Math.ceil(ms / (24 * 60 * 60 * 1000))
}
