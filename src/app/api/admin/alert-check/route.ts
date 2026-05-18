import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'

// Endpoint pra rotina remota verificar se o cron de payment-alerts está
// persistindo wamid + metadata nos BotMessage OUTBOUND — pré-requisito do
// fallback de botões HSM (templates QUICK_REPLY criados sem example.payload
// devolvem o texto literal em vez do payload dinâmico).
//
// Protegido pelo mesmo CRON_SECRET do Vercel — sem deploy de env novo.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hoursParam = request.nextUrl.searchParams.get('hours')
  const hours = hoursParam ? parseInt(hoursParam, 10) : 24
  const since = new Date(Date.now() - hours * 60 * 60 * 1000)

  const messages = await prisma.botMessage.findMany({
    where: {
      direction: 'OUTBOUND',
      createdAt: { gte: since },
      parsedData: { path: ['kind'], equals: 'payment_alert' },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      rawContent: true,
      status: true,
      externalMessageId: true,
      parsedData: true,
      createdAt: true,
    },
  })

  const total = messages.length
  const withWamid = messages.filter(m => m.externalMessageId).length
  const withRecurringId = messages.filter(m => {
    const parsed = m.parsedData as { recurringId?: string } | null
    return !!parsed?.recurringId
  }).length

  return Response.json({
    sinceUTC: since.toISOString(),
    hours,
    total,
    withWamid,
    withRecurringId,
    fallbackReady: total > 0 && withWamid === total && withRecurringId === total,
    samples: messages.slice(0, 5).map(m => ({
      id: m.id,
      createdAt: m.createdAt.toISOString(),
      status: m.status,
      hasWamid: !!m.externalMessageId,
      parsedData: m.parsedData,
      rawContent: m.rawContent,
    })),
  })
}
