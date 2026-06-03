import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import {
  sendWhatsAppNotification,
  sendWhatsAppPaymentNotification,
  sendWhatsAppMultiOverdueNotification,
} from '@/lib/messaging-adapter'
import type { PaymentAlertVariant } from '@/lib/messaging-adapter'
import { markRecurringAsPaid, ensureNextOccurrences } from '@/lib/finance-actions'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'
import { daysUntilInTimezone } from '@/lib/date-tz'

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

  // Lower bound: start of today UTC, so we catch recurrences whose nextDueDate
  // is stored as 00:00 UTC of the current day. Using `gte: now` would filter
  // those out (since the cron typically runs hours after midnight UTC), and
  // today's-due payments would silently never alert.
  // ── Evening cron passa a pegar TAMBÉM vencidas (D+1, D+2, ...): sem
  //    lower bound, o filter aceita qualquer nextDueDate <= endOfToday. Morning
  //    mantém startOfToday — só queremos avisar antecipadamente, não cobrar
  //    de manhã coisas que já estão vencidas (cobrança de vencidas é evening).
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))

  // ─── STEP 1: garantir occurrences pendentes até hoje+7 ──────────────
  // Pra cada recurring ACTIVE, gera occurrences PENDING faltantes entre
  // a última conhecida e horizon. Idempotente — unique [recurringId, dueDate].
  // Sem isso, recorrências criadas recentemente (sem cron rodando ainda)
  // ou que avançaram pela frequência sem o cron ter populado occurrences
  // ficariam invisíveis.
  const horizon = new Date(now)
  horizon.setUTCDate(horizon.getUTCDate() + 7)

  const activeRecurrings = await prisma.recurringTransaction.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, startDate: true, nextDueDate: true, frequency: true, status: true, endDate: true },
  })
  let occurrencesGenerated = 0
  for (const rec of activeRecurrings) {
    occurrencesGenerated += await ensureNextOccurrences(rec, horizon)
  }
  if (occurrencesGenerated > 0) {
    console.log(`[payment-alerts:${period}] Generated ${occurrencesGenerated} new occurrences`)
  }

  // ─── STEP 2: buscar occurrences PENDING na janela do período ────────
  // Morning: dueDate entre hoje (00:00 UTC) e hoje+3 — alertas antecipados.
  // Evening: dueDate <= fim de hoje — inclui vencidas (D+1, D+2, ...).
  const pendingOccurrences = await prisma.recurringOccurrence.findMany({
    where: {
      status: 'PENDING',
      dueDate: period === 'evening'
        ? { lte: maxDate }
        : { gte: startOfToday, lte: maxDate },
      OR: [
        { snoozedUntil: null },
        { snoozedUntil: { lte: now } },
      ],
      recurring: {
        status: 'ACTIVE',
        OR: [
          { snoozedUntil: null },
          { snoozedUntil: { lte: now } },
        ],
      },
    },
    orderBy: [{ recurringTransactionId: 'asc' }, { dueDate: 'asc' }],
    include: {
      recurring: {
        include: {
          user: {
            include: {
              notificationSetting: true,
              botConnections: { where: { isVerified: true, platform: 'WHATSAPP' } },
            },
          },
        },
      },
    },
  })

  // Agrupa occurrences por recurring pra decidir entre alerta single vs multi.
  const occsByRecurring = new Map<string, typeof pendingOccurrences>()
  for (const occ of pendingOccurrences) {
    const arr = occsByRecurring.get(occ.recurringTransactionId) ?? []
    arr.push(occ)
    occsByRecurring.set(occ.recurringTransactionId, arr)
  }

  console.log(`[payment-alerts:${period}] Pending occurrences: ${pendingOccurrences.length} in ${occsByRecurring.size} recurrings`)

  let alertsSent = 0
  let alertsSkipped = 0
  let autoLaunched = 0
  const failures: { id: string; reason: string }[] = []

  for (const [recurringId, occs] of occsByRecurring) {
    const recurring = occs[0].recurring
    const connection = recurring.user.botConnections[0]
    if (!connection) {
      alertsSkipped++
      continue
    }

    const settings = recurring.user.notificationSetting
    const alertsEnabled = settings?.botAlerts ?? true
    if (!alertsEnabled) {
      alertsSkipped++
      continue
    }
    if (period === 'evening') {
      const eveningEnabled = settings?.eveningPaymentReminder ?? true
      if (!eveningEnabled) {
        alertsSkipped++
        continue
      }
    }

    const oldestOcc = occs[0]
    // daysUntilDue/overdue calculados no fuso do user — sem isso, perto da
    // virada do dia local, alertas erram por 1 dia (ver Fase 1).
    const userTz = recurring.user.timezone || 'America/Sao_Paulo'
    const daysUntilDue = daysUntilInTimezone(oldestOcc.dueDate, userTz)
    const overdueOccs = occs.filter(o => daysUntilInTimezone(o.dueDate, userTz) < 0)

    // ─── Auto-launch (autoConfirm=true) ─────────────────────────────
    // Mantém comportamento atual: quando a occurrence mais antiga é de
    // hoje (D=0) e autoConfirm=true, lança automaticamente. Quita só 1
    // parcela (markRecurringAsPaid → markRecurringOccurrencesAsPaid n=1).
    // Se houver overdue acumuladas + autoConfirm=true, é cenário esquisito
    // (cron falhou em dias anteriores) — quita só a de hoje, deixa as
    // vencidas pro alerta normal.
    if (recurring.autoConfirm && daysUntilDue === 0 && period === 'morning') {
      try {
        const result = await markRecurringAsPaid(recurring.userId, recurringId)
        if (result.ok) {
          const formattedAmount = new Intl.NumberFormat('pt-BR', {
            style: 'currency', currency: 'BRL',
          }).format(Number(recurring.amount))
          const accountLine = result.accountName
            ? ` na conta *${result.accountName}*`
            : ''
          const methodLabel = result.paymentMethod
            ? ` · _${PAYMENT_METHOD_LABELS[result.paymentMethod] || result.paymentMethod}_`
            : ''

          const text =
            `🤖 *Lancei sozinho:*\n\n` +
            `📌 *${recurring.description}* — *${formattedAmount}*${accountLine}${methodLabel}\n\n` +
            `Saldo já atualizado. Se foi engano, abre *Transações* no app e exclui.`

          const sendResult = await sendWhatsAppNotification({
            userId: recurring.userId,
            connection,
            text,
            templateFallback: {
              templateName: process.env.WHATSAPP_TEMPLATE_BALANCE_UPDATE,
              bodyParameters: [`Lancei: ${recurring.description} ${formattedAmount}`],
            },
          })

          await prisma.botMessage.create({
            data: {
              userId: recurring.userId,
              connectionId: connection.id,
              direction: 'OUTBOUND',
              rawContent: `🤖 Auto-lançado: ${recurring.description} - ${formattedAmount}`,
              status: sendResult.ok ? 'CONFIRMED' : 'REJECTED',
              errorMessage: sendResult.ok ? null : sendResult.errorMessage ?? 'send failed',
            },
          })

          if (sendResult.ok) {
            autoLaunched++
          } else {
            failures.push({ id: recurringId, reason: `auto-launch notify failed: ${sendResult.errorMessage}` })
          }
          continue
        } else {
          console.warn(`[payment-alerts:${period}] Auto-launch failed for ${recurringId}: ${result.error}. Falling back to alert.`)
        }
      } catch (err) {
        console.error(`[payment-alerts:${period}] Auto-launch error for ${recurringId}:`, err)
      }
    }

    // ─── Alerta MULTI (2+ parcelas vencidas, só evening) ─────────────
    // Quando há 2+ overdue, manda lembrete consolidado novo: "N pagamentos
    // pendentes desde DD/MM" + botões "Paguei todas / algumas / Lembrar".
    if (overdueOccs.length >= 2 && period === 'evening') {
      try {
        const sendResult = await sendWhatsAppMultiOverdueNotification({
          userId: recurring.userId,
          connection,
          recurringId,
          description: recurring.description,
          count: overdueOccs.length,
          oldestDueDate: overdueOccs[0].dueDate.toISOString(),
          totalAmount: Number(recurring.amount) * overdueOccs.length,
        })

        await prisma.botMessage.create({
          data: {
            userId: recurring.userId,
            connectionId: connection.id,
            direction: 'OUTBOUND',
            rawContent: `⚠️ Multi-vencidas (${overdueOccs.length}x): ${recurring.description} [${sendResult.channel ?? 'failed'}]`,
            status: sendResult.ok ? 'CONFIRMED' : 'REJECTED',
            errorMessage: sendResult.ok ? null : sendResult.errorMessage ?? 'send failed',
            externalMessageId: sendResult.messageId ?? null,
            parsedData: { kind: 'payment_alert', alertKind: 'multi', recurringId },
          },
        })

        if (sendResult.ok) {
          alertsSent++
        } else {
          failures.push({ id: recurringId, reason: sendResult.errorMessage || 'multi send failed' })
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err)
        failures.push({ id: recurringId, reason: `multi: ${reason}` })
      }
      continue
    }

    // ─── Alerta SINGLE (1 parcela ou múltiplas em manhã/upcoming) ────
    // Pra evening, só dispara em D-N upcoming ou D=0 ou D+N overdue single.
    // Pra morning, só em D=0/D-1/D-3 upcoming. Aqui usa daysUntilDue da
    // occurrence MAIS ANTIGA — pra Diarista com 3 PENDING vencidas no
    // morning, isso seria negativo, fora do shouldAlert do morning.
    const shouldAlert = period === 'evening'
      ? daysUntilDue <= 0
      : daysUntilDue === 0 || daysUntilDue === 1 || daysUntilDue === 3

    if (!shouldAlert) {
      alertsSkipped++
      continue
    }

    let variant: PaymentAlertVariant
    let daysOverdue: number | undefined
    if (period === 'morning') {
      if (daysUntilDue === 3) variant = 'upcoming-3d'
      else if (daysUntilDue === 1) variant = 'upcoming-1d'
      else variant = 'due-today-morning'
    } else {
      if (daysUntilDue === 0) {
        variant = 'due-today-evening'
      } else {
        daysOverdue = -daysUntilDue
        variant = daysOverdue >= 5 ? 'overdue-pausable' : 'overdue'
      }
    }

    try {
      const sendResult = await sendWhatsAppPaymentNotification({
        userId: recurring.userId,
        connection,
        payment: {
          description: recurring.description,
          amount: Number(recurring.amount),
          dueDate: oldestOcc.dueDate.toISOString(),
          recurringId,
          variant,
          daysOverdue,
        },
      })

      const logPrefix = variant.startsWith('overdue')
        ? `⚠️ Vencida ${daysOverdue}d`
        : variant === 'due-today-evening'
          ? '⏰ Nudge'
          : 'Lembrete'

      await prisma.botMessage.create({
        data: {
          userId: recurring.userId,
          connectionId: connection.id,
          direction: 'OUTBOUND',
          rawContent: `${logPrefix}: ${recurring.description} - R$ ${Number(recurring.amount).toFixed(2)} [${sendResult.channel ?? 'failed'}]`,
          status: sendResult.ok ? 'CONFIRMED' : 'REJECTED',
          errorMessage: sendResult.ok ? null : sendResult.errorMessage ?? 'send failed',
          externalMessageId: sendResult.messageId ?? null,
          parsedData: { kind: 'payment_alert', alertKind: 'single', recurringId, variant },
        },
      })

      if (sendResult.ok) {
        alertsSent++
      } else {
        const reason = sendResult.errorMessage || 'send failed'
        console.error(`[payment-alerts:${period}] Send failed for ${recurringId}:`, JSON.stringify(sendResult.attempts))
        failures.push({ id: recurringId, reason })
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      console.error(`[payment-alerts:${period}] Failed to send alert for ${recurringId}:`, reason)
      failures.push({ id: recurringId, reason })
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
      dueDate: { gte: startOfToday, lte: invoiceEnd },
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

    const alertsEnabled = invoice.user.notificationSetting?.botAlerts ?? true
    if (!alertsEnabled) { invoiceSkipped++; continue }

    if (period === 'evening') {
      const eveningEnabled = invoice.user.notificationSetting?.eveningPaymentReminder ?? true
      if (!eveningEnabled) { invoiceSkipped++; continue }
    }

    const invoiceTz = invoice.user.timezone || 'America/Sao_Paulo'
    const daysUntil = daysUntilInTimezone(invoice.dueDate, invoiceTz)
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
      const sendResult = await sendWhatsAppNotification({
        userId: invoice.userId,
        connection,
        text,
        templateFallback: {
          templateName: process.env.WHATSAPP_TEMPLATE_INVOICE_REMINDER,
          bodyParameters: [invoice.card.name, formattedAmount, formattedDate],
        },
      })
      await prisma.botMessage.create({
        data: {
          userId: invoice.userId,
          connectionId: connection.id,
          direction: 'OUTBOUND',
          rawContent: `Lembrete fatura: ${invoice.card.name} - ${formattedAmount} [${sendResult.channel ?? 'failed'}]`,
          status: sendResult.ok ? 'CONFIRMED' : 'REJECTED',
          errorMessage: sendResult.ok ? null : sendResult.errorMessage ?? 'send failed',
        },
      })
      if (sendResult.ok) {
        invoiceSent++
      } else {
        const reason = sendResult.errorMessage || 'send failed'
        console.error(`[payment-alerts:${period}] Send failed for invoice ${invoice.id}:`, JSON.stringify(sendResult.attempts))
        invoiceFailures.push({ id: invoice.id, reason })
      }
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
        checked: pendingOccurrences.length + unpaidInvoices.length,
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
      payments: { checked: pendingOccurrences.length, sent: alertsSent, autoLaunched, skipped: alertsSkipped, failures },
      invoices: { checked: unpaidInvoices.length, sent: invoiceSent, skipped: invoiceSkipped, failures: invoiceFailures },
      timestamp: now.toISOString(),
    },
  })
}
