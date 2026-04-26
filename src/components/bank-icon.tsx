"use client"

import { detectBankFromName, type BankInfo } from '@/lib/bank-info'
import { Wallet, CreditCard } from 'lucide-react'

type Size = 'sm' | 'md' | 'lg'

const sizeMap: Record<Size, { box: string; text: string; icon: string; iconSize: string }> = {
  sm: { box: 'h-8 w-8', text: 'text-[10px]', icon: 'h-4 w-4', iconSize: 'text-xs' },
  md: { box: 'h-10 w-10', text: 'text-xs', icon: 'h-5 w-5', iconSize: 'text-sm' },
  lg: { box: 'h-11 w-11', text: 'text-[13px]', icon: 'h-5 w-5', iconSize: 'text-base' },
}

interface BankIconProps {
  /** Free-form account name; we'll try to detect the bank/brand from it */
  accountName: string
  /** Account type from Prisma — used only for the fallback (Wallet/CreditCard) */
  accountType?: string
  /** Fallback color used when no brand match (the user's chosen color) */
  fallbackColor?: string
  size?: Size
  className?: string
}

/**
 * Decorative avatar for accounts. Shows the detected bank/card monogram
 * on its brand color, or falls back to a generic Wallet/CreditCard icon
 * tinted with the user's chosen color.
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
    return (
      <div
        className={`${s.box} rounded-xl flex items-center justify-center font-bold tracking-tight shadow-sm ring-1 ring-inset ring-black/10 ${className}`}
        style={{ backgroundColor: bank.bgColor, color: bank.fgColor }}
        aria-label={bank.name}
      >
        <span className={`${s.iconSize} leading-none`}>{bank.monogram}</span>
      </div>
    )
  }

  // Fallback — user-picked color, generic wallet/credit icon
  const Icon = accountType === 'CREDIT_CARD' ? CreditCard : Wallet
  return (
    <div
      className={`${s.box} rounded-xl flex items-center justify-center text-white shadow-sm ring-1 ring-inset ring-black/5 ${className}`}
      style={{ background: `linear-gradient(135deg, ${fallbackColor}, ${fallbackColor}cc)` }}
    >
      <Icon className={s.icon} strokeWidth={1.75} />
    </div>
  )
}
