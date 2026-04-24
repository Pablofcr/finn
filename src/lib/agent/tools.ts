import prisma from '@/lib/prisma'
import {
  getPendingBills,
  getTransactionsByPeriod,
  getMonthSummary,
  getSpendingByCategory,
  getAccountBalance,
  getTopExpenses,
  comparePeriods,
  getBudgetStatus,
  getGoalProgress,
  searchTransactions,
} from '@/lib/finance-queries'
import { markRecurringAsPaid, updateTransaction } from '@/lib/finance-actions'
import type { TransactionType, PaymentMethod } from '@/generated/prisma/enums'

// ============================================================
// Tool schemas — Anthropic tool_use spec
// ============================================================

type JSONSchema = {
  type: 'object'
  properties: Record<string, unknown>
  required?: string[]
}

type ToolDefinition = {
  name: string
  description: string
  input_schema: JSONSchema
}

export const AGENT_TOOLS: readonly ToolDefinition[] = [
  {
    name: 'get_pending_bills',
    description:
      'Lista contas e compromissos a pagar: recorrências ativas e faturas de cartão em aberto. Use quando o usuário pergunta o que tem a pagar, quais contas estão pendentes, o que vence até determinada data, etc.',
    input_schema: {
      type: 'object',
      properties: {
        until_date: {
          type: 'string',
          description:
            'Data limite no formato YYYY-MM-DD. Se omitido, considera todas as contas até o fim do mês corrente. Ex: "2026-04-30" para "até fim de abril".',
        },
      },
    },
  },
  {
    name: 'get_transactions_by_period',
    description:
      'Lista transações (despesas e/ou receitas) num período. Use quando o usuário pergunta sobre gastos/entradas em datas específicas ("ontem", "semana passada", "em março").',
    input_schema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Data inicial no formato YYYY-MM-DD',
        },
        end_date: {
          type: 'string',
          description: 'Data final no formato YYYY-MM-DD',
        },
        type: {
          type: 'string',
          enum: ['INCOME', 'EXPENSE'],
          description: 'Filtra só receitas ou só despesas. Omita para buscar ambas.',
        },
        category_name: {
          type: 'string',
          description:
            'Filtra por nome de categoria (busca parcial, case-insensitive). Ex: "mercado", "transporte".',
        },
        limit: {
          type: 'integer',
          description: 'Máximo de transações a retornar. Padrão 50.',
        },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'get_month_summary',
    description:
      'Resumo de um mês específico: total de entradas, total de saídas, saldo do mês, contagem de transações e top 3 categorias de gasto. Use quando o usuário pede "resumo do mês", "como estou", ou similar.',
    input_schema: {
      type: 'object',
      properties: {
        year: {
          type: 'integer',
          description: 'Ano, ex: 2026',
        },
        month: {
          type: 'integer',
          description: 'Mês de 1 a 12 (Janeiro=1, Dezembro=12)',
        },
      },
      required: ['year', 'month'],
    },
  },
  {
    name: 'get_spending_by_category',
    description:
      'Agrega gastos por categoria num período, ordenado do maior para o menor com percentuais. Use para "no que mais gastei este mês", "quanto gastei por categoria".',
    input_schema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Data inicial YYYY-MM-DD',
        },
        end_date: {
          type: 'string',
          description: 'Data final YYYY-MM-DD',
        },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'get_account_balance',
    description:
      'Retorna saldo e informações de uma conta específica ou de todas as contas ativas. Use para "qual meu saldo", "quanto tenho no nubank", etc.',
    input_schema: {
      type: 'object',
      properties: {
        account_name: {
          type: 'string',
          description:
            'Nome da conta (busca parcial, case-insensitive). Omita para listar todas as contas ativas.',
        },
      },
    },
  },
  {
    name: 'get_top_expenses',
    description:
      'Maiores despesas de um período. Use para "quais foram meus maiores gastos", "top 5 despesas do mês".',
    input_schema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Data inicial YYYY-MM-DD',
        },
        end_date: {
          type: 'string',
          description: 'Data final YYYY-MM-DD',
        },
        limit: {
          type: 'integer',
          description: 'Quantidade de despesas a retornar. Padrão 5.',
        },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'compare_periods',
    description:
      'Compara entradas, saídas e saldo entre dois períodos. Use para "compara março com abril", "gastei mais este mês que no mês passado?".',
    input_schema: {
      type: 'object',
      properties: {
        period_a_start: {
          type: 'string',
          description: 'Início do primeiro período YYYY-MM-DD',
        },
        period_a_end: {
          type: 'string',
          description: 'Fim do primeiro período YYYY-MM-DD',
        },
        period_b_start: {
          type: 'string',
          description: 'Início do segundo período YYYY-MM-DD',
        },
        period_b_end: {
          type: 'string',
          description: 'Fim do segundo período YYYY-MM-DD',
        },
      },
      required: ['period_a_start', 'period_a_end', 'period_b_start', 'period_b_end'],
    },
  },
  {
    name: 'get_budget_status',
    description:
      'Status de orçamentos (todos ou de uma categoria). Retorna quanto foi consumido do limite, quanto sobra, e se alerta foi disparado. Use para "como tá meu orçamento", "quanto sobrou de lazer".',
    input_schema: {
      type: 'object',
      properties: {
        category_name: {
          type: 'string',
          description:
            'Nome da categoria do orçamento. Omita para retornar todos os orçamentos ativos.',
        },
      },
    },
  },
  {
    name: 'get_goal_progress',
    description:
      'Progresso de metas financeiras. Use para "como tá minha meta", "quanto falta pro objetivo".',
    input_schema: {
      type: 'object',
      properties: {
        goal_name: {
          type: 'string',
          description:
            'Nome da meta (busca parcial, case-insensitive). Omita para listar todas as metas.',
        },
      },
    },
  },
  {
    name: 'search_transactions',
    description:
      'Busca textual em descrições de transações. Use quando o usuário pergunta sobre uma transação específica por palavra-chave ("transações com uber", "quando foi o último ifood").',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Texto a buscar na descrição (case-insensitive)',
        },
        start_date: {
          type: 'string',
          description: 'Opcional — data inicial YYYY-MM-DD',
        },
        end_date: {
          type: 'string',
          description: 'Opcional — data final YYYY-MM-DD',
        },
        limit: {
          type: 'integer',
          description: 'Máximo de resultados. Padrão 20.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'mark_recurring_as_paid',
    description:
      'Marca UMA recorrência (conta recorrente) como paga: cria a transação, aplica saldo na conta vinculada e avança a próxima data de vencimento. Use APENAS quando o usuário disser explicitamente que uma conta foi paga (ex: "o condomínio foi pago", "quitei a internet", "paguei o aluguel"). NUNCA use pra registrar uma compra nova — pra isso o parser de transação existente cuida.\n\nFLUXO CORRETO: 1) Primeiro chame get_pending_bills pra listar as recorrências. 2) Identifique qual(is) o usuário mencionou. 3) Chame esta tool uma vez por recorrência, passando o `id` que veio do get_pending_bills (onde source="recurring"). A tool retorna qual conta e forma de pagamento foram usadas — reporte isso ao usuário.',
    input_schema: {
      type: 'object',
      properties: {
        recurring_id: {
          type: 'string',
          description:
            'ID da recorrência (vem do campo `id` de um item de get_pending_bills com source="recurring")',
        },
        paid_date: {
          type: 'string',
          description:
            'Data em que foi pago, formato YYYY-MM-DD. Se omitido, usa a data de vencimento da recorrência.',
        },
      },
      required: ['recurring_id'],
    },
  },
  {
    name: 'update_transaction',
    description:
      'Atualiza uma transação existente: troca a conta, a forma de pagamento ou a data. Use quando o usuário pedir correção de uma baixa recém-registrada ("corrige o Zen pra Nubank PIX", "na verdade paguei pelo Itaú", "foi no crédito não no débito").\n\nFLUXO CORRETO: 1) Primeiro chame search_transactions pra achar a transação pelo nome (passe os últimos dias como filtro). 2) Pegue o `id` da transação certa. 3) Chame esta tool passando `transaction_id` + só os campos a alterar.',
    input_schema: {
      type: 'object',
      properties: {
        transaction_id: {
          type: 'string',
          description: 'ID da transação (do campo `id` retornado por search_transactions)',
        },
        account_name: {
          type: 'string',
          description:
            'Nome (parcial, case-insensitive) da nova conta. Omita se não for pra mudar a conta.',
        },
        payment_method: {
          type: 'string',
          enum: ['PIX', 'DEBIT', 'CREDIT', 'CASH', 'BOLETO', 'TRANSFER'],
          description: 'Nova forma de pagamento. Omita se não for pra mudar.',
        },
        date: {
          type: 'string',
          description: 'Nova data YYYY-MM-DD. Omita se não for pra mudar.',
        },
      },
      required: ['transaction_id'],
    },
  },
] as const

// ============================================================
// Dispatcher — maps tool name to finance-queries function
// ============================================================

type ToolResult = { ok: true; data: unknown } | { ok: false; error: string }

function parseDate(s: unknown): Date | null {
  if (typeof s !== 'string') return null
  const d = new Date(s.length === 10 ? `${s}T00:00:00` : s)
  return isNaN(d.getTime()) ? null : d
}

function endOfDay(s: unknown): Date | null {
  if (typeof s !== 'string') return null
  const d = new Date(s.length === 10 ? `${s}T23:59:59` : s)
  return isNaN(d.getTime()) ? null : d
}

async function resolveCategoryId(userId: string, name: string): Promise<string | null> {
  const cat = await prisma.category.findFirst({
    where: { userId, name: { contains: name, mode: 'insensitive' } },
    select: { id: true },
  })
  return cat?.id ?? null
}

/**
 * Resolves a category by name and returns its id PLUS all subcategory ids
 * underneath it. Used so a query for "Alimentação" also rolls up Mercado,
 * Restaurante, Delivery, Lanche.
 */
async function resolveCategoryIdsWithChildren(
  userId: string,
  name: string
): Promise<string[] | null> {
  const cat = await prisma.category.findFirst({
    where: { userId, name: { contains: name, mode: 'insensitive' } },
    select: { id: true, subcategories: { select: { id: true } } },
  })
  if (!cat) return null
  return [cat.id, ...cat.subcategories.map((s) => s.id)]
}

async function resolveAccountId(userId: string, name: string): Promise<string | null> {
  const acc = await prisma.account.findFirst({
    where: { userId, isActive: true, name: { contains: name, mode: 'insensitive' } },
    select: { id: true },
  })
  return acc?.id ?? null
}

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  userId: string
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case 'get_pending_bills': {
        const until = toolInput.until_date ? endOfDay(toolInput.until_date) : undefined
        if (toolInput.until_date && !until) return { ok: false, error: 'until_date inválida' }
        const data = await getPendingBills(userId, until ?? undefined)
        return { ok: true, data }
      }

      case 'get_transactions_by_period': {
        const start = parseDate(toolInput.start_date)
        const end = endOfDay(toolInput.end_date)
        if (!start || !end) return { ok: false, error: 'start_date/end_date inválidas' }
        const type =
          toolInput.type === 'INCOME' || toolInput.type === 'EXPENSE'
            ? (toolInput.type as TransactionType)
            : undefined
        let categoryIds: string[] | undefined
        if (typeof toolInput.category_name === 'string' && toolInput.category_name.trim()) {
          const resolved = await resolveCategoryIdsWithChildren(userId, toolInput.category_name.trim())
          if (!resolved) {
            return {
              ok: true,
              data: { note: `Nenhuma categoria encontrada com o nome "${toolInput.category_name}"`, transactions: [] },
            }
          }
          categoryIds = resolved
        }
        const limit = typeof toolInput.limit === 'number' ? toolInput.limit : undefined
        const data = await getTransactionsByPeriod(userId, start, end, { type, categoryIds, limit })
        return { ok: true, data }
      }

      case 'get_month_summary': {
        const year = Number(toolInput.year)
        const month = Number(toolInput.month)
        if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
          return { ok: false, error: 'year deve ser ano válido, month entre 1 e 12' }
        }
        const data = await getMonthSummary(userId, year, month)
        return { ok: true, data }
      }

      case 'get_spending_by_category': {
        const start = parseDate(toolInput.start_date)
        const end = endOfDay(toolInput.end_date)
        if (!start || !end) return { ok: false, error: 'start_date/end_date inválidas' }
        const data = await getSpendingByCategory(userId, start, end)
        return { ok: true, data }
      }

      case 'get_account_balance': {
        if (typeof toolInput.account_name === 'string' && toolInput.account_name.trim()) {
          const accountId = await resolveAccountId(userId, toolInput.account_name.trim())
          if (!accountId) {
            return {
              ok: true,
              data: { note: `Nenhuma conta encontrada com o nome "${toolInput.account_name}"`, accounts: [] },
            }
          }
          const data = await getAccountBalance(userId, accountId)
          return { ok: true, data }
        }
        const data = await getAccountBalance(userId)
        return { ok: true, data }
      }

      case 'get_top_expenses': {
        const start = parseDate(toolInput.start_date)
        const end = endOfDay(toolInput.end_date)
        if (!start || !end) return { ok: false, error: 'start_date/end_date inválidas' }
        const limit = typeof toolInput.limit === 'number' ? toolInput.limit : 5
        const data = await getTopExpenses(userId, start, end, limit)
        return { ok: true, data }
      }

      case 'compare_periods': {
        const aStart = parseDate(toolInput.period_a_start)
        const aEnd = endOfDay(toolInput.period_a_end)
        const bStart = parseDate(toolInput.period_b_start)
        const bEnd = endOfDay(toolInput.period_b_end)
        if (!aStart || !aEnd || !bStart || !bEnd) {
          return { ok: false, error: 'datas dos períodos inválidas' }
        }
        const data = await comparePeriods(
          userId,
          { start: aStart, end: aEnd },
          { start: bStart, end: bEnd }
        )
        return { ok: true, data }
      }

      case 'get_budget_status': {
        let categoryId: string | undefined
        if (typeof toolInput.category_name === 'string' && toolInput.category_name.trim()) {
          const resolved = await resolveCategoryId(userId, toolInput.category_name.trim())
          if (!resolved) {
            return {
              ok: true,
              data: { note: `Nenhuma categoria encontrada com o nome "${toolInput.category_name}"`, budgets: [] },
            }
          }
          categoryId = resolved
        }
        const data = await getBudgetStatus(userId, categoryId)
        return { ok: true, data }
      }

      case 'get_goal_progress': {
        let goalId: string | undefined
        if (typeof toolInput.goal_name === 'string' && toolInput.goal_name.trim()) {
          const goal = await prisma.goal.findFirst({
            where: { userId, name: { contains: toolInput.goal_name.trim(), mode: 'insensitive' } },
            select: { id: true },
          })
          if (!goal) {
            return {
              ok: true,
              data: { note: `Nenhuma meta encontrada com o nome "${toolInput.goal_name}"`, goals: [] },
            }
          }
          goalId = goal.id
        }
        const data = await getGoalProgress(userId, goalId)
        return { ok: true, data }
      }

      case 'search_transactions': {
        const query = typeof toolInput.query === 'string' ? toolInput.query : ''
        if (!query.trim()) return { ok: false, error: 'query não pode estar vazia' }
        const start = toolInput.start_date ? parseDate(toolInput.start_date) : undefined
        const end = toolInput.end_date ? endOfDay(toolInput.end_date) : undefined
        const limit = typeof toolInput.limit === 'number' ? toolInput.limit : undefined
        const data = await searchTransactions(userId, query, {
          start: start ?? undefined,
          end: end ?? undefined,
          limit,
        })
        return { ok: true, data }
      }

      case 'mark_recurring_as_paid': {
        const recurringId = typeof toolInput.recurring_id === 'string' ? toolInput.recurring_id : ''
        if (!recurringId) return { ok: false, error: 'recurring_id é obrigatório' }
        const paidDate = toolInput.paid_date ? parseDate(toolInput.paid_date) : undefined
        if (toolInput.paid_date && !paidDate) {
          return { ok: false, error: 'paid_date inválida (use YYYY-MM-DD)' }
        }
        const result = await markRecurringAsPaid(userId, recurringId, paidDate ?? undefined)
        return result.ok ? { ok: true, data: result } : { ok: false, error: result.error ?? 'falha ao marcar como pago' }
      }

      case 'update_transaction': {
        const transactionId = typeof toolInput.transaction_id === 'string' ? toolInput.transaction_id : ''
        if (!transactionId) return { ok: false, error: 'transaction_id é obrigatório' }
        const accountName =
          typeof toolInput.account_name === 'string' && toolInput.account_name.trim()
            ? toolInput.account_name.trim()
            : undefined
        const method =
          typeof toolInput.payment_method === 'string' &&
          ['PIX', 'DEBIT', 'CREDIT', 'CASH', 'BOLETO', 'TRANSFER'].includes(toolInput.payment_method)
            ? (toolInput.payment_method as PaymentMethod)
            : undefined
        const date = toolInput.date ? parseDate(toolInput.date) : undefined
        if (toolInput.date && !date) {
          return { ok: false, error: 'date inválida (use YYYY-MM-DD)' }
        }
        if (!accountName && !method && !date) {
          return { ok: false, error: 'passe ao menos um campo pra atualizar: account_name, payment_method ou date' }
        }
        const result = await updateTransaction(userId, transactionId, {
          accountName,
          paymentMethod: method,
          date: date ?? undefined,
        })
        return result.ok ? { ok: true, data: result } : { ok: false, error: result.error ?? 'falha ao atualizar' }
      }

      default:
        return { ok: false, error: `Tool desconhecida: ${toolName}` }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Erro ao executar ${toolName}: ${msg}` }
  }
}
