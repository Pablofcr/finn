import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// Telegram foi descontinuado. Mantemos GET (pra detectar usuários antigos
// e mostrar o banner de migração) e DELETE (pra limpar a conexão antiga).
// POST retorna 410 Gone — não geramos novos códigos.

export async function GET() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const connection = await prisma.botConnection.findFirst({
    where: { userId: user.id, platform: 'TELEGRAM' },
  })

  return Response.json({
    data: {
      connected: false,
      hadTelegram: !!connection,
      discontinued: true,
    },
  })
}

export async function POST() {
  return Response.json(
    {
      error: 'Telegram descontinuado',
      message: 'A integração com o Telegram foi encerrada. Conecte-se pelo WhatsApp.',
    },
    { status: 410 },
  )
}

export async function DELETE() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  await prisma.botConnection.deleteMany({
    where: { userId: user.id, platform: 'TELEGRAM' },
  })

  return Response.json({ data: { disconnected: true } })
}
