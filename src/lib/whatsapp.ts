const WHATSAPP_API = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}`
const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN

// WhatsApp webhooks from Brazilian mobiles often arrive in legacy 12-digit format
// (without the leading 9), but the Send API requires the 13-digit format.
function normalizeRecipient(to: string): string {
  const digits = to.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('55')) {
    const ddd = digits.substring(2, 4)
    const rest = digits.substring(4)
    if (/^[6-9]/.test(rest)) return `55${ddd}9${rest}`
  }
  return digits
}

interface SendMessageOptions {
  to: string
  text: string
}

interface SendInteractiveOptions {
  to: string
  body: string
  buttons: { id: string; title: string }[]
}

interface SendListOptions {
  to: string
  body: string
  buttonLabel: string
  sectionTitle: string
  rows: { id: string; title: string; description?: string }[]
}

async function whatsappFetch(endpoint: string, body: Record<string, unknown>) {
  const url = `${WHATSAPP_API}${endpoint}`
  console.log('WhatsApp API call:', url, 'token exists:', !!WHATSAPP_TOKEN, 'token length:', WHATSAPP_TOKEN?.length)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (data.error) {
    console.error('WhatsApp API error:', JSON.stringify(data.error))
  }
  return data
}

export async function sendWhatsAppMessage({ to, text }: SendMessageOptions) {
  return whatsappFetch('/messages', {
    messaging_product: 'whatsapp',
    to: normalizeRecipient(to),
    type: 'text',
    text: { body: text },
  })
}

export async function sendWhatsAppInteractive({ to, body, buttons }: SendInteractiveOptions) {
  return whatsappFetch('/messages', {
    messaging_product: 'whatsapp',
    to: normalizeRecipient(to),
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.map(b => ({
          type: 'reply',
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  })
}

export async function sendWhatsAppPaymentAlert({
  to,
  description,
  amount,
  dueDate,
  recurringId,
  variant = 'normal',
}: {
  to: string
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

  const body = variant === 'urgent'
    ? `⏰ *Pagamento ainda não confirmado*\n\n` +
      `*${description}*\n` +
      `💰 ${formattedAmount} · vence *hoje (${formattedDate})*\n\n` +
      `Se já pagou, toque em "Paguei" pra fechar.`
    : `🔔 *Lembrete de pagamento*\n\n` +
      `*${description}*\n` +
      `💰 Valor: *${formattedAmount}*\n` +
      `📅 Vencimento: *${formattedDate}*\n\n` +
      `Já pagou? Toque no botão abaixo!`

  return sendWhatsAppInteractive({
    to,
    body,
    buttons: [
      { id: `paid:${recurringId}`, title: '✅ Paguei' },
      { id: `snooze:${recurringId}`, title: '⏰ Lembrar amanhã' },
    ],
  })
}

export async function sendWhatsAppList({ to, body, buttonLabel, sectionTitle, rows }: SendListOptions) {
  return whatsappFetch('/messages', {
    messaging_product: 'whatsapp',
    to: normalizeRecipient(to),
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: body },
      action: {
        button: buttonLabel,
        sections: [
          {
            title: sectionTitle,
            rows: rows.map(r => ({
              id: r.id,
              title: r.title,
              ...(r.description ? { description: r.description } : {}),
            })),
          },
        ],
      },
    },
  })
}

export async function markAsRead(messageId: string) {
  return whatsappFetch('/messages', {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  })
}

export async function downloadWhatsAppMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  // Step 1: Get media URL
  const mediaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
    headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` },
  })
  const mediaData = await mediaRes.json()
  if (!mediaData.url) return null

  // Step 2: Download the file
  const fileRes = await fetch(mediaData.url, {
    headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` },
  })
  if (!fileRes.ok) return null

  const buffer = Buffer.from(await fileRes.arrayBuffer())
  const mimeType = mediaData.mime_type || 'application/octet-stream'

  return { buffer, mimeType }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
