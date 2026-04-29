"use client"

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Building2, Check, ChevronDown } from 'lucide-react'

interface AccountLite {
  id: string
  name: string
  color?: string
  type?: string
}

interface AccountFilterProps {
  accounts: AccountLite[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function AccountFilter({ accounts, selectedIds, onChange }: AccountFilterProps) {
  const isFiltered = selectedIds.length > 0

  let label: string
  if (selectedIds.length === 0) label = 'Todas as contas'
  else if (selectedIds.length === 1) {
    label = accounts.find((a) => a.id === selectedIds[0])?.name ?? '1 conta'
  } else label = `${selectedIds.length} contas`

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    )
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              'gap-2 h-10 rounded-xl',
              isFiltered && 'bg-primary/5 border-primary/40 text-primary hover:bg-primary/10',
            )}
          />
        }
      >
        <Building2 className="h-4 w-4" />
        <span className="truncate max-w-[140px]">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="px-3 py-2 border-b border-border/60 flex items-center justify-between">
          <p className="text-xs font-medium">Filtrar por conta</p>
          {isFiltered && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs font-medium text-primary hover:underline"
            >
              Limpar
            </button>
          )}
        </div>
        <div className="py-1.5 max-h-[280px] overflow-y-auto">
          {accounts.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">
              Nenhuma conta cadastrada
            </p>
          ) : (
            accounts.map((a) => {
              const checked = selectedIds.includes(a.id)
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggle(a.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/60 text-left transition-colors"
                >
                  <div
                    className={cn(
                      'h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                      checked ? 'bg-primary border-primary' : 'border-border',
                    )}
                  >
                    {checked && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                  </div>
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: a.color || '#94a3b8' }}
                    aria-hidden
                  />
                  <span className="text-sm truncate flex-1">{a.name}</span>
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
