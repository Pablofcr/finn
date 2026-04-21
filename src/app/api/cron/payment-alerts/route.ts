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

  return runPaymentAlerts()
}

export async function runPaymentAlerts() {
  const startedAt = new Date()
  const now = startedAt
  console.log('[payment-alerts] Cron started at', now.toISOString())

  const threeDaysFromNow = new Date(now)
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

  // Find all active recurring transactions due in the next 3 days, excluding
  // any that the user snoozed until a future moment.
  const upcomingPayments = await prisma.recurringTransaction.findMany({
    where: {
      status: 'ACTIVE',
      nextDueDate: {
        gte: now,
        lte: threeDaysFromNow,
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

  console.log('[payment-alerts] Upcoming payments found:', upcomingPayments.length)

  let alertsSent = 0
  let alertsSkipped = 0
  const failures: { id: string; reason: string }[] = []

  for (const payment of upcomingPayments) {
    const connection = payment.user.botConnections[0]
    if (!connection) {
      alertsSkipped++
      continue
    }

    // Check if telegram alerts are enabled
    const alertsEnabled = payment.user.notificationSetting?.telegramAlerts ?? true
    if (!alertsEnabled) {
      alertsSkipped++
      continue
    }

    const daysUntilDue = Math.ceil(
      (payment.nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Send alert for payments due today, tomorrow, or in 3 days
    if (daysUntilDue === 0 || daysUntilDue === 1 || daysUntilDue === 3) {
      try {
        await sendBotPaymentAlert(connection.platform as Platform, connection.platformUserId, {
          description: payment.description,
          amount: Number(payment.amount),
          dueDate: payment.nextDueDate.toISOString(),
          recurringId: payment.id,
        })

        // Log the outbound message
        await prisma.botMessage.create({
          data: {
            userId: payment.userId,
            connectionId: connection.id,
            direction: 'OUTBOUND',
            rawContent: `Lembrete: ${payment.description} - R$ ${Number(payment.amount).toFixed(2)}`,
            status: 'CONFIRMED',
          },
        })

        alertsSent++
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err)
        console.error(`[payment-alerts] Failed to send alert for recurring ${payment.id}:`, reason)
        failures.push({ id: payment.id, reason })
      }
    } else {
      alertsSkipped++
    }
  }

  const finishedAt = new Date()
  console.log('[payment-alerts] Done:', { sent: alertsSent, skipped: alertsSkipped, failed: failures.length })

  try {
    await prisma.cronRun.create({
      data: {
        jobName: 'payment-alerts',
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        status: failures.length > 0 ? 'error' : 'success',
        checked: upcomingPayments.length,
        sent: alertsSent,
        skipped: alertsSkipped,
        failed: failures.length,
        result: {
          failures,
        },
        errorMsg: failures.length > 0 ? failures.map(f => `${f.id}: ${f.reason}`).join('; ') : null,
      },
    })
  } catch (persistErr) {
    console.error('[payment-alerts] Failed to persist CronRun:', persistErr)
  }

  return Response.json({
    data: {
      checked: upcomingPayments.length,
      alertsSent,
      alertsSkipped,
      failures,
      timestamp: now.toISOString(),
    },
  })
}
