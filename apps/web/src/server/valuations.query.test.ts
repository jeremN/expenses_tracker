import { describe, it, expect } from 'vitest'
import { makeTestDb } from '~/test/make-test-db'
import { createAccount, reconcileAccount, getAccountValuations } from '@tracker/db'

describe('getAccountValuations', () => {
  it('returns an account\'s valuations, newest date first', async () => {
    const db = await makeTestDb()
    const acc = await createAccount(db, { name: 'House', kind: 'asset', type: 'real_estate', currentValue: 30000000 })
    await reconcileAccount(db, acc.id, { value: 30500000, date: '2026-05-01' })
    await reconcileAccount(db, acc.id, { value: 31000000, date: '2026-07-01' })
    await reconcileAccount(db, acc.id, { value: 30800000, date: '2026-06-01' })

    const rows = await getAccountValuations(db, acc.id)

    expect(rows.map((r) => r.date)).toEqual(['2026-07-01', '2026-06-01', '2026-05-01'])
    expect(rows.map((r) => r.value)).toEqual([31000000, 30800000, 30500000])
  })

  it('respects a limit (keeps the most recent)', async () => {
    const db = await makeTestDb()
    const acc = await createAccount(db, { name: 'House', kind: 'asset', type: 'real_estate', currentValue: 100 })
    await reconcileAccount(db, acc.id, { value: 200, date: '2026-01-01' })
    await reconcileAccount(db, acc.id, { value: 300, date: '2026-02-01' })
    await reconcileAccount(db, acc.id, { value: 400, date: '2026-03-01' })

    const rows = await getAccountValuations(db, acc.id, 2)

    expect(rows.map((r) => r.date)).toEqual(['2026-03-01', '2026-02-01'])
  })

  it('returns an empty array for an account with no valuations', async () => {
    const db = await makeTestDb()
    const acc = await createAccount(db, { name: 'Fresh', kind: 'asset', type: 'checking', currentValue: 0 })
    expect(await getAccountValuations(db, acc.id)).toEqual([])
  })

  it('scopes to the requested account only', async () => {
    const db = await makeTestDb()
    const a = await createAccount(db, { name: 'A', kind: 'asset', type: 'checking', currentValue: 0 })
    const b = await createAccount(db, { name: 'B', kind: 'asset', type: 'checking', currentValue: 0 })
    await reconcileAccount(db, a.id, { value: 111, date: '2026-01-01' })
    await reconcileAccount(db, b.id, { value: 222, date: '2026-01-01' })

    const rows = await getAccountValuations(db, a.id)
    expect(rows).toHaveLength(1)
    expect(rows[0].value).toBe(111)
  })
})
