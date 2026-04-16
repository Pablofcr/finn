import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { canUseFeature } from '@/lib/plan-limits'

const KEYWORD_MAP: Record<string, { categoryName: string; type: 'EXPENSE' | 'INCOME' }> = {
  // Alimentação
  mercado: { categoryName: 'Alimentação', type: 'EXPENSE' },
  supermercado: { categoryName: 'Alimentação', type: 'EXPENSE' },
  hortifruti: { categoryName: 'Alimentação', type: 'EXPENSE' },
  restaurante: { categoryName: 'Alimentação', type: 'EXPENSE' },
  lanche: { categoryName: 'Alimentação', type: 'EXPENSE' },
  almoco: { categoryName: 'Alimentação', type: 'EXPENSE' },
  jantar: { categoryName: 'Alimentação', type: 'EXPENSE' },
  cafe: { categoryName: 'Alimentação', type: 'EXPENSE' },
  padaria: { categoryName: 'Alimentação', type: 'EXPENSE' },
  pizza: { categoryName: 'Alimentação', type: 'EXPENSE' },
  hamburger: { categoryName: 'Alimentação', type: 'EXPENSE' },
  delivery: { categoryName: 'Alimentação', type: 'EXPENSE' },
  ifood: { categoryName: 'Alimentação', type: 'EXPENSE' },
  // Transporte
  uber: { categoryName: 'Transporte', type: 'EXPENSE' },
  '99': { categoryName: 'Transporte', type: 'EXPENSE' },
  taxi: { categoryName: 'Transporte', type: 'EXPENSE' },
  gasolina: { categoryName: 'Transporte', type: 'EXPENSE' },
  combustivel: { categoryName: 'Transporte', type: 'EXPENSE' },
  estacionamento: { categoryName: 'Transporte', type: 'EXPENSE' },
  pedagio: { categoryName: 'Transporte', type: 'EXPENSE' },
  // Moradia
  aluguel: { categoryName: 'Moradia', type: 'EXPENSE' },
  condominio: { categoryName: 'Moradia', type: 'EXPENSE' },
  iptu: { categoryName: 'Moradia', type: 'EXPENSE' },
  luz: { categoryName: 'Moradia', type: 'EXPENSE' },
  agua: { categoryName: 'Moradia', type: 'EXPENSE' },
  gas: { categoryName: 'Moradia', type: 'EXPENSE' },
  internet: { categoryName: 'Moradia', type: 'EXPENSE' },
  telefone: { categoryName: 'Moradia', type: 'EXPENSE' },
  // Saúde
  farmacia: { categoryName: 'Saúde', type: 'EXPENSE' },
  medico: { categoryName: 'Saúde', type: 'EXPENSE' },
  hospital: { categoryName: 'Saúde', type: 'EXPENSE' },
  dentista: { categoryName: 'Saúde', type: 'EXPENSE' },
  'plano de saude': { categoryName: 'Saúde', type: 'EXPENSE' },
  // Educação
  escola: { categoryName: 'Educação', type: 'EXPENSE' },
  faculdade: { categoryName: 'Educação', type: 'EXPENSE' },
  curso: { categoryName: 'Educação', type: 'EXPENSE' },
  livro: { categoryName: 'Educação', type: 'EXPENSE' },
  // Lazer
  netflix: { categoryName: 'Lazer', type: 'EXPENSE' },
  spotify: { categoryName: 'Lazer', type: 'EXPENSE' },
  cinema: { categoryName: 'Lazer', type: 'EXPENSE' },
  teatro: { categoryName: 'Lazer', type: 'EXPENSE' },
  show: { categoryName: 'Lazer', type: 'EXPENSE' },
  viagem: { categoryName: 'Lazer', type: 'EXPENSE' },
  hotel: { categoryName: 'Lazer', type: 'EXPENSE' },
  // Vestuário
  roupa: { categoryName: 'Vestuário', type: 'EXPENSE' },
  sapato: { categoryName: 'Vestuário', type: 'EXPENSE' },
  shopping: { categoryName: 'Vestuário', type: 'EXPENSE' },
  // Salário (INCOME)
  salario: { categoryName: 'Salário', type: 'INCOME' },
  freelance: { categoryName: 'Salário', type: 'INCOME' },
  pagamento: { categoryName: 'Salário', type: 'INCOME' },
  pix: { categoryName: 'Salário', type: 'INCOME' },
  transferencia: { categoryName: 'Salário', type: 'INCOME' },
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const allowed = await canUseFeature(user.id, 'autoCategory')
  if (!allowed) {
    return Response.json({ error: 'Funcionalidade exclusiva do Finn Pro. Faça upgrade para desbloquear.', upgrade: true }, { status: 403 })
  }

  const description = request.nextUrl.searchParams.get('description')
  if (!description || description.trim().length === 0) {
    return Response.json({ data: null })
  }

  const normalizedDesc = normalize(description)

  // 1. Try user-defined CategoryKeyword matches first
  const userKeywords = await prisma.categoryKeyword.findMany({
    where: {
      category: { userId: user.id },
    },
    include: {
      category: { select: { id: true, name: true, type: true } },
    },
  })

  for (const kw of userKeywords) {
    if (normalizedDesc.includes(normalize(kw.keyword))) {
      return Response.json({
        data: { categoryId: kw.category.id, categoryName: kw.category.name },
      })
    }
  }

  // 2. Fall back to hardcoded keyword map
  const userCategories = await prisma.category.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, type: true },
  })

  for (const [keyword, mapping] of Object.entries(KEYWORD_MAP)) {
    if (normalizedDesc.includes(normalize(keyword))) {
      // Try exact name match first
      let match = userCategories.find(
        (c) => normalize(c.name) === normalize(mapping.categoryName) && c.type === mapping.type
      )

      // Try partial/contains match
      if (!match) {
        match = userCategories.find(
          (c) =>
            c.type === mapping.type &&
            (normalize(c.name).includes(normalize(mapping.categoryName)) ||
              normalize(mapping.categoryName).includes(normalize(c.name)))
        )
      }

      if (match) {
        return Response.json({
          data: { categoryId: match.id, categoryName: match.name },
        })
      }
    }
  }

  return Response.json({ data: null })
}
