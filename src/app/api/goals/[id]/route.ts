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
  const goal = await prisma.goal.findFirst({
    where: { id, userId: user.id },
  })

  if (!goal) {
    return Response.json({ error: 'Meta não encontrada' }, { status: 404 })
  }

  return Response.json({ data: goal })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.goal.findFirst({
    where: { id, userId: user.id },
  })

  if (!existing) {
    return Response.json({ error: 'Meta não encontrada' }, { status: 404 })
  }

  const body = await request.json()
  const { name, targetAmount, currentAmount, deadline, color, icon } = body

  const goal = await prisma.goal.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(targetAmount !== undefined && { targetAmount }),
      ...(currentAmount !== undefined && { currentAmount }),
      ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
      ...(color !== undefined && { color }),
      ...(icon !== undefined && { icon }),
    },
  })

  return Response.json({ data: goal })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.goal.findFirst({
    where: { id, userId: user.id },
  })

  if (!existing) {
    return Response.json({ error: 'Meta não encontrada' }, { status: 404 })
  }

  await prisma.goal.delete({ where: { id } })
  return Response.json({ message: 'Meta excluída' })
}
