import JSZip from 'jszip'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'
import {
  getTransactions,
  getCategories,
  getRecurringRules,
  getInvestmentSnapshots,
  getBankImports,
} from '@tracker/db'
import { toCSV } from './csv-writer'

type DB = BaseSQLiteDatabase<'async', any, any>

/**
 * Fetch every D1 table and return a zip of one CSV per table.
 *
 * Tables: transactions, categories, recurring_rules, investment_snapshots,
 * bank_imports. CSVs are at the zip root (no subdirectories).
 *
 * Money fields are written as integer cents (raw); see the design doc for the
 * full format spec.
 */
export async function buildExportZip(db: DB): Promise<Uint8Array> {
  const [txRows, categories, recurringRows, snapshots, imports] = await Promise.all([
    getTransactions(db),
    getCategories(db),
    getRecurringRules(db),
    getInvestmentSnapshots(db),
    getBankImports(db),
  ])

  // getTransactions and getRecurringRules return left-joined shapes;
  // flatten back to the raw table row before writing.
  const transactions = (txRows as Array<{ transactions: Record<string, unknown> }>).map(
    (r) => r.transactions,
  )
  const recurringRules = (recurringRows as Array<{ recurring_rules?: Record<string, unknown>; recurringRules?: Record<string, unknown> }>).map(
    (r) => r.recurring_rules ?? r.recurringRules ?? r,
  )

  const zip = new JSZip()
  zip.file(
    'transactions.csv',
    toCSV(
      ['id', 'type', 'amount', 'description', 'date', 'category_id', 'recurring_id', 'created_at', 'updated_at'],
      transactions.map(snakeCaseKeys),
    ),
  )
  zip.file(
    'categories.csv',
    toCSV(['id', 'name', 'color', 'icon', 'created_at'], categories.map(snakeCaseKeys)),
  )
  zip.file(
    'recurring_rules.csv',
    toCSV(
      ['id', 'type', 'amount', 'description', 'category_id', 'frequency', 'start_date', 'end_date', 'is_active', 'created_at'],
      recurringRules.map(snakeCaseKeys),
    ),
  )
  zip.file(
    'investment_snapshots.csv',
    toCSV(['id', 'date', 'total_value', 'note', 'created_at'], snapshots.map(snakeCaseKeys)),
  )
  zip.file(
    'bank_imports.csv',
    toCSV(
      ['id', 'filename', 'imported_at', 'row_count', 'status'],
      imports.map(snakeCaseKeys),
    ),
  )

  return zip.generateAsync({ type: 'uint8array' })
}

/**
 * Drizzle returns camelCase keys (categoryId, createdAt). The CSV uses
 * snake_case headers matching the DB columns so the export is re-importable
 * via raw SQL or another tool. Convert keys at the boundary.
 */
function snakeCaseKeys(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    out[k.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase())] = v
  }
  return out
}
