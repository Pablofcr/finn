import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { sendMessage, answerCallbackQuery, editMessageText, downloadFileAsBase64, downloadFileAsBuffer } from '@/lib/telegram'
import { parseTransactionMessage, parseReceiptImage } from '@/lib/parse-transaction'
import { transcribeAudio } from '@/lib/transcribe-audio'
import { canUseFeature, getFeatureUsage } from '@/lib/plan-limits'

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
  jantar: { categoryName: 'Alimentação', type: 'EXPENSE' },
  cafe: { categoryName: 'Alimentação', type: 'EXPENSE' },
  padaria: { categoryName: 'Alimentação', type: 'EXPENSE' },
  pizza: { categoryName: 'Alimentação', type: 'EXPENSE' },
  hamburger: { categoryName: 'Alimentação', type: 'EXPENSE' },
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
  // Vestuário
  roupa: { categoryName: 'Vestuário', type: 'EXPENSE' },
  sapato: { categoryName: 'Vestuário', type: 'EXPENSE' },
  shopping: { categoryName: 'Vestuário', type: 'EXPENSE' },
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
): Promise<{ categoryId: string; categoryName: string } | null> {
  const normalizedDesc = normalize(description)

  try {
    // 1. Try user-defined CategoryKeyword matches first
    const userKeywords = await prisma.categoryKeyword.findMany({
      where: { category: { userId } },
      include: {
        category: { select: { id: true, name: true, type: true } },
      },
    })

    for (const kw of userKeywords) {
      if (normalizedDesc.includes(normalize(kw.keyword))) {
        return { categoryId: kw.category.id, categoryName: kw.category.name }
      }
    }

    // 2. Fall back to hardcoded keyword map
    const userCategories = await prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, type: true },
    })

    for (const [keyword, mapping] of Object.entries(KEYWORD_MAP)) {
      if (normalizedDesc.includes(normalize(keyword))) {
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

    // Auto-categorize
    const category = await findCategoryForDescription(connection.userId, parsed.description)

    // Store parsed data temporarily in bot message for confirmation
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
        },
        status: 'PARSED',
      },
    })

    const recurringLine = parsed.recurring
      ? `\n🔄 Recorrente: ${parsed.recurring.label}`
      : ''

    const categoryLine = category
      ? `\n📂 Categoria: ${category.categoryName}`
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
        recurringLine,
      replyMarkup: {
        inline_keyboard: [
          [
            { text: '✅ Confirmar', callback_data: `confirm_tx:${botMsg.id}` },
            { text: '❌ Cancelar', callback_data: `cancel_tx:${botMsg.id}` },
          ],
        ],
      },
    })
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

  const [action, targetId] = data.split(':')

  const connection = await prisma.botConnection.findFirst({
    where: { platformUserId: chatId, platform: 'TELEGRAM', isVerified: true },
  })

  if (!connection) {
    await answerCallbackQuery(callbackId, 'Conta não conectada.')
    return
  }

  // Handle transaction confirmation from text message
  if (action === 'confirm_tx') {
    await handleConfirmTransaction(chatId, messageId, callbackId, connection, targetId)
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
    // accountId is required — if recurring has no account, use user's first account
    let accountId = recurring.accountId
    if (!accountId) {
      const defaultAccount = await prisma.account.findFirst({
        where: { userId: connection.userId },
        orderBy: { createdAt: 'asc' },
      })
      if (!defaultAccount) {
        await answerCallbackQuery(callbackId, 'Nenhuma conta encontrada. Crie uma conta no app.')
        return
      }
      accountId = defaultAccount.id
    }

    // Create the actual transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId: connection.userId,
        description: recurring.description,
        amount: recurring.amount,
        type: recurring.type,
        date: recurring.nextDueDate,
        accountId,
        categoryId: recurring.categoryId ?? undefined,
        recurringTransactionId: recurring.id,
      },
    })

    // Update account balance if date is not in the future
    if (recurring.nextDueDate <= new Date()) {
      const balanceChange = recurring.type === 'INCOME'
        ? Number(recurring.amount)
        : -Number(recurring.amount)

      await prisma.account.update({
        where: { id: accountId },
        data: { balance: { increment: balanceChange } },
      })
    }

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

    // Auto-categorize
    const category = await findCategoryForDescription(connection.userId, parsed.description)

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
        },
        status: 'PARSED',
      },
    })

    const recurringLine = parsed.recurring
      ? `\n🔄 Recorrente: ${parsed.recurring.label}`
      : ''

    const categoryLine = category
      ? `\n📂 Categoria: ${category.categoryName}`
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
        recurringLine,
      replyMarkup: {
        inline_keyboard: [
          [
            { text: '✅ Confirmar', callback_data: `confirm_tx:${botMsg.id}` },
            { text: '❌ Cancelar', callback_data: `cancel_tx:${botMsg.id}` },
          ],
        ],
      },
    })
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

    // Auto-categorize
    const category = await findCategoryForDescription(connection.userId, parsed.description)

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
        },
        status: 'PARSED',
      },
    })

    const categoryLine = category
      ? `\n📂 Categoria: ${category.categoryName}`
      : ''

    await sendMessage({
      chatId,
      text:
        `🧾 <b>Cupom identificado!</b>\n\n` +
        `🏪 ${parsed.description}\n` +
        `💰 <b>${formattedAmount}</b>\n` +
        `📅 ${formattedDate}` +
        categoryLine +
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
  } catch (err) {
    console.error('Error parsing receipt:', err)
    await sendMessage({
      chatId,
      text: 'Ops, tive um problema ao analisar o cupom. Tente novamente.',
    })
  }
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
  }

  // Get user's default account
  const defaultAccount = await prisma.account.findFirst({
    where: { userId: connection.userId },
    orderBy: { createdAt: 'asc' },
  })

  if (!defaultAccount) {
    await answerCallbackQuery(callbackId, 'Crie uma conta no app primeiro.')
    return
  }

  // Use receipt date if available, otherwise today
  const txDate = parsed.date ? new Date(parsed.date) : new Date()

  // Create the transaction
  const transaction = await prisma.transaction.create({
    data: {
      userId: connection.userId,
      description: parsed.description,
      amount: parsed.amount,
      type: parsed.type as 'INCOME' | 'EXPENSE',
      date: txDate,
      accountId: defaultAccount.id,
      categoryId: parsed.categoryId ?? undefined,
    },
  })

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
        accountId: defaultAccount.id,
        categoryId: parsed.categoryId ?? undefined,
        autoConfirm: false,
      },
    })
    recurringInfo = `\n🔄 Recorrência ${parsed.recurring.label} criada`
  }

  // Update account balance
  const balanceChange = parsed.type === 'INCOME'
    ? parsed.amount
    : -parsed.amount

  await prisma.account.update({
    where: { id: defaultAccount.id },
    data: { balance: { increment: balanceChange } },
  })

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

  await editMessageText({
    chatId,
    messageId,
    text:
      `<b>✅ Transação registrada!</b>\n\n` +
      `${typeEmoji} ${parsed.description}\n` +
      `💰 ${formattedAmount}\n` +
      `🏦 ${defaultAccount.name}` +
      categoryInfo +
      recurringInfo +
      `\n\nSaldo atualizado automaticamente.`,
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
