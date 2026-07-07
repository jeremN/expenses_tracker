import { describe, it, expect } from 'vitest'
import { makeTestDb } from '~/test/make-test-db'
import {
  createCategory,
  createTransaction,
  createAccount,
  reconcileAccount,
  getMonthlySummary,
  getCategoryBreakdown,
} from '@tracker/db'

type TestDb = Awaited<ReturnType<typeof makeTestDb>>

// db.run() over libsql (test driver) returns a ResultSet with `.rows`.
function rows<T = Record<string, unknown>>(result: unknown): T[] {
  return (result as { rows: T[] }).rows
}

type SummaryRow = { month: string; income: number; expenses: number; balance: number }
type BreakdownRow = { category_name: string | null; total: number }

describe('getMonthlySummary excludes the reserved Reconciliation category', () => {
  it('a reconciliation INCOME entry does not inflate monthly income', async () => {
    const db = await makeTestDb()
    const food = await createCategory(db, { name: 'Food' })
    await createTransaction(db, { type: 'income', amount: 50000, date: '2026-07-10', description: 'Salary', categoryId: food.id })
    await createTransaction(db, { type: 'expense', amount: 20000, date: '2026-07-11', description: 'Groceries', categoryId: food.id })

    // Reconcile an account up by 30000 → books a +30000 INCOME in "Reconciliation".
    const acc = await createAccount(db, { name: 'Checking', kind: 'asset', type: 'checking', currentValue: 100000 })
    await reconcileAccount(db, acc.id, { value: 130000, date: '2026-07-12' })

    const jul = rows<SummaryRow>(await getMonthlySummary(db, '2026')).find((r) => r.month === '2026-07')
    expect(Number(jul?.income)).toBe(50000) // NOT 80000 — reconciliation excluded
    expect(Number(jul?.expenses)).toBe(20000)
    expect(Number(jul?.balance)).toBe(30000)
  })

  it('a reconciliation EXPENSE entry does not inflate monthly expenses', async () => {
    const db = await makeTestDb()
    const acc = await createAccount(db, { name: 'Checking', kind: 'asset', type: 'checking', currentValue: 100000 })
    await reconcileAccount(db, acc.id, { value: 90000, date: '2026-07-12' }) // −10000 EXPENSE in "Reconciliation"
    await createTransaction(db, { type: 'expense', amount: 20000, date: '2026-07-11', description: 'Groceries' })

    const jul = rows<SummaryRow>(await getMonthlySummary(db, '2026')).find((r) => r.month === '2026-07')
    expect(Number(jul?.expenses)).toBe(20000) // NOT 30000
  })

  it('does NOT drop uncategorized (null-category) transactions', async () => {
    const db = await makeTestDb()
    await createTransaction(db, { type: 'expense', amount: 5000, date: '2026-07-01', description: 'Cash' })

    const jul = rows<SummaryRow>(await getMonthlySummary(db, '2026')).find((r) => r.month === '2026-07')
    expect(Number(jul?.expenses)).toBe(5000) // null category must survive the exclusion filter
  })
})

describe('getCategoryBreakdown excludes the reserved Reconciliation category', () => {
  it('omits the Reconciliation slice but keeps real expense categories', async () => {
    const db = await makeTestDb()
    const food = await createCategory(db, { name: 'Food' })
    await createTransaction(db, { type: 'expense', amount: 20000, date: '2026-07-11', description: 'Groceries', categoryId: food.id })

    const acc = await createAccount(db, { name: 'Checking', kind: 'asset', type: 'checking', currentValue: 100000 })
    await reconcileAccount(db, acc.id, { value: 90000, date: '2026-07-12' }) // expense in Reconciliation

    const names = rows<BreakdownRow>(await getCategoryBreakdown(db, '2026-07')).map((r) => r.category_name)
    expect(names).toContain('Food')
    expect(names).not.toContain('Reconciliation')
  })
})
