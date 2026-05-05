import prisma from '@/lib/prisma'
import {
  sendWhatsAppMessage,
  sendWhatsAppPaymentAlert,
  sendWhatsAppTemplate,
  type PaymentAlertVariant,
} from '@/lib/whatsapp'

export type { PaymentAlertVariant } from '@/lib/whatsapp'

/**
 * Janela de "customer service" do WhatsApp Cloud API.
 * Fora dela, só template HSM passa. Mantemos 23h pra ter folga (relógio
 * da Meta vs nosso, latência de webhook, etc).
 */
const WINDOW_HOURS = 23
const WINDOW_MS = WINDOW_HOURS * 60 * 60 * 1000

/**
 * Templates HSM aprovados pela Meta. Configurados via env vars porque o
 * nome exato é definido no momento da aprovação no Meta Business Manager.
 *
 * Sem template configurado, mensagens fora da janela de 24h NÃO CHEGAM —
 * a Meta recusa free-form fora da janela e não temos canal alternativo.
 * Por isso é crítico que pelo menos `genericNotification` esteja sempre
 * configurado em produção.
 *
 * Templates esperados (criar no Meta Business Manager → categoria UTILITY):
 *
 *   WHATSAPP_TEMPLATE_PAYMENT_REMINDER
 *     Body com 3 placeholders: descrição, valor formatado, vencimento.
 *     Idealmente com 2 botões QUICK_REPLY ("Paguei", "Lembrar amanhã")
 *     que mandam payloads `paid:<id>` e `snooze:<id>` pro webhook.
 *
 *   WHATSAPP_TEMPLATE_INVOICE_REMINDER
 *     Body com 3 placeholders: nome do cartão, valor, vencimento.
 *
 *   WHATSAPP_TEMPLATE_GENERIC_NOTIFICATION
 *     Body com 1 placeholder: mensagem livre. Usado pra insights e
 *     reengagement quando não há template específico.
 */
const TEMPLATES = {
  paymentReminder: process.env.WHATSAPP_TEMPLATE_PAYMENT_REMINDER,
  invoiceReminder: process.env.WHATSAPP_TEMPLATE_INVOICE_REMINDER,
  genericNotification: process.env.WHATSAPP_TEMPLATE_GENERIC_NOTIFICATION,
}

const TEMPLATE_LANGUAGE = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'pt_BR'

export interface WhatsAppConnectionLite {
  platformUserId: string
}

export interface NotificationResult {
  ok: boolean
  channel?: 'freeform' | 'template'
  attempts: Array<{
    channel: 'freeform' | 'template'
    ok: boolean
    error?: string
    isWindowError?: boolean
  }>
  errorMessage?: string
}

/**
 * Verifica se o usuário tem janela de 24h aberta no WhatsApp.
 * Janela = última mensagem INBOUND do usuário foi <23h atrás.
 */
export async function isWithinWhatsAppWindow(userId: string): Promise<boolean> {
  const last = await prisma.botMessage.findFirst({
    where: {
      userId,
      direction: 'INBOUND',
      connection: { platform: 'WHATSAPP' },
    },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })
  if (!last) return false
  return Date.now() - last.createdAt.getTime() < WINDOW_MS
}

interface PaymentAlertOpts {
  description: string
  amount: number
  dueDate: string
  recurringId: string
  variant: PaymentAlertVariant
  daysOverdue?: number
}

/**
 * Envia mensagem via WhatsApp com cascata: free-form (se janela aberta)
 * → template HSM (se configurado e janela fechada). Retorna o canal usado
 * e detalhes de cada tentativa pra log/auditoria.
 *
 * `templateFallback` define qual template usar fora da janela e quais
 * placeholders preencher. Se ausente E a janela estiver fechada, retorna
 * ok=false sem enviar nada — caller deve logar/avisar admin.
 */
export async function sendWhatsAppNotification(opts: {
  userId: string
  connection: WhatsAppConnectionLite
  text: string
  templateFallback?: {
    templateName?: string  // se não passar, usa TEMPLATES.genericNotification
    bodyParameters: string[]
    buttonPayloads?: string[]
  }
}): Promise<NotificationResult> {
  const attempts: NotificationResult['attempts'] = []
  const withinWindow = await isWithinWhatsAppWindow(opts.userId)

  // 1) Janela aberta → free-form (mais rico, sem placeholders limitados).
  //    Se Meta retornar windowError mesmo com janela "aberta" (relógio
  //    desalinhado, mensagens deletadas, etc), escala pra template.
  if (withinWindow) {
    const plain = htmlToPlain(opts.text)
    const r = await sendWhatsAppMessage({ to: opts.connection.platformUserId, text: plain })
    attempts.push({ channel: 'freeform', ok: r.ok, error: r.error?.message, isWindowError: r.error?.isWindowError })
    if (r.ok) return { ok: true, channel: 'freeform', attempts }
    // Se não foi erro de janela, é fatal (token, número, etc) — não tenta template.
    if (!r.error?.isWindowError) {
      return { ok: false, attempts, errorMessage: r.error?.message }
    }
  }

  // 2) Janela fechada (ou free-form falhou por janela) → template HSM.
  const templateName = opts.templateFallback?.templateName ?? TEMPLATES.genericNotification
  if (!templateName || !opts.templateFallback) {
    const reason = 'outside 24h window and no HSM template configured'
    return { ok: false, attempts, errorMessage: reason }
  }

  const r = await sendWhatsAppTemplate({
    to: opts.connection.platformUserId,
    templateName,
    languageCode: TEMPLATE_LANGUAGE,
    bodyParameters: opts.templateFallback.bodyParameters,
    buttonPayloads: opts.templateFallback.buttonPayloads,
  })
  attempts.push({ channel: 'template', ok: r.ok, error: r.error?.message })
  if (r.ok) return { ok: true, channel: 'template', attempts }
  return { ok: false, attempts, errorMessage: r.error?.message ?? 'template send failed' }
}

/**
 * Versão pra alertas de pagamento. Free-form interactive (com botões) se
 * janela aberta → template HSM `paymentReminder` se configurado e fora da
 * janela. Sem template configurado e fora da janela = ok:false.
 */
export async function sendWhatsAppPaymentNotification(opts: {
  userId: string
  connection: WhatsAppConnectionLite
  payment: PaymentAlertOpts
}): Promise<NotificationResult> {
  const attempts: NotificationResult['attempts'] = []
  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
  }).format(opts.payment.amount)
  const formattedDate = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(opts.payment.dueDate))

  const withinWindow = await isWithinWhatsAppWindow(opts.userId)

  if (withinWindow) {
    const r = await sendWhatsAppPaymentAlert({ to: opts.connection.platformUserId, ...opts.payment })
    attempts.push({ channel: 'freeform', ok: r.ok, error: r.error?.message, isWindowError: r.error?.isWindowError })
    if (r.ok) return { ok: true, channel: 'freeform', attempts }
    if (!r.error?.isWindowError) {
      return { ok: false, attempts, errorMessage: r.error?.message }
    }
  }

  if (!TEMPLATES.paymentReminder) {
    return { ok: false, attempts, errorMessage: 'outside 24h window and WHATSAPP_TEMPLATE_PAYMENT_REMINDER not set' }
  }

  const r = await sendWhatsAppTemplate({
    to: opts.connection.platformUserId,
    templateName: TEMPLATES.paymentReminder,
    languageCode: TEMPLATE_LANGUAGE,
    bodyParameters: [opts.payment.description, formattedAmount, formattedDate],
    // Quick replies dinâmicos: id do recurring vai como payload pra
    // bater com os handlers existentes em /webhook (paid:..., snooze:...)
    buttonPayloads: [`paid:${opts.payment.recurringId}`, `snooze:${opts.payment.recurringId}`],
  })
  attempts.push({ channel: 'template', ok: r.ok, error: r.error?.message })
  if (r.ok) return { ok: true, channel: 'template', attempts }
  return { ok: false, attempts, errorMessage: r.error?.message ?? 'template send failed' }
}

function htmlToPlain(text: string): string {
  return text
    .replace(/<b>/g, '*').replace(/<\/b>/g, '*')
    .replace(/<i>/g, '_').replace(/<\/i>/g, '_')
    .replace(/<code>/g, '`').replace(/<\/code>/g, '`')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
}
