import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { sendWhatsAppMessage, sendWhatsAppInteractive, downloadWhatsAppMedia, markAsRead } from '@/lib/whatsapp'
import { parseTransactionMessage, parseReceiptImage } from '@/lib/parse-transaction'
import { transcribeAudio } from '@/lib/transcribe-audio'
import { canUseFeature, getFeatureUsage } from '@/lib/plan-limits'
import { detectPaymentContext, resolveAccount } from '@/lib/detect-payment-context'
import { applyTransactionBalance } from '@/lib/transaction-balance'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'

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

    // Handle button replies
    if (message.type === 'interactive' && connection) {
      const buttonId = message.interactive?.button_reply?.id
      if (buttonId) {
        await handleButtonReply(from, buttonId, connection)
      }
    }
  } catch (err) {
    console.error('WhatsApp webhook error:', err)
  }

  return Response.json({ ok: true })
}

// Import the category finder from the telegram webhook
async function findCategoryForDescription(userId: string, description: string, originalText?: string) {
  // Reuse the same logic - normalize and search keywords
  const normalizedDesc = (originalText ? `${originalText} ${description}` : description)
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  const KEYWORD_MAP: Record<string, { categoryName: string; type: 'EXPENSE' | 'INCOME' }> = {
    // Alimentação
    mercado: { categoryName: 'Alimentação', type: 'EXPENSE' },
    supermercado: { categoryName: 'Alimentação', type: 'EXPENSE' },
    hortifruti: { categoryName: 'Alimentação', type: 'EXPENSE' },
    restaurante: { categoryName: 'Alimentação', type: 'EXPENSE' },
    lanche: { categoryName: 'Alimentação', type: 'EXPENSE' },
    almoco: { categoryName: 'Alimentação', type: 'EXPENSE' },
    almoço: { categoryName: 'Alimentação', type: 'EXPENSE' },
    janta: { categoryName: 'Alimentação', type: 'EXPENSE' },
    refeicao: { categoryName: 'Alimentação', type: 'EXPENSE' },
    comida: { categoryName: 'Alimentação', type: 'EXPENSE' },
    feira: { categoryName: 'Alimentação', type: 'EXPENSE' },
    acougue: { categoryName: 'Alimentação', type: 'EXPENSE' },
    bebida: { categoryName: 'Alimentação', type: 'EXPENSE' },
    bar: { categoryName: 'Alimentação', type: 'EXPENSE' },
    lanchonete: { categoryName: 'Alimentação', type: 'EXPENSE' },
    sorveteria: { categoryName: 'Alimentação', type: 'EXPENSE' },
    peixe: { categoryName: 'Alimentação', type: 'EXPENSE' },
    carne: { categoryName: 'Alimentação', type: 'EXPENSE' },
    jantar: { categoryName: 'Alimentação', type: 'EXPENSE' },
    cafe: { categoryName: 'Alimentação', type: 'EXPENSE' },
    padaria: { categoryName: 'Alimentação', type: 'EXPENSE' },
    pizza: { categoryName: 'Alimentação', type: 'EXPENSE' },
    hamburger: { categoryName: 'Alimentação', type: 'EXPENSE' },
    hamburguer: { categoryName: 'Alimentação', type: 'EXPENSE' },
    delivery: { categoryName: 'Alimentação', type: 'EXPENSE' },
    ifood: { categoryName: 'Alimentação', type: 'EXPENSE' },
    // Transporte
    uber: { categoryName: 'Transporte', type: 'EXPENSE' },
    '99': { categoryName: 'Transporte', type: 'EXPENSE' },
    taxi: { categoryName: 'Transporte', type: 'EXPENSE' },
    gasolina: { categoryName: 'Transporte', type: 'EXPENSE' },
    combustivel: { categoryName: 'Transporte', type: 'EXPENSE' },
    estacionamento: { categoryName: 'Transporte', type: 'EXPENSE' },
    pedagio: { categoryName: 'Transporte', type: 'EXPENSE' },
    carro: { categoryName: 'Transporte', type: 'EXPENSE' },
    abasteci: { categoryName: 'Transporte', type: 'EXPENSE' },
    abastecimento: { categoryName: 'Transporte', type: 'EXPENSE' },
    posto: { categoryName: 'Transporte', type: 'EXPENSE' },
    onibus: { categoryName: 'Transporte', type: 'EXPENSE' },
    metro: { categoryName: 'Transporte', type: 'EXPENSE' },
    trem: { categoryName: 'Transporte', type: 'EXPENSE' },
    moto: { categoryName: 'Transporte', type: 'EXPENSE' },
    // Moradia
    diarista: { categoryName: 'Moradia', type: 'EXPENSE' },
    faxina: { categoryName: 'Moradia', type: 'EXPENSE' },
    limpeza: { categoryName: 'Moradia', type: 'EXPENSE' },
    empregada: { categoryName: 'Moradia', type: 'EXPENSE' },
    aluguel: { categoryName: 'Moradia', type: 'EXPENSE' },
    condominio: { categoryName: 'Moradia', type: 'EXPENSE' },
    iptu: { categoryName: 'Moradia', type: 'EXPENSE' },
    luz: { categoryName: 'Moradia', type: 'EXPENSE' },
    agua: { categoryName: 'Moradia', type: 'EXPENSE' },
    gas: { categoryName: 'Moradia', type: 'EXPENSE' },
    internet: { categoryName: 'Moradia', type: 'EXPENSE' },
    telefone: { categoryName: 'Moradia', type: 'EXPENSE' },
    // Saúde
    farmacia: { categoryName: 'Saúde', type: 'EXPENSE' },
    medico: { categoryName: 'Saúde', type: 'EXPENSE' },
    hospital: { categoryName: 'Saúde', type: 'EXPENSE' },
    dentista: { categoryName: 'Saúde', type: 'EXPENSE' },
    'plano de saude': { categoryName: 'Saúde', type: 'EXPENSE' },
    // Educação
    escola: { categoryName: 'Educação', type: 'EXPENSE' },
    faculdade: { categoryName: 'Educação', type: 'EXPENSE' },
    curso: { categoryName: 'Educação', type: 'EXPENSE' },
    livro: { categoryName: 'Educação', type: 'EXPENSE' },
    // Lazer
    netflix: { categoryName: 'Lazer', type: 'EXPENSE' },
    spotify: { categoryName: 'Lazer', type: 'EXPENSE' },
    cinema: { categoryName: 'Lazer', type: 'EXPENSE' },
    teatro: { categoryName: 'Lazer', type: 'EXPENSE' },
    show: { categoryName: 'Lazer', type: 'EXPENSE' },
    viagem: { categoryName: 'Lazer', type: 'EXPENSE' },
    hotel: { categoryName: 'Lazer', type: 'EXPENSE' },
    // Presentes
    presente: { categoryName: 'Presentes', type: 'EXPENSE' },
    pascoa: { categoryName: 'Presentes', type: 'EXPENSE' },
    natal: { categoryName: 'Presentes', type: 'EXPENSE' },
    aniversario: { categoryName: 'Presentes', type: 'EXPENSE' },
    // Vestuário
    roupa: { categoryName: 'Vestuário', type: 'EXPENSE' },
    sapato: { categoryName: 'Vestuário', type: 'EXPENSE' },
    tenis: { categoryName: 'Vestuário', type: 'EXPENSE' },
    calca: { categoryName: 'Vestuário', type: 'EXPENSE' },
    camisa: { categoryName: 'Vestuário', type: 'EXPENSE' },
    camiseta: { categoryName: 'Vestuário', type: 'EXPENSE' },
    vestido: { categoryName: 'Vestuário', type: 'EXPENSE' },
    blusa: { categoryName: 'Vestuário', type: 'EXPENSE' },
    jaqueta: { categoryName: 'Vestuário', type: 'EXPENSE' },
    bermuda: { categoryName: 'Vestuário', type: 'EXPENSE' },
    chinelo: { categoryName: 'Vestuário', type: 'EXPENSE' },
    bota: { categoryName: 'Vestuário', type: 'EXPENSE' },
    // Salário (INCOME)
    salario: { categoryName: 'Salário', type: 'INCOME' },
    freelance: { categoryName: 'Salário', type: 'INCOME' },
    pagamento: { categoryName: 'Salário', type: 'INCOME' },
    pix: { categoryName: 'Salário', type: 'INCOME' },
    transferencia: { categoryName: 'Salário', type: 'INCOME' },
  }

  try {
    const userCategories = await prisma.category.findMany({
      where: { OR: [{ userId }, { isSystem: true }] },
      select: { id: true, name: true, type: true },
    })

    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    // Helper: match whole word only (prevents "gas" matching "gastei")
    const matchesWord = (text: string, word: string) => {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp(`\\b${escaped}\\b`).test(text)
    }

    for (const [keyword, mapping] of Object.entries(KEYWORD_MAP)) {
      if (matchesWord(normalizedDesc, norm(keyword))) {
        let match = userCategories.find(c => norm(c.name) === norm(mapping.categoryName) && c.type === mapping.type)
        if (!match) {
          match = userCategories.find(c => c.type === mapping.type && (norm(c.name).includes(norm(mapping.categoryName)) || norm(mapping.categoryName).includes(norm(c.name))))
        }
        if (match) return { categoryId: match.id, categoryName: match.name }

        // Auto-create if not found
        const COLORS: Record<string, string> = {
          'Alimentação': '#ef4444', 'Transporte': '#3b82f6', 'Moradia': '#8b5cf6',
          'Saúde': '#ec4899', 'Vestuário': '#d946ef', 'Salário': '#22c55e',
        }
        const newCat = await prisma.category.create({
          data: { userId, name: mapping.categoryName, type: mapping.type, color: COLORS[mapping.categoryName] || '#6366f1', icon: 'tag' },
        })
        return { categoryId: newCat.id, categoryName: newCat.name }
      }
    }
  } catch (err) {
    console.error('Error finding category:', err)
  }
  return null
}

async function handleVerification(from: string, code: string) {
  const connection = await prisma.botConnection.findFirst({
    where: { verificationCode: code, platform: 'WHATSAPP', isVerified: false },
  })

  if (!connection) {
    await sendWhatsAppMessage({ to: from, text: '❌ Código inválido ou expirado. Gere um novo código no app Finn.' })
    return
  }

  await prisma.botConnection.update({
    where: { id: connection.id },
    data: { platformUserId: from, isVerified: true, verificationCode: null },
  })

  const user = await prisma.user.findUnique({ where: { id: connection.userId } })
  const name = user?.name?.split(' ')[0] || 'usuário'

  await sendWhatsAppMessage({
    to: from,
    text:
      `✅ *Conectado com sucesso!*\n\n` +
      `Olá, ${name}! Agora você pode:\n\n` +
      `💬 Registrar transações por texto\n` +
      `🎙 Registrar por áudio\n` +
      `📸 Enviar foto de cupom fiscal\n` +
      `🔔 Receber alertas de vencimento\n` +
      `📊 Receber insights semanais da IA\n\n` +
      `Manda sua primeira transação!`,
  })
}

async function handleTextMessage(from: string, text: string, connection: { userId: string; id: string }) {
  const parsed = await parseTransactionMessage(text)

  if (!parsed) {
    await sendWhatsAppMessage({
      to: from,
      text: 'Não entendi como transação. Tente algo como:\n\n• _Gastei 50 no mercado_\n• _Recebi 500 do João_\n• _Condomínio 620 todo mês_',
    })
    return
  }

  const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parsed.amount)
  const typeLabel = parsed.type === 'INCOME' ? '📥 Receita' : '📤 Despesa'
  const dateLabel = parsed.date ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(parsed.date)) : 'Hoje'
  const category = await findCategoryForDescription(connection.userId, parsed.description, text)

  // Load accounts + detect payment method and account/card from the message
  const accounts = await prisma.account.findMany({
    where: { userId: connection.userId, isActive: true },
    orderBy: { createdAt: 'asc' },
  })
  const ctx = detectPaymentContext(text, accounts as any)
  const paymentMethod = ctx.paymentMethod || 'DEBIT'
  const resolvedAccount = resolveAccount(ctx.account as any, paymentMethod, accounts as any)

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
        paymentMethod,
        accountId: resolvedAccount?.id || null,
        accountName: resolvedAccount?.name || null,
      },
      status: 'PARSED',
    },
  })

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
  if (paymentMethod === 'CREDIT') lines.push(`_Saldo da conta não muda até você pagar a fatura._`)
  if (parsed.recurring) lines.push(`🔄 ${parsed.recurring.label}`)

  await sendWhatsAppInteractive({
    to: from,
    body: `*Confirme a transação:*\n\n${lines.join('\n')}`,
    buttons: [
      { id: `confirm_tx:${botMsg.id}`, title: '✅ Confirmar' },
      { id: `cancel_tx:${botMsg.id}`, title: '❌ Cancelar' },
    ],
  })
}

async function handleAudioMessage(from: string, message: any, connection: { userId: string; id: string }) {
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

async function handleImageMessage(from: string, message: any, connection: { userId: string; id: string }) {
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
  const [action, targetId] = buttonId.split(':')

  if (action === 'confirm_tx') {
    const botMsg = await prisma.botMessage.findFirst({ where: { id: targetId, userId: connection.userId, status: 'PARSED' } })
    if (!botMsg || !botMsg.parsedData) {
      await sendWhatsAppMessage({ to: from, text: '⚠️ Transação expirada.' })
      return
    }

    const parsed = botMsg.parsedData as any
    const paymentMethod = (parsed.paymentMethod || 'DEBIT') as 'PIX' | 'DEBIT' | 'CREDIT' | 'CASH' | 'BOLETO' | 'TRANSFER'

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

    const transaction = await prisma.$transaction(async (db) => {
      const created = await db.transaction.create({
        data: {
          userId: connection.userId, description: parsed.description, amount: parsed.amount,
          type: parsed.type, date: txDate, accountId,
          categoryId: parsed.categoryId ?? undefined,
          paymentMethod,
        },
      })
      await applyTransactionBalance(db, {
        type: parsed.type,
        amount: parsed.amount,
        accountId,
        paymentMethod,
        date: txDate,
      })
      return created
    })
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

  if (action === 'snooze') {
    await sendWhatsAppMessage({ to: from, text: `⏰ *Lembrete adiado*\n\nVou te lembrar novamente amanhã.` })
  }
}
