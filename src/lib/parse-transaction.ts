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

type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'

interface ParsedTransactionWithDate extends ParsedTransaction {
  date: string | null
  recurring?: {
    frequency: RecurrenceFrequency
    label: string
    dayOfWeek?: number | null // 0=Sunday, 1=Monday, ..., 6=Saturday
  } | null
}

// Convert written-out numbers to digits
const WORD_NUMBERS: Record<string, number> = {
  'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'três': 3, 'tres': 3,
  'quatro': 4, 'cinco': 5, 'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9,
  'dez': 10, 'onze': 11, 'doze': 12, 'treze': 13, 'quatorze': 14, 'catorze': 14,
  'quinze': 15, 'dezesseis': 16, 'dezessete': 17, 'dezoito': 18, 'dezenove': 19,
  'vinte': 20, 'trinta': 30, 'quarenta': 40, 'cinquenta': 50, 'cinqüenta': 50,
  'sessenta': 60, 'setenta': 70, 'oitenta': 80, 'noventa': 90,
  'cem': 100, 'cento': 100, 'duzentos': 200, 'duzentas': 200,
  'trezentos': 300, 'trezentas': 300, 'quatrocentos': 400, 'quatrocentas': 400,
  'quinhentos': 500, 'quinhentas': 500, 'seiscentos': 600, 'seiscentas': 600,
  'setecentos': 700, 'setecentas': 700, 'oitocentos': 800, 'oitocentas': 800,
  'novecentos': 900, 'novecentas': 900, 'mil': 1000,
}

function parseWrittenNumber(text: string): number | null {
  const words = text.toLowerCase().split(/[\s,]+e?\s*/).filter(Boolean)
  if (words.length === 0) return null

  let total = 0
  let current = 0
  let hasNumber = false

  for (const word of words) {
    const val = WORD_NUMBERS[word]
    if (val === undefined) continue
    hasNumber = true
    if (val === 1000) {
      current = current === 0 ? 1000 : current * 1000
    } else if (val >= 100) {
      current += val
    } else {
      current += val
    }
  }
  total += current

  return hasNumber && total > 0 ? total : null
}

function normalizeStr(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// Fast regex parser — position-independent
function regexParseTransaction(text: string): ParsedTransactionWithDate | null {
  let normalized = text.toLowerCase().trim().replace(/[.!?]+$/, '')

  // 1. Extract DATE from anywhere
  let dateStr: string | null = null

  // Specific dates: "dia 1 de abril", "1º de março", "dia 15/04", "dia 15"
  const monthNames: Record<string, number> = {
    janeiro: 0, fevereiro: 1, marco: 2, abril: 3, maio: 4, junho: 5,
    julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
  }
  const specificDateMatch = normalized.match(/(?:dia|no dia)\s+(\d{1,2})[°ºª]?\s+(?:de\s+)?(\w+)/)
  if (specificDateMatch) {
    const day = parseInt(specificDateMatch[1])
    const monthStr = normalizeStr(specificDateMatch[2])
    const monthNum = monthNames[monthStr]
    if (monthNum !== undefined && day >= 1 && day <= 31) {
      const year = new Date().getFullYear()
      const d = new Date(year, monthNum, day)
      dateStr = d.toISOString().split('T')[0]
      normalized = normalized.replace(specificDateMatch[0], ' ').trim()
    }
  }

  // Relative dates: ontem, hoje, anteontem
  if (!dateStr) {
    const timePatterns: { pattern: RegExp; daysAgo: number }[] = [
      { pattern: /\b(anteontem|antes\s+de\s+ontem)\b/, daysAgo: 2 },
      { pattern: /\b(ontem)\b/, daysAgo: 1 },
      { pattern: /\b(hoje)\b/, daysAgo: 0 },
    ]

    for (const { pattern, daysAgo } of timePatterns) {
      const match = normalized.match(pattern)
      if (match) {
        const d = new Date()
        d.setDate(d.getDate() - daysAgo)
        dateStr = d.toISOString().split('T')[0]
        normalized = normalized.replace(match[0], ' ').trim()
        break
      }
    }
  }

  // Remove ordinal markers to avoid confusing "1º" with amount
  normalized = normalized.replace(/(\d)[°ºª]/g, '$1_ord').trim()

  // 2. Extract AMOUNT from anywhere (try explicit R$ first, then others)
  let amount: number | null = null

  // Priority 1: "R$ 95,85" or "valor de R$ 95,85" (explicit currency marker)
  const explicitMatch = normalized.match(/(?:valor\s+(?:de\s+)?)?r\$\s*(\d[\d.,]*\d|\d+)/)
  // Priority 2: "95,85 reais" or "95 reais"
  const reaisMatch = !explicitMatch ? normalized.match(/(\d[\d.,]*\d|\d+)\s*(?:reais|real)/) : null
  // Priority 3: any number (but not ordinals marked with _ord)
  const anyNumMatch = !explicitMatch && !reaisMatch ? normalized.match(/(?<!\d_ord\s*)(\d[\d.,]*\d|\d+)(?!_ord)/) : null

  const numMatch = explicitMatch || reaisMatch || anyNumMatch
  if (numMatch) {
    const amountStr = numMatch[1].replace(/\./g, '').replace(',', '.')
    amount = parseFloat(amountStr)
    if (amount > 0) {
      normalized = normalized.replace(numMatch[0], ' ').trim()
    } else {
      amount = null
    }
  }

  // Try written numbers: "cem reais", "duzentos", "mil e quinhentos"
  if (!amount) {
    const writtenMatch = normalized.match(
      /(?:r?\$?\s*)?((?:(?:um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|(?:qu)?atorze|quinze|dezess?[ei]s|dezess?ete|dezoito|dezenove|vinte|trinta|quarenta|cinq[uü]enta|sessenta|setenta|oitenta|noventa|cem|cento|duzentos?|duzentas?|trezentos?|trezentas?|quatrocentos?|quatrocentas?|quinhentos?|quinhentas?|seiscentos?|seiscentas?|setecentos?|setecentas?|oitocentos?|oitocentas?|novecentos?|novecentas?|mil)[\s,]*(?:e\s+)?)+)\s*(?:reais|real|conto[s]?)?/
    )
    if (writtenMatch) {
      amount = parseWrittenNumber(writtenMatch[1])
      if (amount) {
        normalized = normalized.replace(writtenMatch[0], ' ').trim()
      }
    }
  }

  if (!amount) return null

  // 3. Determine TYPE from anywhere
  const incomeWords = /(recebi|recebemos|ganhei|ganhamos|entrou|me\s+pag\w*|me\s+deu|me\s+enviou|me\s+transferi\w*|pix\s+de|transfer[eê]ncia\s+de|faturei|vendi|cobrei)/
  const expenseWords = /(gastei|gastamos|paguei|pagamos|comprei|compramos|sa[ií]\w*|d[eé]bito|abasteci|abastecemos|almocei|jantei|almocamos|jantamos|tomei|bebi|comi|assinei|renovei|carreguei|recarreguei|depositei|contratei|aluguei)/

  // "Cadastrar/registrar/lançar/anotar/incluir" + context words determine type
  const actionWords = /(cadastr\w*|registr\w*|lan[cç]\w*|anot\w*|inclu\w*|adicion\w*|cri\w*|coloc\w*|bot\w*|marc\w*)/
  const expenseContext = /(pagamento|gasto|despesa|conta|d[ií]vida|boleto|fatura|parcela|presta[cç][aã]o|diarista|faxina|limpeza|empregad[ao]|mensalidade|anuidade|seguro|imposto|taxa|multa|reparo|conserto|manuten[cç][aã]o|obra)/
  const incomeContext = /(recebimento|receita|entrada|renda|sal[aá]rio|ganho|lucro|rendimento|comiss[aã]o|b[oô]nus|pr[eê]mio|reembolso|devolu[cç][aã]o)/

  let type: 'INCOME' | 'EXPENSE'
  const incomeMatch = normalized.match(incomeWords)
  const expenseMatch = normalized.match(expenseWords)
  const actionMatch = normalized.match(actionWords)

  if (incomeMatch && !expenseMatch) {
    type = 'INCOME'
    normalized = normalized.replace(incomeMatch[0], ' ').trim()
  } else if (expenseMatch && !incomeMatch) {
    type = 'EXPENSE'
    normalized = normalized.replace(expenseMatch[0], ' ').trim()
  } else if (actionMatch) {
    // Determine type by context words
    const hasExpenseCtx = expenseContext.test(normalized)
    const hasIncomeCtx = incomeContext.test(normalized)
    if (hasExpenseCtx && !hasIncomeCtx) {
      type = 'EXPENSE'
    } else if (hasIncomeCtx && !hasExpenseCtx) {
      type = 'INCOME'
    } else {
      // Default: if has action word but no clear context, assume expense (most common)
      type = 'EXPENSE'
    }
    normalized = normalized.replace(actionMatch[0], ' ').trim()
  } else {
    return null
  }

  // 4. Detect RECURRENCE from anywhere
  let recurring: ParsedTransactionWithDate['recurring'] = null
  const recurrencePatterns: { pattern: RegExp; frequency: RecurrenceFrequency; label: string; dayOfWeek?: number }[] = [
    { pattern: /\b(todo\s+dia|di[aá]ri[oa]|diariamente|todos\s+os\s+dias)\b/, frequency: 'DAILY', label: 'Diário' },
    // Days of week = weekly (dayOfWeek: 0=Sun, 1=Mon, ..., 6=Sat)
    { pattern: /\b(todo\s+domingo|todos\s+os\s+domingos)\b/, frequency: 'WEEKLY', label: 'Semanal (Domingo)', dayOfWeek: 0 },
    { pattern: /\b(toda\s+segunda(?:[- ]feira)?|todas\s+as\s+segundas(?:[- ]feiras?)?)\b/, frequency: 'WEEKLY', label: 'Semanal (Segunda)', dayOfWeek: 1 },
    { pattern: /\b(toda\s+ter[cç]a(?:[- ]feira)?|todas\s+as\s+ter[cç]as(?:[- ]feiras?)?)\b/, frequency: 'WEEKLY', label: 'Semanal (Terça)', dayOfWeek: 2 },
    { pattern: /\b(toda\s+quarta(?:[- ]feira)?|todas\s+as\s+quartas(?:[- ]feiras?)?)\b/, frequency: 'WEEKLY', label: 'Semanal (Quarta)', dayOfWeek: 3 },
    { pattern: /\b(toda\s+quinta(?:[- ]feira)?|todas\s+as\s+quintas(?:[- ]feiras?)?)\b/, frequency: 'WEEKLY', label: 'Semanal (Quinta)', dayOfWeek: 4 },
    { pattern: /\b(toda\s+sexta(?:[- ]feira)?|todas\s+as\s+sextas(?:[- ]feiras?)?)\b/, frequency: 'WEEKLY', label: 'Semanal (Sexta)', dayOfWeek: 5 },
    { pattern: /\b(todo\s+s[aá]bado|todos\s+os\s+s[aá]bados)\b/, frequency: 'WEEKLY', label: 'Semanal (Sábado)', dayOfWeek: 6 },
    { pattern: /\b(toda\s+semana|semanal|semanalmente|por\s+semana)\b/, frequency: 'WEEKLY', label: 'Semanal' },
    { pattern: /\b(quinzenal|quinzenalmente|a\s+cada\s+15\s+dias|a\s+cada\s+quinze\s+dias)\b/, frequency: 'BIWEEKLY', label: 'Quinzenal' },
    { pattern: /\b(todo\s+m[eê]s|mensal|mensalmente|todos\s+os\s+meses|por\s+m[eê]s|assinatura)\b/, frequency: 'MONTHLY', label: 'Mensal' },
    { pattern: /\b(trimestral|trimestralmente|a\s+cada\s+3\s+meses|a\s+cada\s+tr[eê]s\s+meses)\b/, frequency: 'QUARTERLY', label: 'Trimestral' },
    { pattern: /\b(todo\s+ano|anual|anualmente|todos\s+os\s+anos|por\s+ano)\b/, frequency: 'YEARLY', label: 'Anual' },
  ]

  for (const { pattern, frequency, label, dayOfWeek } of recurrencePatterns) {
    const match = normalized.match(pattern)
    if (match) {
      recurring = { frequency, label, dayOfWeek: dayOfWeek ?? null }
      normalized = normalized.replace(match[0], ' ').trim()
      break
    }
  }

  // 5. Extract DESCRIPTION from whatever remains
  let description = normalized
    .replace(/\b(reais|real|conto[s]?|r\$)\b/g, '')  // remove currency words
    .replace(/\b(pagamento|recorrente|recorr[eê]ncia|valor|cadastr\w*|registr\w*|lan[cç]\w*|anot\w*|inclu\w*|adicion\w*|cri\w*|coloc\w*|bot\w*|marc\w*)\b/g, '')  // remove action/noise words
    .replace(/\d+_ord/g, '')  // remove ordinal markers
    .replace(/\b(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/g, '')  // remove month names
    .replace(/\b(dia|mes|ano)\b/g, '')  // remove date words
    .replace(/\b(de|do|da|dos|das|no|na|nos|nas|em|pra|para|com|pelo|pela|um|uma|uns|umas|os|as|que)\b/g, ' ')
    .replace(/\s[oe]\s/g, ' ')  // remove standalone "o" and "e" only between spaces (protects names like João)
    .replace(/[,;:]+/g, ' ')  // remove punctuation
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s+|\s+$/g, '')  // trim
    .trim()

  if (!description) {
    description = type === 'INCOME' ? 'Receita' : 'Despesa'
  }

  // Capitalize first letter
  description = description.charAt(0).toUpperCase() + description.slice(1)

  return { type, amount, description, date: dateStr, recurring }
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

export async function parseTransactionMessage(text: string): Promise<ParsedTransactionWithDate | null> {
  // Try fast regex parser first (handles 90% of cases instantly)
  const regexResult = regexParseTransaction(text)
  if (regexResult) return regexResult

  // Fall back to Claude AI for complex/ambiguous messages
  try {
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

    const result = extractJson<ParsedTransaction>(content.text)
    if (!result) return null
    return { ...result, date: null }
  } catch (err) {
    console.error('Claude parse fallback error:', err)
    return null
  }
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
