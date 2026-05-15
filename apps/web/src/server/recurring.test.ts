import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the db module so vitest doesn't try to resolve `cloudflare:workers`
// at import time. We don't care what `getDB()` returns — every DB-touching
// call is itself mocked via the `@tracker/db` mock below.
vi.mock('~/server/db', () => ({
  getDB: () => ({}),
}))

vi.mock('@tracker/db', () => ({
  getActiveRecurringRules: vi.fn(),
  getLastGeneratedTransaction: vi.fn(),
  createTransaction: vi.fn(),
}))

import { generateMissingTransactions } from './recurring'
import {
  getActiveRecurringRules,
  getLastGeneratedTransaction,
  createTransaction,
} from '@tracker/db'

const mockGetActive = vi.mocked(getActiveRecurringRules)
const mockGetLast = vi.mocked(getLastGeneratedTransaction)
const mockCreate = vi.mocked(createTransaction)

function makeRule(overrides: Partial<{ startDate: string; frequency: 'weekly' | 'monthly' | 'yearly' }> = {}) {
  return {
    id: 1,
    type: 'expense' as const,
    amount: 1000,
    description: null,
    categoryId: null,
    frequency: 'monthly' as const,
    startDate: '2026-01-01',
    endDate: null,
    isActive: true,
    createdAt: '2026-01-01',
    ...overrides,
  }
}

describe('generateMissingTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('C1 regression: terminates when createTransaction throws UNIQUE error', async () => {
    // The bug was: catch block did `continue` without advancing nextDate,
    // so the loop retried the same date forever and pinned CPU.
    mockGetActive.mockResolvedValue([makeRule({ startDate: '2026-01-01' })] as any)
    mockGetLast.mockResolvedValue(null as any)
    mockCreate.mockRejectedValue(
      new Error('UNIQUE constraint failed: transactions.recurring_id, transactions.date'),
    )

    // If the loop hangs, the test framework's default timeout kicks in;
    // we set a hard 2s race here for a clearer failure message.
    const result = await Promise.race([
      generateMissingTransactions(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT: loop did not terminate')), 2000),
      ),
    ])

    expect(result).toBe(0)
    // Should have attempted at least a few months — proves it advanced.
    expect(mockCreate.mock.calls.length).toBeGreaterThan(2)
    // Should have attempted bounded iterations — definitely not infinite.
    // Generous bound: years worth of monthly attempts is still small.
    expect(mockCreate.mock.calls.length).toBeLessThan(10_000)
  })

  it('successfully generates transactions when inserts succeed', async () => {
    // Force a known horizon by setting a recent start date.
    const today = new Date()
    const monthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1)
    const start = `${monthsAgo.getFullYear()}-${String(monthsAgo.getMonth() + 1).padStart(2, '0')}-01`

    mockGetActive.mockResolvedValue([makeRule({ startDate: start })] as any)
    mockGetLast.mockResolvedValue(null as any)
    mockCreate.mockResolvedValue({ id: 1 } as any)

    const result = await generateMissingTransactions()
    expect(result).toBeGreaterThan(0)
    expect(result).toBe(mockCreate.mock.calls.length)
  })

  it('propagates non-UNIQUE errors instead of swallowing them', async () => {
    mockGetActive.mockResolvedValue([makeRule()] as any)
    mockGetLast.mockResolvedValue(null as any)
    mockCreate.mockRejectedValue(new Error('database is locked'))

    await expect(generateMissingTransactions()).rejects.toThrow('database is locked')
  })

  it('respects end_date when generating', async () => {
    mockGetActive.mockResolvedValue([
      makeRule({ startDate: '2026-01-01' }),
    ].map((r) => ({ ...r, endDate: '2026-03-15' })) as any)
    mockGetLast.mockResolvedValue(null as any)
    mockCreate.mockResolvedValue({ id: 1 } as any)

    const result = await generateMissingTransactions()
    // Jan 1, Feb 1, Mar 1 — three monthly occurrences before end_date (Mar 15)
    expect(result).toBe(3)
  })
})
