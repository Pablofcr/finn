"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { formatCurrency, formatDate, groupByDate } from '@/lib/utils'
import { TRANSACTION_TYPE_LABELS } from '@/lib/constants'
import { Plus, Search, Trash2, Pencil, ArrowLeftRight } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { RecurringTab } from '@/components/transactions/recurring-tab'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: '20' })
    if (search) params.set('search', search)
    if (typeFilter !== 'all') params.set('type', typeFilter)

    try {
      const res = await fetch(`/api/transactions?${params}`)
      if (res.ok) {
        const result = await res.json()
        setTransactions(result.data)
        setTotalPages(result.totalPages)
      }
    } catch {
      toast.error('Não conseguimos carregar suas transações. Verifique sua conexão e tente novamente.')
    }
    setLoading(false)
  }, [page, search, typeFilter])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Transação excluída e saldo atualizado.')
        fetchTransactions()
      } else {
        toast.error('A transação não foi excluída. Tente de novo em alguns instantes.')
      }
    } catch {
      toast.error('A transação não foi excluída. Tente de novo em alguns instantes.')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transações</h1>
        <Link href="/transactions/new">
          <Button className="gap-2 gradient-primary shadow-md shadow-primary/25 border-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova Transação</span>
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList className="grid w-full grid-cols-2 sm:w-[300px]">
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="recurring">Recorrentes</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <div className="space-y-6 pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar transações..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="pl-9 rounded-xl bg-muted/30 border-transparent focus-visible:bg-background"
                />
              </div>
              <Select value={typeFilter} onValueChange={(v) => { if (v) { setTypeFilter(v); setPage(1) } }}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Tipo">
                    {{ all: 'Todos', INCOME: 'Receitas', EXPENSE: 'Despesas', TRANSFER: 'Transferências' }[typeFilter] || 'Tipo'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="INCOME">Receitas</SelectItem>
                  <SelectItem value="EXPENSE">Despesas</SelectItem>
                  <SelectItem value="TRANSFER">Transferências</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <EmptyState
                icon={<ArrowLeftRight className="h-12 w-12" />}
                title="Sua linha do tempo financeira começa aqui"
                description="Registre sua primeira receita ou despesa e veja suas finanças tomarem forma."
                action={
                  <Link href="/transactions/new">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Registrar transação
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-4">
                {groupByDate(transactions).map((group) => (
                  <div key={group.label}>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                      {group.label}
                    </h3>
                    <Card>
                      <CardContent className="p-0 divide-y divide-border/50">
                        {group.items.map((t: any) => (
                          <div key={t.id} className="flex items-center justify-between py-3 px-4 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 text-xs font-semibold"
                                style={{
                                  backgroundColor: `${t.category?.color || '#94a3b8'}15`,
                                  color: t.category?.color || '#94a3b8',
                                }}
                              >
                                {(t.category?.name || 'S')[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{t.description}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{t.category?.name || 'Sem categoria'}</span>
                                  <span>·</span>
                                  <span>{t.account?.name}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <p className={`text-sm font-semibold ${t.type === 'INCOME' ? 'text-income' : t.type === 'EXPENSE' ? 'text-expense' : 'text-transfer'}`}>
                                  {t.type === 'INCOME' ? '+' : t.type === 'EXPENSE' ? '-' : ''}
                                  {formatCurrency(Number(t.amount))}
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {TRANSACTION_TYPE_LABELS[t.type]}
                                </Badge>
                              </div>
                              <div className="flex gap-1">
                                <Link href={`/transactions/new?edit=${t.id}`}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </Link>
                                <AlertDialog>
                                  <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" />}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. O saldo da conta será ajustado.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(t.id)}>
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                ))}

                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Anterior
                    </Button>
                    <span className="flex items-center text-sm text-muted-foreground">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="recurring">
          <div className="pt-4">
            <RecurringTab />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
