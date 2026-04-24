import { classifyIntent } from './router'
import { runQueryAgent } from './agent'

export { classifyIntent, runQueryAgent }
export type { Intent, Classification } from './router'
export type { AgentResult } from './agent'

/**
 * Classifica a mensagem e, se for pergunta (QUERY) com confiança suficiente,
 * roda o agente e retorna a resposta textual. Caso contrário, retorna null
 * — o caller deve seguir o fluxo tradicional (parser de transação).
 */
export async function maybeRunAgent(
  userId: string,
  text: string
): Promise<string | null> {
  const classification = await classifyIntent(text)

  const shouldRunAgent =
    (classification.intent === 'QUERY' || classification.intent === 'ACTION') &&
    classification.confidence >= 0.6

  if (shouldRunAgent) {
    try {
      const result = await runQueryAgent(userId, text)
      return result.text
    } catch (err) {
      console.error('[agent] runQueryAgent error:', err)
      return null // fall through to parser
    }
  }

  return null
}
