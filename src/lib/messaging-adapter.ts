import { sendMessage as sendTelegram, sendPaymentAlert as sendTelegramAlert } from '@/lib/telegram'
import {
  sendWhatsAppMessage,
  sendWhatsAppPaymentAlert,
  type PaymentAlertVariant,
} from '@/lib/whatsapp'

export type Platform = 'TELEGRAM' | 'WHATSAPP'
export type { PaymentAlertVariant } from '@/lib/whatsapp'

export async function sendBotMessage(platform: Platform, chatId: string, text: string) {
  if (platform === 'WHATSAPP') {
    // WhatsApp uses plain text (no HTML)
    const plainText = text
      .replace(/<b>/g, '*').replace(/<\/b>/g, '*')
      .replace(/<i>/g, '_').replace(/<\/i>/g, '_')
      .replace(/<code>/g, '`').replace(/<\/code>/g, '`')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]+>/g, '')
    return sendWhatsAppMessage({ to: chatId, text: plainText })
  }
  return sendTelegram({ chatId, text })
}

// Mapeia variant novo (6 estados) pro variant binário do Telegram (normal/urgent),
// já que Telegram tá em sunset e não vamos investir em UI nova lá.
function variantToTelegram(v: PaymentAlertVariant): 'normal' | 'urgent' {
  if (v === 'due-today-evening' || v === 'overdue' || v === 'overdue-pausable') return 'urgent'
  return 'normal'
}

export async function sendBotPaymentAlert(
  platform: Platform,
  chatId: string,
  opts: {
    description: string
    amount: number
    dueDate: string
    recurringId: string
    variant: PaymentAlertVariant
    daysOverdue?: number
  }
) {
  if (platform === 'WHATSAPP') {
    return sendWhatsAppPaymentAlert({ to: chatId, ...opts })
  }
  return sendTelegramAlert({
    chatId,
    description: opts.description,
    amount: opts.amount,
    dueDate: opts.dueDate,
    recurringId: opts.recurringId,
    variant: variantToTelegram(opts.variant),
  })
}
