import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { sendWhatsAppReengagement, type ReengagementStatus } from '@/lib/whatsapp'

/**
 * Endpoint de teste pro Pablo disparar manualmente uma das 3 mensagens
 * de re-engagement no WhatsApp dele. Não cria ReengagementNudge record
 * (não polui histórico nem cap lifetime de 3).
 *
 * Como usar (estando logado no app):
 *   /api/admin/test-reengagement?status=warning
 *   /api/admin/test-reengagement?status=at-risk
 *   /api/admin/test-reengagement?status=inactive
 */
const ALLOWED_EMAILS = new Set(['pablofcr@gmail.com'])
const VALID_STATUSES: ReengagementStatus[] = ['warning', 'at-risk', 'inactive']

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  if (!ALLOWED_EMAILS.has(user.email.toLowerCase())) {
    return Response.json({ error: 'Endpoint admin restrito.' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const statusParam = (searchParams.get('status') || '').toLowerCase()
  if (!VALID_STATUSES.includes(statusParam as ReengagementStatus)) {
    return Response.json(
      {
        error: 'Status inválido. Use ?status=warning, at-risk ou inactive',
        examples: VALID_STATUSES.map(s => `/api/admin/test-reengagement?status=${s}`),
      },
      { status: 400 },
    )
  }
  const status = statusParam as ReengagementStatus

  const connection = await prisma.botConnection.findFirst({
    where: { userId: user.id, platform: 'WHATSAPP', isVerified: true },
    select: { platformUserId: true },
  })
  if (!connection?.platformUserId) {
    return Response.json(
      { error: 'Nenhuma conexão WhatsApp verificada encontrada.' },
      { status: 404 },
    )
  }

  const firstName = user.name?.split(' ')[0] || 'usuário'

  try {
    await sendWhatsAppReengagement(connection.platformUserId, firstName, status)
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return Response.json({ error: `Falha ao enviar: ${reason}` }, { status: 500 })
  }

  return Response.json({
    ok: true,
    sentTo: connection.platformUserId,
    firstName,
    variant: status,
    note: 'Mensagem enviada pro WhatsApp. NÃO foi gravada em ReengagementNudge — não conta no cap de 3 nem no cooldown.',
  })
}
