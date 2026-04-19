import { sendMessage as sendTelegram, sendPaymentAlert as sendTelegramAlert } from '@/lib/telegram'
import { sendWhatsAppMessage, sendWhatsAppPaymentAlert } from '@/lib/whatsapp'

export type Platform = 'TELEGRAM' | 'WHATSAPP'

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

export async function sendBotPaymentAlert(
  platform: Platform,
  chatId: string,
  opts: { description: string; amount: number; dueDate: string; recurringId: string }
) {
  if (platform === 'WHATSAPP') {
    return sendWhatsAppPaymentAlert({ to: chatId, ...opts })
  }
  return sendTelegramAlert({ chatId, ...opts })
}
