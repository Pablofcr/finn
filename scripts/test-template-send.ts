/**
 * Test focado: dispara um lembrete de pagamento usando os caminhos do
 * messaging-adapter (free-form + template HSM) só pro Pablo. Não toca em
 * outros users — útil pra validar o pipeline sem spam.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/test-template-send.ts
 *
 * Cenário 1: dispara via sendWhatsAppPaymentNotification — vai tentar
 *   free-form (se janela aberta) e cair em template `payment_reminder`
 *   se fora.
 * Cenário 2: força envio via template HSM direto, ignorando janela —
 *   garante que a integração com Meta tá funcionando.
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { sendWhatsAppPaymentNotification, isWithinWhatsAppWindow } from '../src/lib/messaging-adapter'
import { sendWhatsAppTemplate } from '../src/lib/whatsapp'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const pablo = await prisma.user.findFirst({
    where: { email: 'pablofcr@gmail.com' },
    include: {
      botConnections: {
        where: { platform: 'WHATSAPP', isVerified: true },
      },
    },
  })

  if (!pablo) {
    console.error('Pablo não encontrado.')
    return
  }

  const connection = pablo.botConnections[0]
  if (!connection) {
    console.error('Pablo não tem conexão WhatsApp verificada.')
    return
  }

  console.log(`User: ${pablo.email}`)
  console.log(`WhatsApp: ${connection.platformUserId}`)

  const inWindow = await isWithinWhatsAppWindow(pablo.id)
  console.log(`Janela 24h aberta: ${inWindow ? 'SIM (free-form vai funcionar)' : 'NÃO (vai cair em template HSM)'}`)
  console.log()

  // Cenário 1: cascata real do messaging-adapter
  console.log('━━━ Cenário 1: cascata real (free-form OU template, dependendo da janela) ━━━')
  const r1 = await sendWhatsAppPaymentNotification({
    userId: pablo.id,
    connection: { platformUserId: connection.platformUserId },
    payment: {
      description: 'Teste de Lembrete (Pablo only)',
      amount: 99.90,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      recurringId: 'test-' + Date.now(),
      variant: 'upcoming-1d',
    },
  })
  console.log(`  ok: ${r1.ok}`)
  console.log(`  channel: ${r1.channel ?? 'N/A'}`)
  console.log(`  attempts:`, JSON.stringify(r1.attempts, null, 2))
  if (r1.errorMessage) console.log(`  error: ${r1.errorMessage}`)
  console.log()

  // Cenário 2: template HSM forçado, ignorando janela
  console.log('━━━ Cenário 2: template HSM direto (payment_reminder) ━━━')
  const r2 = await sendWhatsAppTemplate({
    to: connection.platformUserId,
    templateName: 'payment_reminder',
    languageCode: 'pt_BR',
    bodyParameters: ['Teste Direto Template', 'R$ 49,90', '08/05/2026'],
    buttonPayloads: ['paid:test-direct', 'snooze:test-direct'],
  })
  console.log(`  ok: ${r2.ok}`)
  console.log(`  messageId: ${r2.messageId ?? 'N/A'}`)
  if (r2.error) console.log(`  error:`, JSON.stringify(r2.error))

  await prisma.$disconnect()
}

main().catch(err => { console.error('Erro fatal:', err); process.exit(1) })

export {}
