import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  return Response.json({ data: user })
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
