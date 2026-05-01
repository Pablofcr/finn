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

/**
 * MSG1 — apresentação + hero do áudio com diálogo simulado.
 * Disparada logo após o user conectar o WhatsApp. Em seguida, o webhook
 * espera uma resposta antes de mandar MSG2:
 *   - Se for áudio/foto/transação parseável → registra normal + done
 *   - Se for saudação ("oi", "olá", etc.) → dispara MSG2 e segue
 *
 * Copy v3 do copy-squad/andre-chaperon. Pablo iterou (v1 sem vida, v2
 * sem apresentação, layout do diálogo apertado, sem hold pra resposta).
 */
export async function sendWhatsAppWelcomeMsg1(to: string, firstName: string) {
  await sendWhatsAppMessage({
    to,
    text:
      `Olá, ${firstName}! 👋\n\n` +
      `Eu sou o *Finn*, o seu assistente financeiro pessoal. Tô aqui pra te ajudar a organizar suas contas, gastos e receitas — sem planilha, sem complicação, conversando com você no zap mesmo.\n\n` +
      `O jeito mais rápido de me usar é *mandando áudio*. 🎙\n\n` +
      `─────────\n` +
      `*Olha como vai ser:*\n\n` +
      `Você 🎙\n` +
      `_"acabei de almoçar, 32 reais no pix"_\n\n` +
      `Finn ✅\n` +
      `Almoço · R$ 32,00 · PIX · hoje\n` +
      `_Saldo atualizado._\n` +
      `─────────\n` +
      `Você 🎙\n` +
      `_"caiu meu salário, 4.500"_\n\n` +
      `Finn ✅\n` +
      `Salário · +R$ 4.500,00 · hoje\n` +
      `_Tá no caixa._\n` +
      `─────────\n\n` +
      `É isso. Você fala do seu jeito, eu organizo. Pode ser no trânsito, saindo do mercado, antes de dormir.\n\n` +
      `Manda um áudio agora me contando *qualquer movimentação de hoje* — uma compra, um pix, um valor que recebeu. Eu te mostro como fica. 👇`,
  })
}

/**
 * MSG2 — fallback de texto + foto. Disparada quando o user responde a
 * MSG1 com saudação (não com transação). Se ele já manda áudio/foto/tx,
 * pulamos a MSG2 — ele já viu o sistema funcionar.
 */
export async function sendWhatsAppWelcomeMsg2(to: string, firstName: string) {
  await sendWhatsAppMessage({
    to,
    text:
      `Boa, ${firstName}! 🙌\n\n` +
      `Se em algum momento você não puder falar — reunião, ônibus cheio, bebê dormindo — *texto também funciona*:\n\n` +
      `─────────\n` +
      `Você ✍️\n` +
      `_"uber 18,90 crédito"_\n\n` +
      `Finn ✅\n` +
      `Transporte · R$ 18,90 · Crédito · hoje\n` +
      `─────────\n\n` +
      `E quando você guardar um cupom fiscal — da padaria, da farmácia, de qualquer lugar — *só fotografa e me manda*: 📸\n\n` +
      `─────────\n` +
      `Você 📸\n` +
      `_[manda foto do cupom]_\n\n` +
      `Finn ✅\n` +
      `Leio o valor, o estabelecimento, categorizo sozinho.\n` +
      `─────────\n\n` +
      `Resumindo o cardápio:\n` +
      `🎙 Áudio — mais rápido\n` +
      `✍️ Texto — mais discreto\n` +
      `📸 Foto — zero esforço\n\n` +
      `Manda a primeira *agora* pra gente começar. Pode ser bobeira — um café, um pix de R$ 5. Só pra você ver acontecer.`,
  })
}

/**
 * @deprecated Use sendWhatsAppWelcomeMsg1 e sendWhatsAppWelcomeMsg2
 * separadamente — agora a MSG2 é disparada só após o user responder
 * com uma saudação (hold no fluxo de welcome).
 */
export async function sendWhatsAppWelcomeMessages(to: string, firstName: string) {
  await sendWhatsAppWelcomeMsg1(to, firstName)
  await sendWhatsAppWelcomeMsg2(to, firstName)
}

/**
 * Mensagens de re-engajamento — copy escrita pelo copy-squad/andre-chaperon.
 * Tom shifts subtly por status: warning friendly check-in, at-risk
 * curiosity, inactive vulnerable honesty. Específicas (não guilt-trip
 * genérico) — Fader flagged: copy genérica vira mute do bot.
 */
export type ReengagementStatus = 'warning' | 'at-risk' | 'inactive'

export async function sendWhatsAppReengagement(
  to: string,
  firstName: string,
  status: ReengagementStatus,
) {
  let text: string
  switch (status) {
    case 'warning':
      text =
        `Oi, ${firstName} 👋\n\n` +
        `Reparei que tu sumiu uns dias por aqui. Sem cobrança — a vida acontece.\n\n` +
        `Só queria te lembrar de uma coisa que muita gente esquece: o Finn não precisa de planilha, nem de categoria, nem de nada formal. Tu pode mandar um áudio de 3 segundos agora — _"gastei 40 num lanche"_ — e tá feito.\n\n` +
        `É isso. Esse é o uso que mais funciona pra quem volta.\n\n` +
        `Manda aí o último gasto que tu lembra. Eu cuido do resto.`
      break
    case 'at-risk':
      text =
        `Oi, ${firstName} 🤔\n\n` +
        `Tô curioso, honestamente. Uns dez dias atrás tu tava registrando direitinho, e aí parou.\n\n` +
        `Não vou tentar adivinhar o motivo. Mas se tu me mandar os 3 últimos gastos que lembrar — só os 3 — eu te devolvo um padrão que tu provavelmente não percebeu sobre como tu tá gastando esse mês.\n\n` +
        `É de graça e leva 30 segundos. Se não for útil, tu me xinga.\n\n` +
        `Combinado?`
      break
    case 'inactive':
      text =
        `Oi, ${firstName}\n\n` +
        `Vou ser direto: faz mais de 20 dias que tu não usa o Finn, e eu não vou fingir que não notei.\n\n` +
        `Mais importante que te trazer de volta é entender por quê tu saiu. Foi chato de usar? Faltou alguma coisa? Achou outro app melhor? Ou só não era a hora?\n\n` +
        `Qualquer resposta me ajuda — inclusive _"esquece, não era pra mim"_. Sem hard feelings.\n\n` +
        `Se quiser responder com uma palavra só, tá ótimo 🙏`
      break
  }
  await sendWhatsAppMessage({ to, text })
}

export type PaymentAlertVariant =
  | 'upcoming-3d'         // D-3: 3 dias antes (manhã)
  | 'upcoming-1d'         // D-1: 1 dia antes (manhã)
  | 'due-today-morning'   // D: manhã do dia do vencimento
  | 'due-today-evening'   // D: noite do dia do vencimento (não pagou)
  | 'overdue'             // D+1 a D+4: vencida (apenas noite)
  | 'overdue-pausable'    // D+5+: vencida há tempo, oferece pausar

export async function sendWhatsAppPaymentAlert({
  to,
  description,
  amount,
  dueDate,
  recurringId,
  variant,
  daysOverdue,
}: {
  to: string
  description: string
  amount: number
  dueDate: string
  recurringId: string
  variant: PaymentAlertVariant
  daysOverdue?: number  // só usado em variants overdue/overdue-pausable
}) {
  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount)

  const formattedDate = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(dueDate))

  // Botões — IDs incluem o tipo de snooze pro webhook saber o quanto silenciar
  const paid = { id: `paid:${recurringId}`, title: '✅ Paguei' }
  const snoozeTomorrow = { id: `snooze:${recurringId}`, title: '⏰ Lembrar amanhã' }
  const snoozeLater = { id: `snooze_later:${recurringId}`, title: '⏰ Lembrar depois' }
  const snoozeEvening = { id: `snooze_evening:${recurringId}`, title: '⏰ Mais tarde' }
  const pause = { id: `pause:${recurringId}`, title: '⏸️ Pausar' }

  let body: string
  let buttons: { id: string; title: string }[]

  switch (variant) {
    case 'upcoming-3d':
      body =
        `🔔 *Lembrete de pagamento*\n\n` +
        `*${description}*\n` +
        `💰 ${formattedAmount}\n` +
        `📅 Vence em 3 dias (${formattedDate})\n\n` +
        `Já pagou? Toque no botão abaixo.`
      buttons = [paid, snoozeLater]
      break

    case 'upcoming-1d':
      body =
        `🔔 *Lembrete de pagamento*\n\n` +
        `*${description}*\n` +
        `💰 ${formattedAmount}\n` +
        `📅 *Vence amanhã* (${formattedDate})\n\n` +
        `Já pagou? Toque no botão abaixo.`
      buttons = [paid, snoozeTomorrow]
      break

    case 'due-today-morning':
      body =
        `🔔 *Lembrete de pagamento*\n\n` +
        `*${description}*\n` +
        `💰 Valor: *${formattedAmount}*\n` +
        `📅 *Vence hoje* (${formattedDate})\n\n` +
        `Já pagou? Toque no botão abaixo.`
      buttons = [paid, snoozeEvening]
      break

    case 'due-today-evening':
      body =
        `⏰ *Pagamento ainda não confirmado*\n\n` +
        `*${description}*\n` +
        `💰 ${formattedAmount} · vence *hoje (${formattedDate})*\n\n` +
        `Se já pagou, toque em "Paguei" pra fechar.`
      buttons = [paid, snoozeTomorrow]
      break

    case 'overdue': {
      const n = daysOverdue ?? 1
      body =
        `⚠️ *Conta vencida*\n\n` +
        `*${description}*\n` +
        `💰 ${formattedAmount}\n` +
        `📅 *Vencida há ${n} ${n === 1 ? 'dia' : 'dias'}* (${formattedDate})\n\n` +
        `Se já pagou, toque em "Paguei" pra fechar.`
      buttons = [paid, snoozeTomorrow]
      break
    }

    case 'overdue-pausable': {
      const n = daysOverdue ?? 5
      body =
        `⚠️ *Conta vencida*\n\n` +
        `*${description}*\n` +
        `💰 ${formattedAmount}\n` +
        `📅 *Vencida há ${n} dias* (${formattedDate})\n\n` +
        `Quer pausar essa recorrência ou marcar como paga?`
      buttons = [paid, snoozeTomorrow, pause]
      break
    }
  }

  return sendWhatsAppInteractive({ to, body, buttons })
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
