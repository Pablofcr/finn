/**
 * Reverte os pagamentos registrados pelo teste do HSM multi-overdue.
 * Pega as RecurringOccurrence da Diarista que foram marcadas como PAID
 * nos últimos 15 minutos, reverte cada uma via revertOccurrencePayment
 * (deleta Transaction + reverte saldo + volta status pra PENDING) e
 * recoloca nextDueDate da recurring na occurrence pendente mais antiga.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/rollback-test-payments.ts
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { revertOccurrencePayment } from '../src/lib/finance-actions'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const FIFTEEN_MIN_MS = 15 * 60 * 1000

async function main() {
  const pablo = await prisma.user.findFirst({ where: { email: 'pablofcr@gmail.com' } })
  if (!pablo) { console.error('Pablo não encontrado.'); return }

  const diarista = await prisma.recurringTransaction.findFirst({
    where: { userId: pablo.id, description: { contains: 'Diarista', mode: 'insensitive' } },
  })
  if (!diarista) { console.error('Recorrência Diarista não encontrada.'); return }

  // Pega PAID atualizadas nos últimos 15 min — o batch de teste.
  const cutoff = new Date(Date.now() - FIFTEEN_MIN_MS)
  const recentlyPaid = await prisma.recurringOccurrence.findMany({
    where: {
      recurringTransactionId: diarista.id,
      status: 'PAID',
      updatedAt: { gte: cutoff },
    },
    orderBy: { dueDate: 'asc' },
    select: { id: true, dueDate: true, paidTransactionId: true },
  })

  if (recentlyPaid.length === 0) {
    console.log('Nenhuma occurrence PAID nos últimos 15 min. Você ainda não confirmou no zap, ou o rollback já rodou.')
    return
  }

  console.log(`Achei ${recentlyPaid.length} occurrence(s) PAID nos últimos 15 min:`)
  for (const o of recentlyPaid) {
    console.log(`  ${o.dueDate.toISOString().slice(0, 10)} (occ=${o.id} tx=${o.paidTransactionId})`)
  }
  console.log()

  let revertedCount = 0
  for (const o of recentlyPaid) {
    const r = await revertOccurrencePayment(pablo.id, o.id)
    if (r.ok) {
      revertedCount++
      console.log(`  ✓ revertida ${o.dueDate.toISOString().slice(0, 10)}`)
    } else {
      console.log(`  ✗ falhou ${o.dueDate.toISOString().slice(0, 10)}: ${r.error}`)
    }
  }

  // Recoloca nextDueDate da recurring na occurrence pendente mais antiga.
  // markRecurringOccurrencesAsPaid avançou nextDueDate quando registrou; sem
  // restaurar, a recurring fica apontando pra uma data no futuro e o cron
  // não vai alertar mais sobre as 3 que acabamos de reverter.
  const oldestPending = await prisma.recurringOccurrence.findFirst({
    where: { recurringTransactionId: diarista.id, status: 'PENDING' },
    orderBy: { dueDate: 'asc' },
    select: { dueDate: true },
  })
  if (oldestPending) {
    await prisma.recurringTransaction.update({
      where: { id: diarista.id },
      data: { nextDueDate: oldestPending.dueDate, status: 'ACTIVE' },
    })
    console.log(`\nnextDueDate da Diarista realinhado pra ${oldestPending.dueDate.toISOString().slice(0, 10)} (status=ACTIVE)`)
  }

  console.log(`\nRollback concluído: ${revertedCount}/${recentlyPaid.length} occurrence(s) revertida(s).`)
  await prisma.$disconnect()
}

main().catch(err => { console.error('Erro fatal:', err); process.exit(1) })

export {}
