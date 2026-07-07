import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// These tests exercise each route's wiring end-to-end: validation early
// returns, the underlying DB call, assertFound on mutations, the wrapper's
// classification + status mapping, and code-preservation in export/import.
// The wrapper itself is unit-tested in `src/server/logger.test.ts`; here we
// catch wiring mistakes (wrong DB fn called, missing assertFound, broken
// validation path) that typecheck cannot.

// --- Mocks (hoisted by vitest) ---

vi.mock('~/server/db', () => ({ getDB: vi.fn(() => ({})) }))

vi.mock('@tracker/db', () => ({
  // categories
  getCategories: vi.fn(),
  getCategoryById: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  // transactions
  getTransactions: vi.fn(),
  getTransactionById: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  // budgets
  getBudgets: vi.fn(),
  upsertBudget: vi.fn(),
  deleteBudget: vi.fn(),
  // accounts
  getAccounts: vi.fn(),
  getAccountById: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
  getNetWorthTotals: vi.fn(),
  // holdings
  getHoldings: vi.fn(),
  getHoldingById: vi.fn(),
  createHolding: vi.fn(),
  updateHolding: vi.fn(),
  deleteHolding: vi.fn(),
  // net worth snapshots
  getNetWorthSnapshots: vi.fn(),
  upsertNetWorthSnapshot: vi.fn(),
  deleteNetWorthSnapshot: vi.fn(),
  // reconciliation
  reconcileAccount: vi.fn(),
  // others used transitively
  getInvestmentSnapshotById: vi.fn(),
  deleteInvestmentSnapshot: vi.fn(),
}))

vi.mock('~/server/export', () => ({ buildExportZip: vi.fn() }))
vi.mock('~/server/import-helpers', () => ({
  processImport: vi.fn(),
  MAX_IMPORT_ROWS: 1000,
}))

// Bypass the Access JWT check. These tests target route wiring, not auth.
// Auth behavior is unit-tested separately in `src/server/access.test.ts`.
vi.mock('~/server/access', () => ({
  requireUser: vi.fn(async () => ({
    email: 'test@example.com',
    sub: 'test-sub',
    raw: {},
  })),
}))

// Silence the structured-log line emitted by the wrapper on unexpected errors.
let errSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  errSpy.mockRestore()
  vi.clearAllMocks()
})

// --- Helpers ---

function jsonRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

async function getHandler(modPath: string, method: string) {
  const mod = (await import(modPath)) as { Route: { options: { server: { handlers: Record<string, (ctx: unknown) => Promise<Response>> } } } }
  return mod.Route.options.server.handlers[method]
}

// --- /api/categories ---

describe('POST /api/categories', () => {
  it('returns 201 with the created row on happy path', async () => {
    const { createCategory } = await import('@tracker/db')
    vi.mocked(createCategory).mockResolvedValue({ id: 1, name: 'Food', color: '#abc', icon: 'x', createdAt: 'now' } as never)

    const handler = await getHandler('./categories', 'POST')
    const res = await handler({ request: jsonRequest('http://x', 'POST', { name: 'Food', color: '#aabbcc' }) })

    expect(res.status).toBe(201)
    const body = await res.json() as { id: number; name: string }
    expect(body).toMatchObject({ id: 1, name: 'Food' })
    expect(errSpy).not.toHaveBeenCalled()
  })

  it('returns 400 + VALIDATION on bad input (no log)', async () => {
    const handler = await getHandler('./categories', 'POST')
    const res = await handler({ request: jsonRequest('http://x', 'POST', { /* missing name */ }) })

    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('VALIDATION')
    expect(errSpy).not.toHaveBeenCalled()
  })

  it('returns 409 + DUPLICATE_NAME when db throws UNIQUE (no log — user-caused)', async () => {
    const { createCategory } = await import('@tracker/db')
    vi.mocked(createCategory).mockRejectedValue(new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: categories.name'))

    const handler = await getHandler('./categories', 'POST')
    const res = await handler({ request: jsonRequest('http://x', 'POST', { name: 'Food' }) })

    expect(res.status).toBe(409)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('DUPLICATE_NAME')
    expect(errSpy).not.toHaveBeenCalled()
  })

  it('returns 500 + INTERNAL when db throws unrelated error (logs)', async () => {
    const { createCategory } = await import('@tracker/db')
    vi.mocked(createCategory).mockRejectedValue(new Error('database is locked'))

    const handler = await getHandler('./categories', 'POST')
    const res = await handler({ request: jsonRequest('http://x', 'POST', { name: 'Food' }) })

    expect(res.status).toBe(500)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('INTERNAL')
    expect(errSpy).toHaveBeenCalledTimes(1)
  })
})

// --- /api/categories/$id ---

describe('PUT /api/categories/$id', () => {
  it('returns 200 with the updated row on happy path', async () => {
    const { updateCategory } = await import('@tracker/db')
    vi.mocked(updateCategory).mockResolvedValue({ id: 5, name: 'Food', color: null, icon: null, createdAt: 'now' } as never)

    const handler = await getHandler('./categories.$id', 'PUT')
    const res = await handler({
      request: jsonRequest('http://x', 'PUT', { name: 'Food' }),
      params: { id: '5' },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { id: number }
    expect(body.id).toBe(5)
  })

  it('returns 404 + NOT_FOUND when row does not exist (assertFound, no log)', async () => {
    const { updateCategory } = await import('@tracker/db')
    vi.mocked(updateCategory).mockResolvedValue(undefined as never)

    const handler = await getHandler('./categories.$id', 'PUT')
    const res = await handler({
      request: jsonRequest('http://x', 'PUT', { name: 'Food' }),
      params: { id: '999' },
    })
    expect(res.status).toBe(404)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('NOT_FOUND')
    expect(errSpy).not.toHaveBeenCalled()
  })

  it('returns 400 + INVALID_ID for non-numeric id', async () => {
    const handler = await getHandler('./categories.$id', 'PUT')
    const res = await handler({
      request: jsonRequest('http://x', 'PUT', { name: 'Food' }),
      params: { id: 'abc' },
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('INVALID_ID')
  })
})

describe('DELETE /api/categories/$id', () => {
  it('returns 200 + success on happy path', async () => {
    const { deleteCategory } = await import('@tracker/db')
    vi.mocked(deleteCategory).mockResolvedValue({ id: 5, name: 'Food' } as never)

    const handler = await getHandler('./categories.$id', 'DELETE')
    const res = await handler({ request: jsonRequest('http://x', 'DELETE'), params: { id: '5' } })
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean }
    expect(body.success).toBe(true)
  })

  it('returns 404 + NOT_FOUND on stale id (assertFound)', async () => {
    const { deleteCategory } = await import('@tracker/db')
    vi.mocked(deleteCategory).mockResolvedValue(undefined as never)

    const handler = await getHandler('./categories.$id', 'DELETE')
    const res = await handler({ request: jsonRequest('http://x', 'DELETE'), params: { id: '999' } })
    expect(res.status).toBe(404)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('NOT_FOUND')
  })
})

// --- /api/transactions/$id ---

describe('PUT /api/transactions/$id', () => {
  it('returns 200 with the updated row on happy path', async () => {
    const { updateTransaction } = await import('@tracker/db')
    vi.mocked(updateTransaction).mockResolvedValue({
      id: 7, type: 'expense', amount: 100, date: '2026-05-20',
    } as never)

    const handler = await getHandler('./transactions.$id', 'PUT')
    const res = await handler({
      request: jsonRequest('http://x', 'PUT', { amount: 100 }),
      params: { id: '7' },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { id: number }
    expect(body.id).toBe(7)
  })

  it('returns 404 + NOT_FOUND on stale id', async () => {
    const { updateTransaction } = await import('@tracker/db')
    vi.mocked(updateTransaction).mockResolvedValue(undefined as never)

    const handler = await getHandler('./transactions.$id', 'PUT')
    const res = await handler({
      request: jsonRequest('http://x', 'PUT', { amount: 100 }),
      params: { id: '999' },
    })
    expect(res.status).toBe(404)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('NOT_FOUND')
  })
})

// --- /api/export ---

describe('GET /api/export', () => {
  it('returns 500 + EXPORT_FAILED (not INTERNAL) when buildExportZip throws', async () => {
    const { buildExportZip } = await import('~/server/export')
    vi.mocked(buildExportZip).mockRejectedValue(new Error('something broke in zip'))

    const handler = await getHandler('./export', 'GET')
    const res = await handler({ request: jsonRequest('http://x', 'GET') })

    expect(res.status).toBe(500)
    const body = await res.json() as { code: string; error: string }
    expect(body.code).toBe('EXPORT_FAILED')
    expect(body.error).toContain('something broke in zip')
    expect(errSpy).toHaveBeenCalledTimes(1)
  })
})

// --- /api/import ---

describe('POST /api/import', () => {
  const validPayload = {
    transactions: [
      { date: '2026-05-20', amount: 100, description: 'lunch' },
    ],
    filename: 'statement.csv',
  }

  it('returns 500 + IMPORT_FAILED (not INTERNAL) when processImport throws', async () => {
    const { processImport } = await import('~/server/import-helpers')
    vi.mocked(processImport).mockRejectedValue(new Error('row 3 invalid'))

    const handler = await getHandler('./import', 'POST')
    const res = await handler({ request: jsonRequest('http://x', 'POST', validPayload) })

    expect(res.status).toBe(500)
    const body = await res.json() as { code: string; error: string }
    expect(body.code).toBe('IMPORT_FAILED')
    expect(body.error).toContain('row 3 invalid')
    expect(errSpy).toHaveBeenCalledTimes(1)
  })

  it('returns 400 + VALIDATION on bad payload (no log)', async () => {
    const handler = await getHandler('./import', 'POST')
    const res = await handler({
      request: jsonRequest('http://x', 'POST', { transactions: [], filename: '' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('VALIDATION')
    expect(errSpy).not.toHaveBeenCalled()
  })
})

// --- /api/budgets ---

describe('POST /api/budgets', () => {
  it('returns 200 with the upserted row on happy path', async () => {
    const { upsertBudget } = await import('@tracker/db')
    vi.mocked(upsertBudget).mockResolvedValue({
      id: 1, categoryId: 3, amount: 50000, createdAt: 'now', updatedAt: 'now',
    } as never)

    const handler = await getHandler('./budgets', 'POST')
    const res = await handler({
      request: jsonRequest('http://x', 'POST', { categoryId: 3, amount: 50000 }),
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { categoryId: number; amount: number }
    expect(body).toMatchObject({ categoryId: 3, amount: 50000 })
    expect(errSpy).not.toHaveBeenCalled()
  })

  it('returns 400 + VALIDATION on bad input (no log)', async () => {
    const handler = await getHandler('./budgets', 'POST')
    const res = await handler({
      request: jsonRequest('http://x', 'POST', { categoryId: 3 /* missing amount */ }),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('VALIDATION')
    expect(errSpy).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/budgets/$categoryId', () => {
  it('returns 200 + success on happy path', async () => {
    const { deleteBudget } = await import('@tracker/db')
    vi.mocked(deleteBudget).mockResolvedValue({ id: 1, categoryId: 3 } as never)

    const handler = await getHandler('./budgets.$categoryId', 'DELETE')
    const res = await handler({ request: jsonRequest('http://x', 'DELETE'), params: { categoryId: '3' } })
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean }
    expect(body.success).toBe(true)
  })

  it('returns 404 + NOT_FOUND on stale id (assertFound)', async () => {
    const { deleteBudget } = await import('@tracker/db')
    vi.mocked(deleteBudget).mockResolvedValue(undefined as never)

    const handler = await getHandler('./budgets.$categoryId', 'DELETE')
    const res = await handler({ request: jsonRequest('http://x', 'DELETE'), params: { categoryId: '999' } })
    expect(res.status).toBe(404)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('NOT_FOUND')
  })

  it('returns 400 + INVALID_ID for non-numeric categoryId', async () => {
    const handler = await getHandler('./budgets.$categoryId', 'DELETE')
    const res = await handler({ request: jsonRequest('http://x', 'DELETE'), params: { categoryId: 'abc' } })
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('INVALID_ID')
  })
})

// --- /api/accounts ---

const accountRow = {
  id: 1, name: 'Checking', kind: 'asset', type: 'checking', valuation: 'manual',
  currentValue: 120000, institution: null, color: null, icon: null,
  isActive: true, createdAt: 'now', updatedAt: 'now',
}

describe('GET /api/accounts', () => {
  it('returns 200 with the account list', async () => {
    const { getAccounts } = await import('@tracker/db')
    vi.mocked(getAccounts).mockResolvedValue([accountRow] as never)

    const handler = await getHandler('./accounts', 'GET')
    const res = await handler({ request: jsonRequest('http://x', 'GET') })

    expect(res.status).toBe(200)
    const body = await res.json() as Array<{ id: number }>
    expect(body).toHaveLength(1)
    expect(body[0]).toMatchObject({ id: 1, name: 'Checking' })
    expect(errSpy).not.toHaveBeenCalled()
  })
})

describe('POST /api/accounts', () => {
  it('returns 201 with the created row on happy path', async () => {
    const { createAccount } = await import('@tracker/db')
    vi.mocked(createAccount).mockResolvedValue(accountRow as never)

    const handler = await getHandler('./accounts', 'POST')
    const res = await handler({
      request: jsonRequest('http://x', 'POST', {
        name: 'Checking', kind: 'asset', type: 'checking', currentValue: 120000,
      }),
    })

    expect(res.status).toBe(201)
    const body = await res.json() as { id: number; kind: string }
    expect(body).toMatchObject({ id: 1, kind: 'asset' })
    expect(errSpy).not.toHaveBeenCalled()
  })

  it('returns 400 + VALIDATION on bad input (no log)', async () => {
    const handler = await getHandler('./accounts', 'POST')
    const res = await handler({
      request: jsonRequest('http://x', 'POST', { kind: 'asset' /* missing name/type/currentValue */ }),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('VALIDATION')
    expect(errSpy).not.toHaveBeenCalled()
  })

  it('returns 400 + VALIDATION when kind is not asset/liability', async () => {
    const handler = await getHandler('./accounts', 'POST')
    const res = await handler({
      request: jsonRequest('http://x', 'POST', {
        name: 'X', kind: 'nonsense', type: 'cash', currentValue: 100,
      }),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('VALIDATION')
  })
})

describe('PUT /api/accounts/$id', () => {
  it('returns 200 with the updated row on happy path', async () => {
    const { updateAccount } = await import('@tracker/db')
    vi.mocked(updateAccount).mockResolvedValue({ ...accountRow, id: 5, currentValue: 200000 } as never)

    const handler = await getHandler('./accounts.$id', 'PUT')
    const res = await handler({
      request: jsonRequest('http://x', 'PUT', { currentValue: 200000 }),
      params: { id: '5' },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { id: number; currentValue: number }
    expect(body).toMatchObject({ id: 5, currentValue: 200000 })
  })

  it('returns 404 + NOT_FOUND when row does not exist (assertFound, no log)', async () => {
    const { updateAccount } = await import('@tracker/db')
    vi.mocked(updateAccount).mockResolvedValue(undefined as never)

    const handler = await getHandler('./accounts.$id', 'PUT')
    const res = await handler({
      request: jsonRequest('http://x', 'PUT', { currentValue: 1 }),
      params: { id: '999' },
    })
    expect(res.status).toBe(404)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('NOT_FOUND')
    expect(errSpy).not.toHaveBeenCalled()
  })

  it('returns 400 + INVALID_ID for non-numeric id', async () => {
    const handler = await getHandler('./accounts.$id', 'PUT')
    const res = await handler({
      request: jsonRequest('http://x', 'PUT', { currentValue: 1 }),
      params: { id: 'abc' },
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('INVALID_ID')
  })
})

describe('DELETE /api/accounts/$id', () => {
  it('returns 200 + success on happy path', async () => {
    const { deleteAccount } = await import('@tracker/db')
    vi.mocked(deleteAccount).mockResolvedValue({ ...accountRow, id: 5 } as never)

    const handler = await getHandler('./accounts.$id', 'DELETE')
    const res = await handler({ request: jsonRequest('http://x', 'DELETE'), params: { id: '5' } })
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean }
    expect(body.success).toBe(true)
  })

  it('returns 404 + NOT_FOUND on stale id (assertFound)', async () => {
    const { deleteAccount } = await import('@tracker/db')
    vi.mocked(deleteAccount).mockResolvedValue(undefined as never)

    const handler = await getHandler('./accounts.$id', 'DELETE')
    const res = await handler({ request: jsonRequest('http://x', 'DELETE'), params: { id: '999' } })
    expect(res.status).toBe(404)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('NOT_FOUND')
  })
})

// --- /api/holdings ---

const holdingRow = {
  id: 1, accountId: 3, symbol: 'VWCE', name: 'VWCE',
  quantity: 10, costBasis: 90000, marketValue: 100000, createdAt: 'now', updatedAt: 'now',
}

describe('GET /api/holdings', () => {
  it('returns 200 with holdings for the given accountId', async () => {
    const { getHoldings } = await import('@tracker/db')
    vi.mocked(getHoldings).mockResolvedValue([holdingRow] as never)

    const handler = await getHandler('./holdings', 'GET')
    const res = await handler({ request: jsonRequest('http://x/api/holdings?accountId=3', 'GET') })

    expect(res.status).toBe(200)
    const body = await res.json() as Array<{ id: number }>
    expect(body).toHaveLength(1)
    expect(vi.mocked(getHoldings)).toHaveBeenCalledWith(expect.anything(), 3)
  })

  it('returns 400 + BAD_QUERY when accountId is missing', async () => {
    const handler = await getHandler('./holdings', 'GET')
    const res = await handler({ request: jsonRequest('http://x/api/holdings', 'GET') })
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('BAD_QUERY')
  })
})

describe('POST /api/holdings', () => {
  it('returns 201 with the created row on happy path', async () => {
    const { createHolding } = await import('@tracker/db')
    vi.mocked(createHolding).mockResolvedValue(holdingRow as never)

    const handler = await getHandler('./holdings', 'POST')
    const res = await handler({
      request: jsonRequest('http://x', 'POST', { accountId: 3, name: 'VWCE', marketValue: 100000 }),
    })
    expect(res.status).toBe(201)
    const body = await res.json() as { id: number }
    expect(body.id).toBe(1)
    expect(errSpy).not.toHaveBeenCalled()
  })

  it('returns 400 + VALIDATION on bad input (no log)', async () => {
    const handler = await getHandler('./holdings', 'POST')
    const res = await handler({
      request: jsonRequest('http://x', 'POST', { name: 'VWCE' /* missing accountId + marketValue */ }),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('VALIDATION')
    expect(errSpy).not.toHaveBeenCalled()
  })
})

describe('PUT /api/holdings/$id', () => {
  it('returns 200 with the updated row on happy path', async () => {
    const { updateHolding } = await import('@tracker/db')
    vi.mocked(updateHolding).mockResolvedValue({ ...holdingRow, id: 7, marketValue: 175000 } as never)

    const handler = await getHandler('./holdings.$id', 'PUT')
    const res = await handler({
      request: jsonRequest('http://x', 'PUT', { marketValue: 175000 }),
      params: { id: '7' },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { id: number; marketValue: number }
    expect(body).toMatchObject({ id: 7, marketValue: 175000 })
  })

  it('returns 404 + NOT_FOUND on stale id', async () => {
    const { updateHolding } = await import('@tracker/db')
    vi.mocked(updateHolding).mockResolvedValue(undefined as never)

    const handler = await getHandler('./holdings.$id', 'PUT')
    const res = await handler({
      request: jsonRequest('http://x', 'PUT', { marketValue: 1 }),
      params: { id: '999' },
    })
    expect(res.status).toBe(404)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('NOT_FOUND')
  })
})

describe('DELETE /api/holdings/$id', () => {
  it('returns 200 + success on happy path', async () => {
    const { deleteHolding } = await import('@tracker/db')
    vi.mocked(deleteHolding).mockResolvedValue({ ...holdingRow, id: 7 } as never)

    const handler = await getHandler('./holdings.$id', 'DELETE')
    const res = await handler({ request: jsonRequest('http://x', 'DELETE'), params: { id: '7' } })
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean }
    expect(body.success).toBe(true)
  })

  it('returns 404 + NOT_FOUND on stale id', async () => {
    const { deleteHolding } = await import('@tracker/db')
    vi.mocked(deleteHolding).mockResolvedValue(undefined as never)

    const handler = await getHandler('./holdings.$id', 'DELETE')
    const res = await handler({ request: jsonRequest('http://x', 'DELETE'), params: { id: '999' } })
    expect(res.status).toBe(404)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('NOT_FOUND')
  })
})

// --- /api/net-worth ---

describe('GET /api/net-worth', () => {
  it('returns 200 with totals + computed netWorth + accounts', async () => {
    const { getNetWorthTotals, getAccounts } = await import('@tracker/db')
    vi.mocked(getNetWorthTotals).mockResolvedValue({ totalAssets: 2000000, totalLiabilities: 800000 } as never)
    vi.mocked(getAccounts).mockResolvedValue([accountRow] as never)

    const handler = await getHandler('./net-worth', 'GET')
    const res = await handler({ request: jsonRequest('http://x', 'GET') })

    expect(res.status).toBe(200)
    const body = await res.json() as { totalAssets: number; totalLiabilities: number; netWorth: number; accounts: unknown[] }
    expect(body.totalAssets).toBe(2000000)
    expect(body.totalLiabilities).toBe(800000)
    expect(body.netWorth).toBe(1200000) // assets − liabilities
    expect(body.accounts).toHaveLength(1)
  })
})

describe('GET /api/net-worth/snapshots', () => {
  it('returns 200 with the snapshot list', async () => {
    const { getNetWorthSnapshots } = await import('@tracker/db')
    vi.mocked(getNetWorthSnapshots).mockResolvedValue([
      { id: 1, date: '2026-07-01', totalAssets: 2000000, totalLiabilities: 800000, netWorth: 1200000, note: null, createdAt: 'now' },
    ] as never)

    const handler = await getHandler('./net-worth.snapshots', 'GET')
    const res = await handler({ request: jsonRequest('http://x/api/net-worth/snapshots', 'GET') })
    expect(res.status).toBe(200)
    const body = await res.json() as Array<{ id: number }>
    expect(body).toHaveLength(1)
  })
})

describe('POST /api/net-worth/snapshots', () => {
  it('computes totals server-side, then upserts (200) with netWorth = assets − liabilities', async () => {
    const { getNetWorthTotals, upsertNetWorthSnapshot } = await import('@tracker/db')
    vi.mocked(getNetWorthTotals).mockResolvedValue({ totalAssets: 2000000, totalLiabilities: 800000 } as never)
    vi.mocked(upsertNetWorthSnapshot).mockResolvedValue({
      id: 1, date: '2026-07-07', totalAssets: 2000000, totalLiabilities: 800000, netWorth: 1200000, note: null, createdAt: 'now',
    } as never)

    const handler = await getHandler('./net-worth.snapshots', 'POST')
    const res = await handler({ request: jsonRequest('http://x', 'POST', { date: '2026-07-07' }) })

    expect(res.status).toBe(200)
    expect(vi.mocked(upsertNetWorthSnapshot)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        date: '2026-07-07', totalAssets: 2000000, totalLiabilities: 800000, netWorth: 1200000,
      }),
    )
  })

  it('returns 400 + VALIDATION on a malformed date', async () => {
    const handler = await getHandler('./net-worth.snapshots', 'POST')
    const res = await handler({ request: jsonRequest('http://x', 'POST', { date: '07/07/2026' }) })
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('VALIDATION')
  })
})

describe('DELETE /api/net-worth/snapshots/$id', () => {
  it('returns 200 + success on happy path', async () => {
    const { deleteNetWorthSnapshot } = await import('@tracker/db')
    vi.mocked(deleteNetWorthSnapshot).mockResolvedValue({ id: 5 } as never)

    const handler = await getHandler('./net-worth.snapshots.$id', 'DELETE')
    const res = await handler({ request: jsonRequest('http://x', 'DELETE'), params: { id: '5' } })
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean }
    expect(body.success).toBe(true)
  })

  it('returns 404 + NOT_FOUND on stale id', async () => {
    const { deleteNetWorthSnapshot } = await import('@tracker/db')
    vi.mocked(deleteNetWorthSnapshot).mockResolvedValue(undefined as never)

    const handler = await getHandler('./net-worth.snapshots.$id', 'DELETE')
    const res = await handler({ request: jsonRequest('http://x', 'DELETE'), params: { id: '999' } })
    expect(res.status).toBe(404)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('NOT_FOUND')
  })
})

// --- /api/accounts/$id/reconcile ---

describe('POST /api/accounts/$id/reconcile', () => {
  it('returns 200 and passes the observed value + date through to reconcileAccount', async () => {
    const { reconcileAccount } = await import('@tracker/db')
    vi.mocked(reconcileAccount).mockResolvedValue({
      account: { ...accountRow, id: 3, currentValue: 123400 },
      valuation: { id: 1, accountId: 3, date: '2026-07-07', value: 123400, createdAt: 'now' },
      transaction: { id: 9, type: 'income', amount: 3400 },
    } as never)

    const handler = await getHandler('./accounts.$id.reconcile', 'POST')
    const res = await handler({
      request: jsonRequest('http://x', 'POST', { value: 123400, date: '2026-07-07' }),
      params: { id: '3' },
    })

    expect(res.status).toBe(200)
    expect(vi.mocked(reconcileAccount)).toHaveBeenCalledWith(
      expect.anything(),
      3,
      expect.objectContaining({ value: 123400, date: '2026-07-07' }),
    )
    expect(errSpy).not.toHaveBeenCalled()
  })

  it('returns 404 + NOT_FOUND when the account does not exist (assertFound)', async () => {
    const { reconcileAccount } = await import('@tracker/db')
    vi.mocked(reconcileAccount).mockResolvedValue(undefined as never)

    const handler = await getHandler('./accounts.$id.reconcile', 'POST')
    const res = await handler({
      request: jsonRequest('http://x', 'POST', { value: 1 }),
      params: { id: '999' },
    })
    expect(res.status).toBe(404)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('NOT_FOUND')
  })

  it('returns 400 + VALIDATION when value is missing', async () => {
    const handler = await getHandler('./accounts.$id.reconcile', 'POST')
    const res = await handler({
      request: jsonRequest('http://x', 'POST', { date: '2026-07-07' }),
      params: { id: '3' },
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('VALIDATION')
  })

  it('returns 400 + INVALID_ID for a non-numeric id', async () => {
    const handler = await getHandler('./accounts.$id.reconcile', 'POST')
    const res = await handler({
      request: jsonRequest('http://x', 'POST', { value: 1 }),
      params: { id: 'abc' },
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('INVALID_ID')
  })
})
