import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  if (!isAdmin(user.email)) return Response.json({ error: 'Acesso restrito' }, { status: 403 })

  const runs = await prisma.cronRun.findMany({
    orderBy: { startedAt: 'desc' },
    take: 50,
  })

  return Response.json({ data: runs })
}
