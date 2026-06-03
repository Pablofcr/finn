"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'

interface Occurrence {
  id: string
  dueDate: string
  isOverdue: boolean
  daysOverdue: number
}

interface Props {
  recurringId: string
  amount: number
  description: string
  /// Callback chamado depois de marcar como pago (e após janela de undo expirar)
  /// pra o pai refetchar a lista de recorrências e atualizar contadores.
  onPaid?: () => void
}

function formatBRDate(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(d)
}

export function OverdueOccurrencesPanel({ recurringId, amount, description, onPaid }: Props) {
  const [pending, setPending] = useState<Occurrence[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  const fetchPending = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/recurring/${recurringId}/occurrences`)
      const json = await res.json()
      const list: Occurrence[] = (json?.data?.pending ?? []) as Occurrence[]
      setPending(list)
    } catch {
      toast.error('Não rolou carregar as parcelas. Tenta de novo.')
    }
    setLoading(false)
  }, [recurringId])

  useEffect(() => { fetchPending() }, [fetchPending])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleMarkPaid() {
    if (selected.size === 0 || submitting) return
    const ids = Array.from(selected)
    setSubmitting(true)

    let undone = false
    try {
      const res = await fetch(`/api/recurring/${recurringId}/occurrences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occurrenceIds: ids }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error ?? 'Não rolou registrar agora.')
        setSubmitting(false)
        return
      }

      const total = ids.length * amount
      toast(`${ids.length} ${ids.length === 1 ? 'pagamento registrado' : 'pagamentos registrados'} · ${formatCurrency(total)}`, {
        description: `${description} — saldo atualizado.`,
        action: {
          label: 'Desfazer',
          onClick: async () => {
            undone = true
            try {
              // Reverte cada occurrence (deleta tx, reverte balance, volta PENDING)
              await Promise.all(
                ids.map(id =>
                  fetch(`/api/recurring/occurrences/${id}/revert`, { method: 'POST' }),
                ),
              )
              toast.success('Pagamentos desfeitos.')
              setSelected(new Set())
              fetchPending()
              onPaid?.()
            } catch {
              toast.error('Não rolou desfazer.')
            }
          },
        },
        duration: 10000,
      })

      // Limpa seleção e atualiza UI imediatamente — visualmente as parcelas
      // somem da lista (otimismo). Se user clicar Desfazer, refazemos fetch.
      setSelected(new Set())
      setPending(prev => prev.filter(o => !ids.includes(o.id)))

      // Depois da janela de Undo, refresh definitivo do pai.
      setTimeout(() => {
        if (!undone) onPaid?.()
      }, 10500)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-2 py-2">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    )
  }

  if (pending.length === 0) {
    return (
      <p className="text-[12px] text-muted-foreground py-2">
        Nada em aberto por aqui.
      </p>
    )
  }

  const total = selected.size * amount
  const overdue = pending.filter(o => o.isOverdue)
  const upcoming = pending.filter(o => !o.isOverdue)

  // Item compartilhado entre as duas seções — visual idêntico, troca só a cor
  // pelo flag isOverdue. Separar em seções resolve o mismatch entre o badge
  // "N em aberto" (conta só vencidas) e a lista (que também mostra a próxima
  // futura como preview pra planejamento). Ver decisão do design-squad.
  const renderItem = (occ: Occurrence) => {
    const isSelected = selected.has(occ.id)
    return (
      <li key={occ.id}>
        <button
          type="button"
          onClick={() => toggle(occ.id)}
          className={cn(
            'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors text-left',
            'min-h-[44px]',  // touch target WCAG 2.5.5
            isSelected
              ? 'bg-primary/10 ring-1 ring-inset ring-primary/30'
              : occ.isOverdue
                ? 'bg-amber-500/5 hover:bg-amber-500/10 ring-1 ring-inset ring-amber-500/15'
                : 'bg-muted/40 hover:bg-muted',
          )}
          aria-pressed={isSelected}
        >
          <span
            className={cn(
              'h-5 w-5 rounded shrink-0 flex items-center justify-center border-2 transition-colors',
              isSelected
                ? 'bg-primary border-primary'
                : 'border-muted-foreground/40 bg-background',
            )}
            aria-hidden="true"
          >
            {isSelected && (
              <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span className="flex-1 min-w-0">
            <span className="text-[13px] font-medium tabular-nums">
              {formatBRDate(occ.dueDate)}
            </span>
            {occ.isOverdue && occ.daysOverdue >= 7 && (
              <span className="text-[11px] text-muted-foreground ml-2">
                faz {occ.daysOverdue} dias
              </span>
            )}
          </span>
          <span className={cn(
            'text-[13px] font-semibold tabular-nums shrink-0',
            occ.isOverdue ? 'text-amber-700 dark:text-amber-400' : 'text-foreground',
          )}>
            {formatCurrency(amount)}
          </span>
        </button>
      </li>
    )
  }

  return (
    <div className="space-y-2 pt-1">
      {overdue.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            Vencida{overdue.length > 1 ? 's' : ''} ({overdue.length})
          </p>
          <ul className="space-y-1">{overdue.map(renderItem)}</ul>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-1 pt-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Próxima{upcoming.length > 1 ? 's' : ''}
          </p>
          <ul className="space-y-1">{upcoming.map(renderItem)}</ul>
        </div>
      )}

      {selected.size > 0 && (
        <Button
          onClick={handleMarkPaid}
          disabled={submitting}
          className="w-full mt-2"
          size="sm"
        >
          {submitting
            ? 'Registrando…'
            : selected.size === 1
              ? `Pronto — paguei essa (${formatCurrency(total)})`
              : `Pronto — paguei essas ${selected.size} (${formatCurrency(total)})`}
        </Button>
      )}
    </div>
  )
}
