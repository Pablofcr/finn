/**
 * Submete os 3 templates HSM (payment_reminder, invoice_reminder,
 * generic_notification) pra aprovação da Meta via Graph API.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/create-whatsapp-templates.ts
 *
 * Idempotente: se um template com o mesmo nome já existe, loga e segue.
 *
 * Requer:
 *   - WHATSAPP_ACCESS_TOKEN com scope `whatsapp_business_management`
 *     (System User token costuma ter; se der erro de permissão, conferir
 *     no App Meta → System Users → permissões do token).
 */

const WABA_ID = '26659521740371129'
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const API = `https://graph.facebook.com/v21.0/${WABA_ID}/message_templates`

if (!TOKEN) {
  console.error('WHATSAPP_ACCESS_TOKEN não setada no .env')
  process.exit(1)
}

interface TemplateDef {
  name: string
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION'
  language: string
  components: Array<Record<string, unknown>>
}

const templates: TemplateDef[] = [
  {
    name: 'payment_reminder',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'BODY',
        text:
          'Lembrete de pagamento: *{{1}}* — {{2}} (vence em {{3}}).\n\n' +
          'Toque num dos botões pra confirmar ou abrir o Finn pra ver detalhes.',
        example: {
          body_text: [['Aluguel', 'R$ 1.500,00', '15/05/2026']],
        },
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Já paguei' },
          { type: 'QUICK_REPLY', text: 'Lembrar amanhã' },
        ],
      },
    ],
  },
  {
    name: 'invoice_reminder',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'BODY',
        text:
          'Lembrete de fatura: cartão *{{1}}* — {{2}} (vence em {{3}}).\n\n' +
          'Confira no Finn pra pagar.',
        example: {
          body_text: [['Nubank', 'R$ 850,00', '10/05/2026']],
        },
      },
    ],
  },
  {
    // UTILITY pra atualizações transacionais: auto-launch de pagamento
    // recorrente, weekly insights, etc. Sample value claramente
    // transacional pra Meta classificar corretamente — tentativas
    // anteriores ("Você tem N insights novos") foram pra Marketing
    // porque o sample soava promocional.
    name: 'balance_update',
    category: 'UTILITY',
    language: 'pt_BR',
    components: [
      {
        type: 'BODY',
        text:
          'Atualização da sua conta Finn:\n\n' +
          '{{1}}\n\n' +
          'Abra o app pra ver detalhes.',
        example: {
          body_text: [['Lancei: Netflix R$ 49,90']],
        },
      },
    ],
  },
  {
    // MARKETING explícito porque reengagement É marketing — relacional,
    // não transacional. Submetido como Marketing de propósito pra evitar
    // reclassificação automática quando Meta vir o uso real.
    // Custo ~R$ 0,30/conversa, mas volume baixo (só usuários inativos).
    name: 'customer_reengagement',
    category: 'MARKETING',
    language: 'pt_BR',
    components: [
      {
        type: 'BODY',
        text:
          'Oi, {{1}}! 👋\n\n' +
          '{{2}}\n\n' +
          'Quando quiser voltar a usar o Finn, é só me mandar uma mensagem aqui mesmo. Estou por aqui sempre que precisar.',
        example: {
          body_text: [
            [
              'Pablo',
              'Reparei que tu sumiu uns dias. Manda um áudio rápido com qualquer gasto que eu cuido do resto.',
            ],
          ],
        },
      },
    ],
  },
]

async function createTemplate(t: TemplateDef): Promise<void> {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(t),
  })
  const data = await res.json()

  if (data.error) {
    // 2388023/2388024: nome+idioma já existe. Tratamos como "já existe" e seguimos.
    const isDuplicate =
      data.error.error_subcode === 2388023 ||
      data.error.error_subcode === 2388024 ||
      /already exists/i.test(data.error.message || '') ||
      /Já existe conteúdo/i.test(data.error.error_user_msg || '')
    if (isDuplicate) {
      console.log(`⚠️  ${t.name}: já existe — pulando`)
      return
    }
    console.error(`❌ ${t.name}: ${data.error.message}`)
    console.error('   detalhes:', JSON.stringify(data.error))
    return
  }

  console.log(`✅ ${t.name}: ${data.status ?? 'submetido'} (id: ${data.id})`)
}

async function main() {
  console.log(`Submetendo ${templates.length} templates pro WABA ${WABA_ID}...\n`)
  for (const t of templates) {
    await createTemplate(t)
  }
  console.log('\nDone. Status final dos templates fica em:')
  console.log('  https://business.facebook.com/latest/whatsapp_manager/message_templates')
  console.log('\nQuando todos virarem APPROVED, seta as env vars no Vercel:')
  console.log('  WHATSAPP_TEMPLATE_PAYMENT_REMINDER=payment_reminder')
  console.log('  WHATSAPP_TEMPLATE_INVOICE_REMINDER=invoice_reminder')
  console.log('  WHATSAPP_TEMPLATE_BALANCE_UPDATE=balance_update')
  console.log('  WHATSAPP_TEMPLATE_REENGAGEMENT=customer_reengagement')
}

main().catch((err) => {
  console.error('Erro fatal:', err)
  process.exit(1)
})

// Marca arquivo como módulo (sem isso, TS trata como script global e
// constantes top-level como WABA_ID colidem com delete-whatsapp-template.ts).
export {}
