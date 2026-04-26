const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

interface InlineKeyboardButton {
  text: string
  callback_data: string
}

interface SendMessageOptions {
  chatId: string | number
  text: string
  parseMode?: 'HTML' | 'MarkdownV2'
  /** When true, suppresses the OG preview Telegram fetches for the first URL — required when the link points behind auth. */
  disableWebPagePreview?: boolean
  replyMarkup?: {
    inline_keyboard: InlineKeyboardButton[][]
  }
}

export async function sendMessage({ chatId, text, parseMode = 'HTML', disableWebPagePreview, replyMarkup }: SendMessageOptions) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
  }
  if (disableWebPagePreview) {
    body.disable_web_page_preview = true
  }
  if (replyMarkup) {
    body.reply_markup = JSON.stringify(replyMarkup)
  }

  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  return res.json()
}

export async function sendPaymentAlert({
  chatId,
  description,
  amount,
  dueDate,
  recurringId,
  variant = 'normal',
}: {
  chatId: string | number
  description: string
  amount: number
  dueDate: string
  recurringId: string
  variant?: 'normal' | 'urgent'
}) {
  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount)

  const formattedDate = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(dueDate))

  const text = variant === 'urgent'
    ? `<b>⏰ Pagamento ainda não confirmado</b>\n\n` +
      `<b>${description}</b>\n` +
      `💰 ${formattedAmount} · vence <b>hoje (${formattedDate})</b>\n\n` +
      `Se já pagou, toque em "Paguei" pra fechar.`
    : `<b>🔔 Lembrete de pagamento</b>\n\n` +
      `<b>${description}</b>\n` +
      `💰 Valor: <b>${formattedAmount}</b>\n` +
      `📅 Vencimento: <b>${formattedDate}</b>\n\n` +
      `Já pagou? Toque no botão abaixo!`

  return sendMessage({
    chatId,
    text,
    replyMarkup: {
      inline_keyboard: [
        [
          { text: '✅ Paguei', callback_data: `paid:${recurringId}` },
          { text: '⏰ Lembrar amanhã', callback_data: `snooze:${recurringId}` },
        ],
      ],
    },
  })
}

export async function answerCallbackQuery(callbackQueryId: string, text: string) {
  const res = await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: false,
    }),
  })

  return res.json()
}

export async function editMessageText({
  chatId,
  messageId,
  text,
}: {
  chatId: string | number
  messageId: number
  text: string
}) {
  const res = await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
    }),
  })

  return res.json()
}

export async function setWebhook(url: string) {
  const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })

  return res.json()
}

export async function getFileUrl(fileId: string): Promise<string | null> {
  const res = await fetch(`${TELEGRAM_API}/getFile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  })

  const data = await res.json()
  if (!data.ok || !data.result?.file_path) return null

  return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${data.result.file_path}`
}

export async function downloadFileAsBase64(fileId: string): Promise<{ base64: string; mimeType: string } | null> {
  const url = await getFileUrl(fileId)
  if (!url) return null

  const res = await fetch(url)
  if (!res.ok) return null

  const buffer = await res.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  // Detect mime type from URL extension (Telegram headers can be unreliable)
  let contentType = res.headers.get('content-type') || 'image/jpeg'
  if (contentType === 'application/octet-stream' || !contentType.startsWith('image/')) {
    if (url.endsWith('.png')) contentType = 'image/png'
    else if (url.endsWith('.webp')) contentType = 'image/webp'
    else if (url.endsWith('.gif')) contentType = 'image/gif'
    else contentType = 'image/jpeg'
  }

  return { base64, mimeType: contentType }
}

export async function downloadFileAsBuffer(fileId: string): Promise<Buffer | null> {
  const url = await getFileUrl(fileId)
  if (!url) return null

  const res = await fetch(url)
  if (!res.ok) return null

  const buffer = await res.arrayBuffer()
  return Buffer.from(buffer)
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
