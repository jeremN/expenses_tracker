import { describe, it, expect } from 'vitest'
import { groupAccountsByKind, latestNetWorthDelta, withValuationDeltas } from './net-worth.helpers'
import type { Account, NetWorthSnapshot, AccountValuationEntry } from '@tracker/shared'

const account = (over: Partial<Account>): Account => ({
  id: 1, name: 'A', kind: 'asset', type: 'cash', valuation: 'manual',
  currentValue: 0, institution: null, color: null, icon: null,
  isActive: true, createdAt: 'now', updatedAt: 'now', ...over,
})

const snap = (date: string, netWorth: number): NetWorthSnapshot => ({
  id: date.length, date, totalAssets: netWorth, totalLiabilities: 0, netWorth, note: null, createdAt: 'now',
})

describe('groupAccountsByKind', () => {
  it('splits active accounts into assets and liabilities, each sorted by value desc', () => {
    const groups = groupAccountsByKind([
      account({ id: 1, name: 'Cash', kind: 'asset', currentValue: 50000 }),
      account({ id: 2, name: 'Brokerage', kind: 'asset', currentValue: 150000 }),
      account({ id: 3, name: 'Mortgage', kind: 'liability', currentValue: 800000 }),
    ])
    expect(groups.assets.map((a) => a.name)).toEqual(['Brokerage', 'Cash'])
    expect(groups.liabilities.map((a) => a.name)).toEqual(['Mortgage'])
  })

  it('excludes inactive accounts', () => {
    const groups = groupAccountsByKind([
      account({ id: 1, name: 'Old', kind: 'asset', currentValue: 999, isActive: false }),
      account({ id: 2, name: 'New', kind: 'asset', currentValue: 100 }),
    ])
    expect(groups.assets.map((a) => a.name)).toEqual(['New'])
  })
})

describe('latestNetWorthDelta', () => {
  it('returns latest minus previous (snapshots are date-descending)', () => {
    // index 0 is newest
    expect(latestNetWorthDelta([snap('2026-07-01', 1300000), snap('2026-06-01', 1200000)])).toBe(100000)
  })

  it('returns a negative delta when net worth fell', () => {
    expect(latestNetWorthDelta([snap('2026-07-01', 1100000), snap('2026-06-01', 1200000)])).toBe(-100000)
  })

  it('returns null with fewer than two snapshots', () => {
    expect(latestNetWorthDelta([snap('2026-07-01', 1)])).toBeNull()
    expect(latestNetWorthDelta([])).toBeNull()
  })
})

describe('withValuationDeltas', () => {
  const val = (date: string, value: number): AccountValuationEntry => ({
    id: date.length, accountId: 1, date, value, createdAt: 'now',
  })

  it('annotates each row with its change from the chronologically previous (older) one', () => {
    // newest-first, as the query returns them
    const rows = withValuationDeltas([
      val('2026-07-01', 31000000),
      val('2026-06-01', 30800000),
      val('2026-05-01', 30500000),
    ])
    expect(rows.map((r) => r.change)).toEqual([200000, 300000, null])
  })

  it('reports negative changes when the value fell', () => {
    const rows = withValuationDeltas([val('2026-07-01', 900), val('2026-06-01', 1000)])
    expect(rows[0].change).toBe(-100)
  })

  it('gives the only row a null change', () => {
    expect(withValuationDeltas([val('2026-07-01', 500)])[0].change).toBeNull()
  })

  it('returns an empty array unchanged', () => {
    expect(withValuationDeltas([])).toEqual([])
  })
})
