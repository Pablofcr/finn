/**
 * Lista BotMessages OUTBOUND recentes pra entender quando o cron disparou
 * o lembrete e o que ele continha. Foco nas últimas 72h.
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const pablo = await prisma.user.findFirst({ where: { email: 'pablofcr@gmail.com' } })
  if (!pablo) { console.error('Pablo não encontrado.'); return }

  const since = new Date(Date.now() - 72 * 60 * 60 * 1000)
  const msgs = await prisma.botMessage.findMany({
    where: { userId: pablo.id, direction: 'OUTBOUND', createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: { id: true, createdAt: true, status: true, rawContent: true, parsedData: true },
  })

  console.log(`━━━ Últimas ${msgs.length} BotMessages OUTBOUND (72h) ━━━`)
  for (const m of msgs) {
    const utc = m.createdAt.toISOString()
    const brt = new Date(m.createdAt.getTime() - 3 * 60 * 60 * 1000).toISOString().replace('Z', ' BRT')
    const preview = (m.rawContent ?? '').slice(0, 80).replace(/\n/g, ' ')
    const parsed = m.parsedData ? JSON.stringify(m.parsedData) : ''
    console.log(`  ${utc}  (${brt})  ${m.status}`)
    console.log(`    raw: ${preview}`)
    if (parsed) console.log(`    parsed: ${parsed}`)
  }
  await prisma.$disconnect()
}
main().catch(err => { console.error(err); process.exit(1) })
export {}
