"use client"

import { detectBankFromName, type BankInfo, type SimpleIconKey, type CustomLogoKey } from '@/lib/bank-info'
import { Wallet, CreditCard } from 'lucide-react'
import {
  SiVisa,
  SiMastercard,
  SiAmericanexpress,
  SiDinersclub,
  SiDiscover,
} from 'react-icons/si'
import type { IconType } from 'react-icons'
import { WillLogo, HipercardLogo, EloLogo } from './brand-logos'

// Card brand SVGs from SimpleIcons (Brazilian banks now use real SVG assets).
const SIMPLE_ICON_MAP: Record<SimpleIconKey, IconType> = {
  visa: SiVisa,
  mastercard: SiMastercard,
  amex: SiAmericanexpress,
  diners: SiDinersclub,
  discover: SiDiscover,
}

/**
 * Slugs that have a real SVG asset under /public/banks/{slug}.svg
 * (downloaded from Tgentil/Bancos-em-SVG, which aggregates official
 * brand SVGs).
 */
const PUBLIC_LOGOS = new Set<CustomLogoKey>([
  'itau', 'bradesco', 'bb', 'caixa', 'santander',
  'inter', 'c6', 'btg', 'original', 'brb',
  'safra', 'sicoob', 'sicredi', 'pagbank', 'neon',
  'xp', 'mercadopago', 'picpay', 'nubank',
])

/** Inline SVG components for brands without a real asset (3 left). */
const INLINE_LOGO_MAP: Partial<Record<CustomLogoKey, React.ComponentType<{ size?: number }>>> = {
  will: WillLogo,
  hipercard: HipercardLogo,
  elo: EloLogo,
}

type Size = 'sm' | 'md' | 'lg'

const sizeMap: Record<Size, { box: string; svg: number; padding: string; fallback: string }> = {
  sm: { box: 'h-8 w-8', svg: 22, padding: 'p-1',   fallback: 'h-4 w-4' },
  md: { box: 'h-10 w-10', svg: 28, padding: 'p-1.5', fallback: 'h-5 w-5' },
  lg: { box: 'h-11 w-11', svg: 32, padding: 'p-1.5', fallback: 'h-5 w-5' },
}

interface BankIconProps {
  accountName: string
  accountType?: string
  fallbackColor?: string
  size?: Size
  className?: string
}

export function BankIcon({
  accountName,
  accountType,
  fallbackColor = '#6366f1',
  size = 'lg',
  className = '',
}: BankIconProps) {
  const bank: BankInfo | null = detectBankFromName(accountName)
  const s = sizeMap[size]

  // Path 1 — real SVG asset under /public/banks
  if (bank?.customLogo && PUBLIC_LOGOS.has(bank.customLogo)) {
    return (
      <div
        className={`${s.box} rounded-xl overflow-hidden bg-white shadow-sm ring-1 ring-inset ring-black/10 shrink-0 flex items-center justify-center ${s.padding} ${className}`}
        aria-label={bank.name}
        title={bank.name}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/banks/${bank.customLogo}.svg`}
          alt={bank.name}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    )
  }

  // Path 2 — inline SVG (Will, Hipercard, Elo — no real asset available yet)
  if (bank?.customLogo && INLINE_LOGO_MAP[bank.customLogo]) {
    const InlineLogo = INLINE_LOGO_MAP[bank.customLogo]!
    return (
      <div
        className={`${s.box} rounded-xl overflow-hidden shadow-sm ring-1 ring-inset ring-black/10 shrink-0 flex items-center justify-center ${className}`}
        aria-label={bank.name}
        title={bank.name}
      >
        <InlineLogo size={s.svg + 8} />
      </div>
    )
  }

  // Path 3 — SimpleIcons SVG on brand background (card brands)
  if (bank?.iconKey) {
    const SvgIcon = SIMPLE_ICON_MAP[bank.iconKey]
    return (
      <div
        className={`${s.box} rounded-xl flex items-center justify-center shadow-sm ring-1 ring-inset ring-black/10 shrink-0 ${className}`}
        style={{ backgroundColor: bank.bgColor, color: bank.fgColor }}
        aria-label={bank.name}
        title={bank.name}
      >
        <SvgIcon size={s.svg} aria-hidden />
      </div>
    )
  }

  // Path 4 — generic fallback when no brand match
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
