import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const [insights, weeklyTxs] = await Promise.all([
    prisma.insight.findMany({
      where: { userId: user.id, isDismissed: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    (async () => {
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)
      return prisma.transaction.findMany({
        where: { userId: user.id, date: { gte: weekStart, lte: now } },
        select: { categoryId: true, type: true, date: true },
      })
    })(),
  ])

  // Empty state evolutivo precisa do mesmo contexto que o dashboard
  const now = new Date()
  const weeklyTxCount = weeklyTxs.length
  const weeklyDays = new Set(weeklyTxs.map((t) => t.date.toISOString().slice(0, 10))).size

  const weeklyCategoryCounts: Record<string, number> = {}
  for (const t of weeklyTxs) {
    if (t.categoryId && t.type === 'EXPENSE') {
      weeklyCategoryCounts[t.categoryId] = (weeklyCategoryCounts[t.categoryId] || 0) + 1
    }
  }
  const topCatId = Object.entries(weeklyCategoryCounts).sort(([, a], [, b]) => b - a)[0]?.[0]
  const topCat = topCatId
    ? await prisma.category.findUnique({
        where: { id: topCatId },
        select: { name: true },
      })
    : null

  const nextSunday = new Date(now)
  const daysToSunday = (7 - nextSunday.getDay()) % 7 || 7
  nextSunday.setDate(nextSunday.getDate() + daysToSunday)
  nextSunday.setHours(9, 0, 0, 0)

  return Response.json({
    data: insights,
    context: {
      weeklyTxCount,
      weeklyDays,
      topCategoryName: topCat?.name || null,
      nextInsightDate: nextSunday.toISOString(),
    },
  })
}
