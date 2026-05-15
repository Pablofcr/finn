/**
 * Lista status de todos os templates HSM do WABA.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/check-template-status.ts
 */
const WABA_ID = '26659521740371129'
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const API = `https://graph.facebook.com/v21.0/${WABA_ID}/message_templates`

if (!TOKEN) {
  console.error('WHATSAPP_ACCESS_TOKEN não setada.')
  process.exit(1)
}

async function main() {
  const res = await fetch(`${API}?fields=name,status,category,language,id&limit=50`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  const data = await res.json()
  if (data.error) {
    console.error('Erro:', data.error.message)
    process.exit(1)
  }
  for (const t of data.data) {
    console.log(`${t.status.padEnd(10)} ${t.category.padEnd(10)} ${t.language.padEnd(8)} ${t.name}`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })

export {}
