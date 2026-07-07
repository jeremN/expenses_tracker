import { describe, it, expect } from 'vitest'
import { makeTestDb } from '~/test/make-test-db'
import { eq } from 'drizzle-orm'
import {
  createAccount,
  getAccountById,
  getNetWorthTotals,
  createTransfer,
  deleteTransfer,
  getTransfers,
  deleteAccount,
  transactions,
} from '@tracker/db'

type TestDb = Awaited<ReturnType<typeof makeTestDb>>

const asset = (db: TestDb, name: string, value: number) =>
  createAccount(db, { name, kind: 'asset', type: 'checking', currentValue: value })
const liability = (db: TestDb, name: string, value: number) =>
  createAccount(db, { name, kind: 'liability', type: 'loan', currentValue: value })
const tracked = (db: TestDb, name: string) =>
  createAccount(db, { name, kind: 'asset', type: 'brokerage', currentValue: 0, valuation: 'tracked' })

async function netWorth(db: TestDb) {
  const t = await getNetWorthTotals(db)
  return t.totalAssets - t.totalLiabilities
}

describe('createTransfer (kind-signed, net-worth-neutral when two-legged)', () => {
  it('asset → asset: moves value between accounts, net worth unchanged', async () => {
    const db = await makeTestDb()
    const checking = await asset(db, 'Checking', 200000)
    const savings = await asset(db, 'Savings', 50000)
    const before = await netWorth(db)

    const res = await createTransfer(db, { fromAccountId: checking.id, toAccountId: savings.id, amount: 75000, date: '2026-07-07' })

    expect(res.ok).toBe(true)
    expect((await getAccountById(db, checking.id))?.currentValue).toBe(125000)
    expect((await getAccountById(db, savings.id))?.currentValue).toBe(125000)
    expect(await netWorth(db)).toBe(before) // neutral
  })

  it('asset → liability (loan paydown): both drop, net worth unchanged', async () => {
    const db = await makeTestDb()
    const checking = await asset(db, 'Checking', 200000)
    const loan = await liability(db, 'Loan', 300000)
    const before = await netWorth(db)

    await createTransfer(db, { fromAccountId: checking.id, toAccountId: loan.id, amount: 50000, date: '2026-07-07' })

    expect((await getAccountById(db, checking.id))?.currentValue).toBe(150000) // asset −
    expect((await getAccountById(db, loan.id))?.currentValue).toBe(250000) // liability owed −
    expect(await netWorth(db)).toBe(before) // neutral
  })

  it('external IN (no from leg): only the destination changes, net worth rises', async () => {
    const db = await makeTestDb()
    const checking = await asset(db, 'Checking', 100000)
    const before = await netWorth(db)

    const res = await createTransfer(db, { toAccountId: checking.id, amount: 30000, date: '2026-07-07' })

    expect(res.ok).toBe(true)
    expect((await getAccountById(db, checking.id))?.currentValue).toBe(130000)
    expect(await netWorth(db)).toBe(before + 30000) // one-legged: intentionally moves net worth
  })

  it('external OUT (no to leg): only the source changes, net worth falls', async () => {
    const db = await makeTestDb()
    const checking = await asset(db, 'Checking', 100000)
    const before = await netWorth(db)

    await createTransfer(db, { fromAccountId: checking.id, amount: 40000, date: '2026-07-07' })

    expect((await getAccountById(db, checking.id))?.currentValue).toBe(60000)
    expect(await netWorth(db)).toBe(before - 40000)
  })

  it('rejects a tracked-valued account leg (holdings-derived value would be overwritten)', async () => {
    const db = await makeTestDb()
    const checking = await asset(db, 'Checking', 100000)
    const brokerage = await tracked(db, 'Brokerage')

    const res = await createTransfer(db, { fromAccountId: checking.id, toAccountId: brokerage.id, amount: 10000, date: '2026-07-07' })

    expect(res).toEqual({ ok: false, reason: 'tracked_leg', accountId: brokerage.id })
    // nothing applied — the source is untouched and no row written
    expect((await getAccountById(db, checking.id))?.currentValue).toBe(100000)
    expect(await getTransfers(db)).toHaveLength(0)
  })

  it('rejects a missing account leg', async () => {
    const db = await makeTestDb()
    const checking = await asset(db, 'Checking', 100000)
    const res = await createTransfer(db, { fromAccountId: checking.id, toAccountId: 9999, amount: 10000, date: '2026-07-07' })
    expect(res).toEqual({ ok: false, reason: 'not_found', accountId: 9999 })
  })

  it('rejects a transfer with no legs at all', async () => {
    const db = await makeTestDb()
    const res = await createTransfer(db, { amount: 10000, date: '2026-07-07' })
    expect(res).toEqual({ ok: false, reason: 'no_legs' })
  })
})

describe('createTransfer with countAsCashFlow (external legs only)', () => {
  it('external IN + opt-in books an INCOME transaction and links it to the transfer', async () => {
    const db = await makeTestDb()
    const checking = await asset(db, 'Checking', 100000)

    const res = await createTransfer(db, { toAccountId: checking.id, amount: 30000, date: '2026-07-07', note: 'Gift', countAsCashFlow: true })

    expect(res.ok).toBe(true)
    const tx = await db.select().from(transactions)
    expect(tx).toHaveLength(1)
    expect(tx[0]).toMatchObject({ type: 'income', amount: 30000, description: 'Gift', categoryId: null })
    // transfer owns the transaction
    expect(res.ok && res.transfer.transactionId).toBe(tx[0].id)
    // account still moved
    expect((await getAccountById(db, checking.id))?.currentValue).toBe(130000)
  })

  it('external OUT + opt-in books an EXPENSE transaction', async () => {
    const db = await makeTestDb()
    const checking = await asset(db, 'Checking', 100000)

    await createTransfer(db, { fromAccountId: checking.id, amount: 40000, date: '2026-07-07', countAsCashFlow: true })

    const tx = await db.select().from(transactions)
    expect(tx).toHaveLength(1)
    expect(tx[0]).toMatchObject({ type: 'expense', amount: 40000 })
  })

  it('external leg WITHOUT opt-in books no transaction (net-worth change only)', async () => {
    const db = await makeTestDb()
    const checking = await asset(db, 'Checking', 100000)

    const res = await createTransfer(db, { toAccountId: checking.id, amount: 30000, date: '2026-07-07' })

    expect(await db.select().from(transactions)).toHaveLength(0)
    expect(res.ok && res.transfer.transactionId).toBeNull()
  })

  it('IGNORES the flag for a two-legged (net-worth-neutral) transfer', async () => {
    const db = await makeTestDb()
    const a = await asset(db, 'A', 200000)
    const b = await asset(db, 'B', 50000)

    const res = await createTransfer(db, { fromAccountId: a.id, toAccountId: b.id, amount: 75000, date: '2026-07-07', countAsCashFlow: true })

    expect(await db.select().from(transactions)).toHaveLength(0)
    expect(res.ok && res.transfer.transactionId).toBeNull()
  })
})

describe('deleteTransfer', () => {
  it('reverses both legs then removes the row', async () => {
    const db = await makeTestDb()
    const a = await asset(db, 'A', 200000)
    const b = await asset(db, 'B', 100000)
    const res = await createTransfer(db, { fromAccountId: a.id, toAccountId: b.id, amount: 60000, date: '2026-07-07' })
    const transferId = res.ok ? res.transfer.id : 0

    const deleted = await deleteTransfer(db, transferId)

    expect(deleted?.id).toBe(transferId)
    expect((await getAccountById(db, a.id))?.currentValue).toBe(200000) // restored
    expect((await getAccountById(db, b.id))?.currentValue).toBe(100000)
    expect(await getTransfers(db)).toHaveLength(0)
  })

  it('also deletes the linked cash-flow transaction (external opt-in transfer)', async () => {
    const db = await makeTestDb()
    const checking = await asset(db, 'Checking', 100000)
    const res = await createTransfer(db, { toAccountId: checking.id, amount: 30000, date: '2026-07-07', countAsCashFlow: true })
    const transferId = res.ok ? res.transfer.id : 0
    const txId = res.ok ? res.transfer.transactionId : null
    expect(await db.select().from(transactions).where(eq(transactions.id, txId!))).toHaveLength(1)

    await deleteTransfer(db, transferId)

    expect(await db.select().from(transactions)).toHaveLength(0) // linked entry removed
    expect((await getAccountById(db, checking.id))?.currentValue).toBe(100000) // account reversed
  })

  it('returns undefined for a missing transfer', async () => {
    const db = await makeTestDb()
    expect(await deleteTransfer(db, 4242)).toBeUndefined()
  })
})

describe('getTransfers', () => {
  it('returns transfers newest-date first', async () => {
    const db = await makeTestDb()
    const a = await asset(db, 'A', 500000)
    const b = await asset(db, 'B', 0)
    await createTransfer(db, { fromAccountId: a.id, toAccountId: b.id, amount: 1000, date: '2026-07-01' })
    await createTransfer(db, { fromAccountId: a.id, toAccountId: b.id, amount: 2000, date: '2026-07-05' })

    const rows = await getTransfers(db)
    expect(rows.map((r) => r.date)).toEqual(['2026-07-05', '2026-07-01'])
  })
})

describe('deleteAccount reconciles transfer legs', () => {
  it('nulls the legs of transfers referencing a deleted account (keeps history, drops the dangling ref)', async () => {
    const db = await makeTestDb()
    const a = await asset(db, 'A', 200000)
    const b = await asset(db, 'B', 100000)
    await createTransfer(db, { fromAccountId: a.id, toAccountId: b.id, amount: 50000, date: '2026-07-07' })

    await deleteAccount(db, a.id)

    const rows = await getTransfers(db)
    expect(rows).toHaveLength(1)
    expect(rows[0].fromAccountId).toBeNull() // leg nulled
    expect(rows[0].toAccountId).toBe(b.id) // other leg preserved
  })
})
