/**
 * One-shot: desliga autoConfirm da recorrência "Condomínio Zen" do Pablo.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/disable-condominio-zen-autoconfirm.ts
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const r = await prisma.recurringTransaction.update({
    where: { id: '7cb15201-a139-4d04-83cc-d401687161ac' },
    data: { autoConfirm: false },
    select: {
      id: true,
      description: true,
      autoConfirm: true,
      nextDueDate: true,
    },
  })
  console.log('Atualizado:', r)
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())

export {}
