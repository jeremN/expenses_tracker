import { describe, it, expect } from 'vitest'
import { makeTestDb } from '~/test/make-test-db'
import {
  createAccount,
  getAccountById,
  createHolding,
  getHoldings,
  updateHolding,
  deleteHolding,
} from '@tracker/db'

async function trackedAccount(db: Awaited<ReturnType<typeof makeTestDb>>) {
  return createAccount(db, {
    name: 'Brokerage', kind: 'asset', type: 'brokerage', valuation: 'tracked', currentValue: 0,
  })
}

describe('holdings query layer', () => {
  it('createHolding on a tracked account recomputes the account current_value to SUM(marketValue)', async () => {
    const db = await makeTestDb()
    const acc = await trackedAccount(db)

    await createHolding(db, { accountId: acc.id, name: 'VWCE', marketValue: 100000 })
    await createHolding(db, { accountId: acc.id, name: 'BTC', symbol: 'BTC', quantity: 0.5, marketValue: 250000 })

    const refreshed = await getAccountById(db, acc.id)
    expect(refreshed?.currentValue).toBe(350000)
  })

  it('deleteHolding recomputes the account current_value', async () => {
    const db = await makeTestDb()
    const acc = await trackedAccount(db)
    const h1 = await createHolding(db, { accountId: acc.id, name: 'VWCE', marketValue: 100000 })
    await createHolding(db, { accountId: acc.id, name: 'BTC', marketValue: 250000 })

    await deleteHolding(db, h1.id)

    const refreshed = await getAccountById(db, acc.id)
    expect(refreshed?.currentValue).toBe(250000)
  })

  it('updateHolding marketValue recomputes the account current_value', async () => {
    const db = await makeTestDb()
    const acc = await trackedAccount(db)
    const h = await createHolding(db, { accountId: acc.id, name: 'VWCE', marketValue: 100000 })

    await updateHolding(db, h.id, { marketValue: 175000 })

    const refreshed = await getAccountById(db, acc.id)
    expect(refreshed?.currentValue).toBe(175000)
  })

  it('does NOT overwrite current_value for a manual account (user-typed value wins)', async () => {
    const db = await makeTestDb()
    const manual = await createAccount(db, {
      name: 'House', kind: 'asset', type: 'real_estate', valuation: 'manual', currentValue: 40000000,
    })

    await createHolding(db, { accountId: manual.id, name: 'stray', marketValue: 999 })

    const refreshed = await getAccountById(db, manual.id)
    expect(refreshed?.currentValue).toBe(40000000)
  })

  it('getHoldings returns holdings for the given account only', async () => {
    const db = await makeTestDb()
    const a = await trackedAccount(db)
    const b = await createAccount(db, { name: 'Crypto', kind: 'asset', type: 'crypto', valuation: 'tracked', currentValue: 0 })
    await createHolding(db, { accountId: a.id, name: 'VWCE', marketValue: 100000 })
    await createHolding(db, { accountId: b.id, name: 'ETH', marketValue: 50000 })

    const holdingsA = await getHoldings(db, a.id)
    expect(holdingsA.map((h) => h.name)).toEqual(['VWCE'])
  })
})
