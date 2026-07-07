import { sqliteTable, integer, text, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  color: text('color'),
  icon: text('icon'),
  createdAt: text('created_at').default(sql`(current_timestamp)`).notNull(),
})

// Defined before transactions to avoid forward reference issue
export const recurringRules = sqliteTable('recurring_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  amount: integer('amount').notNull(), // stored in cents
  description: text('description'),
  categoryId: integer('category_id').references(() => categories.id),
  frequency: text('frequency', { enum: ['weekly', 'monthly', 'yearly'] }).notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: text('created_at').default(sql`(current_timestamp)`).notNull(),
})

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  amount: integer('amount').notNull(), // stored in cents
  description: text('description'),
  date: text('date').notNull(), // YYYY-MM-DD
  categoryId: integer('category_id').references(() => categories.id),
  recurringId: integer('recurring_id').references(() => recurringRules.id),
  createdAt: text('created_at').default(sql`(current_timestamp)`).notNull(),
  updatedAt: text('updated_at').default(sql`(current_timestamp)`).notNull(),
}, (table) => [
  uniqueIndex('uniq_recurring_date').on(table.recurringId, table.date),
  index('idx_transactions_date').on(table.date),
  index('idx_transactions_category_id').on(table.categoryId),
  index('idx_transactions_type').on(table.type),
])

export const investmentSnapshots = sqliteTable('investment_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(), // YYYY-MM-DD
  totalValue: integer('total_value').notNull(), // stored in cents
  note: text('note'),
  createdAt: text('created_at').default(sql`(current_timestamp)`).notNull(),
})

export const budgets = sqliteTable('budgets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  categoryId: integer('category_id')
    .notNull()
    .unique()
    .references(() => categories.id),
  amount: integer('amount').notNull(), // monthly limit in cents
  createdAt: text('created_at').default(sql`(current_timestamp)`).notNull(),
  updatedAt: text('updated_at').default(sql`(current_timestamp)`).notNull(),
})

export const bankImports = sqliteTable('bank_imports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  filename: text('filename').notNull(),
  importedAt: text('imported_at').default(sql`(current_timestamp)`).notNull(),
  rowCount: integer('row_count'),
  status: text('status', { enum: ['pending', 'completed', 'partial'] }).default('pending').notNull(),
})

// --- Net worth: asset/liability accounts and their valuation history ---

// An asset or liability container (cash, brokerage, real estate, a loan…).
// `current_value` is the single figure net worth reads: for `manual` accounts
// the user types it; for `tracked` accounts it's cached from SUM(holdings).
// Values are stored as a POSITIVE magnitude — the asset/liability sign is
// applied at rollup time, never persisted negative (mirrors how <Amount>
// treats income/expense as magnitude + tone).
export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  kind: text('kind', { enum: ['asset', 'liability'] }).notNull(),
  type: text('type', {
    enum: [
      'cash', 'checking', 'savings', 'brokerage', 'retirement',
      'real_estate', 'crypto', 'vehicle', 'loan', 'credit_card', 'other',
    ],
  }).notNull(),
  valuation: text('valuation', { enum: ['manual', 'tracked'] }).notNull().default('manual'),
  currentValue: integer('current_value').notNull().default(0), // cents, positive magnitude
  institution: text('institution'),
  color: text('color'),
  icon: text('icon'),
  // Soft-delete (like recurring_rules.is_active) so retiring an account never
  // corrupts historical snapshots. Rollups only count is_active = 1.
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: text('created_at').default(sql`(current_timestamp)`).notNull(),
  updatedAt: text('updated_at').default(sql`(current_timestamp)`).notNull(),
}, (table) => [
  index('idx_accounts_kind').on(table.kind),
  index('idx_accounts_type').on(table.type),
])

// Individual positions inside a `tracked` account (brokerage/crypto).
// `market_value` (cents) is the load-bearing figure that feeds the account
// rollup; symbol/quantity/cost_basis are reference detail.
export const holdings = sqliteTable('holdings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull().references(() => accounts.id),
  symbol: text('symbol'), // e.g. VWCE, BTC — null for un-tickered assets
  name: text('name').notNull(),
  quantity: real('quantity'), // fractional shares/coins — the one non-integer column
  costBasis: integer('cost_basis'), // total invested, cents (nullable)
  marketValue: integer('market_value').notNull().default(0), // current value, cents
  createdAt: text('created_at').default(sql`(current_timestamp)`).notNull(),
  updatedAt: text('updated_at').default(sql`(current_timestamp)`).notNull(),
}, (table) => [
  index('idx_holdings_account_id').on(table.accountId),
])

// Point-in-time whole-portfolio rollups powering the net-worth trend chart.
// `net_worth` is materialised (not a view) so charting is one indexed SELECT;
// it CAN be negative. One snapshot per day → uniqueIndex enables upsert.
export const netWorthSnapshots = sqliteTable('net_worth_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(), // YYYY-MM-DD
  totalAssets: integer('total_assets').notNull(), // cents
  totalLiabilities: integer('total_liabilities').notNull(), // cents, positive magnitude
  netWorth: integer('net_worth').notNull(), // assets − liabilities; may be negative
  note: text('note'),
  createdAt: text('created_at').default(sql`(current_timestamp)`).notNull(),
}, (table) => [
  uniqueIndex('uniq_net_worth_date').on(table.date),
])

// Reconciliation record: the observed balance of one account on a date. A
// reconcile writes a row here AND updates accounts.current_value, so the jump
// is explained by history rather than silently overwritten.
export const accountValuations = sqliteTable('account_valuations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull().references(() => accounts.id),
  date: text('date').notNull(), // YYYY-MM-DD
  value: integer('value').notNull(), // observed balance, cents, positive magnitude
  createdAt: text('created_at').default(sql`(current_timestamp)`).notNull(),
}, (table) => [
  uniqueIndex('uniq_account_valuation_date').on(table.accountId, table.date),
  index('idx_account_valuations_date').on(table.date),
])

// A move of value between accounts (cash → brokerage, cash → loan paydown).
// Two-legged transfers are net-worth-neutral (composition, not total); from/to
// are nullable so one leg can be external. An external (one-legged) transfer can
// optionally book a cash-flow transaction — transaction_id links to it so the
// transfer owns that entry and deleting the transfer removes it too.
export const assetTransfers = sqliteTable('asset_transfers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(), // YYYY-MM-DD
  fromAccountId: integer('from_account_id').references(() => accounts.id),
  toAccountId: integer('to_account_id').references(() => accounts.id),
  amount: integer('amount').notNull(), // cents moved, positive
  note: text('note'),
  transactionId: integer('transaction_id').references(() => transactions.id), // set when an external leg counts as cash flow
  createdAt: text('created_at').default(sql`(current_timestamp)`).notNull(),
}, (table) => [
  index('idx_asset_transfers_date').on(table.date),
  index('idx_asset_transfers_from').on(table.fromAccountId),
  index('idx_asset_transfers_to').on(table.toAccountId),
])
