"use client"

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft, CreditCard } from 'lucide-react'
import { toast } from 'sonner'

interface InvoiceDetail {
  id: string
  cardId: string
  periodStart: string
  periodEnd: string
  dueDate: string
  total: string
  status: 'OPEN' | 'CLOSED' | 'PAID' | 'OVERDUE'
  paidAt: string | null
  card: {
    id: string
    name: string
    color: string
    linkedAccountId: string | null
    closingDay: number | null
    dueDay: number | null
  }
  transactions: Array<{
    id: string
    description: string
    amount: string
    date: string
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
    category?: { name: string; color: string } | null
    installment?: { installmentNumber: number; totalInstallments: number } | null
  }>
}

interface AccountLite {
  id: string
  name: string
  type: string
}

const STATUS_LABELS = { OPEN: 'Em aberto', CLOSED: 'Fechada', PAID: 'Paga', OVERDUE: 'Em atraso' } as const
const STATUS_STYLES = {
  OPEN: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
  CLOSED: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  PAID: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  OVERDUE: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
} as const

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [accounts, setAccounts] = useState<AccountLite[]>([])
  const [loading, setLoading] = useState(true)
  const [payOpen, setPayOpen] = useState(false)
  const [payingFrom, setPayingFrom] = useState<string>('')
  const [paying, setPaying] = useState(false)

  const fetchInvoice = useCallback(async () => {
    setLoading(true)
    try {
      const [invRes, accRes] = await Promise.all([
        fetch(`/api/invoices/${id}`).then(r => r.json()),
        fetch('/api/accounts').then(r => r.json()),
      ])
      if (invRes.data) {
        setInvoice(invRes.data)
        setPayingFrom(invRes.data.card.linkedAccountId || '')
      }
      if (accRes.data) {
        setAccounts(accRes.data.filter((a: AccountLite) => a.type !== 'CREDIT_CARD'))
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchInvoice()
  }, [fetchInvoice])

  async function handlePay() {
    if (!payingFrom) {
      toast.error('Escolha a conta de onde o valor vai sair.')
      return
    }
    setPaying(true)
    try {
      const res = await fetch(`/api/invoices/${id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromAccountId: payingFrom }),
      })
      const result = await res.json()
      if (res.ok) {
        toast.success('Fatura paga! Saldo da conta atualizado.')
        setPayOpen(false)
        fetchInvoice()
      } else {
        toast.error(result.error || 'Não foi possível pagar a fatura.')
      }
    } catch {
      toast.error('Não foi possível pagar a fatura.')
    }
    setPaying(false)
  }

  if (loading || !invoice) {
    return (
      <div className="space-y-4 animate-fade-in max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  const canPay = invoice.status !== 'PAID' && Number(invoice.total) > 0

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Fatura · {invoice.card.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            Período {new Date(invoice.periodStart).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} – {new Date(invoice.periodEnd).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${invoice.card.color}, ${invoice.card.color}88)` }} />
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground">Total da fatura</p>
              <p className="text-3xl font-bold">{formatCurrency(Number(invoice.total))}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className={STATUS_STYLES[invoice.status]}>
                  {STATUS_LABELS[invoice.status]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Vence {new Date(invoice.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                </span>
              </div>
              {invoice.paidAt && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5">
                  ✓ Paga em {new Date(invoice.paidAt).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
            {canPay && (
              <Dialog open={payOpen} onOpenChange={setPayOpen}>
                <DialogTrigger render={<Button className="gradient-primary border-0 shadow-md shadow-primary/25" />}>
                  Pagar fatura
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Pagar fatura</DialogTitle>
                    <DialogDescription>
                      Vamos registrar um débito no valor de <strong>{formatCurrency(Number(invoice.total))}</strong> na conta escolhida e zerar a fatura.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">De qual conta sai o pagamento?</label>
                    <Select onValueChange={(v) => v && setPayingFrom(v)} value={payingFrom}>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Selecione a conta" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setPayOpen(false)} disabled={paying}>
                      Cancelar
                    </Button>
                    <Button onClick={handlePay} disabled={paying || !payingFrom} className="gradient-primary border-0">
                      {paying ? 'Pagando...' : 'Confirmar pagamento'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compras nesta fatura ({invoice.transactions.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {invoice.transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-8 text-center">
              Nenhuma compra registrada nessa fatura.
            </p>
          ) : (
            <div className="divide-y">
              {invoice.transactions.map(tx => (
                <Link
                  key={tx.id}
                  href={`/transactions/new?edit=${tx.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      {tx.category && (
                        <>
                          {' · '}
                          <span className="inline-flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tx.category.color }} />
                            {tx.category.name}
                          </span>
                        </>
                      )}
                      {tx.installment && ` · ${tx.installment.installmentNumber}/${tx.installment.totalInstallments}`}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold shrink-0 ml-3 ${tx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                    {tx.type === 'INCOME' ? '+' : ''}{formatCurrency(Number(tx.amount))}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
