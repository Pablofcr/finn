"use client"

import Link from 'next/link'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, cn } from '@/lib/utils'
import { getCategoryIcon } from '@/lib/category-icon'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'
import {
  Pencil, Trash2, ArrowLeftRight, Banknote, Receipt, CreditCard,
  Tag, Building2, MapPin, FileText, Layers, Repeat, Wallet,
} from 'lucide-react'

type PaymentMethod = 'PIX' | 'DEBIT' | 'CREDIT' | 'CASH' | 'BOLETO' | 'TRANSFER'

interface Transaction {
  id: string
  description: string
  amount: number | string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  date: string
  paymentMethod?: PaymentMethod
  invoiceId?: string | null
  recurringTransactionId?: string | null
  notes?: string | null
  location?: string | null
  tags?: string[]
  installment?: {
    installmentNumber: number
    totalInstallments: number
    groupId: string
  } | null
  category?: { id: string; name: string; icon?: string; color?: string }
  account?: { id: string; name: string; type?: string; color?: string }
}

interface TransactionDetailSheetProps {
  transaction: Transaction | null
  onOpenChange: (open: boolean) => void
  onDelete: (id: string) => void
}

const FALLBACK_COLOR = '#64748b'

function formatLongDate(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(d)
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60 shrink-0 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <div className="text-sm text-foreground mt-0.5 break-words">{children}</div>
      </div>
    </div>
  )
}

export function TransactionDetailSheet({
  transaction,
  onOpenChange,
  onDelete,
}: TransactionDetailSheetProps) {
  if (!transaction) {
    return (
      <Sheet open={false} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md" />
      </Sheet>
    )
  }

  const t = transaction
  const isIncome = t.type === 'INCOME'
  const isExpense = t.type === 'EXPENSE'
  const isTransfer = t.type === 'TRANSFER'

  const hasCategory = !!t.category?.name
  const TypeIcon = hasCategory
    ? getCategoryIcon(t.category!.icon)
    : isIncome ? Banknote : isTransfer ? ArrowLeftRight : Receipt
  const typeColor = hasCategory ? (t.category!.color || FALLBACK_COLOR) : FALLBACK_COLOR

  const typeLabel = isIncome ? 'Receita' : isExpense ? 'Despesa' : 'Transferência'
  const typeChipClass = isIncome
    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : isExpense
      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
      : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'

  const amountClass = isIncome
    ? 'text-income'
    : isExpense
      ? 'text-expense'
      : 'text-foreground'

  const sign = isIncome ? '+' : isExpense ? '−' : ''

  const installment = t.installment
  const isRecurring = !!t.recurringTransactionId
  const hasInvoice = !!t.invoiceId

  function handleDelete() {
    onDelete(t.id)
    onOpenChange(false)
  }

  return (
    <Sheet open={!!transaction} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col"
      >
        {/* Header — tipo + valor + descrição + data */}
        <div className="px-5 pt-6 pb-5 border-b">
          <div className="flex items-center gap-2 mb-2.5">
            <span className={cn('inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md', typeChipClass)}>
              {typeLabel}
            </span>
            {isRecurring && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400"
                title="Lançamento recorrente"
              >
                <Repeat className="h-3 w-3" />
                Recorrente
              </span>
            )}
            {installment && installment.totalInstallments > 1 && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 tabular-nums"
              >
                <Layers className="h-3 w-3" />
                {installment.installmentNumber}/{installment.totalInstallments}
              </span>
            )}
          </div>

          {/* Tile colorido + valor */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ring-1 ring-inset ring-black/5 dark:ring-white/10"
              style={{ backgroundColor: `${typeColor}1a` }}
            >
              <TypeIcon className="h-5 w-5" />
            </div>
            <p className={cn('text-3xl font-bold tabular-nums', amountClass)}>
              {sign}{formatCurrency(Number(t.amount))}
            </p>
          </div>

          {/* Descrição completa (sem truncate) */}
          <p className="text-base font-medium mt-3 break-words">{t.description}</p>

          {/* Data */}
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            {formatLongDate(t.date)}
          </p>
        </div>

        {/* Body — campos detalhados */}
        <div className="px-5 py-5 space-y-4 flex-1 overflow-y-auto">
          {hasCategory && (
            <Field icon={Tag} label="Categoria">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: t.category!.color || FALLBACK_COLOR }}
                />
                {t.category!.name}
              </span>
            </Field>
          )}

          {t.account && (
            <Field
              icon={t.account.type === 'CREDIT_CARD' ? CreditCard : t.account.type === 'CASH' ? Wallet : Building2}
              label="Conta"
            >
              {t.account.name}
            </Field>
          )}

          {t.paymentMethod && (
            <Field icon={CreditCard} label="Forma de pagamento">
              {PAYMENT_METHOD_LABELS[t.paymentMethod] || t.paymentMethod}
            </Field>
          )}

          {installment && installment.totalInstallments > 1 && (
            <Field icon={Layers} label="Parcela">
              <span className="tabular-nums">
                {installment.installmentNumber} de {installment.totalInstallments}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Esta é uma das parcelas da compra
              </p>
            </Field>
          )}

          {t.location && (
            <Field icon={MapPin} label="Local">
              {t.location}
            </Field>
          )}

          {t.notes && (
            <Field icon={FileText} label="Observações">
              <p className="whitespace-pre-wrap">{t.notes}</p>
            </Field>
          )}

          {t.tags && t.tags.length > 0 && (
            <Field icon={Tag} label="Tags">
              <div className="flex flex-wrap gap-1">
                {t.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            </Field>
          )}
        </div>

        {/* Footer — actions: Editar (primário) + Ver fatura (se houver) + Excluir */}
        <div className="px-5 py-4 border-t flex gap-2">
          <Link
            href={`/transactions/new?edit=${t.id}`}
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            <Button className="w-full gap-2 gradient-primary border-0 shadow-md shadow-primary/25">
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          </Link>
          {hasInvoice && (
            <Link
              href={`/invoices/${t.invoiceId}`}
              onClick={() => onOpenChange(false)}
            >
              <Button variant="outline" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Ver fatura
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={handleDelete}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
            aria-label="Excluir lançamento"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
