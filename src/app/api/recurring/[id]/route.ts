import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { recurringSchema } from '@/lib/validations/recurring'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.recurringTransaction.findFirst({
    where: { id, userId: user.id },
  })

  if (!existing) {
    return Response.json({ error: 'Recorrência não encontrada' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = recurringSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { startDate, endDate, ...rest } = parsed.data
  const startDateChanged = new Date(startDate).getTime() !== existing.startDate.getTime()

  const recurring = await prisma.recurringTransaction.update({
    where: { id },
    data: {
      ...rest,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      ...(startDateChanged ? { nextDueDate: new Date(startDate) } : {}),
    },
    include: { category: true },
  })

  return Response.json({ data: recurring })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.recurringTransaction.findFirst({
    where: { id, userId: user.id },
  })

  if (!existing) {
    return Response.json({ error: 'Recorrência não encontrada' }, { status: 404 })
  }

  const body = await request.json()
  const { status } = body

  if (!status || !['ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED'].includes(status)) {
    return Response.json({ error: 'Status inválido' }, { status: 400 })
  }

  const recurring = await prisma.recurringTransaction.update({
    where: { id },
    data: { status },
    include: { category: true },
  })

  return Response.json({ data: recurring })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.recurringTransaction.findFirst({
    where: { id, userId: user.id },
  })

  if (!existing) {
    return Response.json({ error: 'Recorrência não encontrada' }, { status: 404 })
  }

  await prisma.recurringTransaction.delete({ where: { id } })
  return Response.json({ message: 'Recorrência excluída' })
}
