import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'
import { endOfTodayInTimezone } from '@/lib/date-tz'

/**
 * Exporta transações filtradas como CSV.
 * Aceita os MESMOS filtros que /api/transactions GET (search, type,
 * categoryIds, accountIds, startDate, endDate, valueMin, valueMax) — só
 * pula paginação e devolve um CSV pronto pra download.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const type = searchParams.get('type')
  const categoryIdsParam = searchParams.get('categoryIds') || searchParams.get('categoryId')
  const accountIdsParam = searchParams.get('accountIds') || searchParams.get('accountId')
  const search = searchParams.get('search')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const valueMinStr = searchParams.get('valueMin')
  const valueMaxStr = searchParams.get('valueMax')
  const includeFuture = searchParams.get('includeFuture') === 'true'

  const where: any = { userId: user.id }
  if (type) where.type = type
  if (categoryIdsParam) {
    const ids = categoryIdsParam.split(',').filter(Boolean)
    if (ids.length === 1) where.categoryId = ids[0]
    else if (ids.length > 1) where.categoryId = { in: ids }
  }
  if (accountIdsParam) {
    const ids = accountIdsParam.split(',').filter(Boolean)
    if (ids.length === 1) where.accountId = ids[0]
    else if (ids.length > 1) where.accountId = { in: ids }
  }
  if (search) where.description = { contains: search, mode: 'insensitive' }
  if (startDate || endDate) {
    where.date = {}
    if (startDate) where.date.gte = new Date(startDate)
    if (endDate) where.date.lte = new Date(endDate)
  }
  if (!includeFuture) {
    const endOfToday = endOfTodayInTimezone(user.timezone || 'America/Sao_Paulo')
    if (!where.date) where.date = {}
    if (!where.date.lte || new Date(where.date.lte) > endOfToday) {
      where.date.lte = endOfToday
    }
  }
  if (valueMinStr || valueMaxStr) {
    where.amount = {}
    if (valueMinStr) where.amount.gte = parseFloat(valueMinStr)
    if (valueMaxStr) where.amount.lte = parseFloat(valueMaxStr)
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      category: { select: { name: true } },
      account: { select: { name: true } },
      installment: { select: { installmentNumber: true, totalInstallments: true } },
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  })

  // CSV — colunas fixas. Default sensato (UX review pediu sem column picker).
  const TYPE_LABELS: Record<string, string> = {
    INCOME: 'Receita',
    EXPENSE: 'Despesa',
    TRANSFER: 'Transferência',
  }

  const escapeCSV = (v: string | null | undefined): string => {
    if (v == null) return ''
    const s = String(v)
    // Sempre quotamos; isso lida com vírgula/aspas/quebra-de-linha de uma vez
    return `"${s.replace(/"/g, '""')}"`
  }

  const formatDate = (d: Date): string => {
    const dd = String(d.getUTCDate()).padStart(2, '0')
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    const yyyy = d.getUTCFullYear()
    return `${dd}/${mm}/${yyyy}`
  }

  const formatAmount = (amount: any): string => {
    // pt-BR: vírgula como decimal. Sem símbolo de moeda.
    return Number(amount).toFixed(2).replace('.', ',')
  }

  const header = [
    'Data', 'Descrição', 'Valor', 'Tipo', 'Categoria', 'Conta',
    'Forma de pagamento', 'Parcela', 'Observações',
  ].map(escapeCSV).join(',')

  const rows = transactions.map((t) => {
    const installmentLabel = t.installment
      ? `${t.installment.installmentNumber}/${t.installment.totalInstallments}`
      : ''
    return [
      formatDate(t.date),
      t.description,
      formatAmount(t.amount),
      TYPE_LABELS[t.type] || t.type,
      t.category?.name || '',
      t.account?.name || '',
      t.paymentMethod ? (PAYMENT_METHOD_LABELS[t.paymentMethod] || t.paymentMethod) : '',
      installmentLabel,
      t.notes || '',
    ].map(escapeCSV).join(',')
  })

  // BOM no início pro Excel abrir UTF-8 em pt-BR sem corromper acentos
  const csv = '﻿' + [header, ...rows].join('\r\n')

  // Filename inteligente: se start/endDate cobrem um mês inteiro, usa o nome
  // do mês; senão, timestamp do export.
  const filename = (() => {
    const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
    if (startDate && endDate) {
      const s = new Date(startDate)
      const e = new Date(endDate)
      // mesmo mês/ano + dia 1 → último dia
      if (
        s.getUTCFullYear() === e.getUTCFullYear() &&
        s.getUTCMonth() === e.getUTCMonth() &&
        s.getUTCDate() === 1
      ) {
        const lastDay = new Date(e.getUTCFullYear(), e.getUTCMonth() + 1, 0).getUTCDate()
        if (e.getUTCDate() === lastDay) {
          return `finn-transacoes-${monthNames[s.getUTCMonth()]}-${s.getUTCFullYear()}.csv`
        }
      }
    }
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    return `finn-transacoes-${y}-${m}-${d}.csv`
  })()

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
