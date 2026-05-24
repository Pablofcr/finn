/**
 * Migra a Diarista de quintas/sextas pra quarta-feira:
 *
 *   - startDate: 2026-04-17 (sex) → 2026-04-15 (qua, mesma hora 13:06 BRT)
 *   - Deleta as 4 PENDING em sextas (08, 15, 22, 29 mai)
 *   - Cria 3 PENDING em quartas (06, 13, 20 mai) — mantém em aberto
 *     conforme pedido pelo Pablo. A próxima (27/05) será criada
 *     automaticamente pelo cron ensureNextOccurrences quando rodar.
 *   - nextDueDate = 2026-05-06 (próxima quarta em aberto)
 *
 * As 2 occurrences PAID em 22/04 e 29/04 (já em quarta) batem com a nova
 * cadência teórica (startDate=15/04 quarta + WEEKLY) — não precisa mexer.
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const pablo = await prisma.user.findFirst({ where: { email: 'pablofcr@gmail.com' } })
  if (!pablo) { console.error('Pablo não encontrado.'); return }

  const diarista = await prisma.recurringTransaction.findFirst({
    where: { userId: pablo.id, description: { contains: 'Diarista', mode: 'insensitive' } },
  })
  if (!diarista) { console.error('Diarista não encontrada.'); return }

  console.log('Antes:')
  console.log(`  startDate:   ${diarista.startDate.toISOString()}`)
  console.log(`  nextDueDate: ${diarista.nextDueDate.toISOString()}`)
  console.log()

  // Hora 13:06:11 UTC = mesma hora do startDate atual. Preserva pra ficar
  // consistente com as occurrences históricas.
  const HOUR_UTC = { h: 13, m: 6, s: 11, ms: 472 }
  const mkUTC = (y: number, mo: number, d: number) =>
    new Date(Date.UTC(y, mo, d, HOUR_UTC.h, HOUR_UTC.m, HOUR_UTC.s, HOUR_UTC.ms))

  const newStartDate = mkUTC(2026, 3, 15)   // 2026-04-15 (qua)
  const newNextDue   = mkUTC(2026, 4, 6)    // 2026-05-06 (qua)
  const newPending   = [
    mkUTC(2026, 4, 6),   // 06/05 qua
    mkUTC(2026, 4, 13),  // 13/05 qua
    mkUTC(2026, 4, 20),  // 20/05 qua
  ]

  // Deleta as PENDING em sextas (08, 15, 22, 29 mai). Não toca em PAID.
  const deleted = await prisma.recurringOccurrence.deleteMany({
    where: { recurringTransactionId: diarista.id, status: 'PENDING' },
  })
  console.log(`Deletadas ${deleted.count} occurrence(s) PENDING (sextas).`)

  // Cria as 3 novas em quartas.
  for (const due of newPending) {
    await prisma.recurringOccurrence.create({
      data: {
        recurringTransactionId: diarista.id,
        dueDate: due,
        status: 'PENDING',
      },
    })
    console.log(`  + criada ${due.toISOString().slice(0, 10)} (qua) PENDING`)
  }

  // Atualiza startDate + nextDueDate da recurring.
  await prisma.recurringTransaction.update({
    where: { id: diarista.id },
    data: {
      startDate: newStartDate,
      nextDueDate: newNextDue,
      status: 'ACTIVE',
    },
  })
  console.log()
  console.log('Depois:')
  console.log(`  startDate:   ${newStartDate.toISOString()} (qua)`)
  console.log(`  nextDueDate: ${newNextDue.toISOString()} (qua)`)
  console.log()
  console.log('Migração concluída. A próxima (27/05 qua) será gerada pelo cron ensureNextOccurrences.')
  await prisma.$disconnect()
}

main().catch(err => { console.error('Erro fatal:', err); process.exit(1) })

export {}
