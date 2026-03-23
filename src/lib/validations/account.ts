import { z } from 'zod'

export const accountSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'DIGITAL_WALLET', 'INVESTMENT']),
  balance: z.number(),
  color: z.string().min(1),
  icon: z.string().min(1),
  creditLimit: z.number().optional(),
  closingDay: z.number().int().min(1).max(31).optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
})

export type AccountInput = z.infer<typeof accountSchema>
