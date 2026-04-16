const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

interface InlineKeyboardButton {
  text: string
  callback_data: string
}

interface SendMessageOptions {
  chatId: string | number
  text: string
  parseMode?: 'HTML' | 'MarkdownV2'
  replyMarkup?: {
    inline_keyboard: InlineKeyboardButton[][]
  }
}

export async function sendMessage({ chatId, text, parseMode = 'HTML', replyMarkup }: SendMessageOptions) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
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
}: {
  chatId: string | number
  description: string
  amount: number
  dueDate: string
  recurringId: string
}) {
  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount)

  const formattedDate = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(dueDate))

  const text =
    `<b>🔔 Lembrete de pagamento</b>\n\n` +
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

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
