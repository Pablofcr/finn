import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const count = await prisma.insight.count({
    where: { userId: user.id, isRead: false, isDismissed: false },
  })

  return Response.json({ data: { unreadCount: count } })
}
