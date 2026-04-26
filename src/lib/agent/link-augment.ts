// Augments the agent's reply with deep-links to Finn app sections.
// Telegram: inline HTML <a> tags on the first occurrence of each section name.
// WhatsApp: appends an "Atalhos:" footer with raw URLs (only when 1-3 sections
// are mentioned — more than 3 turns into clutter, per design squad call).

const APP_URL = 'https://finn-steel.vercel.app'

const SECTIONS: Record<string, string> = {
  'Início': '/dashboard',
  'Transações': '/transactions',
  'Contas': '/accounts',
  'Faturas': '/invoices',
  'Categorias': '/categories',
  'Orçamentos': '/budgets',
  'Metas': '/goals',
  'Relatórios': '/reports',
  'Insights': '/insights',
  'Assistente': '/bot',
  'Meu Plano': '/pricing',
  'Configurações': '/settings',
  'Sua Segurança': '/security',
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Telegram: replace the first occurrence of each section name with an HTML
 * link (parseMode=HTML is the bot default). Preserves any surrounding bold
 * markers (*Metas* → <a href=...><b>Metas</b></a>... we keep it simple and
 * just wrap the literal word — Telegram renders as link with the word inside).
 *
 * Returns the augmented text + a boolean indicating whether at least one link
 * was inserted (caller should pass `disable_web_page_preview: true` if so).
 */
export function augmentLinksTelegram(text: string): { text: string; hasLinks: boolean } {
  let result = text
  let hasLinks = false

  for (const [name, path] of Object.entries(SECTIONS)) {
    // Skip if already linked by a previous run
    if (result.includes(`>${name}</a>`)) continue

    const escaped = escapeRegex(name)
    // Whole-word match (Portuguese chars are word chars in JS regex with /u)
    // Avoid matching inside an existing <a>...</a> by checking lookahead
    const pattern = new RegExp(`\\b${escaped}\\b(?![^<]*<\\/a>)`, 'u')
    const url = `${APP_URL}${path}`

    const before = result
    result = result.replace(pattern, `<a href="${url}">${name}</a>`)
    if (result !== before) hasLinks = true
  }

  return { text: result, hasLinks }
}

/**
 * WhatsApp: scan for mentioned sections and append an "Atalhos:" line at the
 * end with raw URLs. Keeps body prose clean. Only fires when 1-3 sections
 * mentioned — beyond that, the footer becomes noise (squad call).
 */
export function augmentLinksWhatsApp(text: string): string {
  const mentioned: string[] = []

  for (const name of Object.keys(SECTIONS)) {
    const pattern = new RegExp(`\\b${escapeRegex(name)}\\b`, 'u')
    if (pattern.test(text)) mentioned.push(name)
  }

  if (mentioned.length < 1 || mentioned.length > 3) return text

  const links = mentioned
    .map((name) => `${name}: ${APP_URL}${SECTIONS[name]}`)
    .join('  ·  ')

  return `${text}\n\n_Atalhos:_ ${links}`
}
