"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader, SheetDescription,
} from '@/components/ui/sheet'
import {
  Search, SlidersHorizontal, X,
  Calendar, Wallet, Tag,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

export type PeriodPreset = 'all' | 'today' | 'week' | 'month' | 'last30' | 'custom'

export interface TransactionFiltersValue {
  search: string
  type: string  // 'all' | 'INCOME' | 'EXPENSE' | 'TRANSFER'
  period: PeriodPreset
  startDate: string  // ISO YYYY-MM-DD or ''
  endDate: string
  accountIds: string[]
  categoryIds: string[]
  valueMin: string
  valueMax: string
  /** Compras parceladas geram tx com `date` no futuro. Por default mostramos
   * só passado+hoje. Toggle pra incluir parcelas futuras. */
  includeFuture: boolean
}

export const EMPTY_FILTERS: TransactionFiltersValue = {
  search: '',
  type: 'all',
  period: 'all',
  startDate: '',
  endDate: '',
  accountIds: [],
  categoryIds: [],
  valueMin: '',
  valueMax: '',
  includeFuture: false,
}

interface AccountOption { id: string; name: string; color?: string }
interface CategoryOption { id: string; name: string; color?: string }

interface TransactionFiltersProps {
  value: TransactionFiltersValue
  onChange: (v: TransactionFiltersValue) => void
}

const TYPE_LABEL: Record<string, string> = {
  all: 'Todos',
  INCOME: 'Receitas',
  EXPENSE: 'Despesas',
  TRANSFER: 'Transferências',
}

const PERIOD_LABEL: Record<PeriodPreset, string> = {
  all: 'Todos',
  today: 'Hoje',
  week: 'Esta semana',
  month: 'Este mês',
  last30: 'Últimos 30 dias',
  custom: 'Personalizado',
}

export function TransactionFilters({ value, onChange }: TransactionFiltersProps) {
  const [open, setOpen] = useState(false)
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])

  // Carrega contas e categorias pra popular o filtro avançado
  useEffect(() => {
    async function load() {
      try {
        const [accRes, catRes] = await Promise.all([
          fetch('/api/accounts'),
          fetch('/api/categories'),
        ])
        if (accRes.ok) {
          const data = await accRes.json()
          setAccounts(data.data || [])
        }
        if (catRes.ok) {
          const data = await catRes.json()
          setCategories(data.data || [])
        }
      } catch {
        // silently fail — filtro avançado fica vazio
      }
    }
    load()
  }, [])

  function update(patch: Partial<TransactionFiltersValue>) {
    onChange({ ...value, ...patch })
  }

  function toggleAccount(id: string) {
    const exists = value.accountIds.includes(id)
    update({ accountIds: exists ? value.accountIds.filter((x) => x !== id) : [...value.accountIds, id] })
  }

  function toggleCategory(id: string) {
    const exists = value.categoryIds.includes(id)
    update({ categoryIds: exists ? value.categoryIds.filter((x) => x !== id) : [...value.categoryIds, id] })
  }

  function applyPeriodPreset(preset: PeriodPreset) {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const todayStr = formatISO(today)

    let startDate = ''
    let endDate = ''

    if (preset === 'today') {
      const start = new Date(today)
      start.setHours(0, 0, 0, 0)
      startDate = formatISO(start)
      endDate = todayStr
    } else if (preset === 'week') {
      const start = new Date(today)
      start.setDate(start.getDate() - start.getDay())
      start.setHours(0, 0, 0, 0)
      startDate = formatISO(start)
      endDate = todayStr
    } else if (preset === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0)
      startDate = formatISO(start)
      endDate = todayStr
    } else if (preset === 'last30') {
      const start = new Date(today)
      start.setDate(start.getDate() - 30)
      start.setHours(0, 0, 0, 0)
      startDate = formatISO(start)
      endDate = todayStr
    }
    update({ period: preset, startDate, endDate })
  }

  // Conta quantos filtros não-padrão estão ativos (pra mostrar badge no botão "Filtros")
  const activeAdvancedCount = [
    value.period !== 'all' ? 1 : 0,
    value.accountIds.length,
    value.categoryIds.length,
    value.valueMin || value.valueMax ? 1 : 0,
    value.includeFuture ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  const hasAnyFilter =
    !!value.search ||
    value.type !== 'all' ||
    value.period !== 'all' ||
    value.accountIds.length > 0 ||
    value.categoryIds.length > 0 ||
    !!value.valueMin ||
    !!value.valueMax ||
    value.includeFuture

  return (
    <div className="space-y-3">
      {/* Linha 1 — search + type + advanced trigger */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição"
            value={value.search}
            onChange={(e) => update({ search: e.target.value })}
            className="pl-9 h-10 rounded-xl bg-muted/40 border-transparent focus-visible:bg-background focus-visible:border-border placeholder:text-muted-foreground/70"
          />
        </div>

        <div className="flex gap-2">
          {/* Type — quick toggle */}
          <select
            value={value.type}
            onChange={(e) => update({ type: e.target.value })}
            className="h-10 rounded-xl bg-muted/40 border border-transparent px-3 text-sm focus:bg-background focus:border-border focus:outline-none"
          >
            <option value="all">Todos</option>
            <option value="INCOME">Receitas</option>
            <option value="EXPENSE">Despesas</option>
            <option value="TRANSFER">Transferências</option>
          </select>

          {/* Advanced filters in a Sheet */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  className={cn(
                    'h-10 rounded-xl gap-2 relative',
                    activeAdvancedCount > 0 && 'border-primary/40 bg-primary/5',
                  )}
                />
              }
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
              {activeAdvancedCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-1">
                  {activeAdvancedCount}
                </span>
              )}
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filtros avançados</SheetTitle>
                <SheetDescription>
                  Combine os filtros pra encontrar a transação certa.
                </SheetDescription>
              </SheetHeader>

              <div className="px-4 pb-6 space-y-6">
                {/* Período */}
                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">Período</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(['all', 'today', 'week', 'month', 'last30'] as PeriodPreset[]).map((preset) => {
                      const active = value.period === preset
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => applyPeriodPreset(preset)}
                          className={cn(
                            'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                            active
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted/50 text-foreground hover:bg-muted',
                          )}
                        >
                          {PERIOD_LABEL[preset]}
                        </button>
                      )
                    })}
                  </div>
                  {/* Custom range — só aparece quando preset='custom' ou já tem datas custom */}
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex-1">
                      <label className="text-[11px] text-muted-foreground">De</label>
                      <Input
                        type="date"
                        value={value.startDate.slice(0, 10)}
                        onChange={(e) => update({ period: 'custom', startDate: e.target.value })}
                        className="h-9 rounded-lg text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[11px] text-muted-foreground">Até</label>
                      <Input
                        type="date"
                        value={value.endDate.slice(0, 10)}
                        onChange={(e) => update({ period: 'custom', endDate: e.target.value })}
                        className="h-9 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </section>

                {/* Conta */}
                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">Conta</p>
                    {value.accountIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => update({ accountIds: [] })}
                        className="ml-auto text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {accounts.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhuma conta cadastrada.</p>
                    ) : (
                      accounts.map((a) => {
                        const active = value.accountIds.includes(a.id)
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => toggleAccount(a.id)}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ring-1 ring-inset',
                              active
                                ? 'bg-primary/10 text-primary ring-primary/30'
                                : 'bg-muted/40 text-foreground ring-transparent hover:bg-muted',
                            )}
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: a.color || '#94a3b8' }}
                            />
                            {a.name}
                          </button>
                        )
                      })
                    )}
                  </div>
                </section>

                {/* Categoria */}
                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">Categoria</p>
                    {value.categoryIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => update({ categoryIds: [] })}
                        className="ml-auto text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                    {categories.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhuma categoria cadastrada.</p>
                    ) : (
                      categories.map((c) => {
                        const active = value.categoryIds.includes(c.id)
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleCategory(c.id)}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ring-1 ring-inset',
                              active
                                ? 'text-foreground'
                                : 'bg-muted/40 text-foreground ring-transparent hover:bg-muted',
                            )}
                            style={active ? {
                              backgroundColor: `${c.color}1a`,
                              color: c.color,
                              boxShadow: `inset 0 0 0 1px ${c.color}40`,
                            } : undefined}
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: c.color || '#94a3b8' }}
                            />
                            {c.name}
                          </button>
                        )
                      })
                    )}
                  </div>
                </section>

                {/* Faixa de valor */}
                <section>
                  <p className="text-sm font-semibold mb-2">Faixa de valor</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[11px] text-muted-foreground">Mínimo</label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={value.valueMin}
                        onChange={(e) => update({ valueMin: e.target.value })}
                        className="h-9 rounded-lg text-sm tabular-nums"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[11px] text-muted-foreground">Máximo</label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="9999,00"
                        value={value.valueMax}
                        onChange={(e) => update({ valueMax: e.target.value })}
                        className="h-9 rounded-lg text-sm tabular-nums"
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <p className="text-sm font-semibold mb-2">Parcelas futuras</p>
                  <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40 transition-colors">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-border"
                      checked={value.includeFuture}
                      onChange={(e) => update({ includeFuture: e.target.checked })}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Incluir parcelas futuras</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Por padrão, a lista mostra só transações que já aconteceram. Marca aqui pra ver também as parcelas de compras parceladas que ainda vão cair.
                      </p>
                    </div>
                  </label>
                </section>
              </div>

              {/* Footer ações */}
              <div className="px-4 py-3 border-t flex items-center justify-between gap-3 sticky bottom-0 bg-background">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange(EMPTY_FILTERS)}
                  className="text-muted-foreground"
                >
                  Limpar tudo
                </Button>
                <Button onClick={() => setOpen(false)} className="gradient-primary border-0 text-white">
                  Aplicar
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Linha 2 — chips ativos */}
      {hasAnyFilter && (
        <div className="flex items-center gap-2 flex-wrap">
          {value.search && (
            <FilterChip label="Busca" valueText={`"${value.search}"`} onRemove={() => update({ search: '' })} />
          )}
          {value.type !== 'all' && (
            <FilterChip label="Tipo" valueText={TYPE_LABEL[value.type]} onRemove={() => update({ type: 'all' })} />
          )}
          {value.period !== 'all' && (
            <FilterChip
              label="Período"
              valueText={value.period === 'custom'
                ? formatCustomRange(value.startDate, value.endDate)
                : PERIOD_LABEL[value.period]}
              onRemove={() => update({ period: 'all', startDate: '', endDate: '' })}
            />
          )}
          {value.accountIds.length > 0 && (
            <FilterChip
              label="Conta"
              valueText={
                value.accountIds.length === 1
                  ? accounts.find((a) => a.id === value.accountIds[0])?.name || '1'
                  : `${value.accountIds.length} contas`
              }
              onRemove={() => update({ accountIds: [] })}
            />
          )}
          {value.categoryIds.length > 0 && (
            <FilterChip
              label="Categoria"
              valueText={
                value.categoryIds.length === 1
                  ? categories.find((c) => c.id === value.categoryIds[0])?.name || '1'
                  : `${value.categoryIds.length} categorias`
              }
              onRemove={() => update({ categoryIds: [] })}
            />
          )}
          {(value.valueMin || value.valueMax) && (
            <FilterChip
              label="Valor"
              valueText={`${value.valueMin ? formatCurrency(parseFloat(value.valueMin)) : '0'} – ${value.valueMax ? formatCurrency(parseFloat(value.valueMax)) : '∞'}`}
              onRemove={() => update({ valueMin: '', valueMax: '' })}
            />
          )}
          {value.includeFuture && (
            <FilterChip
              label="Mostrando"
              valueText="parcelas futuras"
              onRemove={() => update({ includeFuture: false })}
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  )
}

function FilterChip({
  label, valueText, onRemove,
}: {
  label: string
  valueText: string
  onRemove: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full bg-primary/10 text-primary text-xs font-medium ring-1 ring-inset ring-primary/15">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold">{valueText}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover filtro ${label}`}
        className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-primary/20 transition-colors"
      >
        <X className="h-3 w-3" strokeWidth={2} />
      </button>
    </span>
  )
}

function formatISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatCustomRange(start: string, end: string): string {
  if (!start && !end) return 'Custom'
  const fmt = (d: string) => {
    if (!d) return '?'
    const date = new Date(d)
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
  }
  return `${fmt(start)} – ${fmt(end)}`
}
