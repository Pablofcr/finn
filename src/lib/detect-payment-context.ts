import type { PaymentMethod } from '@/generated/prisma/enums'

interface AccountLite {
  id: string
  name: string
  type: string
}

/**
 * Detect payment method and target account/card mentioned in free-form text.
 *
 * Keywords (case/accents insensitive):
 *   PIX       → 'pix'
 *   DEBIT     → 'debito', 'no debito', 'pelo debito'
 *   CREDIT    → 'credito', 'no credito', 'pelo credito', 'cartao'
 *   CASH      → 'dinheiro', 'em dinheiro', 'cash'
 *   BOLETO    → 'boleto'
 *   TRANSFER  → 'transferencia', 'ted', 'doc'
 *
 * Account detection: scans for any account name (normalized) as a whole-word
 * substring in the text. Matches the longest name to avoid "itau" eating
 * "itau black" when both exist.
 */
export function detectPaymentContext(text: string, accounts: AccountLite[]) {
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const normText = ` ${norm(text)} `

  let paymentMethod: PaymentMethod | null = null

  // Priority: CREDIT > DEBIT > PIX > CASH > BOLETO > TRANSFER
  // (credit is most specific because "no cartao" implies credit, not debit)
  if (/\b(credito|no credito|pelo credito|cartao(?! de debito))\b/.test(normText)) {
    paymentMethod = 'CREDIT'
  } else if (/\b(debito|no debito|pelo debito|cartao de debito)\b/.test(normText)) {
    paymentMethod = 'DEBIT'
  } else if (/\bpix\b/.test(normText)) {
    paymentMethod = 'PIX'
  } else if (/\b(dinheiro|em dinheiro|cash)\b/.test(normText)) {
    paymentMethod = 'CASH'
  } else if (/\bboleto\b/.test(normText)) {
    paymentMethod = 'BOLETO'
  } else if (/\b(transferencia|ted|doc)\b/.test(normText)) {
    paymentMethod = 'TRANSFER'
  }

  // Sort accounts by name length descending so "Nubank Ultravioleta" matches
  // before "Nubank".
  const sorted = [...accounts].sort((a, b) => b.name.length - a.name.length)

  let matchedAccount: AccountLite | null = null
  for (const account of sorted) {
    const normName = norm(account.name)
    if (normName.length < 3) continue
    const pattern = new RegExp(`\\b${normName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
    if (pattern.test(normText)) {
      matchedAccount = account
      break
    }
  }

  return { paymentMethod, account: matchedAccount }
}

/**
 * Detects an installment count in free-form text. Matches patterns like:
 *   "em 12x", "12 x", "12 vezes", "parcelado em 10x"
 * Returns an integer between 2 and 48 when found, otherwise null.
 */
export function detectInstallments(text: string): number | null {
  const norm = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const patterns = [
    /\b(\d{1,2})\s*x\b/,
    /\b(\d{1,2})\s*vezes\b/,
    /parcelad[ao]s?\s+em\s+(\d{1,2})/,
  ]
  for (const re of patterns) {
    const match = norm.match(re)
    if (match) {
      const n = parseInt(match[1], 10)
      if (n >= 2 && n <= 48) return n
    }
  }
  return null
}

/**
 * Resolve the final account to use for a transaction, given the user-specified
 * account (from text), the intended payment method, and the user's accounts.
 *
 * Rules:
 * - CREDIT requires a CREDIT_CARD account. Fall back to the first credit card
 *   if the user didn't name one.
 * - Any other method requires a non-credit-card account. Fall back to the
 *   default account, else the oldest account.
 */
export function resolveAccount(
  mentionedAccount: AccountLite | null,
  method: PaymentMethod,
  accounts: AccountLite[] & { isDefault?: boolean; createdAt?: Date }[]
): AccountLite | null {
  if (method === 'CREDIT') {
    if (mentionedAccount?.type === 'CREDIT_CARD') return mentionedAccount
    return accounts.find(a => a.type === 'CREDIT_CARD') || null
  }
  // Non-credit methods
  if (mentionedAccount && mentionedAccount.type !== 'CREDIT_CARD') return mentionedAccount
  const withDefault = accounts.find((a: any) => a.isDefault && a.type !== 'CREDIT_CARD')
  if (withDefault) return withDefault
  return accounts.find(a => a.type !== 'CREDIT_CARD') || null
}
