"use client"

import { Plus } from 'lucide-react'
import { BankIcon } from './bank-icon'
import { ACCOUNT_PRESETS, type AccountTypeKey } from '@/lib/account-presets'

interface BankPickerProps {
  /** Type of account being created — drives which preset list to show */
  accountType: AccountTypeKey
  /** Called when the user picks a brand (name passed verbatim from preset) */
  onPick: (brandName: string) => void
  /** Called when the user picks "Outros" — go straight to the manual form */
  onCustom: () => void
}

/**
 * Brand quick-pick grid shown after the user selects an account type, before
 * the full form. Click → auto-fills the form. "Outros" tile lets them skip.
 */
export function BankPicker({ accountType, onPick, onCustom }: BankPickerProps) {
  const brands = ACCOUNT_PRESETS[accountType] ?? []

  if (brands.length === 0) return null

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
          Mais usados no Brasil
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Toque pra começar — você ajusta tudo depois.
        </p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
        {brands.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => onPick(name)}
            aria-label={`Adicionar conta ${name}`}
            className="group aspect-square rounded-2xl bg-card border border-border/60 flex flex-col items-center justify-center gap-1.5 p-2 transition-all hover:scale-[1.03] hover:shadow-lg hover:shadow-black/5 hover:border-foreground/20 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <BankIcon accountName={name} size="md" />
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground line-clamp-1 leading-tight transition-colors">
              {name}
            </span>
          </button>
        ))}

        {/* Custom / outros */}
        <button
          type="button"
          onClick={onCustom}
          aria-label="Criar conta personalizada"
          className="group aspect-square rounded-2xl border-2 border-dashed border-border bg-muted/20 flex flex-col items-center justify-center gap-1.5 p-2 transition-all hover:border-foreground/40 hover:bg-muted/40 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <div className="h-10 w-10 rounded-xl bg-background border border-border flex items-center justify-center">
            <Plus className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground line-clamp-1 leading-tight">
            Outros
          </span>
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground/70 text-center pt-1">
        Logos pertencem aos respectivos titulares. Finn não tem vínculo comercial.
      </p>
    </div>
  )
}
