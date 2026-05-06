import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { sendWhatsAppNotification } from '@/lib/messaging-adapter'

export const maxDuration = 120

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find all Pro users with autoInsights enabled
  const users = await prisma.user.findMany({
    where: { plan: 'PRO' },
    include: {
      notificationSetting: true,
      botConnections: {
        where: { platform: 'WHATSAPP', isVerified: true },
      },
    },
  })

  let insightsGenerated = 0
  let whatsappSent = 0
  let sendFailed = 0

  for (const user of users) {
    // Check if auto insights are enabled
    const autoEnabled = user.notificationSetting?.autoInsights ?? true
    if (!autoEnabled) continue

    // Check if user has transactions (worth analyzing)
    const txCount = await prisma.transaction.count({
      where: { userId: user.id },
    })
    if (txCount < 3) continue

    try {
      const insights = await generateInsightsForUser(user.id)
      if (!insights || insights.length === 0) continue
      insightsGenerated += insights.length

      // Send important insights via WhatsApp (telegramInsights flag is reused
      // as a generic "send insights via bot" toggle — not renamed to avoid
      // a Prisma migration; the UI no longer exposes it.)
      const insightsEnabled = user.notificationSetting?.telegramInsights ?? true
      const connection = user.botConnections[0]

      if (insightsEnabled && connection) {
        const importantInsights = insights.filter(
          (i: any) => i.severity === 'warning' || i.severity === 'alert'
        )

        if (importantInsights.length > 0) {
          let message = '*💡 Insights da semana*\n\n'

          for (const insight of importantInsights) {
            const emoji =
              insight.severity === 'alert' ? '🔴' :
              insight.severity === 'warning' ? '🟡' :
              insight.severity === 'success' ? '🟢' : '🔵'

            message += `${emoji} *${insight.title}*\n${insight.body}\n\n`
          }

          message += '_Veja todos os insights no app Finn._'

          // Adapter cuida da janela 24h: free-form se aberta, template
          // UTILITY (`balance_update`) se fora. Insights são transacionais
          // (atualização de conta) — categoria UTILITY garante entrega
          // confiável e custo baixo (~R$ 0,04/conversa).
          const result = await sendWhatsAppNotification({
            userId: user.id,
            connection,
            text: message,
            templateFallback: {
              templateName: process.env.WHATSAPP_TEMPLATE_BALANCE_UPDATE,
              bodyParameters: [
                `${importantInsights.length} insight(s) novo(s) sobre seus gastos`,
              ],
            },
          })
          if (result.ok) {
            whatsappSent++
          } else {
            sendFailed++
            console.error(`[weekly-insights] Send failed for user ${user.id}:`, JSON.stringify(result.attempts))
          }
        }
      }
    } catch (err) {
      console.error(`Error generating insights for user ${user.id}:`, err)
    }
  }

  return Response.json({
    data: {
      usersProcessed: users.length,
      insightsGenerated,
      whatsappSent,
      sendFailed,
      timestamp: new Date().toISOString(),
    },
  })
}

async function generateInsightsForUser(userId: string) {
  const anthropic = new Anthropic()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  const [transactions, prevTransactions, budgets, goals, accounts] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: startOfMonth, lte: endOfMonth } },
      include: { category: { select: { name: true } } },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: startOfPrevMonth, lte: endOfPrevMonth } },
      include: { category: { select: { name: true } } },
    }),
    prisma.budget.findMany({
      where: { userId, isActive: true },
      include: { category: { select: { name: true } } },
    }),
    prisma.goal.findMany({ where: { userId, isCompleted: false } }),
    prisma.account.findMany({
      where: { userId, isActive: true },
      select: { name: true, type: true, balance: true },
    }),
  ])

  const budgetData = await Promise.all(
    budgets.map(async (b) => {
      const spent = await prisma.transaction.aggregate({
        where: { userId, categoryId: b.categoryId, type: 'EXPENSE', date: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { amount: true },
      })
      return { category: b.category.name, limit: Number(b.amount), spent: Number(spent._sum.amount || 0) }
    })
  )

  const income = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0)
  const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)
  const prevIncome = prevTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0)
  const prevExpense = prevTransactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)

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
Dados financeiros (BRL):
Receita mês atual: R$ ${income.toFixed(2)} | anterior: R$ ${prevIncome.toFixed(2)}
Despesas mês atual: R$ ${expense.toFixed(2)} | anterior: R$ ${prevExpense.toFixed(2)}
Saldo total: R$ ${totalBalance.toFixed(2)}

Gastos por categoria:
${Object.entries(categorySpending).map(([cat, val]) => {
  const prev = prevCategorySpending[cat] || 0
  return `- ${cat}: R$ ${val.toFixed(2)} (anterior: R$ ${prev.toFixed(2)})`
}).join('\n')}

Orçamentos:
${budgetData.length > 0 ? budgetData.map(b => `- ${b.category}: R$ ${b.spent.toFixed(2)} de R$ ${b.limit.toFixed(2)} (${b.limit > 0 ? Math.round(b.spent / b.limit * 100) : 0}%)`).join('\n') : 'Nenhum'}

Metas:
${goals.length > 0 ? goals.map(g => `- ${g.name}: R$ ${Number(g.currentAmount).toFixed(2)} de R$ ${Number(g.targetAmount).toFixed(2)}`).join('\n') : 'Nenhuma'}
`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Analise e gere 3-5 insights financeiros personalizados.\n\n${financialContext}\n\nResponda APENAS JSON array: [{"title":"...","body":"...","type":"spending|saving|budget|goal|trend|tip","severity":"info|warning|success|alert"}]. Português brasileiro. Sem markdown.`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return null

  const insights = JSON.parse(match[0])

  // Delete old non-dismissed and save new
  await prisma.insight.deleteMany({ where: { userId, isDismissed: false } })

  const created = await Promise.all(
    insights.map((insight: any) =>
      prisma.insight.create({
        data: {
          userId,
          title: insight.title,
          body: insight.body,
          type: insight.type || 'tip',
          severity: insight.severity || 'info',
        },
      })
    )
  )

  return created
}
