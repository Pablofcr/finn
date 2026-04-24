import prisma from '@/lib/prisma'
import { classifyIntent } from './router'
import { runQueryAgent } from './agent'
import { getRecentHistory } from './history'

export { classifyIntent, runQueryAgent }
export type { Intent, Classification } from './router'
export type { AgentResult } from './agent'

/**
 * Classifica a mensagem e decide se o agente conversacional deve responder.
 * - QUERY / ACTION: roda agente com histórico recente.
 * - CONFIRMATION: roda agente COM histórico (pra entender "sim" / "não" em
 *   contexto de uma pergunta anterior do próprio bot). Se não houver pergunta
 *   recente no histórico, o agente vai entender a falta de contexto e pedir
 *   clareza.
 * - REGISTER / OTHER / baixa confiança: retorna null → caller usa o parser
 *   tradicional (fluxo atual de registrar transação).
 */
export async function maybeRunAgent(
  userId: string,
  text: string,
  connectionId?: string
): Promise<string | null> {
  const classification = await classifyIntent(text)

  const shouldRunAgent =
    classification.confidence >= 0.6 &&
    (classification.intent === 'QUERY' ||
      classification.intent === 'ACTION' ||
      classification.intent === 'CONFIRMATION')

  if (!shouldRunAgent) return null

  try {
    const history = await getRecentHistory(userId, { maxMessages: 6, maxMinutesAgo: 30 })
    const result = await runQueryAgent(userId, text, history)

    // Persist both sides so follow-up questions have context next time
    if (connectionId) {
      try {
        await prisma.botMessage.create({
          data: {
            userId,
            connectionId,
            direction: 'INBOUND',
            rawContent: text,
            status: 'PARSED',
          },
        })
        await prisma.botMessage.create({
          data: {
            userId,
            connectionId,
            direction: 'OUTBOUND',
            rawContent: result.text,
            status: 'CONFIRMED',
          },
        })
      } catch (logErr) {
        console.error('[agent] failed to log messages:', logErr)
      }
    }

    return result.text
  } catch (err) {
    console.error('[agent] runQueryAgent error:', err)
    return null // fall through to parser
  }
}
