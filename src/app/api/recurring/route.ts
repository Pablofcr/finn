import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { recurringSchema } from '@/lib/validations/recurring'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const recurring = await prisma.recurringTransaction.findMany({
    where: { userId: user.id },
    include: { category: true },
    orderBy: { nextDueDate: 'asc' },
  })

  return Response.json({ data: recurring })
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

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

  return Response.json({ data: recurring }, { status: 201 })
}
