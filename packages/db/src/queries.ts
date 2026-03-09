import { eq, and, like, desc, sql } from 'drizzle-orm'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'
import * as schema from './schema'

type DB = BaseSQLiteDatabase<'async', any, typeof schema>

// --- Categories ---
export function getCategories(db: DB) {
  return db.select().from(schema.categories).orderBy(schema.categories.name)
}

export function getCategoryById(db: DB, id: number) {
  return db.select().from(schema.categories).where(eq(schema.categories.id, id)).get()
}

export function createCategory(db: DB, data: { name: string; color?: string; icon?: string }) {
  return db.insert(schema.categories).values(data).returning().get()
}

export function updateCategory(db: DB, id: number, data: Partial<{ name: string; color: string; icon: string }>) {
  return db.update(schema.categories).set(data).where(eq(schema.categories.id, id)).returning().get()
}

export async function deleteCategory(db: DB, id: number) {
  await db.update(schema.transactions)
    .set({ categoryId: null })
    .where(eq(schema.transactions.categoryId, id))
  return db.delete(schema.categories).where(eq(schema.categories.id, id))
}

// --- Transactions ---
export function getTransactions(db: DB, filters?: { month?: string; categoryId?: number; type?: string }) {
  const conditions = []

  if (filters?.month) {
    conditions.push(like(schema.transactions.date, `${filters.month}%`))
  }
  if (filters?.categoryId) {
    conditions.push(eq(schema.transactions.categoryId, filters.categoryId))
  }
  if (filters?.type) {
    conditions.push(eq(schema.transactions.type, filters.type))
  }

  const query = db.select().from(schema.transactions)
    .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
    .orderBy(desc(schema.transactions.date))

  if (conditions.length > 0) {
    return query.where(and(...conditions))
  }
  return query
}

export function getTransactionById(db: DB, id: number) {
  return db.select().from(schema.transactions)
    .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
    .where(eq(schema.transactions.id, id))
    .get()
}

export function createTransaction(db: DB, data: {
  type: string; amount: number; description?: string; date: string;
  categoryId?: number; recurringId?: number;
}) {
  return db.insert(schema.transactions).values(data).returning().get()
}

export function updateTransaction(db: DB, id: number, data: Partial<{
  type: string; amount: number; description: string; date: string; categoryId: number;
}>) {
  return db.update(schema.transactions)
    .set({ ...data, updatedAt: sql`(current_timestamp)` })
    .where(eq(schema.transactions.id, id))
    .returning().get()
}

export function deleteTransaction(db: DB, id: number) {
  return db.delete(schema.transactions).where(eq(schema.transactions.id, id))
}

// --- Recurring Rules ---
export function getRecurringRules(db: DB) {
  return db.select().from(schema.recurringRules)
    .leftJoin(schema.categories, eq(schema.recurringRules.categoryId, schema.categories.id))
    .orderBy(desc(schema.recurringRules.createdAt))
}

export function getActiveRecurringRules(db: DB) {
  return db.select().from(schema.recurringRules)
    .where(eq(schema.recurringRules.isActive, true))
}

export function createRecurringRule(db: DB, data: {
  type: string; amount: number; description?: string; categoryId?: number;
  frequency: string; startDate: string; endDate?: string;
}) {
  return db.insert(schema.recurringRules).values(data).returning().get()
}

export function updateRecurringRule(db: DB, id: number, data: Partial<{
  type: string; amount: number; description: string; categoryId: number;
  frequency: string; startDate: string; endDate: string; isActive: boolean;
}>) {
  return db.update(schema.recurringRules).set(data)
    .where(eq(schema.recurringRules.id, id)).returning().get()
}

export function deleteRecurringRule(db: DB, id: number) {
  return db.update(schema.recurringRules)
    .set({ isActive: false })
    .where(eq(schema.recurringRules.id, id))
    .returning().get()
}

// --- Investment Snapshots ---
export function getInvestmentSnapshots(db: DB, range?: { from?: string; to?: string }) {
  const conditions = []

  if (range?.from) {
    conditions.push(like(schema.investmentSnapshots.date, `${range.from}%`))
  }
  if (range?.to) {
    // For "to" we need <=, use raw SQL comparison since dates are YYYY-MM-DD strings
    conditions.push(sql`${schema.investmentSnapshots.date} <= ${range.to + '-31'}`)
  }

  const query = db.select().from(schema.investmentSnapshots)
    .orderBy(desc(schema.investmentSnapshots.date))

  if (conditions.length > 0) {
    return query.where(and(...conditions))
  }
  return query
}

export function createInvestmentSnapshot(db: DB, data: { date: string; totalValue: number; note?: string }) {
  return db.insert(schema.investmentSnapshots).values(data).returning().get()
}

export function deleteInvestmentSnapshot(db: DB, id: number) {
  return db.delete(schema.investmentSnapshots).where(eq(schema.investmentSnapshots.id, id))
}

// --- Bank Imports ---
export function createBankImport(db: DB, data: { filename: string; rowCount: number; status: string }) {
  return db.insert(schema.bankImports).values(data).returning().get()
}

export function getBankImports(db: DB) {
  return db.select().from(schema.bankImports).orderBy(desc(schema.bankImports.importedAt))
}

// --- Stats ---
export function getMonthlySummary(db: DB, year: string) {
  return db.run(sql`
    SELECT
      substr(date, 1, 7) as month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses,
      SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as balance
    FROM transactions
    WHERE date LIKE ${year + '%'}
    GROUP BY substr(date, 1, 7)
    ORDER BY month
  `)
}

export function getCategoryBreakdown(db: DB, month: string) {
  return db.run(sql`
    SELECT
      c.id as category_id,
      c.name as category_name,
      c.color as category_color,
      SUM(t.amount) as total
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.date LIKE ${month + '%'} AND t.type = 'expense'
    GROUP BY c.id
    ORDER BY total DESC
  `)
}

// --- Recurring Generation ---
export function getLastGeneratedTransaction(db: DB, recurringId: number) {
  return db.select().from(schema.transactions)
    .where(eq(schema.transactions.recurringId, recurringId))
    .orderBy(desc(schema.transactions.date))
    .limit(1)
    .get()
}
