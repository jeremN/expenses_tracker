import { z } from 'zod'
import type {
  createTransactionSchema,
  updateTransactionSchema,
  createCategorySchema,
  updateCategorySchema,
  createRecurringRuleSchema,
  updateRecurringRuleSchema,
  createInvestmentSnapshotSchema,
  upsertBudgetSchema,
} from './validators'

export type CreateTransaction = z.infer<typeof createTransactionSchema>
export type UpdateTransaction = z.infer<typeof updateTransactionSchema>
export type CreateCategory = z.infer<typeof createCategorySchema>
export type UpdateCategory = z.infer<typeof updateCategorySchema>
export type CreateRecurringRule = z.infer<typeof createRecurringRuleSchema>
export type UpdateRecurringRule = z.infer<typeof updateRecurringRuleSchema>
export type CreateInvestmentSnapshot = z.infer<typeof createInvestmentSnapshotSchema>
export type UpsertBudget = z.infer<typeof upsertBudgetSchema>

export type TransactionType = 'income' | 'expense'
export type Frequency = 'weekly' | 'monthly' | 'yearly'
export type ImportStatus = 'pending' | 'completed' | 'partial'

// API response types
export interface Transaction {
  id: number
  type: TransactionType
  amount: number
  description: string | null
  date: string
  categoryId: number | null
  recurringId: number | null
  createdAt: string
  updatedAt: string
  category?: Category | null
}

export interface Category {
  id: number
  name: string
  color: string | null
  icon: string | null
  createdAt: string
}

export interface RecurringRule {
  id: number
  type: TransactionType
  amount: number
  description: string | null
  categoryId: number | null
  frequency: Frequency
  startDate: string
  endDate: string | null
  isActive: boolean
  createdAt: string
  category?: Category | null
}

export interface InvestmentSnapshot {
  id: number
  date: string
  totalValue: number
  note: string | null
  createdAt: string
}

export interface MonthlySummary {
  month: string
  income: number
  expenses: number
  balance: number
}

export interface CategoryBreakdown {
  categoryId: number
  categoryName: string
  categoryColor: string | null
  total: number
  percentage: number
}

export interface Budget {
  id: number
  categoryId: number
  amount: number
  createdAt: string
  updatedAt: string
}

export interface BudgetOverviewItem {
  categoryId: number
  categoryName: string
  categoryColor: string | null
  budget: number | null
  spent: number
}
