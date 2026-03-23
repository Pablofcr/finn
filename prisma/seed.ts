import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { defaultCategories } from '../src/lib/seed/default-categories'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding default categories...')

  for (const cat of defaultCategories) {
    const existing = await prisma.category.findFirst({
      where: {
        name: cat.name,
        isSystem: true,
        userId: null,
      },
    })

    if (existing) {
      console.log(`  Skipping "${cat.name}" (already exists)`)
      continue
    }

    const category = await prisma.category.create({
      data: {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: cat.type,
        isSystem: true,
        userId: null,
        keywords: {
          create: cat.keywords.map((keyword) => ({ keyword })),
        },
      },
    })

    console.log(`  Created "${category.name}" with ${cat.keywords.length} keywords`)
  }

  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
