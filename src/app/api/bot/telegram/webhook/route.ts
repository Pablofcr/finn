import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { sendMessage, answerCallbackQuery, editMessageText, downloadFileAsBase64, downloadFileAsBuffer } from '@/lib/telegram'
import { parseTransactionMessage, parseReceiptImage } from '@/lib/parse-transaction'
import { transcribeAudio } from '@/lib/transcribe-audio'
import { canUseFeature, getFeatureUsage } from '@/lib/plan-limits'
import { detectPaymentContext, resolveAccount, detectInstallments } from '@/lib/detect-payment-context'
import { applyTransactionBalance } from '@/lib/transaction-balance'
import { getOrCreateInvoiceFor, adjustInvoiceTotal } from '@/lib/invoice'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'
import { maybeRunAgent } from '@/lib/agent'

export const maxDuration = 60

// ── Auto-category helpers ──────────────────────────────────────────────

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

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

async function findCategoryForDescription(
  userId: string,
  description: string,
  originalText?: string,
): Promise<{ categoryId: string; categoryName: string } | null> {
  // Search in both the parsed description AND the original message for better matching
  const normalizedDesc = normalize(originalText ? `${originalText} ${description}` : description)

  try {
    // 1. Try user-defined CategoryKeyword matches first
    const userKeywords = await prisma.categoryKeyword.findMany({
      where: { category: { userId } },
      include: {
        category: { select: { id: true, name: true, type: true } },
      },
    })

    // Helper: match whole word only (prevents "gas" matching "gastei")
    const matchesWord = (text: string, word: string) => {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp(`\\b${escaped}\\b`).test(text)
    }

    for (const kw of userKeywords) {
      if (matchesWord(normalizedDesc, normalize(kw.keyword))) {
        return { categoryId: kw.category.id, categoryName: kw.category.name }
      }
    }

    // 2. Fall back to hardcoded keyword map
    const userCategories = await prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, type: true },
    })

    for (const [keyword, mapping] of Object.entries(KEYWORD_MAP)) {
      if (matchesWord(normalizedDesc, normalize(keyword))) {
        // Try exact name match first
        let match = userCategories.find(
          (c) => normalize(c.name) === normalize(mapping.categoryName) && c.type === mapping.type
        )

        // Try partial/contains match
        if (!match) {
          match = userCategories.find(
            (c) =>
              c.type === mapping.type &&
              (normalize(c.name).includes(normalize(mapping.categoryName)) ||
                normalize(mapping.categoryName).includes(normalize(c.name)))
          )
        }

        if (match) {
          return { categoryId: match.id, categoryName: match.name }
        }

        // Category doesn't exist yet — create it automatically
        const CATEGORY_COLORS: Record<string, string> = {
          'Alimentação': '#ef4444',
          'Transporte': '#3b82f6',
          'Moradia': '#8b5cf6',
          'Saúde': '#ec4899',
          'Educação': '#f59e0b',
          'Lazer': '#06b6d4',
          'Vestuário': '#d946ef',
          'Presentes': '#f43f5e',
          'Salário': '#22c55e',
        }

        const newCategory = await prisma.category.create({
          data: {
            userId,
            name: mapping.categoryName,
            type: mapping.type,
            color: CATEGORY_COLORS[mapping.categoryName] || '#6366f1',
            icon: 'tag',
          },
        })

        return { categoryId: newCategory.id, categoryName: newCategory.name }
      }
    }
  } catch (err) {
    console.error('Error finding category:', err)
  }

  return null
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-telegram-bot-api-secret-token')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const update = await request.json()

  try {
    if (update.message) {
      await handleMessage(update.message)
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query)
    }
  } catch (err) {
    console.error('Telegram webhook error:', err)
  }

  return Response.json({ ok: true })
}

async function handleMessage(message: any) {
  const chatId = String(message.chat.id)
  const text = message.text?.trim() || ''

  // Handle /start command with verification code
  if (text.startsWith('/start')) {
    const parts = text.split(' ')

    if (parts.length === 2) {
      const code = parts[1]
      await handleVerification(chatId, code)
      return
    }

    // Plain /start without code
    await sendMessage({
      chatId,
      text:
        '<b>Olá! Eu sou o Finn 🤖</b>\n\n' +
        'Sou seu assistente financeiro pessoal com inteligência artificial.\n\n' +
        '💬 Registre transações por <b>texto</b>\n' +
        '🎙 Registre por <b>áudio</b> — eu entendo!\n' +
        '📸 Envie <b>foto do cupom</b> — leio tudo\n' +
        '🔔 Receba <b>alertas antes do vencimento</b>\n' +
        '📊 Receba <b>análises semanais</b> da IA\n\n' +
        'Para começar, conecte sua conta no app Finn → <b>Assistente</b>.',
    })
    return
  }

  // Handle verification code sent directly
  if (/^\d{6}$/.test(text)) {
    await handleVerification(chatId, text)
    return
  }

  // Check if user is connected
  const connection = await prisma.botConnection.findFirst({
    where: { platformUserId: chatId, platform: 'TELEGRAM', isVerified: true },
  })

  if (!connection) {
    await sendMessage({
      chatId,
      text: 'Para começar, conecte sua conta Finn. Acesse o app e vá em <b>Assistente</b>.',
    })
    return
  }

  // Handle photo messages (receipts/invoices)
  if (message.photo && message.photo.length > 0) {
    await handleReceiptPhoto(chatId, message, connection)
    return
  }

  // Handle voice/audio messages
  if (message.voice || message.audio) {
    await handleVoiceMessage(chatId, message, connection)
    return
  }

  // Handle /ajuda command
  if (text === '/ajuda' || text === '/help') {
    await sendMessage({
      chatId,
      text:
        '📋 <b>O que posso fazer:</b>\n\n' +
        '💬 <b>Registrar por texto:</b>\n' +
        '• <i>"Recebi 500 do João"</i>\n' +
        '• <i>"Gastei 50 no mercado"</i>\n\n' +
        '🎙️ <b>Registrar por áudio:</b>\n' +
        '• Grave um áudio descrevendo a transação\n' +
        '• <i>"Paguei oitenta reais na farmácia"</i>\n\n' +
        '🧾 <b>Ler cupons fiscais:</b>\n' +
        '• Envie uma <b>foto</b> do cupom ou nota\n' +
        '• Leio automaticamente o valor e o estabelecimento\n\n' +
        '🔔 <b>Alertas automáticos</b> de contas a vencer\n' +
        '✅ <b>Confirmar pagamentos</b> com um toque\n\n' +
        'É só mandar uma mensagem, áudio ou foto!',
    })
    return
  }

  // Try conversational agent first (for QUERY-type intents)
  const agentReply = await maybeRunAgent(connection.userId, text)
  if (agentReply) {
    await sendMessage({ chatId, text: agentReply })
    return
  }

  // Try to parse as a transaction
  try {
    const parsed = await parseTransactionMessage(text)

    if (!parsed) {
      await sendMessage({
        chatId,
        text:
          'Não entendi como transação. Tente algo como:\n\n' +
          '• <i>"Recebi 500 do João"</i>\n' +
          '• <i>"Gastei 50 no mercado"</i>\n\n' +
          'Ou envie <b>/ajuda</b> para ver tudo que posso fazer.',
      })
      return
    }

    const formattedAmount = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(parsed.amount)

    const typeLabel = parsed.type === 'INCOME' ? '📥 Receita' : '📤 Despesa'
    const typeEmoji = parsed.type === 'INCOME' ? '🟢' : '🔴'

    const dateLabel = parsed.date
      ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(parsed.date))
      : 'Hoje'

    // Auto-categorize (use original text for better keyword matching)
    const category = await findCategoryForDescription(connection.userId, parsed.description, text)

    // Detect payment method and account/card mentioned in the message
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
        userId: connection.userId,
        connectionId: connection.id,
        direction: 'INBOUND',
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
      await askPaymentMethodTelegram(chatId, botMsg.id, { ...parsed, installments }, category)
      return
    }

    if (paymentMethod === 'CREDIT' && !installments) {
      await askInstallmentsTelegram(chatId, botMsg.id, parsed, category)
      return
    }

    await sendTransactionPreviewTelegram(chatId, botMsg.id, { ...parsed, installments }, category, paymentMethod, resolvedAccount)
  } catch (err) {
    console.error('Error parsing transaction:', err)
    await sendMessage({
      chatId,
      text: 'Ops, tive um problema ao processar sua mensagem. Tente novamente.',
    })
  }
}

async function handleVerification(chatId: string, code: string) {
  const connection = await prisma.botConnection.findFirst({
    where: {
      verificationCode: code,
      platform: 'TELEGRAM',
      isVerified: false,
    },
  })

  if (!connection) {
    await sendMessage({
      chatId,
      text: '❌ Código inválido ou expirado. Gere um novo código no app Finn.',
    })
    return
  }

  await prisma.botConnection.update({
    where: { id: connection.id },
    data: {
      platformUserId: chatId,
      isVerified: true,
      verificationCode: null,
    },
  })

  const user = await prisma.user.findUnique({ where: { id: connection.userId } })
  const name = user?.name?.split(' ')[0] || 'usuário'

  await sendMessage({
    chatId,
    text:
      `Oi, ${name}! 👋 Bem-vindo ao <b>Finn</b>, seu assistente financeiro.\n\n` +
      `Agora você pode registrar transações direto aqui no Telegram, de três formas:\n\n` +
      `💬 <b>Texto</b> — escreva naturalmente\n` +
      `🎙 <b>Áudio</b> — mande um áudio descrevendo\n` +
      `📸 <b>Foto</b> — envie foto de cupons ou notas\n\n` +
      `O Finn entende <b>datas</b> ("ontem", "dia 10") e detecta <b>gastos recorrentes</b> automaticamente.\n\n` +
      `<b>Exemplos de mensagens:</b>\n` +
      `<code>Gastei 50 no mercado</code>\n` +
      `<code>Condomínio 620 todo mês</code>\n` +
      `<code>Ontem paguei 30 na farmácia</code>\n\n` +
      `🔔 Você também vai receber <b>alertas de vencimento</b> antes das datas de pagamento — é só tocar em <b>"Paguei"</b> pra confirmar.\n\n` +
      `📊 Toda semana, o Finn envia uma <b>análise inteligente</b> dos seus gastos com dicas personalizadas.\n\n` +
      `Manda sua primeira transação e vamos começar!`,
  })
}

async function handleCallbackQuery(callbackQuery: any) {
  const chatId = String(callbackQuery.message.chat.id)
  const messageId = callbackQuery.message.message_id
  const data = callbackQuery.data || ''
  const callbackId = callbackQuery.id

  const [action, ...rest] = data.split(':')
  const targetId = rest.length > 1 ? rest[rest.length - 1] : rest[0]

  const connection = await prisma.botConnection.findFirst({
    where: { platformUserId: chatId, platform: 'TELEGRAM', isVerified: true },
  })

  if (!connection) {
    await answerCallbackQuery(callbackId, 'Conta não conectada.')
    return
  }

  // set_method:METHOD:botMsgId — user picked a payment method
  if (action === 'set_method') {
    const method = rest[0]
    const botMsgId = rest[1]
    await handleSetMethodTelegram(chatId, messageId, callbackId, connection, method, botMsgId)
    return
  }

  // set_installments:N:botMsgId — user picked the installment count
  if (action === 'set_installments') {
    const count = parseInt(rest[0], 10)
    const botMsgId = rest[1]
    await handleSetInstallmentsTelegram(chatId, callbackId, connection, count, botMsgId)
    return
  }

  // Handle transaction confirmation from text message
  if (action === 'confirm_tx') {
    try {
      await handleConfirmTransaction(chatId, messageId, callbackId, connection, targetId)
    } catch (err) {
      console.error('confirm_tx failed:', err)
      // Always close the Telegram loading spinner even when the handler throws
      try { await answerCallbackQuery(callbackId, 'Erro ao confirmar. Tente de novo.') } catch { /* noop */ }
    }
    return
  }

  if (action === 'cancel_tx') {
    await prisma.botMessage.update({
      where: { id: targetId },
      data: { status: 'REJECTED' },
    })
    await editMessageText({
      chatId,
      messageId,
      text: '❌ Transação cancelada.',
    })
    await answerCallbackQuery(callbackId, 'Cancelado')
    return
  }

  // Handle recurring payment callbacks
  const recurringId = targetId
  const recurring = await prisma.recurringTransaction.findFirst({
    where: { id: recurringId, userId: connection.userId },
    include: { account: true, category: true },
  })

  if (!recurring) {
    await answerCallbackQuery(callbackId, 'Transação não encontrada.')
    return
  }

  if (action === 'paid') {
    // accountId is required — if recurring has no account, use user's default/first account
    let accountId = recurring.accountId
    if (!accountId) {
      const accounts = await prisma.account.findMany({
        where: { userId: connection.userId, isActive: true },
        orderBy: { createdAt: 'asc' },
      })
      const resolved = resolveAccount(null, 'DEBIT', accounts as any)
      if (!resolved) {
        await answerCallbackQuery(callbackId, 'Nenhuma conta encontrada. Crie uma conta no app.')
        return
      }
      accountId = resolved.id
    }

    // Create the actual transaction + apply balance atomically
    const transaction = await prisma.$transaction(async (db) => {
      const created = await db.transaction.create({
        data: {
          userId: connection.userId,
          description: recurring.description,
          amount: recurring.amount,
          type: recurring.type,
          date: recurring.nextDueDate,
          accountId: accountId!,
          categoryId: recurring.categoryId ?? undefined,
          recurringTransactionId: recurring.id,
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
      return created
    })

    // Advance nextDueDate
    const nextDate = calculateNextDueDate(recurring.nextDueDate, recurring.frequency)

    if (recurring.endDate && nextDate > recurring.endDate) {
      await prisma.recurringTransaction.update({
        where: { id: recurring.id },
        data: { status: 'COMPLETED' },
      })
    } else {
      await prisma.recurringTransaction.update({
        where: { id: recurring.id },
        data: { nextDueDate: nextDate },
      })
    }

    // Log the message
    await prisma.botMessage.create({
      data: {
        userId: connection.userId,
        connectionId: connection.id,
        direction: 'INBOUND',
        rawContent: `PAGUEI: ${recurring.description}`,
        status: 'CONFIRMED',
        transactionId: transaction.id,
      },
    })

    const formattedAmount = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(recurring.amount))

    await editMessageText({
      chatId,
      messageId,
      text:
        `<b>✅ Pagamento confirmado!</b>\n\n` +
        `<b>${recurring.description}</b>\n` +
        `💰 ${formattedAmount}\n\n` +
        `Transação registrada e saldo atualizado.`,
    })

    await answerCallbackQuery(callbackId, '✅ Pagamento registrado!')

  } else if (action === 'snooze') {
    // Suppress alerts until end-of-today UTC. The daily cron runs early
    // morning (09:00 UTC), so tomorrow's run will pass this filter and
    // re-send the alert.
    const endOfToday = new Date()
    endOfToday.setUTCHours(23, 59, 59, 999)

    await prisma.recurringTransaction.update({
      where: { id: recurring.id },
      data: { snoozedUntil: endOfToday },
    })

    await editMessageText({
      chatId,
      messageId,
      text:
        `<b>⏰ Lembrete adiado</b>\n\n` +
        `<b>${recurring.description}</b>\n` +
        `Vou te lembrar novamente amanhã.`,
    })

    await answerCallbackQuery(callbackId, '⏰ Vou lembrar amanhã!')
  }
}

async function handleVoiceMessage(
  chatId: string,
  message: any,
  connection: { userId: string; id: string },
) {
  const canVoice = await canUseFeature(connection.userId, 'botVoice')
  if (!canVoice) {
    const usage = await getFeatureUsage(connection.userId, 'botVoice')
    await sendMessage({
      chatId,
      text:
        `🎙 <b>Seus áudios do mês acabaram</b> (${usage.used}/${usage.limit} usados)\n\n` +
        `No plano <b>Free</b> você tem 2 áudios por mês. ` +
        `Com o <b>Finn Pro</b> são ilimitados!\n\n` +
        `💡 Enquanto isso, você pode registrar por texto:\n` +
        `<code>Gastei 50 no mercado</code>\n\n` +
        `👉 Faça upgrade: finn-steel.vercel.app/pricing`,
    })
    return
  }

  await sendMessage({
    chatId,
    text: '🎙️ Ouvindo seu áudio...',
  })

  const fileId = message.voice?.file_id || message.audio?.file_id
  const audioBuffer = await downloadFileAsBuffer(fileId)

  if (!audioBuffer) {
    await sendMessage({
      chatId,
      text: '❌ Não consegui baixar o áudio. Tente enviar novamente.',
    })
    return
  }

  // Step 1: Transcribe
  let transcription: string | null = null
  try {
    transcription = await transcribeAudio(audioBuffer, 'voice.ogg')
  } catch (err) {
    console.error('Transcription error:', err)
  }

  if (!transcription) {
    await sendMessage({
      chatId,
      text: '❌ Não consegui entender o áudio. Tente falar mais perto do microfone.',
    })
    return
  }

  // Show what was understood
  await sendMessage({
    chatId,
    text: `🎙️ Entendi: <i>"${transcription}"</i>`,
  })

  // Try conversational agent first (for QUERY-type intents)
  const agentReply = await maybeRunAgent(connection.userId, transcription)
  if (agentReply) {
    await sendMessage({ chatId, text: agentReply })
    return
  }

  // Step 2: Parse as transaction
  let parsed: { type: 'INCOME' | 'EXPENSE'; amount: number; description: string; date?: string | null; recurring?: { frequency: string; label: string } | null } | null = null
  try {
    parsed = await parseTransactionMessage(transcription)
  } catch (err) {
    console.error('Parse error:', err)
  }

  if (!parsed) {
    await sendMessage({
      chatId,
      text:
        'Não identifiquei uma transação no áudio. Tente algo como:\n\n' +
        '🎙️ <i>"Recebi quinhentos reais do João"</i>\n' +
        '🎙️ <i>"Gastei cinquenta no mercado"</i>',
    })
    return
  }

  // Step 3: Save and confirm
  try {
    const formattedAmount = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(parsed.amount)

    const typeLabel = parsed.type === 'INCOME' ? '📥 Receita' : '📤 Despesa'
    const typeEmoji = parsed.type === 'INCOME' ? '🟢' : '🔴'

    const dateLabel = parsed.date
      ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(parsed.date))
      : 'Hoje'

    // Auto-categorize (use original transcription for better keyword matching)
    const category = await findCategoryForDescription(connection.userId, parsed.description, transcription || undefined)

    // Detect payment method and account/card from transcription
    const accounts = await prisma.account.findMany({
      where: { userId: connection.userId, isActive: true },
      orderBy: { createdAt: 'asc' },
    })
    const ctx = detectPaymentContext(transcription || '', accounts as any)
    const paymentMethod = ctx.paymentMethod
    const installments = detectInstallments(transcription || '')
    const resolvedAccount = paymentMethod
      ? resolveAccount(ctx.account as any, paymentMethod, accounts as any)
      : null

    const botMsg = await prisma.botMessage.create({
      data: {
        userId: connection.userId,
        connectionId: connection.id,
        direction: 'INBOUND',
        rawContent: `[ÁUDIO] ${transcription}`,
        mediaType: 'audio/ogg',
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
      await askPaymentMethodTelegram(chatId, botMsg.id, { ...parsed, installments }, category)
      return
    }

    if (paymentMethod === 'CREDIT' && !installments) {
      await askInstallmentsTelegram(chatId, botMsg.id, parsed, category)
      return
    }

    await sendTransactionPreviewTelegram(chatId, botMsg.id, { ...parsed, installments }, category, paymentMethod, resolvedAccount)
  } catch (err) {
    console.error('Save/confirm error:', err)
    await sendMessage({
      chatId,
      text: 'Ops, não consegui salvar a transação. Tente novamente.',
    })
  }
}

async function handleReceiptPhoto(
  chatId: string,
  message: any,
  connection: { userId: string; id: string },
) {
  const canPhoto = await canUseFeature(connection.userId, 'botPhoto')
  if (!canPhoto) {
    const usage = await getFeatureUsage(connection.userId, 'botPhoto')
    await sendMessage({
      chatId,
      text:
        `📸 <b>Suas fotos do mês acabaram</b> (${usage.used}/${usage.limit} usadas)\n\n` +
        `No plano <b>Free</b> você tem 2 fotos de cupom por mês. ` +
        `Com o <b>Finn Pro</b> são ilimitadas!\n\n` +
        `💡 Enquanto isso, você pode registrar por texto:\n` +
        `<code>Gastei 50 no mercado</code>\n\n` +
        `👉 Faça upgrade: finn-steel.vercel.app/pricing`,
    })
    return
  }

  // Send "processing" message
  await sendMessage({
    chatId,
    text: '🔍 Analisando seu cupom fiscal...',
  })

  // Get the highest resolution photo
  const photo = message.photo[message.photo.length - 1]
  const fileData = await downloadFileAsBase64(photo.file_id)

  if (!fileData) {
    await sendMessage({
      chatId,
      text: '❌ Não consegui baixar a imagem. Tente enviar novamente.',
    })
    return
  }

  try {
    const parsed = await parseReceiptImage(fileData.base64, fileData.mimeType)

    if (!parsed) {
      await sendMessage({
        chatId,
        text:
          '🤔 Não consegui identificar um cupom fiscal nessa imagem.\n\n' +
          'Dicas para uma boa leitura:\n' +
          '• Tire a foto com boa iluminação\n' +
          '• Centralize o cupom na imagem\n' +
          '• Evite reflexos e sombras',
      })
      return
    }

    const formattedAmount = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(parsed.amount)

    const formattedDate = parsed.date
      ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(parsed.date))
      : 'Hoje'

    const itemsList = parsed.items.length > 0
      ? '\n\n📋 <b>Itens:</b>\n' + parsed.items.map(item => `  • ${item}`).join('\n')
      : ''

    // Auto-categorize (use description + items for better keyword matching)
    const itemsText = parsed.items.join(' ')
    const category = await findCategoryForDescription(connection.userId, parsed.description, itemsText)

    // Receipt photos don't tell us the payment method — default to DEBIT and
    // use the user's default account. User can edit in the web app if needed.
    const accounts = await prisma.account.findMany({
      where: { userId: connection.userId, isActive: true },
      orderBy: { createdAt: 'asc' },
    })
    const resolvedAccount = resolveAccount(null, 'DEBIT', accounts as any)
    const paymentMethod = 'DEBIT' as const

    // Store parsed data in bot message
    const botMsg = await prisma.botMessage.create({
      data: {
        userId: connection.userId,
        connectionId: connection.id,
        direction: 'INBOUND',
        rawContent: `[FOTO] Cupom: ${parsed.description}`,
        mediaType: fileData.mimeType,
        parsedData: {
          type: parsed.type,
          amount: parsed.amount,
          description: parsed.description,
          date: parsed.date,
          items: parsed.items,
          categoryId: category?.categoryId || null,
          categoryName: category?.categoryName || null,
          paymentMethod,
          accountId: resolvedAccount?.id || null,
          accountName: resolvedAccount?.name || null,
        },
        status: 'PARSED',
      },
    })

    const categoryLine = category
      ? `\n📂 Categoria: ${category.categoryName}`
      : ''
    const accountLine = resolvedAccount ? `\n🏦 ${resolvedAccount.name}` : ''
    const methodLine = `\n💱 ${PAYMENT_METHOD_LABELS[paymentMethod]}`

    await sendMessage({
      chatId,
      text:
        `🧾 <b>Cupom identificado!</b>\n\n` +
        `🏪 ${parsed.description}\n` +
        `💰 <b>${formattedAmount}</b>\n` +
        `📅 ${formattedDate}` +
        categoryLine +
        accountLine +
        methodLine +
        itemsList +
        `\n\nEstá correto?`,
      replyMarkup: {
        inline_keyboard: [
          [
            { text: '✅ Confirmar', callback_data: `confirm_tx:${botMsg.id}` },
            { text: '❌ Cancelar', callback_data: `cancel_tx:${botMsg.id}` },
          ],
        ],
      },
    })
  } catch (err: any) {
    console.error('Error parsing receipt:', err?.message || err)
    await sendMessage({
      chatId,
      text: '📸 Não foi possível analisar o cupom neste momento. Tente novamente mais tarde ou registre manualmente por texto.',
    })
  }
}

async function askInstallmentsTelegram(
  chatId: string,
  botMsgId: string,
  parsed: { amount: number; description: string },
  category: { categoryName: string } | null,
) {
  const formatMoney = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
  const header = `💳 ${parsed.description}${category ? ` · ${category.categoryName}` : ''}\n💰 <b>${formatMoney(parsed.amount)}</b>`

  await sendMessage({
    chatId,
    text: `${header}\n\n<b>Em quantas parcelas?</b>`,
    replyMarkup: {
      inline_keyboard: [
        [
          { text: 'À vista', callback_data: `set_installments:1:${botMsgId}` },
          { text: '2x', callback_data: `set_installments:2:${botMsgId}` },
          { text: '3x', callback_data: `set_installments:3:${botMsgId}` },
        ],
        [
          { text: '4x', callback_data: `set_installments:4:${botMsgId}` },
          { text: '6x', callback_data: `set_installments:6:${botMsgId}` },
          { text: '10x', callback_data: `set_installments:10:${botMsgId}` },
        ],
        [
          { text: '12x', callback_data: `set_installments:12:${botMsgId}` },
          { text: '24x', callback_data: `set_installments:24:${botMsgId}` },
          { text: '❌ Cancelar', callback_data: `cancel_tx:${botMsgId}` },
        ],
      ],
    },
  })
}

async function askPaymentMethodTelegram(
  chatId: string,
  botMsgId: string,
  parsed: { amount: number; description: string; installments?: number | null },
  category: { categoryName: string } | null,
) {
  const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parsed.amount)
  const installmentsLine = parsed.installments && parsed.installments > 1
    ? `\n🔢 ${parsed.installments}x de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parsed.amount / parsed.installments)}`
    : ''
  const header = `📝 ${parsed.description}${category ? ` · ${category.categoryName}` : ''}\n💰 <b>${formattedAmount}</b>${installmentsLine}`

  await sendMessage({
    chatId,
    text: `${header}\n\n<b>Como você pagou?</b>`,
    replyMarkup: {
      inline_keyboard: [
        [
          { text: '💸 PIX', callback_data: `set_method:PIX:${botMsgId}` },
          { text: '🏧 Débito', callback_data: `set_method:DEBIT:${botMsgId}` },
        ],
        [
          { text: '💳 Crédito', callback_data: `set_method:CREDIT:${botMsgId}` },
          { text: '💵 Dinheiro', callback_data: `set_method:CASH:${botMsgId}` },
        ],
        [
          { text: '📄 Boleto', callback_data: `set_method:BOLETO:${botMsgId}` },
          { text: '🔁 Transferência', callback_data: `set_method:TRANSFER:${botMsgId}` },
        ],
        [
          { text: '❌ Cancelar', callback_data: `cancel_tx:${botMsgId}` },
        ],
      ],
    },
  })
}

async function sendTransactionPreviewTelegram(
  chatId: string,
  botMsgId: string,
  parsed: { type: string; amount: number; description: string; date?: string | null; recurring?: { label: string } | null; installments?: number | null },
  category: { categoryName: string } | null,
  paymentMethod: 'PIX' | 'DEBIT' | 'CREDIT' | 'CASH' | 'BOLETO' | 'TRANSFER',
  resolvedAccount: { name: string } | null,
) {
  const formatMoney = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
  const formattedAmount = formatMoney(parsed.amount)
  const typeLabel = parsed.type === 'INCOME' ? '📥 Receita' : '📤 Despesa'
  const typeEmoji = parsed.type === 'INCOME' ? '🟢' : '🔴'
  const dateLabel = parsed.date
    ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(parsed.date))
    : 'Hoje'
  const accountLabel = paymentMethod === 'CREDIT' ? '💳' : '🏦'
  const accountLine = resolvedAccount ? `\n${accountLabel} ${resolvedAccount.name}` : ''
  const methodLine = `\n💱 ${PAYMENT_METHOD_LABELS[paymentMethod]}`
  const creditNote = paymentMethod === 'CREDIT' ? `\n<i>Saldo da conta não muda até você pagar a fatura.</i>` : ''
  const categoryLine = category ? `\n📂 Categoria: ${category.categoryName}` : ''
  const recurringLine = parsed.recurring ? `\n🔄 Recorrente: ${parsed.recurring.label}` : ''
  const installmentsLine = paymentMethod === 'CREDIT' && parsed.installments && parsed.installments > 1
    ? `\n🔢 ${parsed.installments}x de ${formatMoney(parsed.amount / parsed.installments)}`
    : ''

  await sendMessage({
    chatId,
    text:
      `${typeEmoji} <b>Confirme a transação:</b>\n\n` +
      `${typeLabel}\n` +
      `📝 ${parsed.description}\n` +
      `💰 ${formattedAmount}\n` +
      `📅 ${dateLabel}` +
      categoryLine +
      accountLine +
      methodLine +
      creditNote +
      recurringLine,
    replyMarkup: {
      inline_keyboard: [
        [
          { text: '✅ Confirmar', callback_data: `confirm_tx:${botMsgId}` },
          { text: '❌ Cancelar', callback_data: `cancel_tx:${botMsgId}` },
        ],
      ],
    },
  })
}

async function handleSetMethodTelegram(
  chatId: string,
  messageId: number,
  callbackId: string,
  connection: { userId: string; id: string },
  method: string,
  botMsgId: string,
) {
  const botMsg = await prisma.botMessage.findFirst({
    where: { id: botMsgId, userId: connection.userId, status: 'PARSED' },
  })
  if (!botMsg || !botMsg.parsedData) {
    await answerCallbackQuery(callbackId, 'Transação expirada.')
    return
  }

  const parsed = botMsg.parsedData as any
  const pm = method as 'PIX' | 'DEBIT' | 'CREDIT' | 'CASH' | 'BOLETO' | 'TRANSFER'

  const accounts = await prisma.account.findMany({
    where: { userId: connection.userId, isActive: true },
    orderBy: { createdAt: 'asc' },
  })
  const resolvedAccount = resolveAccount(null, pm, accounts as any)

  if (pm === 'CREDIT' && !resolvedAccount) {
    await answerCallbackQuery(callbackId, 'Cadastre um cartão de crédito no app.')
    await editMessageText({
      chatId,
      messageId,
      text: '⚠️ Você ainda não cadastrou um cartão de crédito. Adicione um em <b>Contas</b> no app e mande a transação novamente.',
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

  await answerCallbackQuery(callbackId, 'Método escolhido')

  // Credit purchase without a detected installment count → ask now.
  if (pm === 'CREDIT' && !parsed.installments) {
    await askInstallmentsTelegram(
      chatId,
      botMsgId,
      { amount: parsed.amount, description: parsed.description },
      parsed.categoryName ? { categoryName: parsed.categoryName } : null,
    )
    return
  }

  await sendTransactionPreviewTelegram(
    chatId,
    botMsgId,
    { type: parsed.type, amount: parsed.amount, description: parsed.description, date: parsed.date, recurring: parsed.recurring, installments: parsed.installments },
    parsed.categoryName ? { categoryName: parsed.categoryName } : null,
    pm,
    resolvedAccount,
  )
}

async function handleSetInstallmentsTelegram(
  chatId: string,
  callbackId: string,
  connection: { userId: string; id: string },
  count: number,
  botMsgId: string,
) {
  const botMsg = await prisma.botMessage.findFirst({
    where: { id: botMsgId, userId: connection.userId, status: 'PARSED' },
  })
  if (!botMsg || !botMsg.parsedData) {
    await answerCallbackQuery(callbackId, 'Transação expirada.')
    return
  }

  const parsed = botMsg.parsedData as any
  // count === 1 means "à vista" → no installment record needed
  const installments = count > 1 ? count : null

  await prisma.botMessage.update({
    where: { id: botMsgId },
    data: { parsedData: { ...parsed, installments } },
  })

  await answerCallbackQuery(callbackId, installments ? `${installments}x` : 'À vista')
  await sendTransactionPreviewTelegram(
    chatId,
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
}

async function handleConfirmTransaction(
  chatId: string,
  messageId: number,
  callbackId: string,
  connection: { userId: string; id: string },
  botMsgId: string,
) {
  const botMsg = await prisma.botMessage.findFirst({
    where: { id: botMsgId, userId: connection.userId, status: 'PARSED' },
  })

  if (!botMsg || !botMsg.parsedData) {
    await answerCallbackQuery(callbackId, 'Transação expirada.')
    return
  }

  const parsed = botMsg.parsedData as {
    type: string; amount: number; description: string;
    date?: string | null;
    recurring?: { frequency: string; label: string; dayOfWeek?: number | null } | null;
    categoryId?: string | null;
    categoryName?: string | null;
    paymentMethod?: 'PIX' | 'DEBIT' | 'CREDIT' | 'CASH' | 'BOLETO' | 'TRANSFER';
    accountId?: string | null;
    accountName?: string | null;
    installments?: number | null;
  }

  const paymentMethod = parsed.paymentMethod || 'DEBIT'
  const installments = paymentMethod === 'CREDIT' && parsed.installments && parsed.installments > 1 ? parsed.installments : 1

  // Resolve the account (prefer what was detected in parsing, otherwise default/oldest)
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
    await answerCallbackQuery(
      callbackId,
      paymentMethod === 'CREDIT'
        ? 'Cadastre um cartão de crédito no app.'
        : 'Crie uma conta no app primeiro.',
    )
    return
  }

  const selectedAccount = await prisma.account.findFirst({
    where: { id: accountId, userId: connection.userId },
  })
  if (!selectedAccount) {
    await answerCallbackQuery(callbackId, 'Conta não encontrada.')
    return
  }

  // Use receipt date if available, otherwise today
  // Normalize date to midnight so same-day transactions sort by createdAt
  const rawDate = parsed.date ? new Date(parsed.date) : new Date()
  const txDate = new Date(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate())

  const cardForInvoice = paymentMethod === 'CREDIT' && selectedAccount.closingDay && selectedAccount.dueDay
    ? { id: selectedAccount.id, userId: connection.userId, closingDay: selectedAccount.closingDay, dueDay: selectedAccount.dueDay }
    : null

  // When paying in installments on credit, each parcel goes into the invoice
  // for the month where that parcel actually charges.
  const installmentAmount = parsed.amount / installments
  const groupId = installments > 1 ? crypto.randomUUID() : null

  // Creating 10–48 installments plus their invoices inside a single
  // transaction would easily exceed Prisma's default 5s window. Each parcel
  // is its own short transaction — if one fails mid-way the ones already
  // committed stay (user can retry the remaining).
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
          type: parsed.type as 'INCOME' | 'EXPENSE',
          date: parcelDate,
          accountId: accountId!,
          categoryId: parsed.categoryId ?? undefined,
          paymentMethod,
          invoiceId: invoice?.id ?? null,
          ...(groupId ? {
            installment: {
              create: { installmentNumber: i + 1, totalInstallments: installments, groupId },
            },
          } : {}),
        },
      })
      await applyTransactionBalance(db, {
        type: parsed.type as any,
        amount: installmentAmount,
        accountId: accountId!,
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

  // If recurring, also create a recurring transaction
  let recurringInfo = ''
  if (parsed.recurring) {
    // Calculate next due date based on frequency and day of week
    let nextDueDate = new Date(txDate)
    if (parsed.recurring.dayOfWeek !== undefined && parsed.recurring.dayOfWeek !== null) {
      // Find the next occurrence of the specified day of week
      const targetDay = parsed.recurring.dayOfWeek
      const today = new Date()
      const currentDay = today.getDay()
      let daysUntil = targetDay - currentDay
      if (daysUntil <= 0) daysUntil += 7 // Next week if today or past
      nextDueDate = new Date(today)
      nextDueDate.setDate(today.getDate() + daysUntil)
    } else {
      // For non-day-specific recurrence, next due is after the first period
      nextDueDate = calculateNextDueDate(txDate, parsed.recurring.frequency)
    }

    await prisma.recurringTransaction.create({
      data: {
        userId: connection.userId,
        description: parsed.description,
        amount: parsed.amount,
        type: parsed.type as 'INCOME' | 'EXPENSE',
        frequency: parsed.recurring.frequency as any,
        startDate: txDate,
        nextDueDate,
        accountId: accountId!,
        categoryId: parsed.categoryId ?? undefined,
        autoConfirm: false,
      },
    })
    recurringInfo = `\n🔄 Recorrência ${parsed.recurring.label} criada`
  }

  // Update bot message status
  await prisma.botMessage.update({
    where: { id: botMsgId },
    data: { status: 'CONFIRMED', transactionId: transaction.id },
  })

  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(parsed.amount)

  const typeEmoji = parsed.type === 'INCOME' ? '📥' : '📤'

  const categoryInfo = parsed.categoryName
    ? `\n📂 ${parsed.categoryName}`
    : ''

  const accountEmoji = paymentMethod === 'CREDIT' ? '💳' : '🏦'
  const balanceNote = paymentMethod === 'CREDIT'
    ? 'Lançado na fatura do cartão.'
    : 'Saldo atualizado automaticamente.'

  await editMessageText({
    chatId,
    messageId,
    text:
      `<b>✅ Transação registrada!</b>\n\n` +
      `${typeEmoji} ${parsed.description}\n` +
      `💰 ${formattedAmount}\n` +
      `${accountEmoji} ${selectedAccount.name}\n` +
      `💱 ${PAYMENT_METHOD_LABELS[paymentMethod]}` +
      categoryInfo +
      recurringInfo +
      `\n\n${balanceNote}`,
  })

  await answerCallbackQuery(callbackId, '✅ Registrado!')
}

function calculateNextDueDate(current: Date, frequency: string): Date {
  const next = new Date(current)
  switch (frequency) {
    case 'DAILY':
      next.setDate(next.getDate() + 1)
      break
    case 'WEEKLY':
      next.setDate(next.getDate() + 7)
      break
    case 'BIWEEKLY':
      next.setDate(next.getDate() + 14)
      break
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1)
      break
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3)
      break
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1)
      break
  }
  return next
}
