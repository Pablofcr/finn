/**
 * Força envio do template HSM `payment_overdue_multi` direto pra Pablo —
 * ignora a janela 24h. Usado pra exercitar o code path novo de
 * `message.type === 'button'` no webhook sem precisar esperar a janela
 * fechar naturalmente.
 *
 * Persiste BotMessage com externalMessageId = wamid + parsedData com
 * recurringId pra resolveButtonIdFromText() conseguir reconstruir o
 * payload canônico quando o user clicar no botão.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/test-multi-overdue-hsm.ts
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { sendWhatsAppTemplate } from '../src/lib/whatsapp'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Default pro nome literal do template aprovado (script create-whatsapp-templates.ts).
  // Em prod, o env var tem precedência caso o nome venha a mudar.
  const templateName = process.env.WHATSAPP_TEMPLATE_PAYMENT_OVERDUE_MULTI || 'payment_overdue_multi'

  const pablo = await prisma.user.findFirst({
    where: { email: 'pablofcr@gmail.com' },
    include: { botConnections: { where: { platform: 'WHATSAPP', isVerified: true } } },
  })
  if (!pablo) { console.error('Pablo não encontrado.'); return }
  const connection = pablo.botConnections[0]
  if (!connection) { console.error('Pablo não tem conexão WhatsApp verificada.'); return }

  // Acha uma recurring ACTIVE com 2+ PENDING — o cenário multi-overdue.
  const recurrings = await prisma.recurringTransaction.findMany({
    where: { userId: pablo.id, status: 'ACTIVE' },
    select: {
      id: true, description: true, amount: true,
      _count: { select: { occurrences: { where: { status: 'PENDING' } } } },
    },
  })
  const target = recurrings.find(r => r._count.occurrences >= 2)
  if (!target) {
    console.error('Nenhuma recorrência com 2+ PENDING. Abre o app e simula isso primeiro.')
    return
  }

  const occs = await prisma.recurringOccurrence.findMany({
    where: { recurringTransactionId: target.id, status: 'PENDING' },
    orderBy: { dueDate: 'asc' },
  })
  const count = occs.length
  const oldest = occs[0].dueDate
  const totalAmount = Number(target.amount) * count

  console.log(`Alvo: ${target.description} — ${count} pendentes, mais antiga ${oldest.toISOString().slice(0, 10)}, total R$ ${totalAmount.toFixed(2)}`)
  console.log(`Template: ${templateName}`)
  console.log(`Para: ${connection.platformUserId}`)
  console.log()

  const formattedOldest = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(oldest)
  const formattedTotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount)

  const r = await sendWhatsAppTemplate({
    to: connection.platformUserId,
    templateName,
    languageCode: 'pt_BR',
    bodyParameters: [target.description, String(count), formattedOldest, formattedTotal],
    buttonPayloads: [
      `paid_all:${target.id}`,
      `paid_some:${target.id}`,
      `snooze:${target.id}`,
    ],
  })

  console.log(`Envio: ok=${r.ok}`)
  if (r.messageId) console.log(`  wamid: ${r.messageId}`)
  if (r.error) console.log(`  error:`, JSON.stringify(r.error))

  if (r.ok && r.messageId) {
    await prisma.botMessage.create({
      data: {
        userId: pablo.id,
        connectionId: connection.id,
        direction: 'OUTBOUND',
        rawContent: `⚠️ [TEST-HSM] Multi-vencidas (${count}x): ${target.description}`,
        status: 'CONFIRMED',
        externalMessageId: r.messageId,
        parsedData: { kind: 'payment_alert', alertKind: 'multi', recurringId: target.id },
      },
    })
    console.log('BotMessage persistida com externalMessageId + parsedData.')
    console.log()
    console.log('Agora vai no WhatsApp, clica "Paguei algumas" e olha se a list aparece.')
  }

  await prisma.$disconnect()
}

main().catch(err => { console.error('Erro fatal:', err); process.exit(1) })

export {}
