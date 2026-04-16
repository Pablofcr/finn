import Anthropic from '@anthropic-ai/sdk'

interface ParsedTransaction {
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
}

interface ParsedReceipt {
  type: 'EXPENSE'
  amount: number
  description: string
  date: string | null
  items: string[]
}

function extractJson<T extends { amount: number; description: string }>(raw: string): T | null {
  const text = raw.trim()
  if (text === 'null' || text === 'nulo') return null

  // Try direct parse first
  try {
    const parsed = JSON.parse(text)
    if (parsed && parsed.amount > 0 && parsed.description) return parsed
  } catch { /* continue */ }

  // Try extracting JSON from markdown code blocks or surrounding text
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed && parsed.amount > 0 && parsed.description) return parsed
    } catch { /* continue */ }
  }

  return null
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

  return extractJson<ParsedTransaction>(content.text)
}

export async function parseReceiptImage(imageBase64: string, mimeType: string): Promise<ParsedReceipt | null> {
  const client = new Anthropic()

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: 'Analise este cupom fiscal ou nota e extraia os dados.',
          },
        ],
      },
    ],
    system: `Você é um leitor de cupons fiscais e notas. Analise a imagem e extraia as informações da compra.

Responda APENAS com um JSON válido, sem markdown, sem explicação:
{"type":"EXPENSE","amount":número,"description":"nome do estabelecimento","date":"YYYY-MM-DD ou null","items":["item1","item2"]}

Regras:
- type é sempre "EXPENSE" (cupons são despesas)
- amount: valor TOTAL da compra (procure "TOTAL", "VALOR TOTAL", "TOTAL A PAGAR"). Número positivo, sem R$
- description: nome do estabelecimento/loja (geralmente no topo do cupom). Curto e limpo
- date: data da compra no formato YYYY-MM-DD. Se não encontrar, null
- items: lista dos 5 principais itens comprados (resumidos). Se não legível, lista vazia []

Se a imagem não for um cupom fiscal ou nota, responda: null`,
  })

  const content = response.content[0]
  if (content.type !== 'text') return null

  const parsed = extractJson<ParsedReceipt>(content.text)
  if (!parsed) return null

  return {
    type: 'EXPENSE',
    amount: parsed.amount,
    description: parsed.description,
    date: parsed.date || null,
    items: parsed.items || [],
  }
}
