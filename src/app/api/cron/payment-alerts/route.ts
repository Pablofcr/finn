import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { sendBotPaymentAlert } from '@/lib/messaging-adapter'
import type { Platform } from '@/lib/messaging-adapter'

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const period = url.searchParams.get('period') === 'evening' ? 'evening' : 'morning'
  return runPaymentAlerts(period)
}

export async function runPaymentAlerts(period: 'morning' | 'evening' = 'morning') {
  const startedAt = new Date()
  const now = startedAt
  console.log(`[payment-alerts:${period}] Cron started at`, now.toISOString())

  const threeDaysFromNow = new Date(now)
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

  // Evening run only needs today's payments; morning also looks ahead 3 days.
  const maxDate = period === 'evening'
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    : threeDaysFromNow

  const upcomingPayments = await prisma.recurringTransaction.findMany({
    where: {
      status: 'ACTIVE',
      nextDueDate: {
        gte: now,
        lte: maxDate,
      },
      OR: [
        { snoozedUntil: null },
        { snoozedUntil: { lte: now } },
      ],
    },
    include: {
      user: {
        include: {
          notificationSetting: true,
          botConnections: {
            where: { isVerified: true },
          },
        },
      },
    },
  })

  console.log(`[payment-alerts:${period}] Upcoming payments found:`, upcomingPayments.length)

  let alertsSent = 0
  let alertsSkipped = 0
  const failures: { id: string; reason: string }[] = []

  for (const payment of upcomingPayments) {
    const connection = payment.user.botConnections[0]
    if (!connection) {
      alertsSkipped++
      continue
    }

    const settings = payment.user.notificationSetting
    const alertsEnabled = settings?.telegramAlerts ?? true
    if (!alertsEnabled) {
      alertsSkipped++
      continue
    }

    // Evening run: respect eveningPaymentReminder opt-out
    if (period === 'evening') {
      const eveningEnabled = settings?.eveningPaymentReminder ?? true
      if (!eveningEnabled) {
        alertsSkipped++
        continue
      }
    }

    const daysUntilDue = Math.ceil(
      (payment.nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Morning fires on 0, 1 and 3 days out. Evening only on due day.
    const shouldAlert = period === 'evening'
      ? daysUntilDue === 0
      : daysUntilDue === 0 || daysUntilDue === 1 || daysUntilDue === 3

    if (!shouldAlert) {
      alertsSkipped++
      continue
    }

    // Evening: skip if user already registered a transaction for this recurring today.
    // The bot's "Paguei" button advances nextDueDate (so the row is already out of
    // this query), but payments registered via the web app leave nextDueDate intact
    // — this guards against sending a nudge in that case too.
    if (period === 'evening') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      const alreadyPaid = await prisma.transaction.findFirst({
        where: {
          recurringTransactionId: payment.id,
          date: { gte: startOfDay, lte: maxDate },
        },
        select: { id: true },
      })
      if (alreadyPaid) {
        alertsSkipped++
        continue
      }
    }

    try {
      await sendBotPaymentAlert(connection.platform as Platform, connection.platformUserId, {
        description: payment.description,
        amount: Number(payment.amount),
        dueDate: payment.nextDueDate.toISOString(),
        recurringId: payment.id,
        variant: period === 'evening' ? 'urgent' : 'normal',
      })

      await prisma.botMessage.create({
        data: {
          userId: payment.userId,
          connectionId: connection.id,
          direction: 'OUTBOUND',
          rawContent: `${period === 'evening' ? '⏰ Nudge' : 'Lembrete'}: ${payment.description} - R$ ${Number(payment.amount).toFixed(2)}`,
          status: 'CONFIRMED',
        },
      })

      alertsSent++
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      console.error(`[payment-alerts:${period}] Failed to send alert for recurring ${payment.id}:`, reason)
      failures.push({ id: payment.id, reason })
    }
  }

  const finishedAt = new Date()
  console.log(`[payment-alerts:${period}] Done:`, { sent: alertsSent, skipped: alertsSkipped, failed: failures.length })

  try {
    await prisma.cronRun.create({
      data: {
        jobName: `payment-alerts:${period}`,
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        status: failures.length > 0 ? 'error' : 'success',
        checked: upcomingPayments.length,
        sent: alertsSent,
        skipped: alertsSkipped,
        failed: failures.length,
        result: { failures },
        errorMsg: failures.length > 0 ? failures.map(f => `${f.id}: ${f.reason}`).join('; ') : null,
      },
    })
  } catch (persistErr) {
    console.error(`[payment-alerts:${period}] Failed to persist CronRun:`, persistErr)
  }

  return Response.json({
    data: {
      period,
      checked: upcomingPayments.length,
      alertsSent,
      alertsSkipped,
      failures,
      timestamp: now.toISOString(),
    },
  })
}
