import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { accountSchema } from '@/lib/validations/account'
import { checkLimit, planLimitMessage } from '@/lib/plan-limits'

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
    return Response.json({ error: planLimitMessage(limitCheck.plan, `${limitCheck.current}/${limitCheck.limit} contas`), upgrade: true }, { status: 403 })
  }

  const body = await request.json()
  const parsed = accountSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const existingCount = await prisma.account.count({ where: { userId: user.id } })
  const shouldBeDefault = parsed.data.isDefault ?? existingCount === 0

  const account = await prisma.$transaction(async (tx) => {
    if (shouldBeDefault) {
      await tx.account.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      })
    }
    return tx.account.create({
      data: {
        userId: user.id,
        ...parsed.data,
        isDefault: shouldBeDefault,
      },
    })
  })

  return Response.json({ data: account }, { status: 201 })
}
