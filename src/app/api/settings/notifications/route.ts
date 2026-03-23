import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  let settings = await prisma.notificationSetting.findUnique({
    where: { userId: user.id },
  })

  if (!settings) {
    settings = await prisma.notificationSetting.create({
      data: { userId: user.id },
    })
  }

  return Response.json({ data: settings })
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()

  const settings = await prisma.notificationSetting.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...body },
    update: body,
  })

  return Response.json({ data: settings })
}
