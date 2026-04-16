export const APP_NAME = 'Finn'
export const APP_DESCRIPTION = 'Gestão financeira pessoal inteligente'

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CHECKING: 'Conta Corrente',
  SAVINGS: 'Poupança',
  CREDIT_CARD: 'Cartão de Crédito',
  CASH: 'Dinheiro',
  DIGITAL_WALLET: 'Carteira Digital',
  INVESTMENT: 'Investimento',
}

export const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  CHECKING: 'building-2',
  SAVINGS: 'piggy-bank',
  CREDIT_CARD: 'credit-card',
  CASH: 'banknote',
  DIGITAL_WALLET: 'smartphone',
  INVESTMENT: 'trending-up',
}

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  INCOME: 'Receita',
  EXPENSE: 'Despesa',
  TRANSFER: 'Transferência',
}

export const BUDGET_PERIOD_LABELS: Record<string, string> = {
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  YEARLY: 'Anual',
}

export const RECURRENCE_LABELS: Record<string, string> = {
  DAILY: 'Diário',
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quinzenal',
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  YEARLY: 'Anual',
}

export const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#64748b',
]

export const NAV_SECTIONS = [
  {
    label: 'Financeiro',
    items: [
      { href: '/dashboard', label: 'Início', icon: 'layout-dashboard' },
      { href: '/transactions', label: 'Transações', icon: 'arrow-left-right' },
      { href: '/accounts', label: 'Contas', icon: 'wallet' },
      { href: '/categories', label: 'Categorias', icon: 'tags' },
    ],
  },
  {
    label: 'Planejamento',
    items: [
      { href: '/budgets', label: 'Orçamentos', icon: 'pie-chart' },
      { href: '/goals', label: 'Metas', icon: 'target' },
    ],
  },
  {
    label: 'Análise',
    items: [
      { href: '/reports', label: 'Relatórios', icon: 'bar-chart-3' },
      { href: '/insights', label: 'Insights', icon: 'lightbulb' },
      { href: '/bot', label: 'Assistente', icon: 'bot' },
    ],
  },
  {
    label: 'Conta',
    items: [
      { href: '/settings', label: 'Configurações', icon: 'settings' },
    ],
  },
]

export const NAV_ITEMS = NAV_SECTIONS.flatMap(section => section.items)

export const MOBILE_NAV_ITEMS = [
  { href: '/dashboard', label: 'Início', icon: 'layout-dashboard' },
  { href: '/transactions', label: 'Transações', icon: 'arrow-left-right' },
  { href: '/transactions/new', label: 'Adicionar', icon: 'plus-circle' },
  { href: '/reports', label: 'Relatórios', icon: 'bar-chart-3' },
  { href: '/settings', label: 'Mais', icon: 'menu' },
]
