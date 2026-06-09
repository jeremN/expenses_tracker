import { describe, it, expect } from 'vitest'
import { makeTestDb } from '~/test/make-test-db'
import {
  createCategory,
  createTransaction,
  getTransactions,
  countTransactions,
} from '@tracker/db'

async function seed() {
  const db = await makeTestDb()
  const food = await createCategory(db, { name: 'Restaurants' })
  await createTransaction(db, { type: 'expense', amount: 100, date: '2026-06-01', description: 'lunch', categoryId: food.id })
  await createTransaction(db, { type: 'expense', amount: 200, date: '2026-06-02', description: 'dinner', categoryId: food.id })
  await createTransaction(db, { type: 'income', amount: 300, date: '2026-06-03', description: 'salary' })
  return { db, food }
}

describe('getTransactions pagination + search', () => {
  it('orders by date desc and applies limit/offset', async () => {
    const { db } = await seed()
    const page1 = await getTransactions(db, { limit: 2, offset: 0 })
    expect(page1.map((r) => r.transactions.date)).toEqual(['2026-06-03', '2026-06-02'])
    const page2 = await getTransactions(db, { limit: 2, offset: 2 })
    expect(page2.map((r) => r.transactions.date)).toEqual(['2026-06-01'])
  })

  it('search matches description OR category name', async () => {
    const { db } = await seed()
    const byDesc = await getTransactions(db, { search: 'lunch' })
    expect(byDesc).toHaveLength(1)
    const byCat = await getTransactions(db, { search: 'Restaurant' })
    expect(byCat).toHaveLength(2) // both Restaurants rows
  })

  it('countTransactions honors the same filters', async () => {
    const { db } = await seed()
    expect((await countTransactions(db))?.value).toBe(3)
    expect((await countTransactions(db, { type: 'expense' }))?.value).toBe(2)
    expect((await countTransactions(db, { search: 'salary' }))?.value).toBe(1)
  })
})
