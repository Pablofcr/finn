import prisma from '@/lib/prisma'

export type HistoryMessage = {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Fetch the last few bot messages for the user, newest-last, to feed as
 * conversation context for the agent. Skips the current in-flight inbound
 * message (it's injected by the caller as the final user turn).
 */
export async function getRecentHistory(
  userId: string,
  opts: { maxMessages?: number; maxMinutesAgo?: number; excludeMessageId?: string } = {}
): Promise<HistoryMessage[]> {
  const maxMessages = opts.maxMessages ?? 6
  const maxMinutesAgo = opts.maxMinutesAgo ?? 30

  const since = new Date(Date.now() - maxMinutesAgo * 60 * 1000)

  const rows = await prisma.botMessage.findMany({
    where: {
      userId,
      createdAt: { gte: since },
      ...(opts.excludeMessageId ? { id: { not: opts.excludeMessageId } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: maxMessages,
    select: { direction: true, rawContent: true, createdAt: true },
  })

  // Reverse to chronological order
  const ordered = rows.reverse()

  return ordered
    .filter((r) => r.rawContent && r.rawContent.trim().length > 0)
    .map((r) => ({
      role: r.direction === 'INBOUND' ? ('user' as const) : ('assistant' as const),
      content: r.rawContent,
    }))
}
