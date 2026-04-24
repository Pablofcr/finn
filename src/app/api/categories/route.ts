import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { categorySchema } from '@/lib/validations/category'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    include: {
      subcategories: {
        include: { _count: { select: { transactions: true } } },
        orderBy: { name: 'asc' },
      },
      parent: { select: { id: true, name: true } },
      keywords: true,
      _count: { select: { transactions: true } },
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  })

  return Response.json({ data: categories })
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const parsed = categorySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  // Prevent duplicates: same user can't have two categories with the same name+type
  const existing = await prisma.category.findFirst({
    where: {
      userId: user.id,
      name: parsed.data.name,
      type: parsed.data.type,
    },
  })
  if (existing) {
    return Response.json(
      { error: `Você já tem uma categoria chamada "${parsed.data.name}" do mesmo tipo.` },
      { status: 409 }
    )
  }

  const category = await prisma.category.create({
    data: {
      userId: user.id,
      ...parsed.data,
    },
  })

  return Response.json({ data: category }, { status: 201 })
}
