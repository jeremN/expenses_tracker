import { sqliteTable, integer, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core'
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
