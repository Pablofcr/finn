import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { accountSchema } from '@/lib/validations/account'
import { checkLimit } from '@/lib/plan-limits'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
  })

  return Response.json({ data: accounts })
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const limitCheck = await checkLimit(user.id, 'accounts')
  if (!limitCheck.allowed) {
    return Response.json({ error: `Limite do plano gratuito atingido (${limitCheck.current}/${limitCheck.limit}). Faça upgrade para o Finn Pro.`, upgrade: true }, { status: 403 })
  }

  const body = await request.json()
  const parsed = accountSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const account = await prisma.account.create({
    data: {
      userId: user.id,
      ...parsed.data,
    },
  })

  return Response.json({ data: account }, { status: 201 })
}
