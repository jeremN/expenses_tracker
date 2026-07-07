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

describe('reconcileAccount scopes the cash-flow entry to cash-type accounts', () => {
  it('does NOT book a transaction when reconciling a non-cash account (revaluation)', async () => {
    const db = await makeTestDb()
    // A property revaluation is not cash flow: only the value moves.
    const house = await createAccount(db, { name: 'House', kind: 'asset', type: 'real_estate', currentValue: 30000000 })

    const result = await reconcileAccount(db, house.id, { value: 32000000, date: '2026-07-07' })

    expect(result?.transaction).toBeNull() // no phantom income
    expect(await db.select().from(transactions)).toHaveLength(0)
    // value still snapped + valuation still recorded
    expect((await getAccountById(db, house.id))?.currentValue).toBe(32000000)
    const vals = await db.select().from(accountValuations).where(eq(accountValuations.accountId, house.id))
    expect(vals).toHaveLength(1)
    expect(vals[0].value).toBe(32000000)
  })

  it('does NOT book a transaction for a brokerage account either', async () => {
    const db = await makeTestDb()
    const brokerage = await createAccount(db, { name: 'Brokerage', kind: 'asset', type: 'brokerage', currentValue: 500000 })
    const result = await reconcileAccount(db, brokerage.id, { value: 560000, date: '2026-07-07' })
    expect(result?.transaction).toBeNull()
    expect(await db.select().from(transactions)).toHaveLength(0)
  })

  it('STILL books a transaction for cash-type accounts (cash / checking / savings)', async () => {
    const db = await makeTestDb()
    const savings = await createAccount(db, { name: 'Savings', kind: 'asset', type: 'savings', currentValue: 100000 })
    const cash = await createAccount(db, { name: 'Wallet', kind: 'asset', type: 'cash', currentValue: 5000 })

    const r1 = await reconcileAccount(db, savings.id, { value: 105000, date: '2026-07-07' })
    const r2 = await reconcileAccount(db, cash.id, { value: 3000, date: '2026-07-07' })

    expect(r1?.transaction).toMatchObject({ type: 'income', amount: 5000 })
    expect(r2?.transaction).toMatchObject({ type: 'expense', amount: 2000 })
  })
})

describe('reconcileAccount books credit-card discrepancies with a liability-aware sign', () => {
  async function card(db: Awaited<ReturnType<typeof makeTestDb>>, owed: number) {
    return createAccount(db, { name: 'Visa', kind: 'liability', type: 'credit_card', currentValue: owed })
  }

  it('owing MORE (balance up) books an EXPENSE for the delta — you spent on the card', async () => {
    const db = await makeTestDb()
    const visa = await card(db, 20000) // owe 200.00

    const result = await reconcileAccount(db, visa.id, { value: 35000, date: '2026-07-07' }) // owe 350.00

    expect(result?.transaction).toMatchObject({ type: 'expense', amount: 15000 })
    expect((await getAccountById(db, visa.id))?.currentValue).toBe(35000)
  })

  it('owing LESS (balance down) books an INCOME for the delta — the inverse of a cash account', async () => {
    const db = await makeTestDb()
    const visa = await card(db, 35000) // owe 350.00

    const result = await reconcileAccount(db, visa.id, { value: 10000, date: '2026-07-07' }) // owe 100.00

    expect(result?.transaction).toMatchObject({ type: 'income', amount: 25000 })
  })

  it('routes the card entry to the reserved Reconciliation category (excluded from stats)', async () => {
    const db = await makeTestDb()
    const visa = await card(db, 20000)
    const result = await reconcileAccount(db, visa.id, { value: 25000, date: '2026-07-07' })
    const cat = await reconciliationCategory(db)
    expect(result?.transaction?.categoryId).toBe(cat!.id)
  })

  it('does NOT book a transaction for other liabilities (e.g. a loan) — scoped to credit cards', async () => {
    const db = await makeTestDb()
    const loan = await createAccount(db, { name: 'Car loan', kind: 'liability', type: 'loan', currentValue: 1000000 })
    const result = await reconcileAccount(db, loan.id, { value: 900000, date: '2026-07-07' })
    expect(result?.transaction).toBeNull()
    expect(await db.select().from(transactions)).toHaveLength(0)
    // value still snapped
    expect((await getAccountById(db, loan.id))?.currentValue).toBe(900000)
  })
})
