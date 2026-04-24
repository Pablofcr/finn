import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { canUseFeature } from '@/lib/plan-limits'
import { resolveCategoryForText } from '@/lib/resolve-category'

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const allowed = await canUseFeature(user.id, 'autoCategory')
  if (!allowed) {
    return Response.json(
      {
        error: 'Funcionalidade exclusiva do Finn Pro. Faça upgrade para desbloquear.',
        upgrade: true,
      },
      { status: 403 }
    )
  }

  const description = request.nextUrl.searchParams.get('description')
  if (!description || description.trim().length === 0) {
    return Response.json({ data: null })
  }

  const resolved = await resolveCategoryForText(user.id, description)
  if (!resolved) return Response.json({ data: null })

  return Response.json({
    data: { categoryId: resolved.id, categoryName: resolved.name },
  })
}
