import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { sendWhatsAppMessage, sendWhatsAppInteractive, sendWhatsAppList, downloadWhatsAppMedia, markAsRead, sendWhatsAppWelcomeMsg1, sendWhatsAppWelcomeMsg2 } from '@/lib/whatsapp'
import { parseTransactionMessage, parseReceiptImage } from '@/lib/parse-transaction'
import { transcribeAudio } from '@/lib/transcribe-audio'
import { canUseFeature, getFeatureUsage } from '@/lib/plan-limits'
import { detectPaymentContext, resolveAccount, detectInstallments } from '@/lib/detect-payment-context'
import { applyTransactionBalance } from '@/lib/transaction-balance'
import { getOrCreateInvoiceFor, adjustInvoiceTotal } from '@/lib/invoice'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'
import { maybeRunAgent } from '@/lib/agent'
import { findCategoryForDescription } from '@/lib/resolve-category'

export const maxDuration = 60

// Verification endpoint (Meta requires this for webhook setup)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }

  return Response.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Meta sends webhook events in this structure
  const entry = body.entry?.[0]
  const changes = entry?.changes?.[0]
  const value = changes?.value

  if (value?.statuses?.[0]) {
    console.log('WhatsApp status callback:', JSON.stringify(value.statuses[0]))
  }

  if (!value?.messages?.[0]) {
    return Response.json({ ok: true })
  }

  const message = value.messages[0]
  const from = message.from // Phone number
  const messageId = message.id

  console.log('WhatsApp webhook from:', from, 'length:', from?.length, 'type:', message.type)

  try {
    // Mark as read immediately
    await markAsRead(messageId)

    // Find connected user
    const connection = await prisma.botConnection.findFirst({
      where: { platformUserId: from, platform: 'WHATSAPP', isVerified: true },
    })

    // Handle verification code
    if (message.type === 'text') {
      const text = message.text.body.trim()

      // Check if it's a verification code
      if (/^\d{6}$/.test(text)) {
        await handleVerification(from, text)
        return Response.json({ ok: true })
      }

      if (!connection) {
        const result = await sendWhatsAppMessage({
          to: from,
          text: 'Para começar, conecte sua conta Finn. Acesse o app e vá em *Assistente*.',
        })
        console.log('WhatsApp send result (no connection):', JSON.stringify(result))
        return Response.json({ ok: true })
      }

      // Handle text transaction
      await handleTextMessage(from, text, connection)
    }

    // Handle audio
    if (message.type === 'audio' && connection) {
      await handleAudioMessage(from, message, connection)
    }

    // Handle image
    if (message.type === 'image' && connection) {
      await handleImageMessage(from, message, connection)
    }

    // Handle button replies (3-button interactive) and list replies (menu)
    if (message.type === 'interactive' && connection) {
      const replyId = message.interactive?.button_reply?.id || message.interactive?.list_reply?.id
      if (replyId) {
        await handleButtonReply(from, replyId, connection)
      }
    }

    // ── Welcome MSG2 flush ──────────────────────────────────────────────
    // Após processar a primeira mensagem do user (qualquer tipo: áudio,
    // foto, texto-transação, query), dispara a MSG2 didática pra continuar
    // o tutorial. Saudação já dispara MSG2 inline e marca done — nesse
    // caso o re-fetch retorna 'done' e este block é no-op.
    if (connection) {
      const fresh = await prisma.botConnection.findUnique({
        where: { id: connection.id },
        select: { welcomeStage: true },
      })
      if (fresh?.welcomeStage === 'awaiting_first_message') {
        const user = await prisma.user.findUnique({ where: { id: connection.userId } })
        const name = user?.name?.split(' ')[0] || 'usuário'
        await sendWhatsAppWelcomeMsg2(from, name)
        await markWelcomeDone(connection.id)
      }
    }
  } catch (err) {
    console.error('WhatsApp webhook error:', err)
  }

  return Response.json({ ok: true })
}


async function handleVerification(from: string, code: string) {
  const connection = await prisma.botConnection.findFirst({
    where: { verificationCode: code, platform: 'WHATSAPP', isVerified: false },
  })

  if (!connection) {
    await sendWhatsAppMessage({ to: from, text: '❌ Código inválido ou expirado. Gere um novo código no app Finn.' })
    return
  }

  // Marca como verificada + entra no estado "esperando primeira resposta
  // após welcome". MSG2 fica em hold até o user responder.
  await prisma.botConnection.update({
    where: { id: connection.id },
    data: {
      platformUserId: from,
      isVerified: true,
      verificationCode: null,
      welcomeStage: 'awaiting_first_message',
    },
  })

  const user = await prisma.user.findUnique({ where: { id: connection.userId } })
  const name = user?.name?.split(' ')[0] || 'usuário'

  await sendWhatsAppWelcomeMsg1(from, name)
}

/**
 * Detecta saudações curtas tipo "oi", "olá", "bom dia" etc. Usado no
 * fluxo de welcome: quando o user responde a MSG1 com saudação (em vez
 * de áudio/foto/transação), disparamos a MSG2 e seguimos.
 * Conservador — só lista explícita pra evitar false positives.
 */
function looksLikeGreeting(text: string): boolean {
  const cleaned = text.trim().toLowerCase().replace(/[!.?,;:]/g, '').replace(/\s+/g, ' ')
  const greetings = new Set([
    'oi', 'olá', 'ola', 'oie', 'oii', 'oiii',
    'eai', 'e aí', 'e ai', 'fala', 'salve', 'opa', 'opaa',
    'bom dia', 'boa tarde', 'boa noite', 'bnoite', 'bdia', 'btarde',
    'ok', 'okay', 'tá', 'ta', 'tah', 'beleza', 'blz', 'show',
    'tudo bem', 'tudo bom', 'td bom', 'tudo certo', 'td certo',
    'oi finn', 'olá finn', 'ola finn', 'oi, finn', 'olá, finn', 'fala finn',
    'oi tudo bem', 'oi td bem', 'tudo certo finn',
    'hello', 'hi',
  ])
  return greetings.has(cleaned)
}

/** Marca o welcome flow como concluído (idempotente). */
async function markWelcomeDone(connectionId: string) {
  await prisma.botConnection.update({
    where: { id: connectionId },
    data: { welcomeStage: 'done' },
  }).catch(() => {/* idempotente */})
}

async function handleTextMessage(
  from: string,
  text: string,
  connection: { userId: string; id: string; welcomeStage?: string | null },
) {
  // ── Welcome flow: saudação curta dispara MSG2 imediato e ENCERRA ─────
  // Se for transação/query/outra coisa, NÃO marcamos done aqui — o flush
  // final no POST handler dispara a MSG2 *depois* do user ver a primeira
  // resposta do bot (registro concluído, preview, etc). Garante didática.
  if (connection.welcomeStage === 'awaiting_first_message' && looksLikeGreeting(text)) {
    const user = await prisma.user.findUnique({ where: { id: connection.userId } })
    const name = user?.name?.split(' ')[0] || 'usuário'
    await sendWhatsAppWelcomeMsg2(from, name)
    await markWelcomeDone(connection.id)
    return
  }

  // Try conversational agent first (for QUERY-type intents)
  const agentReply = await maybeRunAgent(connection.userId, text, connection.id)
  if (agentReply) {
    await sendWhatsAppMessage({ to: from, text: agentReply })
    return
  }

  const parsed = await parseTransactionMessage(text)

  if (!parsed) {
    await sendWhatsAppMessage({
      to: from,
      text: 'Não entendi como transação. Tente algo como:\n\n• _Gastei 50 no mercado_\n• _Recebi 500 do João_\n• _Condomínio 620 todo mês_',
    })
    return
  }

  const category = await findCategoryForDescription(connection.userId, parsed.description, text)

  // Load accounts + detect payment method and account/card from the message
  const accounts = await prisma.account.findMany({
    where: { userId: connection.userId, isActive: true },
    orderBy: { createdAt: 'asc' },
  })
  const ctx = detectPaymentContext(text, accounts as any)
  const paymentMethod = ctx.paymentMethod // may be null
  const installments = detectInstallments(text)
  const resolvedAccount = paymentMethod
    ? resolveAccount(ctx.account as any, paymentMethod, accounts as any)
    : null

  const botMsg = await prisma.botMessage.create({
    data: {
      userId: connection.userId, connectionId: connection.id, direction: 'INBOUND',
      rawContent: text,
      parsedData: {
        type: parsed.type,
        amount: parsed.amount,
        description: parsed.description,
        date: parsed.date || null,
        recurring: parsed.recurring || null,
        categoryId: category?.categoryId || null,
        categoryName: category?.categoryName || null,
        paymentMethod: paymentMethod || null,
        accountId: resolvedAccount?.id || null,
        accountName: resolvedAccount?.name || null,
        installments: installments || null,
      },
      status: 'PARSED',
    },
  })

  if (!paymentMethod) {
    await askPaymentMethodWhatsApp(from, botMsg.id, { ...parsed, installments }, category)
    return
  }

  if (paymentMethod === 'CREDIT' && !installments) {
    await askInstallmentsWhatsApp(from, botMsg.id, parsed, category)
    return
  }

  await sendTransactionPreviewWhatsApp(from, botMsg.id, { ...parsed, installments }, category, paymentMethod, resolvedAccount)
}

// Ask the user how they paid when we couldn't detect it from the message.
async function askInstallmentsWhatsApp(
  to: string,
  botMsgId: string,
  parsed: { amount: number; description: string },
  category: { categoryName: string } | null,
) {
  const formatMoney = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
  const header = `💳 ${parsed.description}${category ? ` · ${category.categoryName}` : ''}\n💰 ${formatMoney(parsed.amount)}`

  await sendWhatsAppList({
    to,
    body: `${header}\n\n*Em quantas parcelas?*`,
    buttonLabel: 'Escolher parcelas',
    sectionTitle: 'Parcelamento',
    rows: [
      { id: `set_installments:1:${botMsgId}`, title: 'À vista' },
      { id: `set_installments:2:${botMsgId}`, title: '2x' },
      { id: `set_installments:3:${botMsgId}`, title: '3x' },
      { id: `set_installments:4:${botMsgId}`, title: '4x' },
      { id: `set_installments:6:${botMsgId}`, title: '6x' },
      { id: `set_installments:10:${botMsgId}`, title: '10x' },
      { id: `set_installments:12:${botMsgId}`, title: '12x' },
      { id: `set_installments:24:${botMsgId}`, title: '24x' },
      { id: `cancel_tx:${botMsgId}`, title: '❌ Cancelar' },
    ],
  })
}

async function askPaymentMethodWhatsApp(
  to: string,
  botMsgId: string,
  parsed: { amount: number; description: string; installments?: number | null },
  category: { categoryName: string } | null,
) {
  const formatMoney = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
  const formattedAmount = formatMoney(parsed.amount)
  const installmentsLine = parsed.installments && parsed.installments > 1
    ? `\n🔢 ${parsed.installments}x de ${formatMoney(parsed.amount / parsed.installments)}`
    : ''
  const header = `📝 ${parsed.description}${category ? ` · ${category.categoryName}` : ''}\n💰 ${formattedAmount}${installmentsLine}`

  await sendWhatsAppList({
    to,
    body: `${header}\n\n*Como você pagou?*`,
    buttonLabel: 'Escolher',
    sectionTitle: 'Forma de pagamento',
    rows: [
      { id: `set_method:PIX:${botMsgId}`, title: '💸 PIX' },
      { id: `set_method:DEBIT:${botMsgId}`, title: '🏧 Débito' },
      { id: `set_method:CREDIT:${botMsgId}`, title: '💳 Crédito' },
      { id: `set_method:CASH:${botMsgId}`, title: '💵 Dinheiro' },
      { id: `set_method:BOLETO:${botMsgId}`, title: '📄 Boleto' },
      { id: `set_method:TRANSFER:${botMsgId}`, title: '🔁 Transferência' },
      { id: `cancel_tx:${botMsgId}`, title: '❌ Cancelar' },
    ],
  })
}

async function sendTransactionPreviewWhatsApp(
  to: string,
  botMsgId: string,
  parsed: { type: string; amount: number; description: string; date?: string | null; recurring?: { label: string } | null; installments?: number | null },
  category: { categoryName: string } | null,
  paymentMethod: 'PIX' | 'DEBIT' | 'CREDIT' | 'CASH' | 'BOLETO' | 'TRANSFER' | 'MEAL_VOUCHER' | 'FOOD_VOUCHER',
  resolvedAccount: { name: string } | null,
) {
  const formatMoney = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
  const formattedAmount = formatMoney(parsed.amount)
  const typeLabel = parsed.type === 'INCOME' ? '📥 Receita' : '📤 Despesa'
  const dateLabel = parsed.date ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(parsed.date)) : 'Hoje'
  const accountLabel = paymentMethod === 'CREDIT' ? '💳' : '🏦'

  const lines = [
    `${typeLabel}`,
    `📝 ${parsed.description}`,
    `💰 ${formattedAmount}`,
    `📅 ${dateLabel}`,
  ]
  if (category) lines.push(`📂 ${category.categoryName}`)
  if (resolvedAccount) lines.push(`${accountLabel} ${resolvedAccount.name}`)
  lines.push(`💱 ${PAYMENT_METHOD_LABELS[paymentMethod]}`)
  if (paymentMethod === 'CREDIT' && parsed.installments && parsed.installments > 1) {
    lines.push(`🔢 ${parsed.installments}x de ${formatMoney(parsed.amount / parsed.installments)}`)
  }
  if (paymentMethod === 'CREDIT') lines.push(`_Saldo da conta não muda até você pagar a fatura._`)
  if (parsed.recurring) lines.push(`🔄 ${parsed.recurring.label}`)

  await sendWhatsAppInteractive({
    to,
    body: `*Confirme a transação:*\n\n${lines.join('\n')}`,
    buttons: [
      { id: `confirm_tx:${botMsgId}`, title: '✅ Confirmar' },
      { id: `cancel_tx:${botMsgId}`, title: '❌ Cancelar' },
    ],
  })
}

async function handleAudioMessage(from: string, message: any, connection: { userId: string; id: string; welcomeStage?: string | null }) {
  // Não marca done aqui — o flush no POST handler dispara MSG2 depois
  // da confirmação da transação, mantendo a didática do tutorial inicial.
  const canVoice = await canUseFeature(connection.userId, 'botVoice')
  if (!canVoice) {
    const usage = await getFeatureUsage(connection.userId, 'botVoice')
    await sendWhatsAppMessage({
      to: from,
      text: `🎙 *Seus áudios do mês acabaram* (${usage.used}/${usage.limit} usados)\n\nCom o *Finn Pro* são ilimitados! Enquanto isso, registre por texto.\n\n👉 Upgrade: finn-steel.vercel.app/pricing`,
    })
    return
  }

  await sendWhatsAppMessage({ to: from, text: '🎙️ Ouvindo seu áudio...' })

  const mediaData = await downloadWhatsAppMedia(message.audio.id)
  if (!mediaData) {
    await sendWhatsAppMessage({ to: from, text: '❌ Não consegui baixar o áudio. Tente novamente.' })
    return
  }

  let transcription: string | null = null
  try {
    transcription = await transcribeAudio(Buffer.from(mediaData.buffer), 'voice.ogg')
  } catch (err) {
    console.error('Transcription error:', err)
  }

  if (!transcription) {
    await sendWhatsAppMessage({ to: from, text: '❌ Não consegui entender o áudio. Tente falar mais perto do microfone.' })
    return
  }

  await sendWhatsAppMessage({ to: from, text: `🎙️ Entendi: _"${transcription}"_` })

  // Parse and show confirmation (reuse text handler logic)
  await handleTextMessage(from, transcription, connection)
}

async function handleImageMessage(from: string, message: any, connection: { userId: string; id: string; welcomeStage?: string | null }) {
  // Não marca done aqui — flush no POST handler dispara MSG2 após processo.
  const canPhoto = await canUseFeature(connection.userId, 'botPhoto')
  if (!canPhoto) {
    const usage = await getFeatureUsage(connection.userId, 'botPhoto')
    await sendWhatsAppMessage({
      to: from,
      text: `📸 *Suas fotos do mês acabaram* (${usage.used}/${usage.limit} usadas)\n\nCom o *Finn Pro* são ilimitadas!\n\n👉 Upgrade: finn-steel.vercel.app/pricing`,
    })
    return
  }

  await sendWhatsAppMessage({ to: from, text: '🔍 Analisando seu cupom fiscal...' })

  const mediaData = await downloadWhatsAppMedia(message.image.id)
  if (!mediaData) {
    await sendWhatsAppMessage({ to: from, text: '❌ Não consegui baixar a imagem. Tente novamente.' })
    return
  }

  try {
    const base64 = mediaData.buffer.toString('base64')
    let mimeType = mediaData.mimeType
    if (!mimeType.startsWith('image/')) mimeType = 'image/jpeg'

    const parsed = await parseReceiptImage(base64, mimeType)

    if (!parsed) {
      await sendWhatsAppMessage({ to: from, text: '🤔 Não consegui identificar um cupom fiscal nessa imagem.\n\nDicas:\n• Boa iluminação\n• Centralize o cupom\n• Evite reflexos' })
      return
    }

    const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parsed.amount)
    const formattedDate = parsed.date ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(parsed.date)) : 'Hoje'
    const category = await findCategoryForDescription(connection.userId, parsed.description, parsed.items.join(' '))

    // Receipt photos don't tell us the payment method — default to DEBIT.
    const accounts = await prisma.account.findMany({
      where: { userId: connection.userId, isActive: true },
      orderBy: { createdAt: 'asc' },
    })
    const resolvedAccount = resolveAccount(null, 'DEBIT', accounts as any)
    const paymentMethod = 'DEBIT' as const

    const botMsg = await prisma.botMessage.create({
      data: {
        userId: connection.userId, connectionId: connection.id, direction: 'INBOUND',
        rawContent: `[FOTO] Cupom: ${parsed.description}`, mediaType: mimeType,
        parsedData: {
          type: parsed.type, amount: parsed.amount, description: parsed.description,
          date: parsed.date, items: parsed.items,
          categoryId: category?.categoryId || null, categoryName: category?.categoryName || null,
          paymentMethod, accountId: resolvedAccount?.id || null, accountName: resolvedAccount?.name || null,
        },
        status: 'PARSED',
      },
    })

    const lines = [
      `🏪 ${parsed.description}`,
      `💰 *${formattedAmount}*`,
      `📅 ${formattedDate}`,
    ]
    if (category) lines.push(`📂 ${category.categoryName}`)
    if (resolvedAccount) lines.push(`🏦 ${resolvedAccount.name}`)
    lines.push(`💱 ${PAYMENT_METHOD_LABELS[paymentMethod]}`)
    if (parsed.items.length > 0) {
      lines.push(`\n📋 *Itens:*`)
      parsed.items.slice(0, 5).forEach(item => lines.push(`  • ${item}`))
    }

    await sendWhatsAppInteractive({
      to: from,
      body: `🧾 *Cupom identificado!*\n\n${lines.join('\n')}\n\nEstá correto?`,
      buttons: [
        { id: `confirm_tx:${botMsg.id}`, title: '✅ Confirmar' },
        { id: `cancel_tx:${botMsg.id}`, title: '❌ Cancelar' },
      ],
    })
  } catch (err) {
    console.error('Error parsing receipt:', err)
    await sendWhatsAppMessage({ to: from, text: '📸 Não foi possível analisar o cupom neste momento. Tente novamente mais tarde.' })
  }
}

async function handleButtonReply(from: string, buttonId: string, connection: { userId: string; id: string }) {
  const [action, ...rest] = buttonId.split(':')

  // `set_installments:N:botMsgId` — user picked the installment count
  if (action === 'set_installments') {
    const [countStr, botMsgId] = rest
    const count = parseInt(countStr, 10)
    const botMsg = await prisma.botMessage.findFirst({
      where: { id: botMsgId, userId: connection.userId, status: 'PARSED' },
    })
    if (!botMsg || !botMsg.parsedData) {
      await sendWhatsAppMessage({ to: from, text: '⚠️ Transação expirada. Mande de novo.' })
      return
    }
    const parsed = botMsg.parsedData as any
    const installments = count > 1 ? count : null

    await prisma.botMessage.update({
      where: { id: botMsgId },
      data: { parsedData: { ...parsed, installments } },
    })

    await sendTransactionPreviewWhatsApp(
      from,
      botMsgId,
      {
        type: parsed.type,
        amount: parsed.amount,
        description: parsed.description,
        date: parsed.date,
        recurring: parsed.recurring,
        installments,
      },
      parsed.categoryName ? { categoryName: parsed.categoryName } : null,
      parsed.paymentMethod || 'CREDIT',
      parsed.accountName ? { name: parsed.accountName } : null,
    )
    return
  }

  // `set_method:METHOD:botMsgId` — user picked a payment method in the list
  if (action === 'set_method') {
    const [method, botMsgId] = rest
    const botMsg = await prisma.botMessage.findFirst({
      where: { id: botMsgId, userId: connection.userId, status: 'PARSED' },
    })
    if (!botMsg || !botMsg.parsedData) {
      await sendWhatsAppMessage({ to: from, text: '⚠️ Transação expirada. Mande de novo.' })
      return
    }

    const parsed = botMsg.parsedData as any
    const accounts = await prisma.account.findMany({
      where: { userId: connection.userId, isActive: true },
      orderBy: { createdAt: 'asc' },
    })
    const pm = method as 'PIX' | 'DEBIT' | 'CREDIT' | 'CASH' | 'BOLETO' | 'TRANSFER'
    const resolvedAccount = resolveAccount(null, pm, accounts as any)

    if (pm === 'CREDIT' && !resolvedAccount) {
      await sendWhatsAppMessage({
        to: from,
        text: '⚠️ Você ainda não cadastrou um cartão de crédito. Adicione um em Contas no app e mande a transação novamente.',
      })
      return
    }

    // Persist the chosen method + account so confirmation uses them
    await prisma.botMessage.update({
      where: { id: botMsgId },
      data: {
        parsedData: {
          ...parsed,
          paymentMethod: pm,
          accountId: resolvedAccount?.id || null,
          accountName: resolvedAccount?.name || null,
        },
      },
    })

    if (pm === 'CREDIT' && !parsed.installments) {
      await askInstallmentsWhatsApp(
        from,
        botMsgId,
        { amount: parsed.amount, description: parsed.description },
        parsed.categoryName ? { categoryName: parsed.categoryName } : null,
      )
      return
    }

    await sendTransactionPreviewWhatsApp(
      from,
      botMsgId,
      { type: parsed.type, amount: parsed.amount, description: parsed.description, date: parsed.date, recurring: parsed.recurring, installments: parsed.installments },
      parsed.categoryName ? { categoryName: parsed.categoryName } : null,
      pm,
      resolvedAccount,
    )
    return
  }

  const targetId = rest.join(':')
  if (action === 'confirm_tx') {
    const botMsg = await prisma.botMessage.findFirst({ where: { id: targetId, userId: connection.userId, status: 'PARSED' } })
    if (!botMsg || !botMsg.parsedData) {
      await sendWhatsAppMessage({ to: from, text: '⚠️ Transação expirada.' })
      return
    }

    const parsed = botMsg.parsedData as any
    const paymentMethod = (parsed.paymentMethod || 'DEBIT') as 'PIX' | 'DEBIT' | 'CREDIT' | 'CASH' | 'BOLETO' | 'TRANSFER'
    const installments = paymentMethod === 'CREDIT' && parsed.installments && parsed.installments > 1 ? parsed.installments : 1

    // Prefer the account resolved when the message was parsed. Fall back to default/oldest.
    let accountId: string | null = parsed.accountId || null
    if (!accountId) {
      const accounts = await prisma.account.findMany({
        where: { userId: connection.userId, isActive: true },
        orderBy: { createdAt: 'asc' },
      })
      const resolved = resolveAccount(null, paymentMethod, accounts as any)
      accountId = resolved?.id || null
    }
    if (!accountId) {
      await sendWhatsAppMessage({
        to: from,
        text: paymentMethod === 'CREDIT'
          ? '⚠️ Você ainda não cadastrou um cartão de crédito no app. Adicione um em Contas e tente de novo.'
          : '⚠️ Crie uma conta no app primeiro.',
      })
      return
    }

    const selectedAccount = await prisma.account.findFirst({ where: { id: accountId, userId: connection.userId } })
    if (!selectedAccount) {
      await sendWhatsAppMessage({ to: from, text: '⚠️ Conta não encontrada.' })
      return
    }

    const rawDate = parsed.date ? new Date(parsed.date) : new Date()
    const txDate = new Date(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate())

    const cardForInvoice = paymentMethod === 'CREDIT' && selectedAccount.closingDay && selectedAccount.dueDay
      ? { id: selectedAccount.id, userId: connection.userId, closingDay: selectedAccount.closingDay, dueDay: selectedAccount.dueDay }
      : null

    const installmentAmount = parsed.amount / installments
    const groupId = installments > 1 ? crypto.randomUUID() : null

    // Each parcel is its own short transaction so 10–48 installments don't
    // exceed Prisma's default 5s window.
    let firstCreated: any = null
    for (let i = 0; i < installments; i++) {
      const parcelDate = new Date(txDate)
      parcelDate.setMonth(parcelDate.getMonth() + i)
      const created = await prisma.$transaction(async (db) => {
        const invoice = cardForInvoice ? await getOrCreateInvoiceFor(db, cardForInvoice, parcelDate) : null
        const createdRow = await db.transaction.create({
          data: {
            userId: connection.userId,
            description: installments > 1 ? `${parsed.description} (${i + 1}/${installments})` : parsed.description,
            amount: installmentAmount,
            type: parsed.type,
            date: parcelDate,
            accountId,
            categoryId: parsed.categoryId ?? undefined,
            paymentMethod,
            invoiceId: invoice?.id ?? null,
            ...(groupId ? {
              installment: { create: { installmentNumber: i + 1, totalInstallments: installments, groupId } },
            } : {}),
          },
        })
        await applyTransactionBalance(db, {
          type: parsed.type,
          amount: installmentAmount,
          accountId,
          paymentMethod,
          date: parcelDate,
        })
        if (invoice) {
          const delta = parsed.type === 'EXPENSE' ? installmentAmount : -installmentAmount
          await adjustInvoiceTotal(db, invoice.id, delta)
        }
        return createdRow
      })
      if (i === 0) firstCreated = created
    }
    const transaction = firstCreated
    await prisma.botMessage.update({ where: { id: targetId }, data: { status: 'CONFIRMED', transactionId: transaction.id } })

    // Handle recurring
    if (parsed.recurring) {
      let nextDueDate = new Date(txDate)
      if (parsed.recurring.dayOfWeek !== undefined && parsed.recurring.dayOfWeek !== null) {
        const targetDay = parsed.recurring.dayOfWeek
        const currentDay = new Date().getDay()
        let daysUntil = targetDay - currentDay
        if (daysUntil <= 0) daysUntil += 7
        nextDueDate = new Date()
        nextDueDate.setDate(new Date().getDate() + daysUntil)
      }

      await prisma.recurringTransaction.create({
        data: {
          userId: connection.userId, description: parsed.description, amount: parsed.amount,
          type: parsed.type, frequency: parsed.recurring.frequency, startDate: txDate,
          nextDueDate, accountId, categoryId: parsed.categoryId ?? undefined,
          autoConfirm: false,
        },
      })
    }

    const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parsed.amount)
    const typeEmoji = parsed.type === 'INCOME' ? '📥' : '📤'
    const accountEmoji = paymentMethod === 'CREDIT' ? '💳' : '🏦'
    const categoryLine = parsed.categoryName ? `\n📂 ${parsed.categoryName}` : ''
    const recurringLine = parsed.recurring ? `\n🔄 Recorrência ${parsed.recurring.label} criada` : ''
    const balanceNote = paymentMethod === 'CREDIT'
      ? 'Lançado na fatura do cartão.'
      : 'Saldo atualizado automaticamente.'

    await sendWhatsAppMessage({
      to: from,
      text: `✅ *Transação registrada!*\n\n${typeEmoji} ${parsed.description}\n💰 ${formattedAmount}\n${accountEmoji} ${selectedAccount.name}\n💱 ${PAYMENT_METHOD_LABELS[paymentMethod]}${categoryLine}${recurringLine}\n\n${balanceNote}`,
    })
  }

  if (action === 'cancel_tx') {
    await prisma.botMessage.update({ where: { id: targetId }, data: { status: 'REJECTED' } })
    await sendWhatsAppMessage({ to: from, text: '❌ Transação cancelada.' })
  }

  if (action === 'paid') {
    // Reuse recurring payment logic
    const recurringId = targetId
    const recurring = await prisma.recurringTransaction.findFirst({
      where: { id: recurringId, userId: connection.userId },
    })

    if (!recurring) {
      await sendWhatsAppMessage({ to: from, text: '⚠️ Transação não encontrada.' })
      return
    }

    let accountId = recurring.accountId
    if (!accountId) {
      const accounts = await prisma.account.findMany({
        where: { userId: connection.userId, isActive: true },
        orderBy: { createdAt: 'asc' },
      })
      const resolved = resolveAccount(null, 'DEBIT', accounts as any)
      if (!resolved) return
      accountId = resolved.id
    }

    await prisma.$transaction(async (db) => {
      await db.transaction.create({
        data: {
          userId: connection.userId, description: recurring.description, amount: recurring.amount,
          type: recurring.type, date: recurring.nextDueDate, accountId: accountId!,
          categoryId: recurring.categoryId ?? undefined, recurringTransactionId: recurring.id,
          paymentMethod: 'DEBIT',
        },
      })
      await applyTransactionBalance(db, {
        type: recurring.type,
        amount: Number(recurring.amount),
        accountId: accountId!,
        paymentMethod: 'DEBIT',
        date: recurring.nextDueDate,
      })
    })

    // Advance next due date
    const next = new Date(recurring.nextDueDate)
    switch (recurring.frequency) {
      case 'DAILY': next.setDate(next.getDate() + 1); break
      case 'WEEKLY': next.setDate(next.getDate() + 7); break
      case 'BIWEEKLY': next.setDate(next.getDate() + 14); break
      case 'MONTHLY': next.setMonth(next.getMonth() + 1); break
      case 'QUARTERLY': next.setMonth(next.getMonth() + 3); break
      case 'YEARLY': next.setFullYear(next.getFullYear() + 1); break
    }

    if (recurring.endDate && next > recurring.endDate) {
      await prisma.recurringTransaction.update({ where: { id: recurring.id }, data: { status: 'COMPLETED' } })
    } else {
      await prisma.recurringTransaction.update({ where: { id: recurring.id }, data: { nextDueDate: next } })
    }

    const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(recurring.amount))
    await sendWhatsAppMessage({
      to: from,
      text: `✅ *Pagamento confirmado!*\n\n*${recurring.description}*\n💰 ${formattedAmount}\n\nTransação registrada e saldo atualizado.`,
    })
  }

  // Family de actions de snooze:
  //   snooze         → "Lembrar amanhã" (D-1 manhã, D noite, D+N noite)
  //                    snoozedUntil = hoje 23:59 UTC
  //   snooze_later   → "Lembrar depois" (D-3 manhã)
  //                    snoozedUntil = D-2 23:59 UTC (= now + 1 day fim do dia)
  //   snooze_evening → "Mais tarde" (D manhã)
  //                    snoozedUntil = hoje 16:00 UTC (antes do evening cron)
  if (action === 'snooze' || action === 'snooze_later' || action === 'snooze_evening') {
    const recurringId = targetId
    const recurring = await prisma.recurringTransaction.findFirst({
      where: { id: recurringId, userId: connection.userId },
    })
    if (!recurring) {
      await sendWhatsAppMessage({ to: from, text: '⚠️ Transação não encontrada.' })
      return
    }

    let snoozedUntil: Date
    let confirmation: string

    if (action === 'snooze_evening') {
      const t = new Date()
      t.setUTCHours(16, 0, 0, 0)
      snoozedUntil = t
      confirmation = `⏰ *Lembrete adiado*\n\n*${recurring.description}*\nTe aviso de novo no fim do dia.`
    } else if (action === 'snooze_later') {
      const t = new Date()
      t.setUTCDate(t.getUTCDate() + 1)
      t.setUTCHours(23, 59, 59, 999)
      snoozedUntil = t
      confirmation = `⏰ *Lembrete adiado*\n\n*${recurring.description}*\nTe aviso de novo na véspera do vencimento.`
    } else {
      // snooze (default = "lembrar amanhã")
      const t = new Date()
      t.setUTCHours(23, 59, 59, 999)
      snoozedUntil = t
      confirmation = `⏰ *Lembrete adiado*\n\n*${recurring.description}*\nVou te lembrar novamente amanhã.`
    }

    await prisma.recurringTransaction.update({
      where: { id: recurring.id },
      data: { snoozedUntil },
    })

    await sendWhatsAppMessage({ to: from, text: confirmation })
  }

  // Pausar recorrência — botão extra que aparece em D+5+ (vencida há tempo).
  if (action === 'pause') {
    const recurringId = targetId
    const recurring = await prisma.recurringTransaction.findFirst({
      where: { id: recurringId, userId: connection.userId },
    })
    if (!recurring) {
      await sendWhatsAppMessage({ to: from, text: '⚠️ Recorrência não encontrada.' })
      return
    }

    await prisma.recurringTransaction.update({
      where: { id: recurring.id },
      data: { status: 'PAUSED' },
    })

    await sendWhatsAppMessage({
      to: from,
      text:
        `⏸️ *Recorrência pausada*\n\n*${recurring.description}* não vai mais gerar lembretes.\n\n` +
        `Quando quiser reativar, abre *Recorrências* no app e troca o status pra Ativa.`,
    })
  }
}
