import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { sendBotPaymentAlert, sendBotMessage } from '@/lib/messaging-adapter'
import type { Platform } from '@/lib/messaging-adapter'
import { markRecurringAsPaid } from '@/lib/finance-actions'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'

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
            where: { isVerified: true, platform: 'WHATSAPP' },
          },
        },
      },
    },
  })

  console.log(`[payment-alerts:${period}] Upcoming payments found:`, upcomingPayments.length)

  let alertsSent = 0
  let alertsSkipped = 0
  let autoLaunched = 0  // recorrências com autoConfirm=true lançadas automaticamente
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

    // ─── Auto-launch: recorrências marcadas como "Lança sozinho" ───────────
    // Quando autoConfirm=true E vence hoje, cria a transação automaticamente
    // sem perguntar. Usuário recebe WhatsApp pós-fato explicando o que foi
    // lançado e onde (cartão Nubank fatura 10/05, conta Itaú débito, etc).
    // Só dispara no morning run pra evitar duplicação se o evening rodar.
    if (payment.autoConfirm && daysUntilDue === 0 && period === 'morning') {
      // Idempotência: se já existe transação dessa recorrência hoje, skip
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      const alreadyToday = await prisma.transaction.findFirst({
        where: {
          recurringTransactionId: payment.id,
          date: { gte: startOfDay, lte: endOfDay },
        },
        select: { id: true },
      })

      if (alreadyToday) {
        alertsSkipped++
        continue
      }

      try {
        const result = await markRecurringAsPaid(payment.userId, payment.id)
        if (result.ok) {
          // Mensagem pós-fato: explica o que foi lançado e onde foi parar.
          const formattedAmount = new Intl.NumberFormat('pt-BR', {
            style: 'currency', currency: 'BRL',
          }).format(Number(payment.amount))
          const accountLine = result.accountName
            ? ` na conta *${result.accountName}*`
            : ''
          const methodLabel = result.paymentMethod
            ? ` · _${PAYMENT_METHOD_LABELS[result.paymentMethod] || result.paymentMethod}_`
            : ''

          const text =
            `🤖 *Lancei sozinho:*\n\n` +
            `📌 *${payment.description}* — *${formattedAmount}*${accountLine}${methodLabel}\n\n` +
            `Saldo já atualizado. Se foi engano, abre *Transações* no app e exclui.`

          await sendBotMessage(connection.platform as Platform, connection.platformUserId, text)

          await prisma.botMessage.create({
            data: {
              userId: payment.userId,
              connectionId: connection.id,
              direction: 'OUTBOUND',
              rawContent: `🤖 Auto-lançado: ${payment.description} - ${formattedAmount}`,
              status: 'CONFIRMED',
            },
          })

          autoLaunched++
          continue  // skip alerta normal — já foi lançado
        } else {
          // Auto-launch falhou (sem conta, etc.) — fallback pro alerta normal
          console.warn(
            `[payment-alerts:${period}] Auto-launch failed for recurring ${payment.id}: ${result.error}. Falling back to normal alert.`,
          )
        }
      } catch (err) {
        console.error(
          `[payment-alerts:${period}] Auto-launch error for recurring ${payment.id}:`,
          err,
        )
        // Fallback pro alerta normal — não impede o fluxo
      }
    }

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

  // ─── Invoice alerts ──────────────────────────────────────────────────
  // Same cadence as payment-alerts: morning fires on days 0, 1 and 3 before
  // due date; evening only on day 0. Only unpaid invoices are considered.
  const invoiceEnd = period === 'evening'
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    : threeDaysFromNow

  const unpaidInvoices = await prisma.invoice.findMany({
    where: {
      status: { in: ['OPEN', 'CLOSED', 'OVERDUE'] },
      dueDate: { gte: now, lte: invoiceEnd },
      total: { gt: 0 },
    },
    include: {
      card: { select: { name: true } },
      user: {
        include: {
          notificationSetting: true,
          botConnections: { where: { isVerified: true, platform: 'WHATSAPP' } },
        },
      },
    },
  })
  console.log(`[payment-alerts:${period}] Unpaid invoices in window:`, unpaidInvoices.length)

  let invoiceSent = 0
  let invoiceSkipped = 0
  const invoiceFailures: { id: string; reason: string }[] = []

  for (const invoice of unpaidInvoices) {
    const connection = invoice.user.botConnections[0]
    if (!connection) { invoiceSkipped++; continue }

    const alertsEnabled = invoice.user.notificationSetting?.telegramAlerts ?? true
    if (!alertsEnabled) { invoiceSkipped++; continue }

    if (period === 'evening') {
      const eveningEnabled = invoice.user.notificationSetting?.eveningPaymentReminder ?? true
      if (!eveningEnabled) { invoiceSkipped++; continue }
    }

    const daysUntil = Math.ceil((invoice.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const shouldAlert = period === 'evening'
      ? daysUntil === 0
      : daysUntil === 0 || daysUntil === 1 || daysUntil === 3
    if (!shouldAlert) { invoiceSkipped++; continue }

    const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(invoice.total))
    const formattedDate = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(invoice.dueDate)
    const heading = period === 'evening'
      ? `⏰ <b>Fatura ainda não paga</b>`
      : `💳 <b>Fatura ${invoice.card.name}</b>`
    const urgency = daysUntil === 0 ? 'vence hoje' : daysUntil === 1 ? 'vence amanhã' : `vence em ${daysUntil} dias (${formattedDate})`

    const text =
      `${heading}\n\n` +
      `<b>${invoice.card.name}</b>\n` +
      `💰 ${formattedAmount}\n` +
      `📅 ${urgency}\n\n` +
      `Pague agora em https://finn-steel.vercel.app/invoices/${invoice.id}`

    try {
      await sendBotMessage(connection.platform as Platform, connection.platformUserId, text)
      await prisma.botMessage.create({
        data: {
          userId: invoice.userId,
          connectionId: connection.id,
          direction: 'OUTBOUND',
          rawContent: `Lembrete fatura: ${invoice.card.name} - ${formattedAmount}`,
          status: 'CONFIRMED',
        },
      })
      invoiceSent++
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      console.error(`[payment-alerts:${period}] Failed invoice alert ${invoice.id}:`, reason)
      invoiceFailures.push({ id: invoice.id, reason })
    }
  }

  const finishedAt = new Date()
  console.log(`[payment-alerts:${period}] Done:`, {
    sent: alertsSent,
    autoLaunched,
    skipped: alertsSkipped,
    failed: failures.length,
    invoiceSent,
    invoiceSkipped,
    invoiceFailed: invoiceFailures.length,
  })

  const totalFailures = [...failures, ...invoiceFailures]
  try {
    await prisma.cronRun.create({
      data: {
        jobName: `payment-alerts:${period}`,
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        status: totalFailures.length > 0 ? 'error' : 'success',
        checked: upcomingPayments.length + unpaidInvoices.length,
        sent: alertsSent + invoiceSent,
        skipped: alertsSkipped + invoiceSkipped,
        failed: totalFailures.length,
        result: { failures: totalFailures, payments: { sent: alertsSent }, invoices: { sent: invoiceSent } },
        errorMsg: totalFailures.length > 0 ? totalFailures.map(f => `${f.id}: ${f.reason}`).join('; ') : null,
      },
    })
  } catch (persistErr) {
    console.error(`[payment-alerts:${period}] Failed to persist CronRun:`, persistErr)
  }

  return Response.json({
    data: {
      period,
      payments: { checked: upcomingPayments.length, sent: alertsSent, autoLaunched, skipped: alertsSkipped, failures },
      invoices: { checked: unpaidInvoices.length, sent: invoiceSent, skipped: invoiceSkipped, failures: invoiceFailures },
      timestamp: now.toISOString(),
    },
  })
}
