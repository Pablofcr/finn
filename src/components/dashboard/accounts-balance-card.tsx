"use client"

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, Plus, Wallet } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { BankIcon } from '@/components/bank-icon'

interface Account {
  id: string
  name: string
  type: string
  balance: number
  color: string
  icon: string
  creditLimit: number | null
  currentInvoice: number | null
  utilizationPct: number | null
  closingDay: number | null
  dueDay: number | null
}

interface AccountsBalanceCardProps {
  accounts: Account[]
  totalBalance: number
}

const TYPE_LABEL: Record<string, string> = {
  CHECKING: 'Conta corrente',
  SAVINGS: 'Poupança',
  CREDIT_CARD: 'Cartão de crédito',
  CASH: 'Dinheiro',
  DIGITAL_WALLET: 'Carteira digital',
  INVESTMENT: 'Investimento',
}

function getProgressColor(percentage: number) {
  if (percentage <= 60) return 'progress-gradient-success'
  if (percentage <= 80) return 'progress-gradient-warning'
  return 'progress-gradient-danger'
}

function getBadgeStyle(percentage: number) {
  if (percentage <= 60) return 'bg-green-500/10 text-green-600'
  if (percentage <= 80) return 'bg-yellow-500/10 text-yellow-600'
  return 'bg-red-500/10 text-red-600'
}

export function AccountsBalanceCard({ accounts, totalBalance }: AccountsBalanceCardProps) {
  // Mostra até 5 contas, prioriza conta corrente / cartão / poupança
  const displayed = accounts.slice(0, 5)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Saldo por conta</CardTitle>
        <Link href="/accounts">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            Gerenciar
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 mb-3">
              <Wallet className="h-6 w-6 text-indigo-500" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium">Nenhuma conta cadastrada</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-xs">
              Cadastre sua primeira conta e eu começo a acompanhar o saldo.
            </p>
            <Link href="/accounts">
              <Button size="sm" className="gradient-primary text-white shadow-sm">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar conta
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Patrimônio líquido (top) — gradient sutil pra amarrar à marca */}
            <div className="flex items-center justify-between px-3 py-3 rounded-xl bg-gradient-to-r from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/10 dark:to-purple-500/10 ring-1 ring-inset ring-indigo-500/10 mb-2">
              <div>
                <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
                  Patrimônio líquido
                </p>
                <p className="text-2xl font-bold tracking-tight tabular-nums">
                  {formatCurrency(totalBalance)}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {accounts.length === 1 ? '1 conta' : `${accounts.length} contas`}
              </span>
            </div>

            {/* Lista de contas */}
            {displayed.map((a) => {
              const isCard = a.type === 'CREDIT_CARD'
              const isNegative = !isCard && a.balance < 0

              if (isCard) {
                return (
                  <div
                    key={a.id}
                    className="flex flex-col gap-2 rounded-xl p-2 -mx-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <BankIcon accountName={a.name} accountType={a.type} size="md" />

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{a.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Cartão de crédito
                          {a.closingDay ? ` · fecha dia ${a.closingDay}` : ''}
                        </p>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(a.currentInvoice || 0)}
                        </span>
                        {a.creditLimit && (
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            de {formatCurrency(a.creditLimit)}
                          </span>
                        )}
                      </div>
                    </div>

                    {a.utilizationPct !== null && (
                      <div className="flex items-center gap-2 pl-[52px]">
                        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              getProgressColor(a.utilizationPct),
                            )}
                            style={{ width: `${Math.min(a.utilizationPct, 100)}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            'text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md',
                            getBadgeStyle(a.utilizationPct),
                          )}
                        >
                          {a.utilizationPct}%
                        </span>
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl p-2 -mx-2 hover:bg-muted/50 transition-colors"
                >
                  <BankIcon accountName={a.name} accountType={a.type} size="md" />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {TYPE_LABEL[a.type] || a.type}
                    </p>
                  </div>

                  <span
                    className={cn(
                      'text-sm font-semibold tabular-nums shrink-0',
                      isNegative
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-900 dark:text-white',
                    )}
                  >
                    {isNegative ? '-' : ''}
                    {formatCurrency(Math.abs(a.balance))}
                  </span>
                </div>
              )
            })}

            {accounts.length > 5 && (
              <Link
                href="/accounts"
                className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground py-2 mt-1"
              >
                Ver todas as {accounts.length} contas
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
