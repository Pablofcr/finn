/**
 * Backfill: gera RecurringOccurrence pra cada parcela teórica de cada
 * RecurringTransaction existente. Idempotente — usa upsert no
 * (recurringTransactionId, dueDate) unique.
 *
 * Estratégia:
 *  1) Pra cada Transaction vinculada a uma RecurringTransaction, cria
 *     occurrence PAID com paidTransactionId = tx.id, dueDate = tx.date.
 *     (Aproximação: dueDate teórico nem sempre bate com data exata de
 *     pagamento, mas pra histórico isso é suficiente.)
 *
 *  2) Pra cada RecurringTransaction ACTIVE, gera occurrences PENDING
 *     pra todas as datas teóricas entre `nextDueDate` e `hoje + 7 dias`
 *     (folga pra cobrir o cron que olha "vencendo em até 3 dias"). Isso
 *     cria as parcelas vencidas-mas-não-confirmadas (caso Diarista) +
 *     a parcela "atual" + parcelas iminentes.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/backfill-recurring-occurrences.ts
 *
 * Re-rodar é seguro: occurrences existentes são puladas pelo unique.
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { advanceByFrequency, expectedDueDatesBetween } from '../src/lib/recurring-occurrence'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const now = new Date()
  const horizon = new Date(now)
  horizon.setUTCDate(horizon.getUTCDate() + 7)

  // ─── Step 1: Occurrences PAID a partir das Transactions existentes ──
  const txs = await prisma.transaction.findMany({
    where: { recurringTransactionId: { not: null } },
    select: { id: true, recurringTransactionId: true, date: true, description: true },
    orderBy: { date: 'asc' },
  })

  let paidCreated = 0
  let paidSkipped = 0
  for (const tx of txs) {
    const existing = await prisma.recurringOccurrence.findFirst({
      where: {
        recurringTransactionId: tx.recurringTransactionId!,
        dueDate: tx.date,
      },
      select: { id: true },
    })
    if (existing) {
      paidSkipped++
      continue
    }
    try {
      await prisma.recurringOccurrence.create({
        data: {
          recurringTransactionId: tx.recurringTransactionId!,
          dueDate: tx.date,
          status: 'PAID',
          paidTransactionId: tx.id,
        },
      })
      paidCreated++
    } catch (err) {
      // Possível colisão de unique (recurringId, dueDate) por concorrência.
      // Pra script one-shot, basta logar e seguir.
      console.warn(`PAID skip ${tx.id}:`, err instanceof Error ? err.message : err)
      paidSkipped++
    }
  }

  console.log(`PAID: criadas ${paidCreated}, puladas ${paidSkipped}`)

  // ─── Step 2: Occurrences PENDING das recorrências ativas ────────────
  const recurrings = await prisma.recurringTransaction.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      description: true,
      startDate: true,
      nextDueDate: true,
      frequency: true,
    },
  })

  let pendingCreated = 0
  let pendingSkipped = 0
  for (const rec of recurrings) {
    // Datas teóricas entre nextDueDate (inclusivo) e hoje+7 (inclusivo).
    // Se nextDueDate é futuro distante, só gera essa única occurrence.
    const upperBound = rec.nextDueDate > horizon ? rec.nextDueDate : horizon
    const dates = expectedDueDatesBetween(
      rec.startDate,
      rec.frequency,
      rec.nextDueDate,
      upperBound,
    )

    for (const dueDate of dates) {
      try {
        const created = await prisma.recurringOccurrence.create({
          data: {
            recurringTransactionId: rec.id,
            dueDate,
            status: 'PENDING',
          },
        })
        pendingCreated++
        console.log(
          `  + ${rec.description} ${dueDate.toISOString().slice(0, 10)} (id ${created.id.slice(0, 8)})`,
        )
      } catch (err) {
        // Unique violation — já existe (ex: foi criada no Step 1 como PAID).
        pendingSkipped++
      }
    }
  }

  console.log(`\nPENDING: criadas ${pendingCreated}, puladas ${pendingSkipped}`)

  // ─── Step 3: Sumário do estado pós-backfill ─────────────────────────
  const summary = await prisma.recurringOccurrence.groupBy({
    by: ['status'],
    _count: { _all: true },
  })
  console.log('\nEstado das occurrences:')
  for (const row of summary) {
    console.log(`  ${row.status}: ${row._count._all}`)
  }
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())

export {}
