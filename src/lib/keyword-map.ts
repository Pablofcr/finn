// ============================================================
// Single source of truth for category metadata + keyword → category map.
// Used by: bot webhooks (auto-categorize), /api/categories/suggest, seed.
// ============================================================

export type TxType = 'EXPENSE' | 'INCOME'

export type CategoryMeta = {
  color: string
  icon: string
  parentName?: string
  type: TxType
}

/**
 * Categories the system can auto-create on behalf of the user.
 * Children reference their parent by `parentName`. Parents come first.
 */
export const CATEGORY_METADATA: Record<string, CategoryMeta> = {
  // ─── EXPENSE parents ──────────────────────────────────────
  'Alimentação':        { color: '#f97316', icon: 'utensils',        type: 'EXPENSE' },
  'Transporte':         { color: '#3b82f6', icon: 'car',             type: 'EXPENSE' },
  'Moradia':            { color: '#8b5cf6', icon: 'home',            type: 'EXPENSE' },
  'Saúde':              { color: '#ef4444', icon: 'heart-pulse',     type: 'EXPENSE' },

  // ─── EXPENSE flat ─────────────────────────────────────────
  'Educação':           { color: '#06b6d4', icon: 'graduation-cap',  type: 'EXPENSE' },
  'Lazer':              { color: '#eab308', icon: 'gamepad-2',       type: 'EXPENSE' },
  'Vestuário':          { color: '#d946ef', icon: 'shirt',           type: 'EXPENSE' },
  'Compras':            { color: '#ec4899', icon: 'shopping-bag',    type: 'EXPENSE' },
  'Cuidados Pessoais':  { color: '#c026d3', icon: 'sparkles',        type: 'EXPENSE' },
  'Assinaturas':        { color: '#64748b', icon: 'repeat',          type: 'EXPENSE' },
  'Presentes':          { color: '#f43f5e', icon: 'gift',            type: 'EXPENSE' },
  'Outros Gastos':      { color: '#94a3b8', icon: 'circle-ellipsis', type: 'EXPENSE' },

  // ─── Alimentação children ─────────────────────────────────
  'Mercado':      { color: '#fb923c', icon: 'shopping-cart',   parentName: 'Alimentação', type: 'EXPENSE' },
  'Restaurante':  { color: '#f97316', icon: 'utensils-crossed', parentName: 'Alimentação', type: 'EXPENSE' },
  'Delivery':     { color: '#ea580c', icon: 'bike',            parentName: 'Alimentação', type: 'EXPENSE' },
  'Lanche':       { color: '#fdba74', icon: 'coffee',          parentName: 'Alimentação', type: 'EXPENSE' },

  // ─── Transporte children ──────────────────────────────────
  'Combustível':         { color: '#60a5fa', icon: 'fuel',            parentName: 'Transporte', type: 'EXPENSE' },
  'App/Táxi':            { color: '#3b82f6', icon: 'car-taxi-front',  parentName: 'Transporte', type: 'EXPENSE' },
  'Transporte Público':  { color: '#0ea5e9', icon: 'bus',             parentName: 'Transporte', type: 'EXPENSE' },
  'Manutenção':          { color: '#1e40af', icon: 'wrench',          parentName: 'Transporte', type: 'EXPENSE' },

  // ─── Moradia children ─────────────────────────────────────
  'Aluguel/Condomínio':  { color: '#a78bfa', icon: 'home',            parentName: 'Moradia', type: 'EXPENSE' },
  'Energia':             { color: '#a855f7', icon: 'zap',             parentName: 'Moradia', type: 'EXPENSE' },
  'Água':                { color: '#6366f1', icon: 'droplet',         parentName: 'Moradia', type: 'EXPENSE' },
  'Internet/TV':         { color: '#8b5cf6', icon: 'wifi',            parentName: 'Moradia', type: 'EXPENSE' },

  // ─── Saúde children ──────────────────────────────────────
  'Farmácia':            { color: '#fca5a5', icon: 'pill',            parentName: 'Saúde', type: 'EXPENSE' },
  'Consulta/Exame':      { color: '#f87171', icon: 'stethoscope',     parentName: 'Saúde', type: 'EXPENSE' },
  'Plano de Saúde':      { color: '#dc2626', icon: 'shield-plus',     parentName: 'Saúde', type: 'EXPENSE' },

  // ─── INCOME (flat) ────────────────────────────────────────
  'Salário':             { color: '#22c55e', icon: 'briefcase',       type: 'INCOME' },
  'Freelance':           { color: '#10b981', icon: 'laptop',          type: 'INCOME' },
  'Investimentos':       { color: '#0ea5e9', icon: 'trending-up',     type: 'INCOME' },
  'Outros Rendimentos':  { color: '#14b8a6', icon: 'coins',           type: 'INCOME' },
}

/**
 * Keyword (lowercased, NFD-normalized, no diacritics) → category name.
 * The category MUST exist in CATEGORY_METADATA — keep in sync.
 */
export const KEYWORD_MAP: Record<string, string> = {
  // ─── Alimentação > Mercado ────────────────────────────────
  mercado: 'Mercado',
  supermercado: 'Mercado',
  hortifruti: 'Mercado',
  feira: 'Mercado',
  acougue: 'Mercado',
  carne: 'Mercado',
  peixe: 'Mercado',
  hiper: 'Mercado',
  atacadao: 'Mercado',
  assai: 'Mercado',

  // ─── Alimentação > Restaurante ────────────────────────────
  restaurante: 'Restaurante',
  almoco: 'Restaurante',
  almocei: 'Restaurante',
  janta: 'Restaurante',
  jantei: 'Restaurante',
  jantar: 'Restaurante',
  mcdonalds: 'Restaurante',
  'burger king': 'Restaurante',
  subway: 'Restaurante',
  pizza: 'Restaurante',
  pizzaria: 'Restaurante',
  hamburger: 'Restaurante',
  hamburguer: 'Restaurante',
  sushi: 'Restaurante',
  comi: 'Restaurante',

  // ─── Alimentação > Delivery ───────────────────────────────
  ifood: 'Delivery',
  delivery: 'Delivery',
  rappi: 'Delivery',
  'uber eats': 'Delivery',

  // ─── Alimentação > Lanche ─────────────────────────────────
  padaria: 'Lanche',
  cafe: 'Lanche',
  lanchonete: 'Lanche',
  lanche: 'Lanche',
  starbucks: 'Lanche',
  sorvete: 'Lanche',
  sorveteria: 'Lanche',
  acai: 'Lanche',

  // ─── Alimentação (generic parent fallback) ────────────────
  refeicao: 'Alimentação',
  comida: 'Alimentação',
  marmita: 'Alimentação',

  // ─── Transporte > Combustível ─────────────────────────────
  gasolina: 'Combustível',
  combustivel: 'Combustível',
  posto: 'Combustível',
  abasteci: 'Combustível',
  abastecer: 'Combustível',
  etanol: 'Combustível',
  diesel: 'Combustível',

  // ─── Transporte > App/Táxi ────────────────────────────────
  uber: 'App/Táxi',
  '99': 'App/Táxi',
  taxi: 'App/Táxi',
  indriver: 'App/Táxi',

  // ─── Transporte > Transporte Público ──────────────────────
  onibus: 'Transporte Público',
  metro: 'Transporte Público',
  passagem: 'Transporte Público',
  bilhete: 'Transporte Público',

  // ─── Transporte > Manutenção ──────────────────────────────
  oficina: 'Manutenção',
  mecanico: 'Manutenção',
  manutencao: 'Manutenção',
  revisao: 'Manutenção',
  pneu: 'Manutenção',
  oleo: 'Manutenção',
  'troca de oleo': 'Manutenção',
  alinhamento: 'Manutenção',
  balanceamento: 'Manutenção',
  funilaria: 'Manutenção',
  lavagem: 'Manutenção',
  'lava jato': 'Manutenção',
  'lava-jato': 'Manutenção',

  // ─── Transporte (generic parent fallback) ─────────────────
  estacionamento: 'Transporte',
  pedagio: 'Transporte',
  carro: 'Transporte',
  ipva: 'Transporte',
  licenciamento: 'Transporte',
  'seguro auto': 'Transporte',

  // ─── Moradia > Aluguel/Condomínio ─────────────────────────
  aluguel: 'Aluguel/Condomínio',
  condominio: 'Aluguel/Condomínio',
  iptu: 'Aluguel/Condomínio',

  // ─── Moradia > Energia ────────────────────────────────────
  luz: 'Energia',
  energia: 'Energia',
  enel: 'Energia',
  coelba: 'Energia',
  cosern: 'Energia',
  cemig: 'Energia',
  cpfl: 'Energia',

  // ─── Moradia > Água ───────────────────────────────────────
  agua: 'Água',
  sabesp: 'Água',
  cagece: 'Água',
  copasa: 'Água',

  // ─── Moradia > Internet/TV ────────────────────────────────
  internet: 'Internet/TV',
  wifi: 'Internet/TV',

  // ─── Moradia (generic parent fallback) ────────────────────
  gas: 'Moradia',
  faxina: 'Moradia',
  diarista: 'Moradia',
  limpeza: 'Moradia',
  reforma: 'Moradia',
  obra: 'Moradia',

  // ─── Saúde > Farmácia ────────────────────────────────────
  farmacia: 'Farmácia',
  drogaria: 'Farmácia',
  remedio: 'Farmácia',
  vacina: 'Farmácia',

  // ─── Saúde > Consulta/Exame ──────────────────────────────
  medico: 'Consulta/Exame',
  consulta: 'Consulta/Exame',
  exame: 'Consulta/Exame',
  hospital: 'Consulta/Exame',
  dentista: 'Consulta/Exame',
  psicologo: 'Consulta/Exame',
  terapia: 'Consulta/Exame',
  fisioterapia: 'Consulta/Exame',
  nutricionista: 'Consulta/Exame',

  // ─── Saúde > Plano de Saúde ──────────────────────────────
  'plano de saude': 'Plano de Saúde',
  unimed: 'Plano de Saúde',
  amil: 'Plano de Saúde',
  hapvida: 'Plano de Saúde',
  bradesco_saude: 'Plano de Saúde',

  // ─── Saúde (generic parent fallback) ─────────────────────
  academia: 'Saúde',
  oculos: 'Saúde',
  lente: 'Saúde',

  // ─── Educação (flat) ─────────────────────────────────────
  escola: 'Educação',
  faculdade: 'Educação',
  curso: 'Educação',
  livro: 'Educação',
  mensalidade: 'Educação',
  udemy: 'Educação',
  alura: 'Educação',
  ingles: 'Educação',
  idioma: 'Educação',

  // ─── Lazer (flat) ────────────────────────────────────────
  cinema: 'Lazer',
  teatro: 'Lazer',
  show: 'Lazer',
  ingresso: 'Lazer',
  viagem: 'Lazer',
  hotel: 'Lazer',
  netflix: 'Lazer',
  spotify: 'Lazer',
  disney: 'Lazer',
  'prime video': 'Lazer',
  hbo: 'Lazer',
  bar: 'Lazer',
  balada: 'Lazer',
  cerveja: 'Lazer',
  jogo: 'Lazer',

  // ─── Vestuário (flat) ────────────────────────────────────
  roupa: 'Vestuário',
  sapato: 'Vestuário',
  tenis: 'Vestuário',
  calca: 'Vestuário',
  camisa: 'Vestuário',
  camiseta: 'Vestuário',
  vestido: 'Vestuário',
  blusa: 'Vestuário',
  jaqueta: 'Vestuário',
  bermuda: 'Vestuário',

  // ─── Compras (flat) ──────────────────────────────────────
  amazon: 'Compras',
  'mercado livre': 'Compras',
  shopee: 'Compras',
  shein: 'Compras',
  magalu: 'Compras',
  'casas bahia': 'Compras',
  americanas: 'Compras',
  eletronico: 'Compras',
  bolsa: 'Compras',

  // ─── Cuidados Pessoais (flat) ────────────────────────────
  cabelo: 'Cuidados Pessoais',
  salao: 'Cuidados Pessoais',
  barbearia: 'Cuidados Pessoais',
  manicure: 'Cuidados Pessoais',
  pedicure: 'Cuidados Pessoais',
  perfume: 'Cuidados Pessoais',
  maquiagem: 'Cuidados Pessoais',
  cosmetico: 'Cuidados Pessoais',

  // ─── Assinaturas (flat) ──────────────────────────────────
  assinatura: 'Assinaturas',
  icloud: 'Assinaturas',
  'google one': 'Assinaturas',
  notion: 'Assinaturas',
  chatgpt: 'Assinaturas',
  github: 'Assinaturas',
  adobe: 'Assinaturas',
  canva: 'Assinaturas',
  figma: 'Assinaturas',

  // ─── Presentes (flat) ────────────────────────────────────
  presente: 'Presentes',

  // ─── INCOME ──────────────────────────────────────────────
  salario: 'Salário',
  holerite: 'Salário',
  vale: 'Salário',
  adiantamento: 'Salário',
  '13': 'Salário',
  ferias: 'Salário',
  'pro-labore': 'Salário',
  bonus: 'Salário',
  comissao: 'Salário',
  plr: 'Salário',

  freelance: 'Freelance',
  freela: 'Freelance',
  projeto: 'Freelance',
  consultoria: 'Freelance',
  bico: 'Freelance',

  dividendo: 'Investimentos',
  rendimento: 'Investimentos',
  juros: 'Investimentos',
  investimento: 'Investimentos',
  acao: 'Investimentos',
  poupanca: 'Investimentos',
  cdb: 'Investimentos',
  fii: 'Investimentos',

  reembolso: 'Outros Rendimentos',
  cashback: 'Outros Rendimentos',
  restituicao: 'Outros Rendimentos',
  premio: 'Outros Rendimentos',
  sorteio: 'Outros Rendimentos',
}

export function getCategoryMeta(categoryName: string): CategoryMeta | null {
  return CATEGORY_METADATA[categoryName] ?? null
}

/**
 * Find the category name for a keyword, matching whole words only
 * (so "gas" doesn't match "gastei"). Returns null if no keyword matches.
 */
export function categoryForKeyword(normalizedText: string): {
  categoryName: string
  meta: CategoryMeta
} | null {
  for (const keyword of Object.keys(KEYWORD_MAP)) {
    const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i')
    if (regex.test(normalizedText)) {
      const categoryName = KEYWORD_MAP[keyword]
      const meta = CATEGORY_METADATA[categoryName]
      if (meta) return { categoryName, meta }
    }
  }
  return null
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
