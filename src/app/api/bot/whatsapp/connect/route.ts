import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { generateVerificationCode } from '@/lib/whatsapp'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const [whatsapp, telegram] = await Promise.all([
    prisma.botConnection.findFirst({
      where: { userId: user.id, platform: 'WHATSAPP' },
    }),
    prisma.botConnection.findFirst({
      where: { userId: user.id, platform: 'TELEGRAM' },
      select: { id: true },
    }),
  ])

  const whatsappNumber = process.env.WHATSAPP_DISPLAY_NUMBER || ''
  const hadTelegram = !!telegram

  return Response.json({
    data: whatsapp
      ? {
          connected: whatsapp.isVerified,
          platformUserId: whatsapp.platformUserId,
          verificationCode: whatsapp.isVerified ? null : whatsapp.verificationCode,
          whatsappNumber,
          hadTelegram,
        }
      : { connected: false, whatsappNumber, hadTelegram },
  })
}

export async function POST() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const existing = await prisma.botConnection.findFirst({
    where: { userId: user.id, platform: 'WHATSAPP' },
  })

  if (existing?.isVerified) {
    return Response.json({ error: 'WhatsApp já conectado' }, { status: 400 })
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
        platform: 'WHATSAPP',
        platformUserId: '',
        verificationCode: code,
      },
    })
  }

  return Response.json({
    data: {
      verificationCode: code,
      whatsappNumber: process.env.WHATSAPP_DISPLAY_NUMBER || '',
    },
  })
}

export async function DELETE() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  await prisma.botConnection.deleteMany({
    where: { userId: user.id, platform: 'WHATSAPP' },
  })

  return Response.json({ data: { disconnected: true } })
}
