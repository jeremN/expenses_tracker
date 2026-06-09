import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  categories,
  transactions,
  recurringRules,
  investmentSnapshots,
  budgets,
  bankImports,
} from '@tracker/db'

const schema = {
  categories,
  transactions,
  recurringRules,
  investmentSnapshots,
  budgets,
  bankImports,
}

// packages/db/drizzle relative to this file (apps/web/src/test/).
const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../packages/db/drizzle',
)

/**
 * Fresh in-memory libsql DB with the real Drizzle migrations applied. libsql
 * is async like D1, so the returned db is assignable to the queries' DB type.
 * One DB per call → tests are isolated.
 */
export async function makeTestDb() {
  const client = createClient({ url: ':memory:' })
  const db = drizzle(client, { schema })
  await migrate(db, { migrationsFolder })
  return db
}

export type TestDb = Awaited<ReturnType<typeof makeTestDb>>
