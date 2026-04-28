import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { markRecurringAsPaid } from '@/lib/finance-actions'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const result = await markRecurringAsPaid(user.id, id)

  if (!result.ok) {
    return Response.json({ error: result.error || 'Erro ao marcar como paga' }, { status: 400 })
  }

  return Response.json({ data: result })
}
