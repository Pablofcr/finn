import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const insights = await prisma.insight.findMany({
    where: { userId: user.id, isDismissed: false },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return Response.json({ data: insights })
}
