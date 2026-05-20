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
