import { describe, it, expect } from 'vitest'
import { makeTestDb } from '~/test/make-test-db'
import {
  upsertNetWorthSnapshot,
  getNetWorthSnapshots,
  deleteNetWorthSnapshot,
} from '@tracker/db'

const snap = (date: string, netWorth: number) => ({
  date, totalAssets: netWorth + 100000, totalLiabilities: 100000, netWorth,
})

describe('net-worth snapshot query layer', () => {
  it('upsertNetWorthSnapshot inserts a snapshot for a new date', async () => {
    const db = await makeTestDb()
    const row = await upsertNetWorthSnapshot(db, snap('2026-07-01', 1200000))
    expect(row).toMatchObject({ date: '2026-07-01', netWorth: 1200000, totalLiabilities: 100000 })
  })

  it('upsertNetWorthSnapshot updates in place on the same date (no duplicate)', async () => {
    const db = await makeTestDb()
    await upsertNetWorthSnapshot(db, snap('2026-07-01', 1200000))
    await upsertNetWorthSnapshot(db, snap('2026-07-01', 1300000))

    const all = await getNetWorthSnapshots(db)
    expect(all).toHaveLength(1)
    expect(all[0].netWorth).toBe(1300000)
  })

  it('getNetWorthSnapshots returns snapshots ordered by date descending', async () => {
    const db = await makeTestDb()
    await upsertNetWorthSnapshot(db, snap('2026-05-01', 100))
    await upsertNetWorthSnapshot(db, snap('2026-07-01', 300))
    await upsertNetWorthSnapshot(db, snap('2026-06-01', 200))

    const all = await getNetWorthSnapshots(db)
    expect(all.map((s) => s.date)).toEqual(['2026-07-01', '2026-06-01', '2026-05-01'])
  })

  it('getNetWorthSnapshots filters by month range (from/to as YYYY-MM)', async () => {
    const db = await makeTestDb()
    await upsertNetWorthSnapshot(db, snap('2026-05-15', 1))
    await upsertNetWorthSnapshot(db, snap('2026-06-15', 2))
    await upsertNetWorthSnapshot(db, snap('2026-07-15', 3))

    const june = await getNetWorthSnapshots(db, { from: '2026-06', to: '2026-06' })
    expect(june.map((s) => s.date)).toEqual(['2026-06-15'])
  })

  it('deleteNetWorthSnapshot removes the snapshot and returns it', async () => {
    const db = await makeTestDb()
    const created = await upsertNetWorthSnapshot(db, snap('2026-07-01', 500))
    const deleted = await deleteNetWorthSnapshot(db, created.id)
    expect(deleted?.id).toBe(created.id)
    expect(await getNetWorthSnapshots(db)).toHaveLength(0)
  })
})
