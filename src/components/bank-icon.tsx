"use client"

import { detectBankFromName, type BankInfo, type SimpleIconKey, type CustomLogoKey } from '@/lib/bank-info'
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
import {
  ItauLogo, BradescoLogo, BancoDoBrasilLogo, CaixaLogo, SantanderLogo,
  InterLogo, C6Logo, BTGLogo, PagBankLogo, WillLogo, NeonLogo, OriginalLogo,
  SafraLogo, XPLogo, SicoobLogo, SicrediLogo, BRBLogo, HipercardLogo, EloLogo,
} from './brand-logos'

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

const CUSTOM_LOGO_MAP: Record<CustomLogoKey, React.ComponentType<{ size?: number }>> = {
  itau: ItauLogo,
  bradesco: BradescoLogo,
  bb: BancoDoBrasilLogo,
  caixa: CaixaLogo,
  santander: SantanderLogo,
  inter: InterLogo,
  c6: C6Logo,
  btg: BTGLogo,
  pagbank: PagBankLogo,
  will: WillLogo,
  neon: NeonLogo,
  original: OriginalLogo,
  safra: SafraLogo,
  xp: XPLogo,
  sicoob: SicoobLogo,
  sicredi: SicrediLogo,
  brb: BRBLogo,
  hipercard: HipercardLogo,
  elo: EloLogo,
}

type Size = 'sm' | 'md' | 'lg'

const sizeMap: Record<Size, { box: string; mono: string; svg: number; fallback: string }> = {
  sm: { box: 'h-8 w-8', mono: 'text-[10px]', svg: 22, fallback: 'h-4 w-4' },
  md: { box: 'h-10 w-10', mono: 'text-xs', svg: 28, fallback: 'h-5 w-5' },
  lg: { box: 'h-11 w-11', mono: 'text-[13px]', svg: 32, fallback: 'h-5 w-5' },
}

interface BankIconProps {
  accountName: string
  accountType?: string
  fallbackColor?: string
  size?: Size
  className?: string
}

/**
 * Decorative avatar for accounts. Three render paths:
 *   1. Custom inline SVG (Itaú, Bradesco, BB, Caixa, Santander, Inter, C6, BTG,
 *      PagBank, Will, Neon, Original, Safra, XP, Sicoob, Sicredi, BRB,
 *      Hipercard, Elo) — full visual fidelity, fills the tile.
 *   2. SimpleIcons SVG (Visa, Mastercard, Amex, Diners, Discover, Nubank,
 *      Mercado Pago, PicPay) on brand-color background.
 *   3. Generic Wallet/CreditCard fallback (account name doesn't match
 *      anything) on the user's chosen color.
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

  // Path 1 — custom inline SVG: it provides its own background, no wrapper tint
  if (bank && bank.customLogo) {
    const CustomLogo = CUSTOM_LOGO_MAP[bank.customLogo]
    return (
      <div
        className={`${s.box} rounded-xl overflow-hidden shadow-sm ring-1 ring-inset ring-black/10 shrink-0 flex items-center justify-center ${className}`}
        aria-label={bank.name}
        title={bank.name}
      >
        <CustomLogo size={s.svg + 8} />
      </div>
    )
  }

  // Path 2 — SimpleIcons SVG on brand background
  if (bank && bank.iconKey) {
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

  // Path 3 — fallback (no brand match)
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
