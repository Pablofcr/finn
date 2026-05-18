import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'

// Endpoint pra rotina remota verificar se o cron de payment-alerts está
// persistindo wamid + metadata nos BotMessage OUTBOUND — pré-requisito do
// fallback de botões HSM (templates QUICK_REPLY criados sem example.payload
// devolvem o texto literal em vez do payload dinâmico).
//
// Vive sob /api/cron/* porque é a única árvore whitelisted pelo middleware
// que não exige sessão Supabase (ver src/lib/supabase/middleware.ts).
//
// Dois modos:
//   - Sem Authorization: retorna SÓ AGREGADOS (count, withWamid, withRecurringId,
//     fallbackReady). Público — não vaza nada sensível. Usado pela routine remota.
//   - Com Bearer CRON_SECRET: retorna também samples (rawContent, parsedData)
//     pra debug manual.
export async function GET(request: NextRequest) {
  const hoursParam = request.nextUrl.searchParams.get('hours')
  const hours = hoursParam ? Math.min(parseInt(hoursParam, 10) || 24, 168) : 24
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
  const confirmed = messages.filter(m => m.status === 'CONFIRMED').length

  const aggregate = {
    sinceUTC: since.toISOString(),
    hours,
    total,
    confirmed,
    withWamid,
    withRecurringId,
    fallbackReady: total > 0 && withWamid === total && withRecurringId === total,
  }

  const authHeader = request.headers.get('Authorization')
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({
      ...aggregate,
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

  return Response.json(aggregate)
}
