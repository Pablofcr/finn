import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const insight = await prisma.insight.findFirst({
    where: { id, userId: user.id },
  })

  if (!insight) {
    return Response.json({ error: 'Insight não encontrado' }, { status: 404 })
  }

  const updated = await prisma.insight.update({
    where: { id },
    data: {
      isRead: body.isRead ?? insight.isRead,
      isDismissed: body.isDismissed ?? insight.isDismissed,
    },
  })

  return Response.json({ data: updated })
}
