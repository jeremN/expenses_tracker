import { describe, it, expect } from 'vitest'
import { makeTestDb, type TestDb } from '~/test/make-test-db'
import {
  createCategory,
  createTransaction,
  upsertBudget,
  getBudgetOverview,
} from '@tracker/db'

// libsql `.run()` returns `{ rows }` (the app reads `.results` from D1's
// driver). Either way the SQL semantics are what we assert here.
type Row = {
  category_id: number
  category_name: string
  category_color: string | null
  budget: number | null
  spent: number
}
async function overview(db: TestDb, month: string) {
  const res = (await getBudgetOverview(db, month)) as unknown as { rows: Row[] }
  return res.rows
}

describe('getBudgetOverview', () => {
  it('returns every category, null budget when unset, spend summed for the month', async () => {
    const db = await makeTestDb()
    const food = await createCategory(db, { name: 'Food' })
    const rent = await createCategory(db, { name: 'Rent' })

    await upsertBudget(db, food.id, 50000) // €500 budget on Food only
    // June expenses on Food: 200 + 100 = 300; one is income (ignored).
    await createTransaction(db, { type: 'expense', amount: 20000, date: '2026-06-03', categoryId: food.id })
    await createTransaction(db, { type: 'expense', amount: 10000, date: '2026-06-20', categoryId: food.id })
    await createTransaction(db, { type: 'income', amount: 99999, date: '2026-06-10', categoryId: food.id })
    // May expense on Food — must NOT count toward June.
    await createTransaction(db, { type: 'expense', amount: 70000, date: '2026-05-15', categoryId: food.id })
    // June expense on Rent (no budget) — appears with budget: null.
    await createTransaction(db, { type: 'expense', amount: 80000, date: '2026-06-01', categoryId: rent.id })

    const rows = await overview(db, '2026-06')

    // Ordered by category name: Food, Rent.
    expect(rows.map((r) => r.category_name)).toEqual(['Food', 'Rent'])
    const foodRow = rows.find((r) => r.category_name === 'Food')!
    const rentRow = rows.find((r) => r.category_name === 'Rent')!
    expect(foodRow.budget).toBe(50000)
    expect(Number(foodRow.spent)).toBe(30000) // only June expenses
    expect(rentRow.budget).toBeNull()
    expect(Number(rentRow.spent)).toBe(80000)
  })

  it('returns spent 0 for a category with no transactions in the month', async () => {
    const db = await makeTestDb()
    await createCategory(db, { name: 'Travel' })
    const rows = await overview(db, '2026-06')
    expect(rows).toHaveLength(1)
    expect(Number(rows[0].spent)).toBe(0)
    expect(rows[0].budget).toBeNull()
  })
})
