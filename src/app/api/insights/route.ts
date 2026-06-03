import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { getTodayInTimezone } from '@/lib/date-tz'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const userTz = user.timezone || 'America/Sao_Paulo'
  const todayInTz = getTodayInTimezone(userTz)
  const now = new Date()

  const [insights, weeklyTxs] = await Promise.all([
    prisma.insight.findMany({
      where: { userId: user.id, isDismissed: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    (async () => {
      // Semana começa no domingo do calendário do user.
      const day = todayInTz.getUTCDay()
      const weekStart = new Date(Date.UTC(
        todayInTz.getUTCFullYear(),
        todayInTz.getUTCMonth(),
        todayInTz.getUTCDate() - day,
      ))
      return prisma.transaction.findMany({
        where: { userId: user.id, date: { gte: weekStart, lte: now } },
        select: { categoryId: true, type: true, date: true },
      })
    })(),
  ])

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

  // Próximo domingo no calendário do user, 09h local.
  const daysToSunday = (7 - todayInTz.getUTCDay()) % 7 || 7
  const nextSundayLocal = new Date(Date.UTC(
    todayInTz.getUTCFullYear(),
    todayInTz.getUTCMonth(),
    todayInTz.getUTCDate() + daysToSunday,
    9, 0, 0,
  ))
  const nextSunday = nextSundayLocal

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
