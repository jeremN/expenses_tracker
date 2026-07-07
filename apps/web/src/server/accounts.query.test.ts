import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { makeTestDb } from '~/test/make-test-db'
import {
  createAccount,
  getAccounts,
  getAccountById,
  deleteAccount,
  getNetWorthTotals,
  holdings,
  accountValuations,
} from '@tracker/db'

describe('accounts query layer', () => {
  it('createAccount stores an account with defaults (manual valuation, active)', async () => {
    const db = await makeTestDb()
    const acc = await createAccount(db, {
      name: 'Checking', kind: 'asset', type: 'checking', currentValue: 120000,
    })
    expect(acc).toMatchObject({
      name: 'Checking', kind: 'asset', type: 'checking',
      valuation: 'manual', currentValue: 120000, isActive: true,
    })
    expect(acc.id).toBeGreaterThan(0)
  })

  it('getAccounts returns accounts ordered by name', async () => {
    const db = await makeTestDb()
    await createAccount(db, { name: 'Zebra', kind: 'asset', type: 'cash', currentValue: 0 })
    await createAccount(db, { name: 'Apple', kind: 'asset', type: 'cash', currentValue: 0 })
    const list = await getAccounts(db)
    expect(list.map((a) => a.name)).toEqual(['Apple', 'Zebra'])
  })

  it('getNetWorthTotals sums assets and liabilities from active accounts only', async () => {
    const db = await makeTestDb()
    await createAccount(db, { name: 'Cash', kind: 'asset', type: 'cash', currentValue: 500000 })
    await createAccount(db, { name: 'Brokerage', kind: 'asset', type: 'brokerage', currentValue: 1500000 })
    await createAccount(db, { name: 'Mortgage', kind: 'liability', type: 'loan', currentValue: 800000 })
    // A retired (inactive) asset must NOT count toward current net worth.
    await createAccount(db, {
      name: 'Old wallet', kind: 'asset', type: 'cash', currentValue: 999999, isActive: false,
    })

    const totals = await getNetWorthTotals(db)
    expect(totals.totalAssets).toBe(2000000) // 500000 + 1500000
    expect(totals.totalLiabilities).toBe(800000)
    // net worth = assets − liabilities (subtraction done by the caller); may be negative
    expect(totals.totalAssets - totals.totalLiabilities).toBe(1200000)
  })

  it('deleteAccount removes the account and cascades its holdings and valuations', async () => {
    const db = await makeTestDb()
    const acc = await createAccount(db, {
      name: 'Brokerage', kind: 'asset', type: 'brokerage', valuation: 'tracked', currentValue: 0,
    })
    await db.insert(holdings).values({ accountId: acc.id, name: 'VWCE', marketValue: 100000 })
    await db.insert(accountValuations).values({ accountId: acc.id, date: '2026-07-01', value: 100000 })

    const deleted = await deleteAccount(db, acc.id)

    expect(deleted?.id).toBe(acc.id)
    expect(await getAccountById(db, acc.id)).toBeUndefined()
    const remainingHoldings = await db.select().from(holdings).where(eq(holdings.accountId, acc.id))
    const remainingVals = await db.select().from(accountValuations).where(eq(accountValuations.accountId, acc.id))
    expect(remainingHoldings).toHaveLength(0)
    expect(remainingVals).toHaveLength(0)
  })
})
