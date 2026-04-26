// Curated brand lists per account type, ordered by Brazilian market popularity.
// Each entry is a canonical brand name from src/lib/bank-info.ts BANKS table —
// the detector handles all matching, color, icon resolution.

export type AccountTypeKey =
  | 'CHECKING'
  | 'SAVINGS'
  | 'CREDIT_CARD'
  | 'CASH'
  | 'DIGITAL_WALLET'
  | 'INVESTMENT'

export const ACCOUNT_PRESETS: Record<AccountTypeKey, string[]> = {
  CHECKING: [
    'Nubank',
    'Itaú',
    'Bradesco',
    'Banco do Brasil',
    'Caixa',
    'Santander',
    'Inter',
    'C6 Bank',
    'BTG Pactual',
    'Original',
  ],
  SAVINGS: [
    'Caixa',
    'Banco do Brasil',
    'Bradesco',
    'Itaú',
    'Santander',
    'Nubank',
    'Inter',
    'Sicredi',
  ],
  CREDIT_CARD: [
    'Nubank',
    'Itaú',
    'Bradesco',
    'Santander',
    'Caixa',
    'Banco do Brasil',
    'Inter',
    'C6 Bank',
    'XP',
    'PicPay',
    'Will Bank',
    'Neon',
  ],
  DIGITAL_WALLET: [
    'Mercado Pago',
    'PicPay',
    'PagBank',
    'Inter',
    'Will Bank',
    'Neon',
  ],
  INVESTMENT: [
    'XP',
    'BTG Pactual',
    'Nubank',
    'Inter',
    'Itaú',
    'Safra',
  ],
  CASH: [], // no picker — single "Carteira" option
}

/**
 * Sane defaults applied when a brand tile is clicked, in addition to
 * name/color/icon which come from BankInfo.
 */
export function defaultsForAccountType(type: AccountTypeKey): {
  closingDay?: number
  dueDay?: number
} {
  if (type === 'CREDIT_CARD') {
    return { closingDay: 1, dueDay: 10 }
  }
  return {}
}
