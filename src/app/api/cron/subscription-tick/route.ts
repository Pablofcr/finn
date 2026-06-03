import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * Cron diário de manutenção das subscriptions. Roda 4h UTC = 1h BRT
 * (cedo, fora do horário de uso, antes do payment-alerts).
 *
 * Responsabilidades (apenas transições de estado — não envia nada):
 *
 * 1) TRIAL → EXPIRED quando trialEndsAt passou e ninguém converteu.
 *    O acesso ao app passa a ser negado (paywall) na próxima request
 *    do user. Mensagens de "trial expirou" são responsabilidade da
 *    Fase 3 (mensagens automáticas WhatsApp).
 *
 * 2) ACTIVE → EXPIRED quando currentPeriodEnd passou e o gateway não
 *    renovou. Em prática, o webhook do Asaas vai mudar isso quando o
 *    pagamento falhar — este cron é só safety net.
 *
 * 3) Incrementa daysActiveCount pra subscriptions que tiveram atividade
 *    no dia anterior (qualquer transação criada OU mensagem inbound do
 *    bot). Usado pra analytics e futuro tracking de engagement.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = new Date()
  const now = startedAt
  const yesterdayStart = new Date(now)
  yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1)
  yesterdayStart.setUTCHours(0, 0, 0, 0)
  const yesterdayEnd = new Date(yesterdayStart)
  yesterdayEnd.setUTCHours(23, 59, 59, 999)

  // ── 1) Expira trials que já venceram ────────────────────────────────
  // Sincroniza User.plan: TRIAL → EXPIRED. Só toca users que estavam em
  // TRIAL — PRO/MASTER que por algum motivo tenham subscription TRIAL
  // (não deveria acontecer) ficam com User.plan intacto.
  const trialsToExpire = await prisma.subscription.findMany({
    where: { status: 'TRIAL', trialEndsAt: { lte: now } },
    include: { user: { select: { plan: true } } },
  })

  for (const sub of trialsToExpire) {
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED', trialExpiredAt: now },
      })
      if (sub.user.plan === 'TRIAL') {
        await tx.user.update({
          where: { id: sub.userId },
          data: { plan: 'EXPIRED' },
        })
      }
    })
  }

  // ── 2) Expira assinaturas pagas com currentPeriodEnd vencido ────────
  // (safety net — webhook do gateway é o caminho primário)
  const paidToExpire = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      currentPeriodEnd: { lte: now, not: null },
    },
    include: { user: { select: { plan: true } } },
  })

  for (const sub of paidToExpire) {
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      })
      if (sub.user.plan === 'PRO') {
        await tx.user.update({
          where: { id: sub.userId },
          data: { plan: 'EXPIRED' },
        })
      }
    })
  }

  // ── 3) Incrementa daysActiveCount pra quem teve atividade ontem ─────
  // Critério "ativo no dia": criou transação OU mandou inbound no bot.
  // Faz dois queries separados e une os userIds antes de aplicar o
  // increment (evita double-count se o user fez ambas).
  const [activeFromTransactions, activeFromBot] = await Promise.all([
    prisma.transaction.findMany({
      where: { createdAt: { gte: yesterdayStart, lte: yesterdayEnd } },
      select: { userId: true },
      distinct: ['userId'],
    }),
    prisma.botMessage.findMany({
      where: {
        direction: 'INBOUND',
        createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
      },
      select: { userId: true },
      distinct: ['userId'],
    }),
  ])

  const activeUserIds = new Set<string>([
    ...activeFromTransactions.map(t => t.userId),
    ...activeFromBot.map(b => b.userId),
  ])

  let daysActiveIncremented = 0
  if (activeUserIds.size > 0) {
    const result = await prisma.subscription.updateMany({
      where: { userId: { in: Array.from(activeUserIds) } },
      data: { daysActiveCount: { increment: 1 } },
    })
    daysActiveIncremented = result.count
  }

  const finishedAt = new Date()
  return Response.json({
    data: {
      trialsExpired: trialsToExpire.length,
      paidExpired: paidToExpire.length,
      daysActiveIncremented,
      runtimeMs: finishedAt.getTime() - startedAt.getTime(),
      timestamp: finishedAt.toISOString(),
    },
  })
}
