import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { makeTestDb } from '~/test/make-test-db'
import {
  createAccount,
  getAccountById,
  reconcileAccount,
  categories,
  transactions,
  accountValuations,
} from '@tracker/db'

async function cashAccount(db: Awaited<ReturnType<typeof makeTestDb>>, value: number) {
  return createAccount(db, { name: 'Checking', kind: 'asset', type: 'checking', currentValue: value })
}

async function reconciliationCategory(db: Awaited<ReturnType<typeof makeTestDb>>) {
  return db.select().from(categories).where(eq(categories.name, 'Reconciliation')).get()
}

describe('reconcileAccount (balancing cash-flow entry, reserved category)', () => {
  it('observed > previous → books an INCOME entry for the delta in the Reconciliation category', async () => {
    const db = await makeTestDb()
    const acc = await cashAccount(db, 120000)

    const result = await reconcileAccount(db, acc.id, { value: 123400, date: '2026-07-07' })

    // account snapped to observed value
    expect(result?.account?.currentValue).toBe(123400)
    expect((await getAccountById(db, acc.id))?.currentValue).toBe(123400)
    // balancing transaction: +3400 as income
    expect(result?.transaction).toMatchObject({ type: 'income', amount: 3400, date: '2026-07-07' })
    // ...routed to the reserved category
    const cat = await reconciliationCategory(db)
    expect(cat).toBeTruthy()
    expect(result?.transaction?.categoryId).toBe(cat!.id)
    // ...and a valuation row was recorded
    const vals = await db.select().from(accountValuations).where(eq(accountValuations.accountId, acc.id))
    expect(vals).toHaveLength(1)
    expect(vals[0].value).toBe(123400)
  })

  it('observed < previous → books an EXPENSE entry for the absolute delta', async () => {
    const db = await makeTestDb()
    const acc = await cashAccount(db, 120000)

    const result = await reconcileAccount(db, acc.id, { value: 118000, date: '2026-07-07' })

    expect(result?.transaction).toMatchObject({ type: 'expense', amount: 2000 })
    expect((await getAccountById(db, acc.id))?.currentValue).toBe(118000)
  })

  it('observed == previous → NO transaction, but still records the valuation', async () => {
    const db = await makeTestDb()
    const acc = await cashAccount(db, 120000)

    const result = await reconcileAccount(db, acc.id, { value: 120000, date: '2026-07-07' })

    expect(result?.transaction).toBeNull()
    const allTx = await db.select().from(transactions)
    expect(allTx).toHaveLength(0)
    const vals = await db.select().from(accountValuations).where(eq(accountValuations.accountId, acc.id))
    expect(vals).toHaveLength(1)
  })

  it('reconciling twice reuses ONE Reconciliation category and upserts the daily valuation', async () => {
    const db = await makeTestDb()
    const acc = await cashAccount(db, 120000)

    await reconcileAccount(db, acc.id, { value: 121000, date: '2026-07-07' })
    await reconcileAccount(db, acc.id, { value: 122000, date: '2026-07-07' })

    // only one reserved category
    const cats = await db.select().from(categories).where(eq(categories.name, 'Reconciliation'))
    expect(cats).toHaveLength(1)
    // valuation for that day upserted, not duplicated
    const vals = await db.select().from(accountValuations).where(eq(accountValuations.accountId, acc.id))
    expect(vals).toHaveLength(1)
    expect(vals[0].value).toBe(122000)
    expect((await getAccountById(db, acc.id))?.currentValue).toBe(122000)
  })

  it('returns undefined for a missing account (so the route can 404)', async () => {
    const db = await makeTestDb()
    const result = await reconcileAccount(db, 9999, { value: 1, date: '2026-07-07' })
    expect(result).toBeUndefined()
  })
})
