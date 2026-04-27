/**
 * Migrate existing users from the merged "Aluguel/Condomínio" category
 * to two separate subcategories: "Aluguel" and "Condomínio".
 *
 * Strategy:
 *   1. Rename existing "Aluguel/Condomínio" → "Aluguel" (key icon, lavender).
 *   2. Create a new sibling "Condomínio" (building-2 icon, deeper purple).
 *   3. For every Transaction, RecurringTransaction and Budget pointing to
 *      the old category, smart-route based on description: anything
 *      containing "condomín" goes to the new Condomínio; everything else
 *      stays on Aluguel.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/migrate-aluguel-condominio.ts
 *
 * Idempotent: re-running is a no-op once "Aluguel/Condomínio" no longer exists.
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const OLD_NAME = 'Aluguel/Condomínio'
const ALUGUEL_META = { name: 'Aluguel', icon: 'key', color: '#a78bfa' }
const CONDOMINIO_META = { name: 'Condomínio', icon: 'building-2', color: '#7c3aed' }

function looksLikeCondo(description: string): boolean {
  return /condom[ií]n/i.test(description)
}

async function main() {
  const oldCategories = await prisma.category.findMany({
    where: { name: OLD_NAME },
  })

  console.log(`Found ${oldCategories.length} merged categories to split.`)

  let migratedTx = 0
  let migratedRecurring = 0
  let migratedBudgets = 0
  let createdCondoCategories = 0

  for (const old of oldCategories) {
    if (!old.userId) {
      console.warn(`Skipping system category ${old.id} (no userId)`)
      continue
    }

    // Rename old → "Aluguel" (key, lavender)
    const aluguel = await prisma.category.update({
      where: { id: old.id },
      data: { name: ALUGUEL_META.name, icon: ALUGUEL_META.icon, color: ALUGUEL_META.color },
    })

    // Create or reuse "Condomínio" sibling
    let condominio = await prisma.category.findFirst({
      where: { userId: old.userId, name: CONDOMINIO_META.name, parentId: old.parentId },
    })
    if (!condominio) {
      condominio = await prisma.category.create({
        data: {
          userId: old.userId,
          name: CONDOMINIO_META.name,
          icon: CONDOMINIO_META.icon,
          color: CONDOMINIO_META.color,
          type: old.type,
          parentId: old.parentId,
        },
      })
      createdCondoCategories++
      console.log(`  + Created "Condomínio" for user ${old.userId}`)
    }

    // Smart-route Transactions
    const txs = await prisma.transaction.findMany({
      where: { categoryId: aluguel.id },
      select: { id: true, description: true },
    })
    const txsToCondo = txs.filter((t) => looksLikeCondo(t.description))
    if (txsToCondo.length > 0) {
      await prisma.transaction.updateMany({
        where: { id: { in: txsToCondo.map((t) => t.id) } },
        data: { categoryId: condominio.id },
      })
      migratedTx += txsToCondo.length
    }

    // Smart-route RecurringTransactions
    const recs = await prisma.recurringTransaction.findMany({
      where: { categoryId: aluguel.id },
      select: { id: true, description: true },
    })
    const recsToCondo = recs.filter((r) => looksLikeCondo(r.description))
    if (recsToCondo.length > 0) {
      await prisma.recurringTransaction.updateMany({
        where: { id: { in: recsToCondo.map((r) => r.id) } },
        data: { categoryId: condominio.id },
      })
      migratedRecurring += recsToCondo.length
    }

    // Budgets are 1-per-(userId, categoryId, period) — leave them on Aluguel.
    // The user can create a separate Condomínio budget manually if needed.

    console.log(
      `  ✓ User ${old.userId}: ${txsToCondo.length}tx + ${recsToCondo.length}rec routed to Condomínio`,
    )
    migratedBudgets += 0
  }

  console.log('---')
  console.log(`Done. Renamed: ${oldCategories.length} | Created Condomínio: ${createdCondoCategories}`)
  console.log(`Routed to Condomínio: ${migratedTx} transactions, ${migratedRecurring} recurring`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
