// Brazilian bank + card brand recognition for decorative account avatars.
// Detection is normalize → contains (whole-word boundaries where possible);
// listed in priority order (more specific brands first).
// `iconKey` references a SimpleIcons component when an official SVG exists,
// otherwise we fall back to a styled monogram.

export type SimpleIconKey =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'diners'
  | 'discover'
  | 'nubank'
  | 'mercadopago'
  | 'picpay'

export type BankInfo = {
  /** Canonical short name */
  name: string
  /** Initials shown when no SVG icon is available */
  monogram: string
  /** Brand color used as background */
  bgColor: string
  /** Foreground (text/icon) color */
  fgColor: string
  /** SimpleIcon if there's an official SVG; undefined → use monogram */
  iconKey?: SimpleIconKey
  /** Keywords (lowercase, no diacritics) that should match this bank */
  keywords: string[]
}

export const BANKS: BankInfo[] = [
  // ─── Card brands (check first so "Visa Infinit" hits Visa, not a bank) ────
  { name: 'Visa', monogram: 'VISA', bgColor: '#1A1F71', fgColor: '#FFFFFF', iconKey: 'visa', keywords: ['visa'] },
  { name: 'Mastercard', monogram: 'MC', bgColor: '#EB001B', fgColor: '#FFFFFF', iconKey: 'mastercard', keywords: ['mastercard', 'master card', 'master'] },
  { name: 'Amex', monogram: 'AMEX', bgColor: '#006FCF', fgColor: '#FFFFFF', iconKey: 'amex', keywords: ['amex', 'american express'] },
  { name: 'Diners', monogram: 'DC', bgColor: '#0079BE', fgColor: '#FFFFFF', iconKey: 'diners', keywords: ['diners'] },
  { name: 'Discover', monogram: 'DISC', bgColor: '#FF6000', fgColor: '#FFFFFF', iconKey: 'discover', keywords: ['discover'] },
  { name: 'Elo', monogram: 'ELO', bgColor: '#000000', fgColor: '#FCEC32', keywords: ['elo'] },
  { name: 'Hipercard', monogram: 'HC', bgColor: '#B11E2C', fgColor: '#FFFFFF', keywords: ['hipercard'] },

  // ─── Digital banks / fintechs ─────────────────────────────────────────────
  { name: 'Nubank', monogram: 'N', bgColor: '#820AD1', fgColor: '#FFFFFF', iconKey: 'nubank', keywords: ['nubank', 'nu bank', 'nu pagamentos'] },
  { name: 'Mercado Pago', monogram: 'MP', bgColor: '#00B1EA', fgColor: '#FFFFFF', iconKey: 'mercadopago', keywords: ['mercado pago', 'mercadopago'] },
  { name: 'PicPay', monogram: 'P', bgColor: '#21C25E', fgColor: '#FFFFFF', iconKey: 'picpay', keywords: ['picpay', 'pic pay'] },
  { name: 'Inter', monogram: 'i', bgColor: '#FF7A00', fgColor: '#FFFFFF', keywords: ['inter', 'banco inter'] },
  { name: 'C6 Bank', monogram: 'C6', bgColor: '#000000', fgColor: '#D2A26A', keywords: ['c6', 'c6 bank'] },
  { name: 'PagBank', monogram: 'PB', bgColor: '#00BF63', fgColor: '#FFFFFF', keywords: ['pagbank', 'pagseguro', 'pag bank', 'pag seguro'] },
  { name: 'Will Bank', monogram: 'W', bgColor: '#00C4B0', fgColor: '#FFFFFF', keywords: ['will bank', 'willbank'] },
  { name: 'Neon', monogram: 'N', bgColor: '#08DDA1', fgColor: '#0E2540', keywords: ['neon'] },
  { name: 'Original', monogram: 'O', bgColor: '#EC7100', fgColor: '#FFFFFF', keywords: ['original', 'banco original'] },
  { name: 'BTG Pactual', monogram: 'BTG', bgColor: '#001E62', fgColor: '#FFFFFF', keywords: ['btg', 'btg pactual'] },
  { name: 'XP', monogram: 'XP', bgColor: '#000000', fgColor: '#FCD700', keywords: ['xp', 'xp investimentos'] },

  // ─── Cooperatives ─────────────────────────────────────────────────────────
  { name: 'Sicoob', monogram: 'SO', bgColor: '#00603A', fgColor: '#FFFFFF', keywords: ['sicoob'] },
  { name: 'Sicredi', monogram: 'SR', bgColor: '#1A5632', fgColor: '#FFFFFF', keywords: ['sicredi'] },

  // ─── Traditional banks ────────────────────────────────────────────────────
  { name: 'Bradesco', monogram: 'B', bgColor: '#CC092F', fgColor: '#FFFFFF', keywords: ['bradesco'] },
  { name: 'Itaú', monogram: 'I', bgColor: '#EC7000', fgColor: '#003399', keywords: ['itau', 'itaú', 'iti'] },
  { name: 'Banco do Brasil', monogram: 'BB', bgColor: '#FAE128', fgColor: '#003D8C', keywords: ['banco do brasil', 'bb'] },
  { name: 'Caixa', monogram: 'C', bgColor: '#0070AF', fgColor: '#F39200', keywords: ['caixa', 'caixa economica', 'cef'] },
  { name: 'Santander', monogram: 'S', bgColor: '#EC0000', fgColor: '#FFFFFF', keywords: ['santander'] },
  { name: 'Safra', monogram: 'Sa', bgColor: '#00A0E3', fgColor: '#FFFFFF', keywords: ['safra'] },
  { name: 'BRB', monogram: 'BRB', bgColor: '#0066B2', fgColor: '#FFFFFF', keywords: ['brb'] },
]

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/**
 * Detects a bank or card brand from a free-form account name like
 * "Bradesco", "Cartão Itaú Black", "Visa Infinit", "Conta Nubank PJ".
 * Returns null if nothing matches.
 */
export function detectBankFromName(accountName: string | null | undefined): BankInfo | null {
  if (!accountName) return null
  const text = ` ${normalize(accountName)} `
  for (const bank of BANKS) {
    for (const kw of bank.keywords) {
      const padded = ` ${kw} `
      if (text.includes(padded)) return bank
      if (text.startsWith(` ${kw}`) || text.endsWith(`${kw} `)) return bank
    }
  }
  return null
}
