import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { categorySchema } from '@/lib/validations/category'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.category.findFirst({
    where: { id, OR: [{ userId: user.id }, { isSystem: true }] },
  })

  if (!existing) {
    return Response.json({ error: 'Categoria não encontrada' }, { status: 404 })
  }

  if (existing.isSystem) {
    return Response.json({ error: 'Categorias do sistema não podem ser editadas' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = categorySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const category = await prisma.category.update({
    where: { id },
    data: parsed.data,
  })

  return Response.json({ data: category })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.category.findFirst({
    where: { id, userId: user.id },
  })

  if (!existing) {
    return Response.json({ error: 'Categoria não encontrada' }, { status: 404 })
  }

  if (existing.isSystem) {
    return Response.json({ error: 'Categorias do sistema não podem ser excluídas' }, { status: 403 })
  }

  await prisma.category.delete({ where: { id } })
  return Response.json({ message: 'Categoria excluída' })
}
