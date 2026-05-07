/**
 * Deleta um template HSM por nome (todas as versões de idioma).
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/delete-whatsapp-template.ts <name>
 *
 * Útil quando a Meta classifica errado (ex: copy genérica vira Marketing
 * em vez de Utility) e precisa resubmeter com copy ajustada.
 */

const WABA_ID = '26659521740371129'
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN

if (!TOKEN) {
  console.error('WHATSAPP_ACCESS_TOKEN não setada')
  process.exit(1)
}

const name = process.argv[2]
if (!name) {
  console.error('Uso: scripts/delete-whatsapp-template.ts <name>')
  process.exit(1)
}

async function main() {
  const url = `https://graph.facebook.com/v21.0/${WABA_ID}/message_templates?name=${encodeURIComponent(name)}`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${TOKEN}` },
  })
  const data = await res.json()
  if (data.error) {
    console.error(`❌ ${name}:`, data.error.message)
    process.exit(1)
  }
  console.log(`🗑️  ${name}: deletado (${JSON.stringify(data)})`)
}

main().catch(err => { console.error(err); process.exit(1) })

// Marca arquivo como módulo (sem isso, TS trata como script global e
// constantes top-level colidem com create-whatsapp-templates.ts).
export {}
