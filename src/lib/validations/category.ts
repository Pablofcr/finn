import { z } from 'zod'

export const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  icon: z.string().min(1),
  color: z.string().min(1),
  type: z.enum(['INCOME', 'EXPENSE']),
  parentId: z.string().optional(),
})

export type CategoryInput = z.infer<typeof categorySchema>
