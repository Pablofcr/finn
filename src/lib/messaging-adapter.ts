import prisma from '@/lib/prisma'
import {
  sendWhatsAppMessage,
  sendWhatsAppInteractive,
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
 * Meta recusa free-form fora da janela.
 *
 * Templates esperados (criar no Meta Business Manager via
 * `scripts/create-whatsapp-templates.ts`):
 *
 *   WHATSAPP_TEMPLATE_PAYMENT_REMINDER (UTILITY)
 *     Body com 3 placeholders: descrição, valor formatado, vencimento.
 *     Idealmente com 2 botões QUICK_REPLY ("Paguei", "Lembrar amanhã")
 *     que mandam payloads `paid:<id>` e `snooze:<id>` pro webhook.
 *
 *   WHATSAPP_TEMPLATE_PAYMENT_OVERDUE (UTILITY)
 *     Body com 3 placeholders: descrição, valor formatado, vencimento.
 *     Texto adverte que já venceu + alerta de multa/juros. 3 botões
 *     QUICK_REPLY ("Paguei", "Lembrar amanhã", "Pausar") com payloads
 *     `paid:<id>`, `snooze:<id>`, `pause:<id>`. Usado em D+1 em diante.
 *
 *   WHATSAPP_TEMPLATE_INVOICE_REMINDER (UTILITY)
 *     Body com 3 placeholders: nome do cartão, valor, vencimento.
 *
 *   WHATSAPP_TEMPLATE_BALANCE_UPDATE (UTILITY)
 *     Body com 1 placeholder: descrição transacional curta.
 *     Usado pra auto-launch e weekly-insights — atualizações de conta.
 *
 *   WHATSAPP_TEMPLATE_REENGAGEMENT (MARKETING)
 *     Body com 2 placeholders: primeiro nome, copy de re-engajamento.
 *     Marketing porque é relacional/customer care, não transacional —
 *     classificação correta evita reclassificação automática da Meta.
 */
const TEMPLATES = {
  paymentReminder: process.env.WHATSAPP_TEMPLATE_PAYMENT_REMINDER,
  paymentOverdue: process.env.WHATSAPP_TEMPLATE_PAYMENT_OVERDUE,
  paymentOverdueMulti: process.env.WHATSAPP_TEMPLATE_PAYMENT_OVERDUE_MULTI,
  invoiceReminder: process.env.WHATSAPP_TEMPLATE_INVOICE_REMINDER,
  balanceUpdate: process.env.WHATSAPP_TEMPLATE_BALANCE_UPDATE,
  reengagement: process.env.WHATSAPP_TEMPLATE_REENGAGEMENT,
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
 * `templateFallback` é obrigatório quando a janela 24h pode estar fechada
 * (= sempre, na prática). Caller passa `templateName` explicitamente pra
 * que cada use case escolha a categoria certa (UTILITY vs MARKETING) —
 * sem template, mensagem fora da janela retorna ok=false.
 */
export async function sendWhatsAppNotification(opts: {
  userId: string
  connection: WhatsAppConnectionLite
  text: string
  templateFallback?: {
    templateName: string | undefined
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
  if (!opts.templateFallback?.templateName) {
    const reason = 'outside 24h window and no HSM template configured'
    return { ok: false, attempts, errorMessage: reason }
  }

  const r = await sendWhatsAppTemplate({
    to: opts.connection.platformUserId,
    templateName: opts.templateFallback.templateName,
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

  // Variants overdue/overdue-pausable preferem template separado com texto
  // "venceu em" + alerta de multa + 3 botões (paid/snooze/pause). Se a env
  // var WHATSAPP_TEMPLATE_PAYMENT_OVERDUE ainda não estiver setada (template
  // novo aguardando aprovação Meta), cai no payment_reminder pra mensagem
  // chegar — texto "vence em" fica incorreto mas é melhor que perder o
  // alerta. Demais variants (upcoming-3d, upcoming-1d, due-today-*) sempre
  // usam o template padrão de lembrete antecipado.
  const isOverdue =
    opts.payment.variant === 'overdue' || opts.payment.variant === 'overdue-pausable'
  const usingOverdueTemplate = isOverdue && !!TEMPLATES.paymentOverdue

  const templateName = usingOverdueTemplate ? TEMPLATES.paymentOverdue : TEMPLATES.paymentReminder
  if (!templateName) {
    return { ok: false, attempts, errorMessage: 'outside 24h window and WHATSAPP_TEMPLATE_PAYMENT_REMINDER not set' }
  }

  const buttonPayloads = usingOverdueTemplate
    ? [`paid:${opts.payment.recurringId}`, `snooze:${opts.payment.recurringId}`, `pause:${opts.payment.recurringId}`]
    : [`paid:${opts.payment.recurringId}`, `snooze:${opts.payment.recurringId}`]

  const r = await sendWhatsAppTemplate({
    to: opts.connection.platformUserId,
    templateName,
    languageCode: TEMPLATE_LANGUAGE,
    bodyParameters: [opts.payment.description, formattedAmount, formattedDate],
    buttonPayloads,
  })
  attempts.push({ channel: 'template', ok: r.ok, error: r.error?.message })
  if (r.ok) return { ok: true, channel: 'template', attempts }
  return { ok: false, attempts, errorMessage: r.error?.message ?? 'template send failed' }
}

/**
 * Lembrete consolidado pra múltiplas parcelas em atraso da mesma recorrência.
 * Copy aprovada pelos squads design+copy em 12/05/2026: tom de aliado, sem
 * jargão de cobrança bancária. Botões: Paguei todas / Paguei algumas / Lembrar.
 *
 * Within window 24h: interactive free-form (3 botões).
 * Fora: template HSM `paymentOverdueMulti` (mesmos 3 botões, payloads
 * dinâmicos pra bater com webhook handlers).
 */
export async function sendWhatsAppMultiOverdueNotification(opts: {
  userId: string
  connection: WhatsAppConnectionLite
  recurringId: string
  description: string
  count: number          // quantas parcelas em atraso
  oldestDueDate: string  // ISO da mais antiga (pra "pendentes desde DD/MM")
  totalAmount: number
}): Promise<NotificationResult> {
  const attempts: NotificationResult['attempts'] = []
  const formattedTotal = new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
  }).format(opts.totalAmount)
  const formattedOldest = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })
    .format(new Date(opts.oldestDueDate))

  const body =
    `⚠️ *${opts.description}* — ${opts.count} pagamentos pendentes desde ${formattedOldest}. ` +
    `Total ${formattedTotal}.\n\n` +
    `Tá acumulando — toque num dos botões ou abra o Finn pra resolver.`

  const buttons = [
    { id: `paid_all:${opts.recurringId}`, title: 'Paguei todas' },
    { id: `paid_some:${opts.recurringId}`, title: 'Paguei algumas' },
    { id: `snooze:${opts.recurringId}`, title: 'Lembrar amanhã' },
  ]

  const withinWindow = await isWithinWhatsAppWindow(opts.userId)

  if (withinWindow) {
    const r = await sendWhatsAppInteractive({
      to: opts.connection.platformUserId,
      body,
      buttons,
    })
    attempts.push({ channel: 'freeform', ok: r.ok, error: r.error?.message, isWindowError: r.error?.isWindowError })
    if (r.ok) return { ok: true, channel: 'freeform', attempts }
    if (!r.error?.isWindowError) {
      return { ok: false, attempts, errorMessage: r.error?.message }
    }
  }

  // Fora da janela 24h: template HSM. Se template multi ainda não setado
  // (aguardando aprovação Meta), cai pro template single overdue como
  // fallback — perde a consolidação mas a mensagem chega.
  const templateName = TEMPLATES.paymentOverdueMulti ?? TEMPLATES.paymentOverdue ?? TEMPLATES.paymentReminder
  if (!templateName) {
    return { ok: false, attempts, errorMessage: 'outside 24h window and no payment template configured' }
  }

  // Se usando o template multi (com 4 placeholders + 3 botões dedicados),
  // mapeia direto. Senão, cai num formato compatível com o template single
  // (3 placeholders), o que perde a info de "N pagamentos".
  const isMultiTemplate = templateName === TEMPLATES.paymentOverdueMulti
  const bodyParameters = isMultiTemplate
    ? [opts.description, String(opts.count), formattedOldest, formattedTotal]
    : [opts.description, formattedTotal, formattedOldest]
  const buttonPayloads = isMultiTemplate
    ? [`paid_all:${opts.recurringId}`, `paid_some:${opts.recurringId}`, `snooze:${opts.recurringId}`]
    : [`paid:${opts.recurringId}`, `snooze:${opts.recurringId}`, `pause:${opts.recurringId}`]

  const r = await sendWhatsAppTemplate({
    to: opts.connection.platformUserId,
    templateName,
    languageCode: TEMPLATE_LANGUAGE,
    bodyParameters,
    buttonPayloads,
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
