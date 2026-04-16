import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import { canUseFeature } from '@/lib/plan-limits'

const anthropic = new Anthropic()

export async function POST() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const allowed = await canUseFeature(user.id, 'aiInsights')
  if (!allowed) {
    return Response.json({ error: 'Funcionalidade exclusiva do Finn Pro. Faça upgrade para desbloquear.', upgrade: true }, { status: 403 })
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  // Current month transactions
  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id, date: { gte: startOfMonth, lte: endOfMonth } },
    include: { category: { select: { name: true } } },
  })

  // Previous month transactions
  const prevTransactions = await prisma.transaction.findMany({
    where: { userId: user.id, date: { gte: startOfPrevMonth, lte: endOfPrevMonth } },
    include: { category: { select: { name: true } } },
  })

  // Budgets
  const budgets = await prisma.budget.findMany({
    where: { userId: user.id, isActive: true },
    include: { category: { select: { name: true } } },
  })

  // Budget spending
  const budgetData = await Promise.all(
    budgets.map(async (b) => {
      const spent = await prisma.transaction.aggregate({
        where: {
          userId: user.id,
          categoryId: b.categoryId,
          type: 'EXPENSE',
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      })
      return {
        category: b.category.name,
        limit: Number(b.amount),
        spent: Number(spent._sum.amount || 0),
      }
    })
  )

  // Goals
  const goals = await prisma.goal.findMany({
    where: { userId: user.id, isCompleted: false },
  })

  // Accounts
  const accounts = await prisma.account.findMany({
    where: { userId: user.id, isActive: true },
    select: { name: true, type: true, balance: true },
  })

  // Summary
  const income = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0)
  const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)
  const prevIncome = prevTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0)
  const prevExpense = prevTransactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)

  // Category breakdown
  const categorySpending: Record<string, number> = {}
  transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
    const cat = t.category?.name || 'Sem categoria'
    categorySpending[cat] = (categorySpending[cat] || 0) + Number(t.amount)
  })

  const prevCategorySpending: Record<string, number> = {}
  prevTransactions.filter(t => t.type === 'EXPENSE').forEach(t => {
    const cat = t.category?.name || 'Sem categoria'
    prevCategorySpending[cat] = (prevCategorySpending[cat] || 0) + Number(t.amount)
  })

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0)

  const financialContext = `
Dados financeiros do usuário (moeda: BRL):

RESUMO DO MÊS ATUAL:
- Receita: R$ ${income.toFixed(2)}
- Despesas: R$ ${expense.toFixed(2)}
- Saldo do mês: R$ ${(income - expense).toFixed(2)}
- Total em contas: R$ ${totalBalance.toFixed(2)}

RESUMO DO MÊS ANTERIOR:
- Receita: R$ ${prevIncome.toFixed(2)}
- Despesas: R$ ${prevExpense.toFixed(2)}

GASTOS POR CATEGORIA (mês atual):
${Object.entries(categorySpending).map(([cat, val]) => {
  const prev = prevCategorySpending[cat] || 0
  const change = prev > 0 ? ((val - prev) / prev * 100).toFixed(0) : 'novo'
  return `- ${cat}: R$ ${val.toFixed(2)} (mês anterior: R$ ${prev.toFixed(2)}, variação: ${change}%)`
}).join('\n')}

ORÇAMENTOS:
${budgetData.length > 0
  ? budgetData.map(b => `- ${b.category}: gasto R$ ${b.spent.toFixed(2)} de R$ ${b.limit.toFixed(2)} (${b.limit > 0 ? Math.round(b.spent / b.limit * 100) : 0}%)`).join('\n')
  : 'Nenhum orçamento configurado'}

METAS:
${goals.length > 0
  ? goals.map(g => `- ${g.name}: R$ ${Number(g.currentAmount).toFixed(2)} de R$ ${Number(g.targetAmount).toFixed(2)}${g.deadline ? ` (prazo: ${g.deadline.toLocaleDateString('pt-BR')})` : ''}`).join('\n')
  : 'Nenhuma meta configurada'}

CONTAS:
${accounts.map(a => `- ${a.name} (${a.type}): R$ ${Number(a.balance).toFixed(2)}`).join('\n')}
`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Você é um consultor financeiro pessoal. Analise os dados financeiros abaixo e gere exatamente 4-6 insights úteis e personalizados.

${financialContext}

Responda APENAS com um JSON array. Cada item deve ter:
- "title": título curto (max 60 caracteres)
- "body": explicação detalhada com números específicos (max 200 caracteres)
- "type": um de "spending", "saving", "budget", "goal", "trend", "tip"
- "severity": um de "info", "warning", "success", "alert"

Regras:
- Se gastos aumentaram muito vs mês anterior, dê um alerta
- Se há orçamento próximo ou estourado, avise
- Se há metas com progresso bom, parabenize
- Dê dicas práticas baseadas nos dados reais
- Use português brasileiro
- Responda APENAS o JSON, sem markdown, sem explicação extra`,
      }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    let insights: any[]
    try {
      insights = JSON.parse(text)
    } catch {
      // Try extracting JSON from response
      const match = text.match(/\[[\s\S]*\]/)
      if (match) {
        insights = JSON.parse(match[0])
      } else {
        return Response.json({ error: 'Erro ao processar resposta da IA' }, { status: 500 })
      }
    }

    // Delete old non-dismissed insights and save new ones
    await prisma.insight.deleteMany({
      where: { userId: user.id, isDismissed: false },
    })

    const created = await Promise.all(
      insights.map((insight: any) =>
        prisma.insight.create({
          data: {
            userId: user.id,
            title: insight.title,
            body: insight.body,
            type: insight.type || 'tip',
            severity: insight.severity || 'info',
          },
        })
      )
    )

    return Response.json({ data: created })
  } catch (error: any) {
    console.error('AI Insights error:', error)
    return Response.json({ error: 'Erro ao gerar insights. Verifique a chave da API.' }, { status: 500 })
  }
}
