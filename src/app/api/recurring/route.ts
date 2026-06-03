import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { recurringSchema } from '@/lib/validations/recurring'
import { checkLimit } from '@/lib/plan-limits'
import { getTodayInTimezone } from '@/lib/date-tz'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const startOfToday = getTodayInTimezone(user.timezone || 'America/Sao_Paulo')

  const recurring = await prisma.recurringTransaction.findMany({
    where: { userId: user.id },
    include: {
      category: true,
      // Agrega contagem e mais antiga PENDING vencida pra o card da UI
      // mostrar badge "N em aberto" sem precisar de N requests adicionais.
      occurrences: {
        where: { status: 'PENDING', dueDate: { lt: startOfToday } },
        orderBy: { dueDate: 'asc' },
        select: { id: true, dueDate: true },
      },
    },
    orderBy: { nextDueDate: 'asc' },
  })

  // Achata occurrences pra apenas o que a UI precisa.
  const enriched = recurring.map(r => {
    const { occurrences, ...rest } = r
    return {
      ...rest,
      pendingOverdueCount: occurrences.length,
      oldestOverdueDate: occurrences[0]?.dueDate.toISOString() ?? null,
    }
  })

  return Response.json({ data: enriched })
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const limitCheck = await checkLimit(user.id, 'recurringTransactions')
  if (!limitCheck.allowed) {
    return Response.json({ error: `Limite do plano gratuito atingido (${limitCheck.current}/${limitCheck.limit}). Faça upgrade para o Finn Pro.`, upgrade: true }, { status: 403 })
  }

  const body = await request.json()
  const parsed = recurringSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { startDate, endDate, ...rest } = parsed.data

  const recurring = await prisma.recurringTransaction.create({
    data: {
      userId: user.id,
      ...rest,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      nextDueDate: new Date(startDate),
      status: 'ACTIVE',
    },
    include: { category: true },
  })

  // Cria a primeira RecurringOccurrence imediatamente — sem isso, o cron
  // só popula na próxima execução (manhã/noite), e o usuário pode tentar
  // marcar como paga antes da primeira occurrence existir.
  await prisma.recurringOccurrence.create({
    data: {
      recurringTransactionId: recurring.id,
      dueDate: new Date(startDate),
      status: 'PENDING',
    },
  }).catch(() => {/* unique violation = ok, já existe */})

  return Response.json({ data: recurring }, { status: 201 })
}
