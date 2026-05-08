/**
 * Backfill: cria registro Subscription pra todos os usuários existentes.
 *
 * Executar UMA VEZ depois de rodar `npm run db:push` com o schema novo.
 * Idempotente — pula users que já têm subscription.
 *
 * Política: todos os users existentes ganham um trial fresco de 14 dias
 * a partir da execução deste script (Pablo decidiu — quem já tava no app
 * teve acesso aberto antes, agora ganha 14 dias do Diagnóstico antes do
 * paywall, sem penalidade).
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/backfill-subscriptions.ts
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const TRIAL_DAYS = 14

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Backfill de Subscriptions iniciado.\n')

  const usersWithoutSubscription = await prisma.user.findMany({
    where: { subscription: null },
    select: { id: true, email: true, plan: true, createdAt: true },
  })

  console.log(`Encontrados ${usersWithoutSubscription.length} users sem subscription.\n`)

  if (usersWithoutSubscription.length === 0) {
    console.log('Nada a fazer. Saindo.')
    return
  }

  const now = new Date()
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)

  let created = 0
  for (const user of usersWithoutSubscription) {
    try {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          status: 'TRIAL',
          plan: 'TRIAL',
          trialStartedAt: now,
          trialEndsAt,
        },
      })
      console.log(`✅ ${user.email} → trial até ${trialEndsAt.toISOString()}`)
      created++
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      console.error(`❌ ${user.email}: ${reason}`)
    }
  }

  console.log(`\nBackfill concluído: ${created}/${usersWithoutSubscription.length} subscriptions criadas.`)
  await prisma.$disconnect()
}

main().catch(err => { console.error('Erro fatal:', err); process.exit(1) })

export {}
