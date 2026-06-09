import { eq, and, or, like, desc, sql, count } from 'drizzle-orm'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'
import * as schema from './schema'

type DB = BaseSQLiteDatabase<'async', any, typeof schema>

type TxType = 'income' | 'expense'
type Frequency = 'weekly' | 'monthly' | 'yearly'
type ImportStatus = 'pending' | 'completed' | 'partial'

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
  // Also null the FK on recurring rules — otherwise newly generated
  // transactions inherit a dangling category_id that breaks join-based stats.
  await db.update(schema.recurringRules)
    .set({ categoryId: null })
    .where(eq(schema.recurringRules.categoryId, id))
  // Remove the category's budget (FK has no DB-level cascade here).
  await db.delete(schema.budgets).where(eq(schema.budgets.categoryId, id))
  return db.delete(schema.categories)
    .where(eq(schema.categories.id, id))
    .returning()
    .get()
}

// --- Budgets ---
export function getBudgets(db: DB) {
  return db.select().from(schema.budgets)
}

export function upsertBudget(db: DB, categoryId: number, amount: number) {
  return db.insert(schema.budgets)
    .values({ categoryId, amount })
    .onConflictDoUpdate({
      target: schema.budgets.categoryId,
      set: { amount, updatedAt: sql`(current_timestamp)` },
    })
    .returning()
    .get()
}

export function deleteBudget(db: DB, categoryId: number) {
  return db.delete(schema.budgets)
    .where(eq(schema.budgets.categoryId, categoryId))
    .returning()
    .get()
}

/**
 * Every category with its monthly budget (null if unset) and the total
 * expense spend for the given `YYYY-MM` month. One query so the budgets page
 * has spend + limit per category without N round-trips.
 */
export function getBudgetOverview(db: DB, month: string) {
  return db.run(sql`
    SELECT
      c.id as category_id,
      c.name as category_name,
      c.color as category_color,
      b.amount as budget,
      COALESCE((
        SELECT SUM(t.amount) FROM transactions t
        WHERE t.category_id = c.id AND t.type = 'expense' AND t.date LIKE ${month + '%'}
      ), 0) as spent
    FROM categories c
    LEFT JOIN budgets b ON b.category_id = c.id
    ORDER BY c.name
  `)
}

// --- Transactions ---
type TxFilters = {
  month?: string
  categoryId?: number
  type?: string
  search?: string
  limit?: number
  offset?: number
}

// Shared WHERE conditions so list and count never drift apart.
function txConditions(filters?: TxFilters) {
  const conditions = []
  if (filters?.month) {
    conditions.push(like(schema.transactions.date, `${filters.month}%`))
  }
  if (filters?.categoryId) {
    conditions.push(eq(schema.transactions.categoryId, filters.categoryId))
  }
  if (filters?.type) {
    conditions.push(eq(schema.transactions.type, filters.type as TxType))
  }
  if (filters?.search) {
    const term = `%${filters.search}%`
    conditions.push(
      or(
        like(schema.transactions.description, term),
        like(schema.categories.name, term),
      ),
    )
  }
  return conditions
}

export function getTransactions(db: DB, filters?: TxFilters) {
  const conditions = txConditions(filters)
  let query = db
    .select()
    .from(schema.transactions)
    .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
    .$dynamic()

  if (conditions.length > 0) {
    query = query.where(and(...conditions))
  }
  query = query.orderBy(desc(schema.transactions.date))
  if (filters?.limit != null) {
    query = query.limit(filters.limit)
  }
  if (filters?.offset != null) {
    query = query.offset(filters.offset)
  }
  return query
}

// Total matching rows for pagination. `.get()` returns a plain object on both
// the D1 and libsql drivers (unlike `.run()`, whose shape diverges).
export function countTransactions(db: DB, filters?: TxFilters) {
  const conditions = txConditions(filters)
  let query = db
    .select({ value: count() })
    .from(schema.transactions)
    .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
    .$dynamic()
  if (conditions.length > 0) {
    query = query.where(and(...conditions))
  }
  return query.get()
}

export function getTransactionById(db: DB, id: number) {
  return db.select().from(schema.transactions)
    .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
    .where(eq(schema.transactions.id, id))
    .get()
}

export function createTransaction(db: DB, data: {
  type: TxType; amount: number; description?: string; date: string;
  categoryId?: number; recurringId?: number;
}) {
  return db.insert(schema.transactions).values(data).returning().get()
}

export function updateTransaction(db: DB, id: number, data: Partial<{
  type: TxType; amount: number; description: string; date: string; categoryId: number;
}>) {
  return db.update(schema.transactions)
    .set({ ...data, updatedAt: sql`(current_timestamp)` })
    .where(eq(schema.transactions.id, id))
    .returning().get()
}

export function deleteTransaction(db: DB, id: number) {
  return db.delete(schema.transactions)
    .where(eq(schema.transactions.id, id))
    .returning()
    .get()
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
  type: TxType; amount: number; description?: string; categoryId?: number;
  frequency: Frequency; startDate: string; endDate?: string;
}) {
  return db.insert(schema.recurringRules).values(data).returning().get()
}

export function updateRecurringRule(db: DB, id: number, data: Partial<{
  type: TxType; amount: number; description: string; categoryId: number;
  frequency: Frequency; startDate: string; endDate: string; isActive: boolean;
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
    conditions.push(sql`${schema.investmentSnapshots.date} >= ${range.from + '-01'}`)
  }
  if (range?.to) {
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

export function getInvestmentSnapshotById(db: DB, id: number) {
  return db.select().from(schema.investmentSnapshots).where(eq(schema.investmentSnapshots.id, id)).get()
}

export function deleteInvestmentSnapshot(db: DB, id: number) {
  return db.delete(schema.investmentSnapshots)
    .where(eq(schema.investmentSnapshots.id, id))
    .returning()
    .get()
}

// --- Bank Imports ---
export function createBankImport(db: DB, data: { filename: string; rowCount: number; status: ImportStatus }) {
  return db.insert(schema.bankImports).values(data).returning().get()
}

export function updateBankImportStatus(db: DB, id: number, data: { rowCount?: number; status: ImportStatus }) {
  return db.update(schema.bankImports).set(data).where(eq(schema.bankImports.id, id)).returning().get()
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

export function getCategorizedDescriptions(db: DB) {
  return db.run(sql`
    SELECT description, category_id, COUNT(*) as cnt
    FROM transactions
    WHERE description IS NOT NULL AND category_id IS NOT NULL
    GROUP BY description, category_id
    ORDER BY cnt DESC
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
