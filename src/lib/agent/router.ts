import Anthropic from '@anthropic-ai/sdk'

export type Intent = 'REGISTER' | 'QUERY' | 'ACTION' | 'CONFIRMATION' | 'OTHER'

export type Classification = {
  intent: Intent
  confidence: number // 0-1
}

const CLASSIFIER_SYSTEM = `Você é um classificador de intenção para um assistente financeiro brasileiro.

Classifique a mensagem do usuário em UMA das intenções:

REGISTER — usuário quer registrar uma transação financeira NOVA e avulsa (gasto, receita, compra que acabou de fazer). Tem verbo de transação + menção de valor.
  Exemplos: "gastei 50 no mercado", "recebi 2000 de salário", "comprei um celular de 5 mil reais parcelado em 10 vezes", "pix de 200 pro joão", "abasteci 150", "500 no restaurante"

ACTION — usuário quer executar uma AÇÃO sobre algo que JÁ existe no sistema — tipicamente dar baixa em conta recorrente ("X foi pago", "paguei o condomínio", "quitei a internet", "registra o pagamento"). O usuário NÃO menciona um valor novo — está se referindo a uma conta/recorrência que já estava cadastrada.
  Exemplos: "o condomínio foi pago", "os dois condomínios foram pagos, registre o pagamento", "quitei a fatura", "paga a conta de luz", "já paguei o aluguel", "dá baixa no netflix"

QUERY — usuário faz uma pergunta. Pode ser sobre as finanças dele (dados) OU sobre como o Finn funciona (features, conceitos, como usar). Inclui pedidos de explicação, esclarecimento e follow-ups da conversa anterior.
  Exemplos sobre DADOS: "quanto gastei este mês?", "quais contas tenho pra pagar?", "meu saldo", "quais foram meus maiores gastos?", "como tá meu orçamento de lazer?", "resumo do mês", "compara março com abril"
  Exemplos sobre o PRODUTO: "como funciona o orçamento?", "o que é uma meta?", "como faço pra definir prazo?", "como funciona essa definição de prazos?", "quem é você?", "o que você sabe fazer?", "me explica isso", "como uso essa categoria?", "qual a diferença entre orçamento e meta?"

CONFIRMATION — usuário está confirmando ou negando algo que o bot perguntou/sugeriu.
  Exemplos: "sim", "confirma", "não", "nope", "ok", "certo", "isso mesmo", "tá errado"

OTHER — saudação, agradecimento, pergunta fora do escopo financeiro, comando não relacionado.
  Exemplos: "oi", "bom dia", "obrigado", "quem é você?", "como você funciona?"

Responda APENAS com JSON válido, sem markdown, sem explicação:
{"intent": "REGISTER|ACTION|QUERY|CONFIRMATION|OTHER", "confidence": 0.0-1.0}

Regras importantes:
- REGISTER = transação NOVA com valor mencionado. ACTION = mexer em algo existente (normalmente sem mencionar valor, porque o valor já está no sistema).
- "Paguei 50 de farmácia" = REGISTER (transação nova avulsa).
- "Paguei o condomínio" / "o condomínio foi pago" = ACTION (conta recorrente existente, sem valor novo).
- Quando em dúvida entre REGISTER e ACTION, prefira REGISTER (o parser consegue lidar com falsos positivos melhor que ações não executadas).`

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic()
  return _client
}

/**
 * Classifica a intenção da mensagem do usuário.
 * Em caso de erro ou baixa confiança, retorna REGISTER como fallback seguro.
 */
export async function classifyIntent(message: string): Promise<Classification> {
  const text = message.trim()
  if (!text) return { intent: 'OTHER', confidence: 1 }

  // Cheap local shortcut for obvious confirmation words — saves an API call
  const lowerShort = text.toLowerCase()
  if (
    /^(sim|s|não|nao|n|ok|okay|certo|confirma|confirmado|cancela|cancelar)$/.test(lowerShort)
  ) {
    return { intent: 'CONFIRMATION', confidence: 0.99 }
  }

  try {
    const response = await getClient().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 100,
      system: [
        {
          type: 'text',
          text: CLASSIFIER_SYSTEM,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: text }],
    })

    const block = response.content.find((b) => b.type === 'text')
    if (!block || block.type !== 'text') return fallback()

    const parsed = parseJson(block.text)
    if (!parsed) return fallback()

    const intent = normalizeIntent(parsed.intent)
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5

    if (!intent) return fallback()
    return { intent, confidence: Math.min(1, Math.max(0, confidence)) }
  } catch {
    return fallback()
  }
}

function parseJson(text: string): { intent?: unknown; confidence?: unknown } | null {
  // Extract JSON object even if wrapped in markdown or prose
  const match = text.match(/\{[\s\S]*?\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

function normalizeIntent(v: unknown): Intent | null {
  if (typeof v !== 'string') return null
  const upper = v.toUpperCase().trim()
  if (
    upper === 'REGISTER' ||
    upper === 'QUERY' ||
    upper === 'ACTION' ||
    upper === 'CONFIRMATION' ||
    upper === 'OTHER'
  ) {
    return upper
  }
  return null
}

function fallback(): Classification {
  // Default to REGISTER preserves existing bot behavior (parser handles it)
  return { intent: 'REGISTER', confidence: 0 }
}
