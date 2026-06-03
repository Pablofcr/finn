import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { revertOccurrencePayment } from '@/lib/finance-actions'

/**
 * POST /api/recurring/occurrences/[occurrenceId]/revert
 *
 * Reverte uma quitação: deleta a Transaction, reverte balance, occurrence
 * volta pra PENDING. Usado pelo Undo da UI (toast com "Desfazer" por 10s).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ occurrenceId: string }> },
) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { occurrenceId } = await params
  const result = await revertOccurrencePayment(user.id, occurrenceId)
  if (!result.ok) {
    return Response.json({ error: result.error ?? 'Erro ao desfazer.' }, { status: 400 })
  }
  return Response.json({ data: { ok: true } })
}
