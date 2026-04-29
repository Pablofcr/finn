/**
 * Migrate existing users to the new Lazer hierarchy.
 *
 * What this does for each existing user:
 *   1. Ensures a Lazer parent category exists (creates if missing).
 *   2. Creates the 4 subcategories under Lazer if they don't exist:
 *      - Streaming (tv icon)
 *      - Cinema/Eventos (ticket icon)
 *      - Viagens (plane icon)
 *      - Bares/Saídas (beer icon)
 *   3. If the user had an OLD flat Lazer (without children), it's promoted
 *      to a parent — the row stays, just gains children.
 *   4. Re-categorizes existing transactions under the new subcategories
 *      based on description keywords (Netflix → Streaming, etc.).
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/migrate-lazer-subcategories.ts
 *
 * Idempotent: safe to re-run.
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

interface SubcategoryDef {
  name: string
  icon: string
  color: string
  routeRegex: RegExp  // Descriptions matching this go under the subcategory
}

const LAZER_PARENT = {
  name: 'Lazer',
  icon: 'gamepad-2',
  color: '#eab308',
}

const SUBCATEGORIES: SubcategoryDef[] = [
  {
    name: 'Streaming',
    icon: 'tv',
    color: '#f59e0b',
    routeRegex: /netflix|spotify|disney|hbo\b|hbo max|\bmax\b|prime video|amazon prime|youtube premium|apple tv|apple music|globoplay|paramount|deezer/i,
  },
  {
    name: 'Cinema/Eventos',
    icon: 'ticket',
    color: '#ca8a04',
    routeRegex: /cinema|teatro|show|ingresso|evento|festival/i,
  },
  {
    name: 'Viagens',
    icon: 'plane',
    color: '#facc15',
    routeRegex: /viagem|hotel|pousada|airbnb|passagem|passeio/i,
  },
  {
    name: 'Bares/Saídas',
    icon: 'beer',
    color: '#d97706',
    routeRegex: /\bbar\b|balada|cerveja|drinks|happy hour|\bpub\b|boteco/i,
  },
]

async function main() {
  // Buscar usuários do app
  const users = await prisma.user.findMany({ select: { id: true, email: true } })
  console.log(`Migrating Lazer hierarchy for ${users.length} users...\n`)

  let usersTouched = 0
  let lazerCreated = 0
  let subsCreated = 0
  let txsRecategorized = 0

  for (const user of users) {
    // 1. Garante categoria Lazer pai
    let lazer = await prisma.category.findFirst({
      where: { userId: user.id, name: LAZER_PARENT.name, type: 'EXPENSE' },
    })

    if (!lazer) {
      lazer = await prisma.category.create({
        data: {
          userId: user.id,
          name: LAZER_PARENT.name,
          icon: LAZER_PARENT.icon,
          color: LAZER_PARENT.color,
          type: 'EXPENSE',
        },
      })
      lazerCreated++
      console.log(`  + Created Lazer parent for ${user.email}`)
    }

    // 2. Cria subcategorias que não existem
    const userSubsCreated: Record<string, { id: string; name: string }> = {}
    for (const sub of SUBCATEGORIES) {
      let subcat = await prisma.category.findFirst({
        where: { userId: user.id, name: sub.name, parentId: lazer.id },
      })
      if (!subcat) {
        subcat = await prisma.category.create({
          data: {
            userId: user.id,
            name: sub.name,
            icon: sub.icon,
            color: sub.color,
            type: 'EXPENSE',
            parentId: lazer.id,
          },
        })
        subsCreated++
      }
      userSubsCreated[sub.name] = { id: subcat.id, name: sub.name }
    }

    // 3. Re-categorizar transações existentes que estão na Lazer pai (sem subcategoria)
    //    OU sem categoria nenhuma com descrição que bate com keywords das subs
    const candidates = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: 'EXPENSE',
        OR: [
          { categoryId: lazer.id },     // Transações que já estavam em Lazer flat
          { categoryId: null },          // Transações sem categoria
        ],
      },
      select: { id: true, description: true, categoryId: true },
    })

    let userTxsRecategorized = 0
    for (const tx of candidates) {
      for (const sub of SUBCATEGORIES) {
        if (sub.routeRegex.test(tx.description)) {
          await prisma.transaction.update({
            where: { id: tx.id },
            data: { categoryId: userSubsCreated[sub.name].id },
          })
          userTxsRecategorized++
          break
        }
      }
    }

    // 4. Mesma re-categorização pra recurringTransactions
    const recCandidates = await prisma.recurringTransaction.findMany({
      where: {
        userId: user.id,
        type: 'EXPENSE',
        OR: [
          { categoryId: lazer.id },
          { categoryId: null },
        ],
      },
      select: { id: true, description: true },
    })
    for (const r of recCandidates) {
      for (const sub of SUBCATEGORIES) {
        if (sub.routeRegex.test(r.description)) {
          await prisma.recurringTransaction.update({
            where: { id: r.id },
            data: { categoryId: userSubsCreated[sub.name].id },
          })
          break
        }
      }
    }

    if (userTxsRecategorized > 0 || subsCreated > 0) {
      usersTouched++
      txsRecategorized += userTxsRecategorized
      if (userTxsRecategorized > 0) {
        console.log(`  ✓ ${user.email}: ${userTxsRecategorized} transações recategorizadas`)
      }
    }
  }

  console.log('\n---')
  console.log(`Done.`)
  console.log(`  Users touched: ${usersTouched}/${users.length}`)
  console.log(`  Lazer parents created: ${lazerCreated}`)
  console.log(`  Subcategories created: ${subsCreated}`)
  console.log(`  Transactions recategorized: ${txsRecategorized}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
