import { z } from 'zod'

export const goalSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  targetAmount: z.number().positive('Valor deve ser maior que zero'),
  deadline: z.string().optional(),
  icon: z.string().min(1),
  color: z.string().min(1),
})

export type GoalInput = z.infer<typeof goalSchema>
