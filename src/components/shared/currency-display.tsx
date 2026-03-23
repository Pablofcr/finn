import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'

interface CurrencyDisplayProps {
  value: number
  className?: string
  showSign?: boolean
  colored?: boolean
}

export function CurrencyDisplay({ value, className, showSign, colored }: CurrencyDisplayProps) {
  const formatted = formatCurrency(Math.abs(value))
  const isPositive = value >= 0

  return (
    <span
      className={cn(
        className,
        colored && (isPositive ? 'text-green-600' : 'text-red-600')
      )}
    >
      {showSign && (isPositive ? '+' : '-')}
      {showSign ? formatted : formatCurrency(value)}
    </span>
  )
}
