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

export const accountKindSchema = z.enum(['asset', 'liability'])
export const accountTypeSchema = z.enum([
  'cash', 'checking', 'savings', 'brokerage', 'retirement',
  'real_estate', 'crypto', 'vehicle', 'loan', 'credit_card', 'other',
])
export const accountValuationSchema = z.enum(['manual', 'tracked'])

export const createAccountSchema = z.object({
  name: z.string().min(1).max(80),
  kind: accountKindSchema,
  type: accountTypeSchema,
  // Optional: the DB column defaults to 'manual', so an omitted value is fine.
  valuation: accountValuationSchema.optional(),
  currentValue: z.number().int().nonnegative(), // cents, positive magnitude
  institution: z.string().max(80).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const updateAccountSchema = createAccountSchema.partial()

export const createHoldingSchema = z.object({
  accountId: z.number().int().positive(),
  name: z.string().min(1).max(80),
  symbol: z.string().max(20).optional(),
  quantity: z.number().nonnegative().optional(), // fractional shares/coins allowed
  costBasis: z.number().int().nonnegative().optional(), // cents
  marketValue: z.number().int().nonnegative(), // cents
})

// accountId is fixed at creation — a holding can't hop accounts on update.
export const updateHoldingSchema = createHoldingSchema.omit({ accountId: true }).partial()

// Totals are computed server-side from accounts, never client-supplied.
export const createNetWorthSnapshotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().optional(),
})

export const reconcileAccountSchema = z.object({
  value: z.number().int().nonnegative(), // observed balance, cents, positive magnitude
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().optional(),
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
