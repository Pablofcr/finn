/**
 * Migra usuários FREE legados pra TRIAL (Diagnóstico Financeiro 14 dias).
 * Decisão Pablo (2026-06-03): NÃO retroativo — hoje conta como dia 1 do
 * trial pra todos os FREE atuais. trialEndsAt = hoje + 14d.
 *
 * MASTER (Pablo) e PRO (Dyely) ficam intactos.
 *
 * Idempotente: roda quantas vezes quiser; só toca users com plan=FREE.
 *
 * Uso:
 *   npx tsx scripts/migrate-free-to-trial.ts            # dry-run
 *   npx tsx scripts/migrate-free-to-trial.ts --apply    # aplica
 */
import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local', override: true })

import prisma from '../src/lib/prisma'

const TRIAL_DAYS = 14

async function main() {
  const apply = process.argv.includes('--apply')

  const freeUsers = await prisma.user.findMany({
    where: { plan: 'FREE' },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      subscription: { select: { id: true, status: true, trialEndsAt: true } },
    },
  })

  console.log(`Found ${freeUsers.length} FREE users to migrate:\n`)
  freeUsers.forEach(u => console.log({
    email: u.email,
    name: u.name,
    accountAge: Math.floor((Date.now() - u.createdAt.getTime()) / (1000 * 60 * 60 * 24)) + 'd',
    hasSubscription: !!u.subscription,
    subStatus: u.subscription?.status ?? null,
  }))

  if (!apply) {
    console.log('\n(dry-run — run with --apply pra aplicar)')
    return
  }

  // 14 dias a partir de AGORA — NÃO retroativo
  const now = new Date()
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)

  console.log(`\nApplying: plan=TRIAL, trialEndsAt=${trialEndsAt.toISOString()}\n`)

  for (const u of freeUsers) {
    await prisma.$transaction(async (tx) => {
      // Atualiza User.plan
      await tx.user.update({
        where: { id: u.id },
        data: { plan: 'TRIAL' },
      })

      // Cria ou atualiza Subscription pra refletir o novo trial
      await tx.subscription.upsert({
        where: { userId: u.id },
        create: {
          userId: u.id,
          status: 'TRIAL',
          plan: 'TRIAL',
          trialStartedAt: now,
          trialEndsAt,
        },
        update: {
          status: 'TRIAL',
          plan: 'TRIAL',
          trialStartedAt: now,
          trialEndsAt,
          trialExpiredAt: null,
        },
      })
    })

    console.log(`✅ ${u.email} migrated`)
  }

  console.log(`\nDone. ${freeUsers.length} users migrated to TRIAL.`)
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
