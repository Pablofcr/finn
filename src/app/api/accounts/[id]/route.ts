import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { accountSchema } from '@/lib/validations/account'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const account = await prisma.account.findFirst({
    where: { id, userId: user.id },
  })

  if (!account) {
    return Response.json({ error: 'Conta não encontrada' }, { status: 404 })
  }

  return Response.json({ data: account })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.account.findFirst({
    where: { id, userId: user.id },
  })

  if (!existing) {
    return Response.json({ error: 'Conta não encontrada' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = accountSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const account = await prisma.account.update({
    where: { id },
    data: parsed.data,
  })

  return Response.json({ data: account })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.account.findFirst({
    where: { id, userId: user.id },
  })

  if (!existing) {
    return Response.json({ error: 'Conta não encontrada' }, { status: 404 })
  }

  const txCount = await prisma.transaction.count({
    where: { accountId: id },
  })

  if (txCount > 0) {
    await prisma.account.update({
      where: { id },
      data: { isActive: false },
    })
    return Response.json({ message: 'Conta desativada (possui transações vinculadas)' })
  }

  await prisma.account.delete({ where: { id } })
  return Response.json({ message: 'Conta excluída' })
}
