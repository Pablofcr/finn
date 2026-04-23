import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const cardId = searchParams.get('cardId')
  const status = searchParams.get('status')

  const where: any = { userId: user.id }
  if (cardId) where.cardId = cardId
  if (status) where.status = status

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      card: { select: { id: true, name: true, color: true, linkedAccountId: true } },
      _count: { select: { transactions: true } },
    },
    orderBy: [{ periodEnd: 'desc' }],
  })

  return Response.json({ data: invoices })
}
