import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { sendWhatsAppWelcomeMessages } from '@/lib/whatsapp'

/**
 * Endpoint de teste pro Pablo re-disparar as mensagens de boas-vindas no
 * WhatsApp dele sem precisar reconectar a conta. Restrito por whitelist
 * de email pra não virar canal de spam acidental.
 *
 * Como usar (estando logado no app):
 *   1. Abre o app no navegador (já autenticado)
 *   2. Em outra aba, abre /api/admin/send-welcome-test
 *   3. Recebe as 2 mensagens no WhatsApp do número conectado
 */
const ALLOWED_EMAILS = new Set(['pablofcr@gmail.com'])

export async function GET() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  if (!ALLOWED_EMAILS.has(user.email.toLowerCase())) {
    return Response.json({ error: 'Endpoint admin restrito.' }, { status: 403 })
  }

  // Busca o número de WhatsApp conectado e verificado do usuário logado
  const connection = await prisma.botConnection.findFirst({
    where: { userId: user.id, platform: 'WHATSAPP', isVerified: true },
    select: { platformUserId: true },
  })

  if (!connection?.platformUserId) {
    return Response.json(
      { error: 'Nenhuma conexão WhatsApp verificada encontrada pra este usuário.' },
      { status: 404 },
    )
  }

  const firstName = user.name?.split(' ')[0] || 'usuário'

  try {
    await sendWhatsAppWelcomeMessages(connection.platformUserId, firstName)
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return Response.json({ error: `Falha ao enviar: ${reason}` }, { status: 500 })
  }

  return Response.json({
    ok: true,
    sentTo: connection.platformUserId,
    firstName,
  })
}
