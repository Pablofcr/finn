import Anthropic from '@anthropic-ai/sdk'

interface ParsedTransaction {
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
}

export async function parseTransactionMessage(text: string): Promise<ParsedTransaction | null> {
  const client = new Anthropic()

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: text,
      },
    ],
    system: `Você é um parser de transações financeiras. O usuário vai enviar uma mensagem em português descrevendo uma transação financeira.

Extraia as informações e responda APENAS com um JSON válido, sem markdown, sem explicação:
{"type": "INCOME" ou "EXPENSE", "amount": número, "description": "descrição curta"}

Regras:
- "recebi", "ganhei", "entrou", "me pagou", "pix de", "transferência de" = INCOME
- "gastei", "paguei", "comprei", "saiu", "débito" = EXPENSE
- Se não mencionar valor ou não parecer uma transação financeira, responda: null
- O amount deve ser um número positivo (sem R$, sem vírgula)
- A description deve ser curta e clara (ex: "Freelance do João", "Mercado")

Exemplos:
"recebi 500 do João" → {"type":"INCOME","amount":500,"description":"Pagamento do João"}
"gastei 50 no mercado" → {"type":"EXPENSE","amount":50,"description":"Mercado"}
"pix de 1200 da empresa" → {"type":"INCOME","amount":1200,"description":"Pix da empresa"}
"paguei 89,90 na farmácia" → {"type":"EXPENSE","amount":89.90,"description":"Farmácia"}
"bom dia" → null`,
  })

  const content = response.content[0]
  if (content.type !== 'text') return null

  const cleaned = content.text.trim()
  if (cleaned === 'null') return null

  try {
    const parsed = JSON.parse(cleaned)
    if (!parsed.type || !parsed.amount || !parsed.description) return null
    if (parsed.amount <= 0) return null
    return parsed
  } catch {
    return null
  }
}
