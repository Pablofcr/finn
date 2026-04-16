import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function POST() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  await prisma.insight.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  })

  return Response.json({ data: { success: true } })
}
