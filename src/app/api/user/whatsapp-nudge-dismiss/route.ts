import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

/**
 * Incrementa whatsappNudgeDismissedCount do usuário. O frontend chama
 * isso quando o user clica "Agora não" no banner do dashboard. Após 2
 * dispensas, o banner para de aparecer pra não encher o saco.
 */
export async function POST() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { whatsappNudgeDismissedCount: { increment: 1 } },
    select: { whatsappNudgeDismissedCount: true },
  })

  return Response.json({ data: { count: updated.whatsappNudgeDismissedCount } })
}
