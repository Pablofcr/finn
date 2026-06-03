import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { markRecurringOccurrenceIdsAsPaid } from '@/lib/finance-actions'
import { advanceByFrequency } from '@/lib/recurring-occurrence'

/**
 * GET: lista parcelas relevantes da recorrência pra UI inline expandable.
 * Retorna PENDING vencidas + a primeira PENDING futura (ergonomia decidida
 * pelo design-squad — não mostra histórico nem futuras distantes).
 *
 * Response shape: { data: { pending: [{ id, dueDate, isOverdue, daysOverdue }] } }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const recurring = await prisma.recurringTransaction.findFirst({
    where: { id, userId: user.id },
    select: { id: true, frequency: true, nextDueDate: true, status: true },
  })
  if (!recurring) {
    return Response.json({ error: 'Recorrência não encontrada' }, { status: 404 })
  }

  const now = new Date()
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))

  // Vencidas (dueDate < startOfToday) — todas elas.
  const overdue = await prisma.recurringOccurrence.findMany({
    where: {
      recurringTransactionId: id,
      status: 'PENDING',
      dueDate: { lt: startOfToday },
    },
    orderBy: { dueDate: 'asc' },
    select: { id: true, dueDate: true },
  })

  // Próxima PENDING (incluindo hoje) — só a primeira.
  const upcoming = await prisma.recurringOccurrence.findFirst({
    where: {
      recurringTransactionId: id,
      status: 'PENDING',
      dueDate: { gte: startOfToday },
    },
    orderBy: { dueDate: 'asc' },
    select: { id: true, dueDate: true },
  })

  const dayMs = 24 * 60 * 60 * 1000
  const pending = [...overdue, ...(upcoming ? [upcoming] : [])].map(o => ({
    id: o.id,
    dueDate: o.dueDate.toISOString(),
    isOverdue: o.dueDate < startOfToday,
    daysOverdue: o.dueDate < startOfToday
      ? Math.floor((startOfToday.getTime() - o.dueDate.getTime()) / dayMs)
      : 0,
  }))

  return Response.json({ data: { pending } })
}

/**
 * POST: marca occurrences específicas como pagas (por IDs, não FIFO).
 * Body: { occurrenceIds: string[] }
 * Retorna `results` com mapping occurrenceId → transactionId pra alimentar
 * o Undo no frontend.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const ids = Array.isArray(body?.occurrenceIds) ? body.occurrenceIds : []
  if (ids.length === 0) {
    return Response.json({ error: 'occurrenceIds vazio' }, { status: 400 })
  }

  // Sanity: garante que todas as IDs pertencem à recurring do path.
  const owned = await prisma.recurringOccurrence.findMany({
    where: { id: { in: ids }, recurringTransactionId: id, recurring: { userId: user.id } },
    select: { id: true },
  })
  if (owned.length !== ids.length) {
    return Response.json({ error: 'Alguma parcela não pertence a essa recorrência.' }, { status: 400 })
  }

  const result = await markRecurringOccurrenceIdsAsPaid(user.id, ids)
  if (!result.ok) {
    return Response.json({ error: result.error ?? 'Erro ao registrar pagamentos.' }, { status: 400 })
  }

  // Suprimir a recorrência do nextDueDate stale: se a primeira PENDING
  // restante for outra data, atualiza.
  const stillPending = await prisma.recurringOccurrence.findFirst({
    where: { recurringTransactionId: id, status: 'PENDING' },
    orderBy: { dueDate: 'asc' },
    select: { dueDate: true },
  })
  if (stillPending) {
    await prisma.recurringTransaction.update({
      where: { id },
      data: { nextDueDate: stillPending.dueDate },
    })
  } else {
    // Não há mais nenhuma PENDING — avança nextDueDate teórica.
    const lastPaid = await prisma.recurringOccurrence.findFirst({
      where: { recurringTransactionId: id, status: 'PAID' },
      orderBy: { dueDate: 'desc' },
      select: { dueDate: true },
    })
    if (lastPaid) {
      const rec = await prisma.recurringTransaction.findUnique({
        where: { id },
        select: { frequency: true },
      })
      if (rec) {
        await prisma.recurringTransaction.update({
          where: { id },
          data: { nextDueDate: advanceByFrequency(lastPaid.dueDate, rec.frequency) },
        })
      }
    }
  }

  return Response.json({ data: result })
}
