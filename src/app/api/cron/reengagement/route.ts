import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { sendWhatsAppNotification } from '@/lib/messaging-adapter'
import { buildReengagementText, type ReengagementStatus } from '@/lib/whatsapp'

/**
 * Cron de re-engagement — Ter-Qui 10:30 BRT (= 13:30 UTC).
 * Plano definido pelo data-squad/peter-fader + copy-squad/andre-chaperon.
 *
 * Triggers:
 *   warning  → daysSinceLast >= 6 e <= 9
 *   at-risk  → daysSinceLast >= 14 e <= 20
 *   inactive → daysSinceLast >= 30
 *
 * Cooldowns (após o último nudge enviado):
 *   warning  → 21 dias
 *   at-risk  → 45 dias
 *   inactive → NUNCA mais (1 shot, depois Pablo manualmente)
 *
 * Lifetime cap: 3 nudges totais por user — depois disso, nunca mais.
 *
 * Abort conditions (cada user passa por checagem antes de receber):
 *   - notificationSetting.botAlerts = false (opt-out)
 *   - botConnections WHATSAPP isVerified = false (sem canal)
 *   - lifetime nudge count >= 3
 *   - cooldown da janela do status atual ainda ativo
 *   - status virou 'engaged' após recompute (user voltou a usar)
 */

const COOLDOWN_DAYS: Record<ReengagementStatus, number | null> = {
  warning: 21,
  'at-risk': 45,
  inactive: null, // null = nunca re-nudge
}
const LIFETIME_CAP = 3

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = new Date()
  const now = startedAt
  const dayMs = 1000 * 60 * 60 * 24

  // Fetch users com WhatsApp conectado + setting de notificação.
  // Reengagement quase sempre roda fora da janela 24h (esse é o ponto:
  // o user sumiu) — depende de template HSM aprovado pra entregar.
  const users = await prisma.user.findMany({
    where: {
      botConnections: { some: { platform: 'WHATSAPP', isVerified: true } },
    },
    select: {
      id: true,
      name: true,
      notificationSetting: { select: { botAlerts: true } },
      botConnections: {
        where: { platform: 'WHATSAPP', isVerified: true },
        select: { platformUserId: true },
      },
    },
  })

  let evaluated = 0
  let sent = 0
  let skipped = 0
  let failed = 0
  const failures: { userId: string; reason: string }[] = []

  for (const user of users) {
    evaluated++

    // Abort: opt-out
    const alertsEnabled = user.notificationSetting?.botAlerts ?? true
    if (!alertsEnabled) { skipped++; continue }

    const connection = user.botConnections[0]
    if (!connection?.platformUserId) { skipped++; continue }

    // Recompute DSLA (idêntico ao admin endpoint — Fader: recompute at send)
    const [lastTx, lastInbound] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId: user.id },
        _max: { createdAt: true },
      }),
      prisma.botMessage.aggregate({
        where: { userId: user.id, direction: 'INBOUND' },
        _max: { createdAt: true },
      }),
    ])
    const txAt = lastTx._max.createdAt
    const inAt = lastInbound._max.createdAt
    let lastActivity: Date | null = null
    if (txAt && inAt) lastActivity = txAt > inAt ? txAt : inAt
    else lastActivity = txAt || inAt

    if (!lastActivity) { skipped++; continue } // user nunca registrou nada — não é caso pra re-engagement
    const daysSince = Math.floor((now.getTime() - lastActivity.getTime()) / dayMs)

    // Determina status — usa janelas amplas pra não perder users em
    // dias que o cron não rodou (Mon, Fri, weekend).
    let status: ReengagementStatus | null = null
    if (daysSince >= 30) status = 'inactive'
    else if (daysSince >= 14 && daysSince <= 20) status = 'at-risk'
    else if (daysSince >= 6 && daysSince <= 9) status = 'warning'

    if (!status) { skipped++; continue }

    // Lifetime cap
    const lifetimeCount = await prisma.reengagementNudge.count({ where: { userId: user.id } })
    if (lifetimeCount >= LIFETIME_CAP) { skipped++; continue }

    // Cooldown — pega o último nudge e verifica se cooldown do status atual passou
    const lastNudge = await prisma.reengagementNudge.findFirst({
      where: { userId: user.id },
      orderBy: { sentAt: 'desc' },
    })
    if (lastNudge) {
      const daysSinceLastNudge = Math.floor((now.getTime() - lastNudge.sentAt.getTime()) / dayMs)
      const cooldownForStatus = COOLDOWN_DAYS[status]
      // null = nunca re-nudge (inactive)
      if (cooldownForStatus === null) { skipped++; continue }
      if (daysSinceLastNudge < cooldownForStatus) { skipped++; continue }

      // Se o último nudge JÁ era inactive, nunca mais
      if (lastNudge.engagementStatus === 'inactive') { skipped++; continue }
    }

    // Tudo certo — envia
    const firstName = user.name?.split(' ')[0] || 'usuário'
    try {
      const text = buildReengagementText(firstName, status)
      const result = await sendWhatsAppNotification({
        userId: user.id,
        connection,
        text,
        // Reengagement praticamente sempre roda fora da janela 24h
        // (o ponto é: o user sumiu). Template MARKETING é a forma certa —
        // mensagem é relacional, não transacional. Submetida como Marketing
        // explicitamente pra evitar reclassificação automática da Meta.
        templateFallback: {
          templateName: process.env.WHATSAPP_TEMPLATE_REENGAGEMENT,
          bodyParameters: [
            firstName,
            status === 'inactive'
              ? 'Passei pra saber de ti. Faz um tempinho que a gente não se fala — qualquer resposta me ajuda.'
              : 'Reparei que tu sumiu uns dias. Manda um áudio rápido com qualquer gasto que eu cuido do resto.',
          ],
        },
      })
      if (result.ok) {
        await prisma.reengagementNudge.create({
          data: {
            userId: user.id,
            status: 'sent',
            engagementStatus: status,
            daysSinceLast: daysSince,
          },
        })
        sent++
      } else {
        const reason = result.errorMessage || 'all channels failed'
        await prisma.reengagementNudge.create({
          data: {
            userId: user.id,
            status: 'failed',
            statusDetail: reason,
            engagementStatus: status,
            daysSinceLast: daysSince,
          },
        })
        failures.push({ userId: user.id, reason })
        failed++
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      await prisma.reengagementNudge.create({
        data: {
          userId: user.id,
          status: 'failed',
          statusDetail: reason,
          engagementStatus: status,
          daysSinceLast: daysSince,
        },
      })
      failures.push({ userId: user.id, reason })
      failed++
    }
  }

  const finishedAt = new Date()
  const durationMs = finishedAt.getTime() - startedAt.getTime()

  // Persiste em CronRun pra aparecer no admin
  try {
    await prisma.cronRun.create({
      data: {
        jobName: 'reengagement',
        startedAt,
        finishedAt,
        durationMs,
        status: failures.length > 0 ? 'error' : 'success',
        checked: evaluated,
        sent,
        skipped,
        failed,
        result: { failures },
        errorMsg: failures.length > 0 ? failures.map(f => `${f.userId}: ${f.reason}`).join('; ') : null,
      },
    })
  } catch (persistErr) {
    console.error('[reengagement] Failed to persist CronRun:', persistErr)
  }

  return Response.json({
    data: { evaluated, sent, skipped, failed, failures, durationMs },
  })
}
