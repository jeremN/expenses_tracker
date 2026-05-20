import { drizzle } from 'drizzle-orm/d1'
import { env } from 'cloudflare:workers'
import * as schema from '@tracker/db'

/**
 * Returns a Drizzle ORM instance connected to the Cloudflare D1 database.
 *
 * Uses the `env` module from `cloudflare:workers` to access the D1 binding
 * configured in wrangler.jsonc (binding name: "DB").
 *
 * Usage in server functions:
 * ```ts
 * import { getDB } from '~/server/db'
 * const db = getDB()
 * const rows = await db.query.transactions.findMany()
 * ```
 */
export function getDB() {
  return drizzle(env.expenses_tracker_db, { schema })
}
