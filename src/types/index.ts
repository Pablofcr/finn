import type {
  TransactionType,
  AccountType,
  BudgetPeriod,
  Currency,
  RecurrenceFrequency,
  RecurrenceStatus,
} from '@/generated/prisma/enums'

export type {
  TransactionType,
  AccountType,
  BudgetPeriod,
  Currency,
  RecurrenceFrequency,
  RecurrenceStatus,
}

export interface TransactionFormData {
  type: TransactionType
  amount: number
  description: string
  date: string
  accountId: string
  categoryId?: string
  toAccountId?: string
  location?: string
  notes?: string
  tags?: string[]
  installments?: number
}

export interface AccountFormData {
  name: string
  type: AccountType
  balance: number
  color: string
  icon: string
  creditLimit?: number
  closingDay?: number
  dueDay?: number
}

export interface CategoryFormData {
  name: string
  icon: string
  color: string
  type: TransactionType
  parentId?: string
}

export interface BudgetFormData {
  categoryId: string
  amount: number
  period: BudgetPeriod
  alertAt: number
}

export interface GoalFormData {
  name: string
  targetAmount: number
  deadline?: string
  icon: string
  color: string
}

export interface RecurringFormData {
  description: string
  amount: number
  type: TransactionType
  categoryId?: string
  accountId?: string
  frequency: RecurrenceFrequency
  startDate: string
  endDate?: string
  autoConfirm?: boolean
}

export interface TransactionSummary {
  totalIncome: number
  totalExpense: number
  balance: number
  transactionCount: number
}

export interface CategorySummary {
  categoryId: string
  categoryName: string
  categoryIcon: string
  categoryColor: string
  total: number
  percentage: number
  count: number
}

export interface MonthlyData {
  month: string
  income: number
  expense: number
}

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
