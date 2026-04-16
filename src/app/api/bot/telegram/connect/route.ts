import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { generateVerificationCode } from '@/lib/telegram'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const connection = await prisma.botConnection.findFirst({
    where: { userId: user.id, platform: 'TELEGRAM' },
  })

  return Response.json({
    data: connection
      ? {
          connected: connection.isVerified,
          platformUserId: connection.platformUserId,
          verificationCode: connection.isVerified ? null : connection.verificationCode,
        }
      : { connected: false },
  })
}

export async function POST() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const existing = await prisma.botConnection.findFirst({
    where: { userId: user.id, platform: 'TELEGRAM' },
  })

  if (existing?.isVerified) {
    return Response.json({ error: 'Telegram já conectado' }, { status: 400 })
  }

  const code = generateVerificationCode()

  if (existing) {
    await prisma.botConnection.update({
      where: { id: existing.id },
      data: { verificationCode: code },
    })
  } else {
    await prisma.botConnection.create({
      data: {
        userId: user.id,
        platform: 'TELEGRAM',
        platformUserId: '',
        verificationCode: code,
      },
    })
  }

  return Response.json({
    data: {
      verificationCode: code,
      botUsername: process.env.TELEGRAM_BOT_USERNAME || 'FinnFinancasBot',
    },
  })
}

export async function DELETE() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  await prisma.botConnection.deleteMany({
    where: { userId: user.id, platform: 'TELEGRAM' },
  })

  return Response.json({ data: { disconnected: true } })
}
