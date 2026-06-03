/**
 * Garante que todos os usuários tenham as categorias default do seed.
 * Add-only: NUNCA deleta categorias existentes (custom do user é
 * preservado). Match por (name, type, parentId) pra ser idempotente.
 *
 * Pablo (founder, MASTER) tem 30 categorias por ser conta antiga (seed
 * default era menor na época). Outros usuários migrados de FREE → TRIAL
 * tem 5-7 (deletaram propositalmente) ou 36 (default atual completo).
 *
 * Decisão (2026-06-03): Pablo pediu pra todos terem o conjunto completo.
 * Aplico o defaultCategories canônico — quem deletou recebe de volta o
 * que faltava; quem já tinha não muda.
 *
 * Uso:
 *   npx tsx scripts/sync-default-categories.ts            # dry-run
 *   npx tsx scripts/sync-default-categories.ts --apply    # aplica
 */
import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local', override: true })

import prisma from '../src/lib/prisma'
import { defaultCategories } from '../src/lib/seed/default-categories'

async function main() {
  const apply = process.argv.includes('--apply')

  const users = await prisma.user.findMany({
    select: { id: true, email: true, plan: true },
    orderBy: { createdAt: 'asc' },
  })

  let totalAdded = 0
  let totalSubsAdded = 0

  for (const u of users) {
    const existing = await prisma.category.findMany({
      where: { userId: u.id },
      select: { id: true, name: true, type: true, parentId: true },
    })
    const existingParents = new Map(
      existing.filter(c => !c.parentId).map(c => [`${c.name}|${c.type}`, c]),
    )
    const existingSubs = new Map(
      existing.filter(c => c.parentId).map(c => [`${c.parentId}|${c.name}`, c]),
    )

    const toAddParents: typeof defaultCategories = []
    const toAddSubs: Array<{ parentName: string; parentType: 'INCOME' | 'EXPENSE'; sub: { name: string; icon: string }; parentColor: string }> = []

    for (const cat of defaultCategories) {
      const parentKey = `${cat.name}|${cat.type}`
      const existingParent = existingParents.get(parentKey)
      if (!existingParent) {
        toAddParents.push(cat)
        if (cat.subcategories) {
          for (const sub of cat.subcategories) {
            toAddSubs.push({ parentName: cat.name, parentType: cat.type, sub, parentColor: cat.color })
          }
        }
      } else if (cat.subcategories) {
        for (const sub of cat.subcategories) {
          const subKey = `${existingParent.id}|${sub.name}`
          if (!existingSubs.has(subKey)) {
            toAddSubs.push({ parentName: cat.name, parentType: cat.type, sub, parentColor: cat.color })
          }
        }
      }
    }

    if (toAddParents.length === 0 && toAddSubs.length === 0) {
      console.log(`✓ ${u.email} (${u.plan}) — já completo (${existing.length} categorias)`)
      continue
    }

    console.log(`+ ${u.email} (${u.plan}) — vai adicionar ${toAddParents.length} parents + ${toAddSubs.length} subs`)
    toAddParents.forEach(p => console.log(`    [parent] ${p.type === 'INCOME' ? '↑' : '↓'} ${p.name}`))
    toAddSubs.forEach(s => console.log(`    [sub]    ${s.parentName} → ${s.sub.name}`))

    if (!apply) continue

    // Cria parents primeiro, depois subs vinculados aos IDs reais
    const createdParentByName = new Map<string, string>()
    for (const cat of toAddParents) {
      const created = await prisma.category.create({
        data: {
          userId: u.id,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          type: cat.type,
        },
      })
      createdParentByName.set(`${cat.name}|${cat.type}`, created.id)
      totalAdded++
    }
    for (const { parentName, parentType, sub, parentColor } of toAddSubs) {
      // Pode ser parent existente OU acabado de criar
      let parentId = existingParents.get(`${parentName}|${parentType}`)?.id
      if (!parentId) parentId = createdParentByName.get(`${parentName}|${parentType}`)
      if (!parentId) {
        console.error(`  !! ERRO: parent não encontrado pra sub ${parentName}/${sub.name}`)
        continue
      }
      await prisma.category.create({
        data: {
          userId: u.id,
          name: sub.name,
          icon: sub.icon,
          color: parentColor,
          type: parentType,
          parentId,
        },
      })
      totalSubsAdded++
    }
  }

  console.log(`\n${apply ? 'APPLIED' : 'DRY-RUN'}: ${totalAdded} parents + ${totalSubsAdded} subs across ${users.length} users`)
  if (!apply) console.log('Run with --apply pra aplicar.')
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
