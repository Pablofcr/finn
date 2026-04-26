import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { budgetSchema } from '@/lib/validations/budget'

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const existing = await prisma.budget.findFirst({ where: { id, userId: user.id } })
  if (!existing) return Response.json({ error: 'Orçamento não encontrado' }, { status: 404 })

  const body = await request.json()
  const parsed = budgetSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const budget = await prisma.budget.update({
    where: { id },
    data: parsed.data,
    include: { category: true },
  })

  return Response.json({ data: budget })
}

export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const existing = await prisma.budget.findFirst({ where: { id, userId: user.id } })
  if (!existing) return Response.json({ error: 'Orçamento não encontrado' }, { status: 404 })

  await prisma.budget.delete({ where: { id } })
  return Response.json({ data: { deleted: true } })
}
