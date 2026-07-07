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
  // Reconciliation entries are balance corrections, not real cash flow, so they
  // are excluded from income/expense/balance. NOT EXISTS is null-safe — rows
  // with a NULL category_id (uncategorized) are kept. See RECONCILIATION_CATEGORY.
  return db.run(sql`
    SELECT
      substr(date, 1, 7) as month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses,
      SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as balance
    FROM transactions
    WHERE date LIKE ${year + '%'}
      AND NOT EXISTS (
        SELECT 1 FROM categories rc
        WHERE rc.id = transactions.category_id AND rc.name = ${RECONCILIATION_CATEGORY}
      )
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
      AND NOT EXISTS (
        SELECT 1 FROM categories rc
        WHERE rc.id = t.category_id AND rc.name = ${RECONCILIATION_CATEGORY}
      )
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

// --- Accounts / Net worth ---
type AccountKind = 'asset' | 'liability'
type AccountType =
  | 'cash' | 'checking' | 'savings' | 'brokerage' | 'retirement'
  | 'real_estate' | 'crypto' | 'vehicle' | 'loan' | 'credit_card' | 'other'
type Valuation = 'manual' | 'tracked'

export function getAccounts(db: DB) {
  return db.select().from(schema.accounts).orderBy(schema.accounts.name)
}

export function getAccountById(db: DB, id: number) {
  return db.select().from(schema.accounts).where(eq(schema.accounts.id, id)).get()
}

export function createAccount(db: DB, data: {
  name: string; kind: AccountKind; type: AccountType; currentValue: number;
  valuation?: Valuation; institution?: string; color?: string; icon?: string; isActive?: boolean;
}) {
  return db.insert(schema.accounts).values(data).returning().get()
}

export function updateAccount(db: DB, id: number, data: Partial<{
  name: string; kind: AccountKind; type: AccountType; valuation: Valuation;
  currentValue: number; institution: string; color: string; icon: string; isActive: boolean;
}>) {
  return db.update(schema.accounts)
    .set({ ...data, updatedAt: sql`(current_timestamp)` })
    .where(eq(schema.accounts.id, id))
    .returning().get()
}

export async function deleteAccount(db: DB, id: number) {
  // No DB-level cascade (FKs are ON DELETE no action) — remove children in the
  // query layer, exactly like deleteCategory. Transfer rows are kept as history
  // but the leg pointing at this account is nulled (it becomes an external leg),
  // dropping the dangling reference without rewriting the other account.
  await db.delete(schema.holdings).where(eq(schema.holdings.accountId, id))
  await db.delete(schema.accountValuations).where(eq(schema.accountValuations.accountId, id))
  await db.update(schema.assetTransfers).set({ fromAccountId: null })
    .where(eq(schema.assetTransfers.fromAccountId, id))
  await db.update(schema.assetTransfers).set({ toAccountId: null })
    .where(eq(schema.assetTransfers.toAccountId, id))
  return db.delete(schema.accounts)
    .where(eq(schema.accounts.id, id))
    .returning()
    .get()
}

/**
 * Current net worth split into asset and liability totals, summed from ACTIVE
 * accounts only (retired accounts stay in history but drop out of "now").
 * Values are positive magnitudes; the caller computes netWorth = assets −
 * liabilities (which may be negative). `.get()` over an aggregate always yields
 * one COALESCE'd row, so the totals are guaranteed numbers.
 */
export async function getNetWorthTotals(db: DB) {
  const row = await db.select({
    totalAssets: sql<number>`COALESCE(SUM(CASE WHEN ${schema.accounts.kind} = 'asset' THEN ${schema.accounts.currentValue} ELSE 0 END), 0)`,
    totalLiabilities: sql<number>`COALESCE(SUM(CASE WHEN ${schema.accounts.kind} = 'liability' THEN ${schema.accounts.currentValue} ELSE 0 END), 0)`,
  })
    .from(schema.accounts)
    .where(eq(schema.accounts.isActive, true))
    .get()
  return { totalAssets: row?.totalAssets ?? 0, totalLiabilities: row?.totalLiabilities ?? 0 }
}

// --- Holdings (positions inside a `tracked` account) ---
export function getHoldings(db: DB, accountId: number) {
  return db.select().from(schema.holdings)
    .where(eq(schema.holdings.accountId, accountId))
    .orderBy(schema.holdings.name)
}

export function getHoldingById(db: DB, id: number) {
  return db.select().from(schema.holdings).where(eq(schema.holdings.id, id)).get()
}

/**
 * Recompute a `tracked` account's cached current_value from SUM(holdings).
 * No-op for `manual` accounts — their current_value is the user's typed figure
 * and must never be clobbered by a stray holding. Called after every holding
 * mutation (the single seam that keeps the cache honest, cf. getBudgetOverview
 * pre-aggregation).
 */
export async function recalcAccountValue(db: DB, accountId: number) {
  const account = await db.select().from(schema.accounts)
    .where(eq(schema.accounts.id, accountId)).get()
  if (!account || account.valuation !== 'tracked') return account
  const row = await db.select({
    total: sql<number>`COALESCE(SUM(${schema.holdings.marketValue}), 0)`,
  }).from(schema.holdings).where(eq(schema.holdings.accountId, accountId)).get()
  return db.update(schema.accounts)
    .set({ currentValue: row?.total ?? 0, updatedAt: sql`(current_timestamp)` })
    .where(eq(schema.accounts.id, accountId))
    .returning().get()
}

export async function createHolding(db: DB, data: {
  accountId: number; name: string; symbol?: string;
  quantity?: number; costBasis?: number; marketValue: number;
}) {
  const holding = await db.insert(schema.holdings).values(data).returning().get()
  await recalcAccountValue(db, data.accountId)
  return holding
}

export async function updateHolding(db: DB, id: number, data: Partial<{
  name: string; symbol: string; quantity: number; costBasis: number; marketValue: number;
}>) {
  const holding = await db.update(schema.holdings)
    .set({ ...data, updatedAt: sql`(current_timestamp)` })
    .where(eq(schema.holdings.id, id))
    .returning().get()
  if (holding) await recalcAccountValue(db, holding.accountId)
  return holding
}

export async function deleteHolding(db: DB, id: number) {
  const holding = await db.delete(schema.holdings)
    .where(eq(schema.holdings.id, id))
    .returning().get()
  if (holding) await recalcAccountValue(db, holding.accountId)
  return holding
}

// --- Net-worth snapshots ---
export function upsertNetWorthSnapshot(db: DB, data: {
  date: string; totalAssets: number; totalLiabilities: number; netWorth: number; note?: string;
}) {
  return db.insert(schema.netWorthSnapshots)
    .values(data)
    .onConflictDoUpdate({
      target: schema.netWorthSnapshots.date,
      set: {
        totalAssets: data.totalAssets,
        totalLiabilities: data.totalLiabilities,
        netWorth: data.netWorth,
        note: data.note,
      },
    })
    .returning()
    .get()
}

export function getNetWorthSnapshots(db: DB, range?: { from?: string; to?: string }) {
  // from/to are YYYY-MM; widen to the month edges (cf. getInvestmentSnapshots).
  const conditions = []
  if (range?.from) {
    conditions.push(sql`${schema.netWorthSnapshots.date} >= ${range.from + '-01'}`)
  }
  if (range?.to) {
    conditions.push(sql`${schema.netWorthSnapshots.date} <= ${range.to + '-31'}`)
  }
  const query = db.select().from(schema.netWorthSnapshots)
    .orderBy(desc(schema.netWorthSnapshots.date))
  if (conditions.length > 0) {
    return query.where(and(...conditions))
  }
  return query
}

export function deleteNetWorthSnapshot(db: DB, id: number) {
  return db.delete(schema.netWorthSnapshots)
    .where(eq(schema.netWorthSnapshots.id, id))
    .returning()
    .get()
}

// --- Reconciliation ---
// Reconcile entries land in this reserved category so charts/savings-rate can
// exclude them (the balance-correction-vs-return distinction). The name is
// unique in `categories`, so we get-or-create it once and reuse it.
export const RECONCILIATION_CATEGORY = 'Reconciliation'

// Reconciling one of these types treats a balance discrepancy as real cash flow
// (unrecorded income/spending) and books a balancing transaction. Every other
// type is a revaluation (investments, property, vehicles) or a liability, where
// a value change is NOT cash flow — those reconcile silently (value only). Only
// asset-cash types are included so `delta > 0 → income` always holds.
export const CASH_FLOW_ACCOUNT_TYPES = new Set<AccountType>(['cash', 'checking', 'savings'])

async function getOrCreateReconciliationCategoryId(db: DB): Promise<number> {
  const existing = await db.select().from(schema.categories)
    .where(eq(schema.categories.name, RECONCILIATION_CATEGORY)).get()
  if (existing) return existing.id
  // onConflictDoNothing guards the rare concurrent-create race; re-select if we lost it.
  const created = await db.insert(schema.categories)
    .values({ name: RECONCILIATION_CATEGORY })
    .onConflictDoNothing()
    .returning().get()
  if (created) return created.id
  const now = await db.select().from(schema.categories)
    .where(eq(schema.categories.name, RECONCILIATION_CATEGORY)).get()
  return now!.id
}

/**
 * Set an account's observed balance on a date. For CASH_FLOW_ACCOUNT_TYPES only,
 * the discrepancy (observed − previous) is booked as a balancing transaction
 * (income if up, expense if down) in the reserved Reconciliation category. For
 * every other type (investments/property/liabilities) a value change is a
 * revaluation, not cash flow, so no transaction is written. Either way it records
 * an account_valuations row (upserted per day) and snaps current_value.
 * Returns undefined if the account doesn't exist (so the route can 404).
 */
export async function reconcileAccount(db: DB, accountId: number, data: {
  value: number; date: string; note?: string;
}) {
  const account = await db.select().from(schema.accounts)
    .where(eq(schema.accounts.id, accountId)).get()
  if (!account) return undefined

  const delta = data.value - account.currentValue

  let transaction = null
  if (delta !== 0 && CASH_FLOW_ACCOUNT_TYPES.has(account.type)) {
    const categoryId = await getOrCreateReconciliationCategoryId(db)
    transaction = await db.insert(schema.transactions).values({
      type: delta > 0 ? 'income' : 'expense',
      amount: Math.abs(delta),
      description: data.note ?? `Reconciliation: ${account.name}`,
      date: data.date,
      categoryId,
    }).returning().get()
  }

  const valuation = await db.insert(schema.accountValuations)
    .values({ accountId, date: data.date, value: data.value })
    .onConflictDoUpdate({
      target: [schema.accountValuations.accountId, schema.accountValuations.date],
      set: { value: data.value },
    })
    .returning().get()

  const updated = await db.update(schema.accounts)
    .set({ currentValue: data.value, updatedAt: sql`(current_timestamp)` })
    .where(eq(schema.accounts.id, accountId))
    .returning().get()

  return { account: updated, valuation, transaction }
}

/** An account's recorded balances over time (from reconciliations), newest first. */
export function getAccountValuations(db: DB, accountId: number, limit?: number) {
  const query = db.select().from(schema.accountValuations)
    .where(eq(schema.accountValuations.accountId, accountId))
    .orderBy(desc(schema.accountValuations.date), desc(schema.accountValuations.id))
  return limit ? query.limit(limit) : query
}

// --- Asset transfers ---
// A transfer moves `amount` (cents, positive) between accounts, applying a
// kind-signed delta to each present leg's current_value:
//   from → asset −amount / liability +amount
//   to   → asset +amount / liability −amount
// With both legs present the change nets to zero (composition, not total). A
// one-legged transfer (external in/out) intentionally moves net worth. Only
// MANUAL-valued accounts may participate — a tracked account's value is derived
// from holdings and would be overwritten by recalcAccountValue, so it's rejected.

type AccountRow = typeof schema.accounts.$inferSelect
type AssetTransferRow = typeof schema.assetTransfers.$inferSelect
type TransactionRow = typeof schema.transactions.$inferSelect

export type CreateTransferResult =
  | { ok: true; transfer: AssetTransferRow; from?: AccountRow; to?: AccountRow; transaction?: TransactionRow }
  | { ok: false; reason: 'no_legs' | 'not_found' | 'tracked_leg'; accountId?: number }

/** Signed delta applied to a leg's current_value. Positive = value grows. */
function transferLegDelta(kind: AccountKind, leg: 'from' | 'to', amount: number): number {
  const dir = leg === 'from' ? -1 : 1 // asset frame: source removes, destination adds
  return kind === 'asset' ? dir * amount : -dir * amount
}

export async function createTransfer(db: DB, data: {
  amount: number; date: string; fromAccountId?: number | null; toAccountId?: number | null;
  note?: string; countAsCashFlow?: boolean;
}): Promise<CreateTransferResult> {
  const fromId = data.fromAccountId ?? null
  const toId = data.toAccountId ?? null
  if (fromId == null && toId == null) return { ok: false, reason: 'no_legs' }

  const legs: Array<{ id: number; leg: 'from' | 'to' }> = []
  if (fromId != null) legs.push({ id: fromId, leg: 'from' })
  if (toId != null) legs.push({ id: toId, leg: 'to' })

  // Validate BEFORE writing anything, so a bad leg leaves no partial state.
  const loaded: Partial<Record<'from' | 'to', AccountRow>> = {}
  for (const { id, leg } of legs) {
    const acc = await db.select().from(schema.accounts).where(eq(schema.accounts.id, id)).get()
    if (!acc) return { ok: false, reason: 'not_found', accountId: id }
    if (acc.valuation !== 'manual') return { ok: false, reason: 'tracked_leg', accountId: id }
    loaded[leg] = acc
  }

  // Opt-in cash-flow entry: only for a one-legged (external) transfer. External
  // IN (to leg) is income; external OUT (from leg) is expense. Uncategorized so
  // it counts in cash-flow stats (unlike the excluded Reconciliation category).
  let transaction: TransactionRow | undefined
  if (data.countAsCashFlow && legs.length === 1) {
    const external = legs[0]
    transaction = await db.insert(schema.transactions).values({
      type: external.leg === 'to' ? 'income' : 'expense',
      amount: data.amount,
      description: data.note ?? (external.leg === 'to' ? 'Transfer in' : 'Transfer out'),
      date: data.date,
    }).returning().get()
  }

  const transfer = await db.insert(schema.assetTransfers).values({
    date: data.date, amount: data.amount, note: data.note,
    fromAccountId: fromId, toAccountId: toId,
    transactionId: transaction?.id ?? null,
  }).returning().get()

  const applied: { from?: AccountRow; to?: AccountRow } = {}
  for (const { id, leg } of legs) {
    const acc = loaded[leg]!
    const delta = transferLegDelta(acc.kind, leg, data.amount)
    applied[leg] = await db.update(schema.accounts)
      .set({ currentValue: acc.currentValue + delta, updatedAt: sql`(current_timestamp)` })
      .where(eq(schema.accounts.id, id))
      .returning().get()
  }

  return { ok: true, transfer, from: applied.from, to: applied.to, transaction }
}

export function getTransfers(db: DB, limit?: number) {
  const query = db.select().from(schema.assetTransfers)
    .orderBy(desc(schema.assetTransfers.date), desc(schema.assetTransfers.id))
  return limit ? query.limit(limit) : query
}

/**
 * Delete a transfer and REVERSE its effect on each leg that still points to an
 * existing manual account (a leg may have been nulled by deleteAccount, or the
 * account since converted to tracked — skip those). Returns undefined for a
 * missing transfer so the route can 404.
 */
export async function deleteTransfer(db: DB, id: number): Promise<AssetTransferRow | undefined> {
  const transfer = await db.select().from(schema.assetTransfers)
    .where(eq(schema.assetTransfers.id, id)).get()
  if (!transfer) return undefined

  const legs: Array<{ id: number | null; leg: 'from' | 'to' }> = [
    { id: transfer.fromAccountId, leg: 'from' },
    { id: transfer.toAccountId, leg: 'to' },
  ]
  for (const { id: accId, leg } of legs) {
    if (accId == null) continue
    const acc = await db.select().from(schema.accounts).where(eq(schema.accounts.id, accId)).get()
    if (!acc || acc.valuation !== 'manual') continue
    const delta = transferLegDelta(acc.kind, leg, transfer.amount)
    await db.update(schema.accounts)
      .set({ currentValue: acc.currentValue - delta, updatedAt: sql`(current_timestamp)` })
      .where(eq(schema.accounts.id, accId)).run()
  }

  const deleted = await db.delete(schema.assetTransfers)
    .where(eq(schema.assetTransfers.id, id))
    .returning().get()
  // Remove the owned cash-flow entry after the FK reference is gone.
  if (transfer.transactionId != null) {
    await db.delete(schema.transactions)
      .where(eq(schema.transactions.id, transfer.transactionId)).run()
  }
  return deleted
}
