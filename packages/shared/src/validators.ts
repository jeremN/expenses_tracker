import { z } from 'zod'

export const transactionTypeSchema = z.enum(['income', 'expense'])
export const frequencySchema = z.enum(['weekly', 'monthly', 'yearly'])

export const createTransactionSchema = z.object({
  type: transactionTypeSchema,
  amount: z.number().int().positive(), // cents
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoryId: z.number().int().positive().optional(),
})

export const updateTransactionSchema = createTransactionSchema.partial()

export const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().optional(),
})

export const updateCategorySchema = createCategorySchema.partial()

export const createRecurringRuleSchema = z.object({
  type: transactionTypeSchema,
  amount: z.number().int().positive(),
  description: z.string().optional(),
  categoryId: z.number().int().positive().optional(),
  frequency: frequencySchema,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const updateRecurringRuleSchema = createRecurringRuleSchema.partial()

export const createInvestmentSnapshotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalValue: z.number().int().positive(), // cents
  note: z.string().optional(),
})

export const upsertBudgetSchema = z.object({
  categoryId: z.number().int().positive(),
  amount: z.number().int().positive(), // monthly limit in cents
})

export const monthQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
})

export const yearQuerySchema = z.object({
  year: z.string().regex(/^\d{4}$/).optional(),
})

export const dateRangeQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}$/).optional(),
})
