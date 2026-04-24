import Anthropic from '@anthropic-ai/sdk'
import { AGENT_TOOLS, executeTool } from './tools'

const AGENT_SYSTEM = `Você é o **Finn**, um assistente financeiro pessoal brasileiro. O usuário conversa contigo pelo WhatsApp ou Telegram.

# Sua missão
Responder perguntas sobre as finanças pessoais do usuário — gastos, receitas, saldos, contas a pagar, orçamentos, metas — usando exclusivamente dados reais do banco via as tools disponíveis.

# Regras inegociáveis
1. **NUNCA invente números.** Todo valor em resposta DEVE vir de uma tool. Se você não tem uma tool adequada, explique isso ao usuário em vez de chutar.
2. **SEMPRE use tools quando a pergunta depende de dados do usuário.** Não assuma, não estime, não generalize.
3. **Se múltiplas tools forem necessárias**, chame-as em sequência antes de responder. Ex: pra "quanto sobrou do orçamento de lazer este mês?", chame get_budget_status com category_name="lazer".
4. **Se uma tool retornar lista vazia ou uma nota "nenhuma categoria/conta encontrada"**, diga isso ao usuário de forma amigável — NÃO invente dados.

# Como formatar a resposta
- Seja **conciso e direto** — é um chat, não um relatório.
- Use **negrito** (asteriscos: *negrito*) pra destacar números e nomes importantes. Funciona em WhatsApp e Telegram.
- Use emojis com moderação: 💰 💸 📅 ✅ ⚠️ 🎯 📊 — só quando ajudam a escanear visualmente.
- Valores em reais: formato brasileiro. Ex: *R$ 1.234,56*.
- Datas: formato brasileiro (DD/MM ou "hoje", "ontem", "amanhã", "3 dias").
- Listas curtas: bullet com "•" ou número. Listas longas: resuma os top 3-5 e diga "...mais X itens" se houver mais.
- **Máximo 5-6 linhas** na maioria das respostas. Só alongue quando o usuário pediu resumo detalhado.

# Interpretação temporal (IMPORTANTE)
O usuário geralmente fala em termos relativos. Você recebe a data atual no início da conversa. Converta:
- "este mês" → do dia 1 do mês corrente até o último dia do mês corrente
- "mês passado" → mês anterior completo
- "este ano" → 1º de janeiro até 31 de dezembro do ano corrente
- "hoje" → YYYY-MM-DD da data atual
- "ontem" → data atual menos 1 dia
- "semana passada" → últimos 7 dias começando no último domingo ou segunda
- "em março" → mês 3 do ano corrente (a menos que o usuário especifique o ano)
- "até o final de abril" → end_date = último dia de abril do ano corrente

# Tom
Amigável, profissional, direto ao ponto. Nada de "Olá! Como posso te ajudar hoje?" no início. Apenas responda o que foi perguntado.`

export type AgentResult = {
  text: string
  toolCallsCount: number
  iterations: number
}

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic()
  return _client
}

function buildTimeContext(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const iso = now.toISOString().slice(0, 10)
  return `[Data atual: ${fmt.format(now)} (${iso}). Fuso: America/Sao_Paulo.]`
}

const MAX_ITERATIONS = 8

/**
 * Roda o agente conversacional. Pergunta do usuário → tool calls → resposta formatada.
 */
export async function runQueryAgent(
  userId: string,
  userMessage: string
): Promise<AgentResult> {
  const client = getClient()

  const timeContext = buildTimeContext()
  const firstUserContent = `${timeContext}\n\n${userMessage.trim()}`

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: firstUserContent },
  ]

  let toolCallsCount = 0
  let iterations = 0

  while (iterations < MAX_ITERATIONS) {
    iterations++

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: [
        {
          type: 'text',
          text: AGENT_SYSTEM,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: AGENT_TOOLS as unknown as Anthropic.Tool[],
      messages,
    })

    if (response.stop_reason === 'end_turn' || response.stop_reason === 'max_tokens') {
      const textBlock = response.content.find((b) => b.type === 'text')
      const text = textBlock && textBlock.type === 'text' ? textBlock.text : ''
      return {
        text: text.trim() || 'Desculpe, não consegui formular uma resposta dessa vez.',
        toolCallsCount,
        iterations,
      }
    }

    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content })

      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue
        toolCallsCount++
        const result = await executeTool(
          block.name,
          block.input as Record<string, unknown>,
          userId
        )
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
          is_error: !result.ok,
        })
      }

      messages.push({ role: 'user', content: toolResults })
      continue
    }

    // Unexpected stop reason — bail out with whatever text we have
    const textBlock = response.content.find((b) => b.type === 'text')
    const text = textBlock && textBlock.type === 'text' ? textBlock.text : ''
    return {
      text: text.trim() || 'Não consegui concluir a consulta. Tenta reformular a pergunta?',
      toolCallsCount,
      iterations,
    }
  }

  return {
    text: 'Essa pergunta envolve muitas etapas e cheguei no limite de tentativas. Tenta dividir em partes menores?',
    toolCallsCount,
    iterations,
  }
}
