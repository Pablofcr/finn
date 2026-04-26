"use client"

import { detectBankFromName, type BankInfo, type SimpleIconKey } from '@/lib/bank-info'
import { Wallet, CreditCard } from 'lucide-react'
import {
  SiVisa,
  SiMastercard,
  SiAmericanexpress,
  SiDinersclub,
  SiDiscover,
  SiNubank,
  SiMercadopago,
  SiPicpay,
} from 'react-icons/si'
import type { IconType } from 'react-icons'

const SIMPLE_ICON_MAP: Record<SimpleIconKey, IconType> = {
  visa: SiVisa,
  mastercard: SiMastercard,
  amex: SiAmericanexpress,
  diners: SiDinersclub,
  discover: SiDiscover,
  nubank: SiNubank,
  mercadopago: SiMercadopago,
  picpay: SiPicpay,
}

type Size = 'sm' | 'md' | 'lg'

const sizeMap: Record<Size, { box: string; mono: string; svg: number; fallback: string }> = {
  sm: { box: 'h-8 w-8', mono: 'text-[10px]', svg: 18, fallback: 'h-4 w-4' },
  md: { box: 'h-10 w-10', mono: 'text-xs', svg: 22, fallback: 'h-5 w-5' },
  lg: { box: 'h-11 w-11', mono: 'text-[13px]', svg: 24, fallback: 'h-5 w-5' },
}

interface BankIconProps {
  accountName: string
  accountType?: string
  fallbackColor?: string
  size?: Size
  className?: string
}

/**
 * Decorative avatar for accounts:
 *   - When the account name matches a brand with an official SimpleIcons SVG
 *     (Visa, Mastercard, Amex, Diners, Discover, Nubank, Mercado Pago, PicPay)
 *     → render the brand SVG on the brand-color background.
 *   - When the brand is recognized but no SVG is available
 *     → render a monogram on the brand-color background.
 *   - When nothing matches
 *     → fallback to a generic Wallet/CreditCard glyph on the user's chosen color.
 */
export function BankIcon({
  accountName,
  accountType,
  fallbackColor = '#6366f1',
  size = 'lg',
  className = '',
}: BankIconProps) {
  const bank: BankInfo | null = detectBankFromName(accountName)
  const s = sizeMap[size]

  if (bank) {
    const SvgIcon = bank.iconKey ? SIMPLE_ICON_MAP[bank.iconKey] : null
    return (
      <div
        className={`${s.box} rounded-xl flex items-center justify-center font-bold tracking-tight shadow-sm ring-1 ring-inset ring-black/10 shrink-0 ${className}`}
        style={{ backgroundColor: bank.bgColor, color: bank.fgColor }}
        aria-label={bank.name}
        title={bank.name}
      >
        {SvgIcon ? (
          <SvgIcon size={s.svg} aria-hidden />
        ) : (
          <span className={`${s.mono} leading-none`}>{bank.monogram}</span>
        )}
      </div>
    )
  }

  // Fallback — user-picked color, generic wallet/credit icon
  const Icon = accountType === 'CREDIT_CARD' ? CreditCard : Wallet
  return (
    <div
      className={`${s.box} rounded-xl flex items-center justify-center text-white shadow-sm ring-1 ring-inset ring-black/5 shrink-0 ${className}`}
      style={{ background: `linear-gradient(135deg, ${fallbackColor}, ${fallbackColor}cc)` }}
    >
      <Icon className={s.fallback} strokeWidth={1.75} />
    </div>
  )
}
