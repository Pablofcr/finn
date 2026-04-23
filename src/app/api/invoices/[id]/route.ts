import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    include: {
      card: true,
      transactions: {
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        include: {
          category: { select: { id: true, name: true, icon: true, color: true } },
          installment: true,
        },
      },
    },
  })

  if (!invoice) {
    return Response.json({ error: 'Fatura não encontrada' }, { status: 404 })
  }

  return Response.json({ data: invoice })
}
