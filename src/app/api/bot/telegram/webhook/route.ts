import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { sendMessage, answerCallbackQuery, editMessageText } from '@/lib/telegram'

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
        'Sou seu assistente financeiro. Através de mim você vai:\n\n' +
        '🔔 Receber lembretes de pagamento\n' +
        '✅ Confirmar pagamentos com um toque\n' +
        '📊 Acompanhar suas finanças\n\n' +
        'Para me conectar à sua conta, acesse <b>Assistente</b> no app Finn e siga as instruções.',
    })
    return
  }

  // Handle verification code sent directly
  if (/^\d{6}$/.test(text)) {
    await handleVerification(chatId, text)
    return
  }

  // Default response
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

  await sendMessage({
    chatId,
    text:
      '📋 <b>O que posso fazer:</b>\n\n' +
      '🔔 Envio lembretes automáticos de pagamento\n' +
      '✅ Você confirma com um toque\n\n' +
      'Tudo automático! Relaxa que eu cuido dos lembretes. 😉',
  })
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

  const [action, recurringId] = data.split(':')

  const connection = await prisma.botConnection.findFirst({
    where: { platformUserId: chatId, platform: 'TELEGRAM', isVerified: true },
  })

  if (!connection) {
    await answerCallbackQuery(callbackId, 'Conta não conectada.')
    return
  }

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
