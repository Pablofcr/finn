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
    keywords: ['comida', 'refeição', 'marmita'],
    subcategories: [
      { name: 'Mercado', icon: 'shopping-cart', keywords: ['mercado', 'supermercado', 'hortifruti', 'feira', 'açougue', 'carne', 'peixe'] },
      { name: 'Restaurante', icon: 'utensils-crossed', keywords: ['restaurante', 'almoço', 'jantar', 'pizza', 'hamburguer', 'sushi', 'mcdonalds', 'burger king', 'subway'] },
      { name: 'Delivery', icon: 'bike', keywords: ['ifood', 'rappi', 'uber eats', 'delivery'] },
      { name: 'Lanche', icon: 'coffee', keywords: ['padaria', 'café', 'lanchonete', 'lanche', 'starbucks', 'sorvete', 'açaí'] },
    ],
  },
  {
    name: 'Transporte',
    icon: 'car',
    color: '#3b82f6',
    type: 'EXPENSE',
    keywords: ['estacionamento', 'pedágio', 'manutenção carro', 'oficina', 'pneu', 'óleo', 'lavagem', 'ipva', 'licenciamento', 'multa', 'seguro auto'],
    subcategories: [
      { name: 'Combustível', icon: 'fuel', keywords: ['gasolina', 'combustível', 'posto', 'abasteci', 'etanol', 'diesel'] },
      { name: 'App/Táxi', icon: 'car-taxi-front', keywords: ['uber', '99', 'taxi', 'indriver'] },
      { name: 'Transporte Público', icon: 'bus', keywords: ['ônibus', 'metrô', 'passagem', 'bilhete'] },
    ],
  },
  {
    name: 'Moradia',
    icon: 'home',
    color: '#8b5cf6',
    type: 'EXPENSE',
    keywords: ['gás', 'reforma', 'obra', 'móveis', 'eletrodoméstico', 'decoração', 'limpeza', 'faxina', 'diarista'],
    subcategories: [
      { name: 'Aluguel/Condomínio', icon: 'home', keywords: ['aluguel', 'condomínio', 'iptu'] },
      { name: 'Energia', icon: 'zap', keywords: ['luz', 'energia', 'enel', 'coelba', 'cosern', 'cemig', 'cpfl'] },
      { name: 'Água', icon: 'droplet', keywords: ['água', 'sabesp', 'cagece', 'copasa'] },
      { name: 'Internet/TV', icon: 'wifi', keywords: ['internet', 'wifi', 'telefone', 'celular'] },
    ],
  },
  {
    name: 'Saúde',
    icon: 'heart-pulse',
    color: '#ef4444',
    type: 'EXPENSE',
    keywords: ['academia', 'óculos', 'lente'],
    subcategories: [
      { name: 'Farmácia', icon: 'pill', keywords: ['farmácia', 'drogaria', 'remédio', 'vacina'] },
      { name: 'Consulta/Exame', icon: 'stethoscope', keywords: ['médico', 'consulta', 'exame', 'hospital', 'dentista', 'psicólogo', 'terapia', 'fisioterapia', 'nutricionista'] },
      { name: 'Plano de Saúde', icon: 'shield-plus', keywords: ['plano de saúde', 'unimed', 'amil', 'hapvida'] },
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
    name: 'Vestuário',
    icon: 'shirt',
    color: '#d946ef',
    type: 'EXPENSE',
    keywords: [
      'roupa', 'sapato', 'tênis', 'calça', 'camisa', 'camiseta',
      'vestido', 'blusa', 'saia', 'jaqueta', 'casaco', 'bermuda',
      'short', 'cueca', 'calcinha', 'meia', 'chinelo', 'sandália',
      'bota', 'calçado', 'loja de roupa', 'moda', 'costura',
    ],
  },
  {
    name: 'Compras',
    icon: 'shopping-bag',
    color: '#ec4899',
    type: 'EXPENSE',
    keywords: [
      'bolsa', 'acessório', 'joia', 'presente',
      'eletrônico', 'celular', 'computador', 'notebook',
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
