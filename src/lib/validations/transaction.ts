import { z } from 'zod'

export const transactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  amount: z.number().positive('Valor deve ser maior que zero'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  date: z.string().min(1, 'Data é obrigatória'),
  accountId: z.string().min(1, 'Conta é obrigatória'),
  categoryId: z.string().optional(),
  toAccountId: z.string().optional(),
  paymentMethod: z.enum(['PIX', 'DEBIT', 'CREDIT', 'CASH', 'BOLETO', 'TRANSFER']).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  installments: z.nan().transform(() => undefined).pipe(z.undefined())
    .or(z.number().int().min(1).max(48))
    .optional(),
})

export type TransactionInput = z.infer<typeof transactionSchema>
