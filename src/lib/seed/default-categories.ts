export interface DefaultCategory {
  name: string
  icon: string
  color: string
  type: 'INCOME' | 'EXPENSE'
  keywords: string[]
  subcategories?: { name: string; icon: string; keywords: string[] }[]
}

export const defaultCategories: DefaultCategory[] = [
  // ===== DESPESAS (10) =====
  {
    name: 'Alimentação',
    icon: 'utensils',
    color: '#f97316',
    type: 'EXPENSE',
    keywords: [
      'restaurante', 'lanchonete', 'padaria', 'supermercado', 'mercado',
      'ifood', 'rappi', 'uber eats', 'almoço', 'jantar', 'café',
      'sorvete', 'pizza', 'hamburguer', 'sushi', 'açaí', 'feira',
      'hortifruti', 'delivery', 'marmita', 'salgado', 'doce',
      'san paolo', 'mcdonalds', 'burger king', 'subway', 'starbucks',
    ],
  },
  {
    name: 'Transporte',
    icon: 'car',
    color: '#3b82f6',
    type: 'EXPENSE',
    keywords: [
      'uber', '99', 'taxi', 'gasolina', 'combustível', 'estacionamento',
      'pedágio', 'ônibus', 'metrô', 'passagem', 'avião', 'aéreo',
      'manutenção carro', 'oficina', 'pneu', 'óleo', 'lavagem',
      'ipva', 'licenciamento', 'multa', 'seguro auto',
    ],
  },
  {
    name: 'Moradia',
    icon: 'home',
    color: '#8b5cf6',
    type: 'EXPENSE',
    keywords: [
      'aluguel', 'condomínio', 'iptu', 'luz', 'energia', 'água',
      'gás', 'internet', 'telefone', 'celular', 'reforma', 'obra',
      'móveis', 'eletrodoméstico', 'decoração', 'limpeza', 'faxina',
    ],
  },
  {
    name: 'Saúde',
    icon: 'heart-pulse',
    color: '#ef4444',
    type: 'EXPENSE',
    keywords: [
      'médico', 'consulta', 'exame', 'remédio', 'farmácia', 'hospital',
      'dentista', 'plano de saúde', 'academia', 'psicólogo', 'terapia',
      'vacina', 'óculos', 'lente', 'fisioterapia', 'nutricionista',
    ],
  },
  {
    name: 'Educação',
    icon: 'graduation-cap',
    color: '#06b6d4',
    type: 'EXPENSE',
    keywords: [
      'escola', 'faculdade', 'curso', 'livro', 'material escolar',
      'mensalidade', 'udemy', 'alura', 'apostila', 'idioma', 'inglês',
      'workshop', 'treinamento', 'certificação',
    ],
  },
  {
    name: 'Lazer',
    icon: 'gamepad-2',
    color: '#eab308',
    type: 'EXPENSE',
    keywords: [
      'cinema', 'teatro', 'show', 'ingresso', 'viagem', 'hotel',
      'passeio', 'parque', 'praia', 'netflix', 'spotify', 'disney',
      'hbo', 'prime video', 'youtube premium', 'jogo', 'game',
      'festa', 'bar', 'balada', 'happy hour', 'cerveja', 'drinks',
    ],
  },
  {
    name: 'Compras',
    icon: 'shopping-bag',
    color: '#ec4899',
    type: 'EXPENSE',
    keywords: [
      'roupa', 'sapato', 'tênis', 'bolsa', 'acessório', 'joia',
      'presente', 'eletrônico', 'celular', 'computador', 'notebook',
      'amazon', 'mercado livre', 'shopee', 'shein', 'magazine luiza',
      'casas bahia', 'americanas',
    ],
  },
  {
    name: 'Cuidados Pessoais',
    icon: 'sparkles',
    color: '#d946ef',
    type: 'EXPENSE',
    keywords: [
      'cabelo', 'salão', 'barbearia', 'manicure', 'pedicure',
      'cosmético', 'perfume', 'maquiagem', 'creme', 'shampoo',
      'depilação', 'estética', 'spa',
    ],
  },
  {
    name: 'Assinaturas',
    icon: 'repeat',
    color: '#64748b',
    type: 'EXPENSE',
    keywords: [
      'assinatura', 'mensalidade', 'plano', 'seguro', 'icloud',
      'google one', 'dropbox', 'notion', 'chatgpt', 'github',
      'adobe', 'canva', 'figma', 'antivírus',
    ],
  },
  {
    name: 'Outros Gastos',
    icon: 'circle-ellipsis',
    color: '#94a3b8',
    type: 'EXPENSE',
    keywords: [
      'outros', 'diversos', 'imprevisto', 'emergência', 'doação',
      'gorjeta', 'taxa', 'tarifa', 'multa', 'juros',
    ],
  },

  // ===== RECEITAS (4) =====
  {
    name: 'Salário',
    icon: 'briefcase',
    color: '#22c55e',
    type: 'INCOME',
    keywords: [
      'salário', 'holerite', 'pagamento', 'vale', 'adiantamento',
      '13º', 'férias', 'pró-labore', 'bônus', 'comissão',
      'hora extra', 'PLR',
    ],
  },
  {
    name: 'Freelance',
    icon: 'laptop',
    color: '#10b981',
    type: 'INCOME',
    keywords: [
      'freelance', 'freela', 'projeto', 'consultoria', 'serviço',
      'trabalho extra', 'bico', 'contrato',
    ],
  },
  {
    name: 'Investimentos',
    icon: 'trending-up',
    color: '#0ea5e9',
    type: 'INCOME',
    keywords: [
      'dividendo', 'rendimento', 'juros', 'investimento', 'ação',
      'fundo', 'tesouro', 'poupança', 'CDB', 'LCI', 'LCA',
      'FII', 'renda fixa', 'renda variável',
    ],
  },
  {
    name: 'Outros Rendimentos',
    icon: 'coins',
    color: '#14b8a6',
    type: 'INCOME',
    keywords: [
      'aluguel recebido', 'presente', 'reembolso', 'cashback',
      'restituição', 'prêmio', 'sorteio', 'herança', 'venda',
    ],
  },
]
