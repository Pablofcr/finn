import { z } from 'zod'

export const budgetSchema = z.object({
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  amount: z.number().positive('Valor deve ser maior que zero'),
  period: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']),
  alertAt: z.number().int().min(1).max(100).default(80),
})

export type BudgetInput = z.infer<typeof budgetSchema>
