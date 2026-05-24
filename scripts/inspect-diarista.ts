/**
 * Dump completo do estado da Diarista pra investigar dois bugs reportados:
 *   1) Lembrete mostrou "2 pendentes" mas deveria ser 3
 *   2) Vencimentos parecem cair em sexta, mas user lembra que era quarta
 *
 * Lista a recurring + TODAS as occurrences (PAID/PENDING) + Transactions
 * legadas linkadas. Pra cada dueDate calcula dia da semana em UTC pra
 * confirmar drift.
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

async function main() {
  const pablo = await prisma.user.findFirst({ where: { email: 'pablofcr@gmail.com' } })
  if (!pablo) { console.error('Pablo não encontrado.'); return }

  const recurring = await prisma.recurringTransaction.findFirst({
    where: { userId: pablo.id, description: { contains: 'Diarista', mode: 'insensitive' } },
  })
  if (!recurring) { console.error('Diarista não encontrada.'); return }

  console.log('━━━ RecurringTransaction ━━━')
  console.log(`  id:           ${recurring.id}`)
  console.log(`  description:  ${recurring.description}`)
  console.log(`  frequency:    ${recurring.frequency}`)
  console.log(`  startDate:    ${recurring.startDate.toISOString()}  (${WEEKDAYS[recurring.startDate.getUTCDay()]})`)
  console.log(`  nextDueDate:  ${recurring.nextDueDate.toISOString()}  (${WEEKDAYS[recurring.nextDueDate.getUTCDay()]})`)
  console.log(`  endDate:      ${recurring.endDate?.toISOString() ?? '(none)'}`)
  console.log(`  status:       ${recurring.status}`)
  console.log(`  snoozedUntil: ${recurring.snoozedUntil?.toISOString() ?? '(none)'}`)
  console.log(`  amount:       R$ ${Number(recurring.amount).toFixed(2)}`)
  console.log()

  const occs = await prisma.recurringOccurrence.findMany({
    where: { recurringTransactionId: recurring.id },
    orderBy: { dueDate: 'asc' },
    include: { transaction: { select: { id: true, date: true, amount: true, createdAt: true } } },
  })

  console.log(`━━━ RecurringOccurrences (${occs.length} total) ━━━`)
  for (const o of occs) {
    const dueDow = WEEKDAYS[o.dueDate.getUTCDay()]
    const txInfo = o.transaction
      ? ` tx@${o.transaction.date.toISOString().slice(0, 10)}`
      : ''
    console.log(`  ${o.dueDate.toISOString().slice(0, 10)} (${dueDow})  ${o.status.padEnd(8)} occ=${o.id}${txInfo}`)
  }
  console.log()

  // Transactions linkadas a essa recurring (inclui as que viraram occurrence
  // via backfill E as que rodaram via markRecurringAsPaid direto).
  const txs = await prisma.transaction.findMany({
    where: { recurringTransactionId: recurring.id },
    orderBy: { date: 'asc' },
    include: { recurringOccurrence: { select: { id: true, status: true } } },
  })

  console.log(`━━━ Transactions linkadas (${txs.length}) ━━━`)
  for (const tx of txs) {
    const dow = WEEKDAYS[tx.date.getUTCDay()]
    const occInfo = tx.recurringOccurrence
      ? ` ↔ occ=${tx.recurringOccurrence.id} (${tx.recurringOccurrence.status})`
      : ' (sem occurrence linkada)'
    console.log(`  ${tx.date.toISOString().slice(0, 10)} (${dow})  R$ ${Number(tx.amount).toFixed(2)}  tx=${tx.id}${occInfo}`)
  }

  await prisma.$disconnect()
}

main().catch(err => { console.error('Erro fatal:', err); process.exit(1) })

export {}
