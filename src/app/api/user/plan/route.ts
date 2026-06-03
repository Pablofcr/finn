import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { PLAN_LIMITS, PLAN_PRICES } from '@/lib/plan-limits'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const plan = user.plan || 'TRIAL'
  const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]

  // Get current usage + subscription pra countdown do trial
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [transactionsCount, accountsCount, budgetsCount, goalsCount, recurringCount, subscription] = await Promise.all([
    prisma.transaction.count({ where: { userId: user.id, createdAt: { gte: startOfMonth } } }),
    prisma.account.count({ where: { userId: user.id } }),
    prisma.budget.count({ where: { userId: user.id } }),
    prisma.goal.count({ where: { userId: user.id } }),
    prisma.recurringTransaction.count({ where: { userId: user.id, status: 'ACTIVE' } }),
    prisma.subscription.findUnique({
      where: { userId: user.id },
      select: { status: true, trialEndsAt: true, currentPeriodEnd: true },
    }),
  ])

  // Dias restantes do trial — só faz sentido pra plan=TRIAL
  let daysLeftInTrial: number | null = null
  if (plan === 'TRIAL' && subscription?.trialEndsAt) {
    const msLeft = subscription.trialEndsAt.getTime() - now.getTime()
    daysLeftInTrial = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)))
  }

  return Response.json({
    data: {
      plan,
      price: PLAN_PRICES[plan as keyof typeof PLAN_PRICES],
      limits,
      subscription: subscription ? {
        status: subscription.status,
        trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      } : null,
      daysLeftInTrial,
      foundingMember: plan === 'MASTER',
      usage: {
        transactionsThisMonth: transactionsCount,
        accounts: accountsCount,
        budgets: budgetsCount,
        goals: goalsCount,
        recurringTransactions: recurringCount,
      },
    },
  })
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { plan, billingCycle } = body as { plan: 'PRO' | 'TRIAL'; billingCycle?: 'MONTHLY' | 'YEARLY' }

  if (plan !== 'PRO' && plan !== 'TRIAL') {
    return Response.json({ error: 'Plano inválido' }, { status: 400 })
  }

  // Update user plan
  await prisma.user.update({
    where: { id: user.id },
    data: { plan },
  })

  // If upgrading to Pro, auto-register Finn subscription as recurring expense
  if (plan === 'PRO') {
    const cycle = billingCycle || 'MONTHLY'
    const amount = cycle === 'YEARLY' ? 178.80 : 14.90 // R$14,90/mês ou R$178,80/ano
    const frequency = cycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY'

    // Get user's default account
    const defaultAccount = await prisma.account.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    })

    if (defaultAccount) {
      // Check if already has a Finn subscription recurring
      const existingFinnSub = await prisma.recurringTransaction.findFirst({
        where: {
          userId: user.id,
          description: { contains: 'Finn Pro' },
          status: 'ACTIVE',
        },
      })

      if (!existingFinnSub) {
        const now = new Date()

        // Create the first transaction
        await prisma.transaction.create({
          data: {
            userId: user.id,
            description: `Assinatura Finn Pro (${cycle === 'YEARLY' ? 'Anual' : 'Mensal'})`,
            amount,
            type: 'EXPENSE',
            date: now,
            accountId: defaultAccount.id,
          },
        })

        // Create recurring transaction for future charges
        await prisma.recurringTransaction.create({
          data: {
            userId: user.id,
            description: `Assinatura Finn Pro (${cycle === 'YEARLY' ? 'Anual' : 'Mensal'})`,
            amount,
            type: 'EXPENSE',
            frequency,
            startDate: now,
            nextDueDate: now,
            accountId: defaultAccount.id,
            autoConfirm: false,
          },
        })

        // Update account balance
        await prisma.account.update({
          where: { id: defaultAccount.id },
          data: { balance: { decrement: amount } },
        })
      }
    }
  }

  // If downgrading to Trial, cancel Finn subscription recurring
  if (plan === 'TRIAL') {
    await prisma.recurringTransaction.updateMany({
      where: {
        userId: user.id,
        description: { contains: 'Finn Pro' },
        status: 'ACTIVE',
      },
      data: { status: 'CANCELLED' },
    })
  }

  return Response.json({
    data: {
      plan,
      message: plan === 'PRO'
        ? 'Bem-vindo ao Finn Pro! Assinatura registrada automaticamente.'
        : 'Plano voltou para Diagnóstico.',
    },
  })
}
