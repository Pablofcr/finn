import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { transactionSchema } from '@/lib/validations/transaction'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const transaction = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
    include: {
      category: true,
      account: true,
      installment: true,
    },
  })

  if (!transaction) {
    return Response.json({ error: 'Transação não encontrada' }, { status: 404 })
  }

  return Response.json({ data: transaction })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
  })

  if (!existing) {
    return Response.json({ error: 'Transação não encontrada' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = transactionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { installments: _installments, ...data } = parsed.data

  // Revert old balance change
  if (existing.type === 'EXPENSE') {
    await prisma.account.update({
      where: { id: existing.accountId },
      data: { balance: { increment: Number(existing.amount) } },
    })
  } else if (existing.type === 'INCOME') {
    await prisma.account.update({
      where: { id: existing.accountId },
      data: { balance: { decrement: Number(existing.amount) } },
    })
  }

  const transaction = await prisma.transaction.update({
    where: { id },
    data: {
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: new Date(data.date),
      accountId: data.accountId,
      categoryId: data.categoryId || null,
      location: data.location || null,
      notes: data.notes || null,
      tags: data.tags || [],
    },
    include: { category: true, account: true },
  })

  // Apply new balance change
  if (data.type === 'EXPENSE') {
    await prisma.account.update({
      where: { id: data.accountId },
      data: { balance: { decrement: data.amount } },
    })
  } else if (data.type === 'INCOME') {
    await prisma.account.update({
      where: { id: data.accountId },
      data: { balance: { increment: data.amount } },
    })
  }

  return Response.json({ data: transaction })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
  })

  if (!existing) {
    return Response.json({ error: 'Transação não encontrada' }, { status: 404 })
  }

  // Revert balance
  if (existing.type === 'EXPENSE') {
    await prisma.account.update({
      where: { id: existing.accountId },
      data: { balance: { increment: Number(existing.amount) } },
    })
  } else if (existing.type === 'INCOME') {
    await prisma.account.update({
      where: { id: existing.accountId },
      data: { balance: { decrement: Number(existing.amount) } },
    })
  }

  await prisma.transaction.delete({ where: { id } })

  return Response.json({ message: 'Transação excluída' })
}
