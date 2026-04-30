import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  // Embute status da conexão WhatsApp pra alimentar o banner no dashboard
  // e o step do onboarding sem request adicional.
  const whatsappConnection = await prisma.botConnection.findFirst({
    where: { userId: user.id, platform: 'WHATSAPP', isVerified: true },
    select: { id: true },
  })

  return Response.json({
    data: {
      ...user,
      whatsappConnected: !!whatsappConnection,
    },
  })
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: body.name,
      phone: body.phone,
      defaultCurrency: body.defaultCurrency,
      timezone: body.timezone,
    },
  })

  return Response.json({ data: updated })
}
