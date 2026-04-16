import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { sendMessage, answerCallbackQuery, editMessageText } from '@/lib/telegram'
import { parseTransactionMessage } from '@/lib/parse-transaction'

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
        'Sou seu assistente financeiro. Através de mim você pode:\n\n' +
        '💬 Registrar transações por mensagem\n' +
        '🔔 Receber lembretes de pagamento\n' +
        '✅ Confirmar pagamentos com um toque\n\n' +
        'Exemplos de mensagens:\n' +
        '• <i>"Recebi 500 do João"</i>\n' +
        '• <i>"Gastei 50 no mercado"</i>\n\n' +
        'Para me conectar à sua conta, acesse <b>Assistente</b> no app Finn e siga as instruções.',
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

  // Handle /ajuda command
  if (text === '/ajuda' || text === '/help') {
    await sendMessage({
      chatId,
      text:
        '📋 <b>O que posso fazer:</b>\n\n' +
        '💬 <b>Registrar transações por mensagem:</b>\n' +
        '• <i>"Recebi 500 do João"</i>\n' +
        '• <i>"Gastei 50 no mercado"</i>\n' +
        '• <i>"Pix de 1200 da empresa"</i>\n' +
        '• <i>"Paguei 89,90 na farmácia"</i>\n\n' +
        '🔔 <b>Alertas automáticos</b> de contas a vencer\n' +
        '✅ <b>Confirmar pagamentos</b> com um toque\n\n' +
        'É só mandar uma mensagem descrevendo o que recebeu ou gastou!',
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
        },
        status: 'PARSED',
      },
    })

    await sendMessage({
      chatId,
      text:
        `${typeEmoji} <b>Confirme a transação:</b>\n\n` +
        `${typeLabel}\n` +
        `📝 ${parsed.description}\n` +
        `💰 ${formattedAmount}\n` +
        `📅 Hoje`,
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
      `<b>✅ Conectado com sucesso!</b>\n\n` +
      `Olá, ${name}! Agora você vai receber:\n\n` +
      `🔔 Lembretes antes do vencimento\n` +
      `✅ Botões para confirmar pagamentos\n\n` +
      `Pode voltar ao app Finn — está tudo pronto!`,
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

  const parsed = botMsg.parsedData as { type: string; amount: number; description: string }

  // Get user's default account
  const defaultAccount = await prisma.account.findFirst({
    where: { userId: connection.userId },
    orderBy: { createdAt: 'asc' },
  })

  if (!defaultAccount) {
    await answerCallbackQuery(callbackId, 'Crie uma conta no app primeiro.')
    return
  }

  // Create the transaction
  const transaction = await prisma.transaction.create({
    data: {
      userId: connection.userId,
      description: parsed.description,
      amount: parsed.amount,
      type: parsed.type as 'INCOME' | 'EXPENSE',
      date: new Date(),
      accountId: defaultAccount.id,
    },
  })

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

  await editMessageText({
    chatId,
    messageId,
    text:
      `<b>✅ Transação registrada!</b>\n\n` +
      `${typeEmoji} ${parsed.description}\n` +
      `💰 ${formattedAmount}\n` +
      `🏦 ${defaultAccount.name}\n\n` +
      `Saldo atualizado automaticamente.`,
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
