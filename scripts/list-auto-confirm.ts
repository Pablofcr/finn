/**
 * Lista todas as recorrências do Pablo com autoConfirm=true.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/list-auto-confirm.ts
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const pablo = await prisma.user.findFirst({
    where: { email: 'pablofcr@gmail.com' },
    select: { id: true },
  })
  if (!pablo) {
    console.error('Usuário pablofcr@gmail.com não encontrado.')
    return
  }

  const all = await prisma.recurringTransaction.findMany({
    where: { userId: pablo.id },
    select: {
      id: true,
      description: true,
      amount: true,
      type: true,
      frequency: true,
      status: true,
      autoConfirm: true,
      nextDueDate: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  const auto = all.filter(r => r.autoConfirm)
  const manual = all.filter(r => !r.autoConfirm)

  console.log(`\nTotal de recorrências: ${all.length}`)
  console.log(`Com autoConfirm=true: ${auto.length}`)
  console.log(`Com autoConfirm=false: ${manual.length}\n`)

  if (auto.length > 0) {
    console.log('━━━ Recorrências que LANÇAM SOZINHAS ━━━')
    for (const r of auto) {
      const amount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(r.amount))
      const next = r.nextDueDate.toISOString().slice(0, 10)
      const created = r.createdAt.toISOString().slice(0, 10)
      console.log(`  • ${r.description} — ${amount} (${r.type}, ${r.frequency}, ${r.status})`)
      console.log(`    próximo: ${next} | criada em: ${created} | id: ${r.id}`)
    }
    console.log('')
  }

  if (manual.length > 0) {
    console.log('━━━ Recorrências que pedem confirmação ━━━')
    for (const r of manual) {
      const amount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(r.amount))
      const next = r.nextDueDate.toISOString().slice(0, 10)
      console.log(`  • ${r.description} — ${amount} (${r.frequency}, ${r.status}) | próximo: ${next}`)
    }
    console.log('')
  }
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())

export {}
