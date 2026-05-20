# Server-side Error Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a thin, swappable server-side logger that emits structured `console.error` lines for unexpected server failures, fixing the silent-swallow bug in `/api/*` routes and giving every `catch` site in server fns + REST routes a server-visible trail.

**Architecture:** Two named wrappers (`withServerFn`, `withApiHandler`) in `apps/web/src/server/logger.ts` classify thrown errors via `toAppError`, decide whether to log via a new `isUnexpectedError` predicate in `@tracker/shared`, and either re-throw (server fns) or return an `errorResponse` with a status derived from a new `httpStatusForCode` helper. All log output flows through one `logServerError` primitive so a future Logpush / Workers Logs / Axiom sink is a one-line swap.

**Tech Stack:** TanStack Start (React + SSR on Cloudflare Workers), Drizzle, vitest, TypeScript, pnpm workspace. `packages/shared` has no test runner — its code is unit-tested from `apps/web`'s vitest. Cloudflare Workers' native log path is `console.*`.

**Reference spec:** `docs/2026-05-20-server-error-logging-design.md`

---

## File Structure

**New files:**
- `apps/web/src/server/logger.ts` — `logServerError`, `withServerFn`, `withApiHandler`
- `apps/web/src/server/logger.test.ts` — unit tests for all three exports

**Modified files:**
- `packages/shared/src/errors.ts` — add `isUnexpectedError`
- `apps/web/src/i18n/app-error.test.ts` — add `isUnexpectedError` tests (no test runner in `packages/shared`)
- `apps/web/src/server/api-helpers.ts` — add `httpStatusForCode`
- `apps/web/src/routes/categories.tsx` — migrate 3 server fns to `withServerFn`
- `apps/web/src/routes/api/categories.ts` — migrate GET + POST to `withApiHandler`
- `apps/web/src/routes/api/categories.$id.ts` — migrate handlers
- `apps/web/src/routes/api/transactions.ts` — migrate handlers
- `apps/web/src/routes/api/transactions.$id.ts` — migrate handlers
- `apps/web/src/routes/api/recurring.ts` — migrate handlers
- `apps/web/src/routes/api/recurring.$id.ts` — migrate handlers
- `apps/web/src/routes/api/investments.ts` — migrate handlers
- `apps/web/src/routes/api/investments.$id.ts` — migrate handlers
- `apps/web/src/routes/api/stats.monthly-summary.ts` — migrate handlers
- `apps/web/src/routes/api/stats.category-breakdown.ts` — migrate handlers
- `apps/web/src/routes/api/export.ts` — migrate handlers
- `apps/web/src/routes/api/import.ts` — migrate handlers

Each `/api/*` file follows an identical shape: `try { ... } catch { return errorResponse('Failed to ...', 500, 'INTERNAL') }`. The wrapper replaces that boilerplate.

---

## Task 1: Add `isUnexpectedError` to `@tracker/shared`

**Files:**
- Modify: `packages/shared/src/errors.ts`
- Test: `apps/web/src/i18n/app-error.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `apps/web/src/i18n/app-error.test.ts` (file already imports from `@tracker/shared`):

```ts
import { AppError, toAppError, isUnexpectedError } from '@tracker/shared'

describe('isUnexpectedError', () => {
  it.each(['INTERNAL', 'IMPORT_FAILED', 'EXPORT_FAILED', 'BAD_QUERY'] as const)(
    'returns true for system code %s',
    (code) => {
      expect(isUnexpectedError(code)).toBe(true)
    },
  )

  it.each(['DUPLICATE_NAME', 'VALIDATION', 'NOT_FOUND', 'INVALID_ID'] as const)(
    'returns false for user-caused code %s',
    (code) => {
      expect(isUnexpectedError(code)).toBe(false)
    },
  )
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter web test -- app-error`
Expected: FAIL — `isUnexpectedError is not exported from '@tracker/shared'`

- [ ] **Step 3: Add the function**

Edit `packages/shared/src/errors.ts`. Append after the existing `toAppError`:

```ts
const UNEXPECTED_CODES = new Set<AppErrorCode>([
  'INTERNAL', 'IMPORT_FAILED', 'EXPORT_FAILED', 'BAD_QUERY',
])

/**
 * True for system-caused codes (DB outage, internal failure). False for
 * user-caused codes (duplicate name, validation, missing record). Used by
 * the server logger to decide whether an error is worth emitting to logs.
 */
export function isUnexpectedError(code: AppErrorCode): boolean {
  return UNEXPECTED_CODES.has(code)
}
```

No re-export change needed — `packages/shared/src/index.ts` already does `export * from './errors'`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter web test -- app-error`
Expected: PASS (every existing `toAppError` test still passes + the 8 new `isUnexpectedError` cases)

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/errors.ts apps/web/src/i18n/app-error.test.ts
git commit -m "feat(errors): add isUnexpectedError code classifier"
```

---

## Task 2: Add `httpStatusForCode` to `api-helpers`

**Files:**
- Modify: `apps/web/src/server/api-helpers.ts`
- Test: `apps/web/src/server/api-helpers.test.ts` (new)

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/server/api-helpers.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { httpStatusForCode } from './api-helpers'

describe('httpStatusForCode', () => {
  it('returns 409 for DUPLICATE_NAME', () => {
    expect(httpStatusForCode('DUPLICATE_NAME')).toBe(409)
  })
  it('returns 404 for NOT_FOUND', () => {
    expect(httpStatusForCode('NOT_FOUND')).toBe(404)
  })
  it.each(['VALIDATION', 'INVALID_ID', 'BAD_QUERY'] as const)(
    'returns 400 for client-input code %s',
    (code) => {
      expect(httpStatusForCode(code)).toBe(400)
    },
  )
  it.each(['INTERNAL', 'IMPORT_FAILED', 'EXPORT_FAILED'] as const)(
    'returns 500 for system code %s',
    (code) => {
      expect(httpStatusForCode(code)).toBe(500)
    },
  )
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter web test -- api-helpers`
Expected: FAIL — `httpStatusForCode is not exported from './api-helpers'`

- [ ] **Step 3: Add the function**

Edit `apps/web/src/server/api-helpers.ts`. Append after `errorResponse`:

```ts
export function httpStatusForCode(code: AppErrorCode): number {
  switch (code) {
    case 'DUPLICATE_NAME': return 409
    case 'NOT_FOUND': return 404
    case 'VALIDATION':
    case 'INVALID_ID':
    case 'BAD_QUERY':
      return 400
    case 'INTERNAL':
    case 'IMPORT_FAILED':
    case 'EXPORT_FAILED':
      return 500
  }
}
```

The exhaustive `switch` (no `default`) makes TypeScript fail compilation if `AppErrorCode` ever gains a new variant that this function hasn't mapped — a deliberate safety net.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter web test -- api-helpers`
Expected: PASS — all 8 cases.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/api-helpers.ts apps/web/src/server/api-helpers.test.ts
git commit -m "feat(errors): add httpStatusForCode mapping helper"
```

---

## Task 3: Create `logServerError` primitive

**Files:**
- Create: `apps/web/src/server/logger.ts`
- Create: `apps/web/src/server/logger.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/server/logger.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AppError } from '@tracker/shared'
import { logServerError } from './logger'

describe('logServerError', () => {
  let errSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    errSpy.mockRestore()
  })

  it('emits one structured JSON line', () => {
    const err = new AppError('INTERNAL', 'boom')
    logServerError(err, { op: 'test-op' })

    expect(errSpy).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(errSpy.mock.calls[0][0] as string)
    expect(payload).toMatchObject({
      level: 'error',
      op: 'test-op',
      code: 'INTERNAL',
      message: 'boom',
    })
    expect(typeof payload.timestamp).toBe('string')
    expect(new Date(payload.timestamp).toString()).not.toBe('Invalid Date')
  })

  it('includes stack when present', () => {
    const err = new AppError('INTERNAL', 'with stack')
    logServerError(err, { op: 'op' })
    const payload = JSON.parse(errSpy.mock.calls[0][0] as string)
    expect(payload.stack).toContain('AppError')
  })

  it('truncates stack over 2 KB', () => {
    const err = new AppError('INTERNAL', 'big stack')
    err.stack = 'x'.repeat(5000)
    logServerError(err, { op: 'op' })
    const payload = JSON.parse(errSpy.mock.calls[0][0] as string)
    expect(payload.stack.length).toBeLessThanOrEqual(2048)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter web test -- logger`
Expected: FAIL — `logServerError` not exported (file doesn't exist).

- [ ] **Step 3: Create the logger module**

Create `apps/web/src/server/logger.ts`:

```ts
import type { AppError } from '@tracker/shared'

type LogContext = { op: string }

const STACK_MAX = 2048

/**
 * Single seam for server-side error logging. Today: console.error JSON
 * (picked up by `wrangler tail` and Workers Logs). Future: swap the body
 * for a Logpush / Axiom / Better Stack call without touching call sites.
 *
 * The caller has already decided this entry is worth logging. This function
 * does not consult isUnexpectedError — that decision lives in the wrappers.
 */
export function logServerError(err: AppError, ctx: LogContext): void {
  const stack = err.stack
  console.error(JSON.stringify({
    level: 'error',
    op: ctx.op,
    code: err.code,
    message: err.message,
    stack: stack && stack.length > STACK_MAX ? stack.slice(0, STACK_MAX) : stack,
    timestamp: new Date().toISOString(),
  }))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter web test -- logger`
Expected: PASS — 3 cases.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/logger.ts apps/web/src/server/logger.test.ts
git commit -m "feat(logging): add logServerError primitive"
```

---

## Task 4: Add `withServerFn` wrapper

**Files:**
- Modify: `apps/web/src/server/logger.ts`
- Modify: `apps/web/src/server/logger.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `apps/web/src/server/logger.test.ts`:

```ts
import { AppError, toAppError } from '@tracker/shared'
import { withServerFn } from './logger'

describe('withServerFn', () => {
  let errSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    errSpy.mockRestore()
  })

  it('returns the handler value when no throw', async () => {
    const wrapped = withServerFn('op', async (x: number) => x * 2)
    await expect(wrapped(3)).resolves.toBe(6)
    expect(errSpy).not.toHaveBeenCalled()
  })

  it('re-throws the classified AppError on raw throw', async () => {
    const wrapped = withServerFn('op', async () => {
      throw new Error('UNIQUE constraint failed: categories.name')
    })
    await expect(wrapped(undefined as never)).rejects.toMatchObject({
      name: 'AppError', code: 'DUPLICATE_NAME',
    })
  })

  it('does NOT log for user-caused codes', async () => {
    const wrapped = withServerFn('op', async () => {
      throw new AppError('DUPLICATE_NAME', 'dup')
    })
    await expect(wrapped(undefined as never)).rejects.toThrow()
    expect(errSpy).not.toHaveBeenCalled()
  })

  it.each(['INTERNAL', 'IMPORT_FAILED', 'EXPORT_FAILED', 'BAD_QUERY'] as const)(
    'logs unexpected code %s',
    async (code) => {
      const wrapped = withServerFn('op', async () => {
        throw new AppError(code, 'boom')
      })
      await expect(wrapped(undefined as never)).rejects.toThrow()
      expect(errSpy).toHaveBeenCalledTimes(1)
    },
  )

  it('preserves the AppError reference (does not re-wrap)', async () => {
    const original = new AppError('INTERNAL', 'orig')
    const wrapped = withServerFn('op', async () => { throw original })
    await expect(wrapped(undefined as never)).rejects.toBe(original)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter web test -- logger`
Expected: FAIL — `withServerFn` not exported.

- [ ] **Step 3: Add `withServerFn` to the logger module**

Append to `apps/web/src/server/logger.ts`:

```ts
import { toAppError, isUnexpectedError } from '@tracker/shared'

/**
 * Wrap a TanStack Start server-fn handler. On throw: classify with
 * toAppError, log if the resolved code is system-caused, re-throw the
 * AppError so seroval preserves the .code on the wire to the client.
 */
export function withServerFn<A, R>(
  op: string,
  fn: (args: A) => Promise<R>,
): (args: A) => Promise<R> {
  return async (args) => {
    try {
      return await fn(args)
    } catch (e) {
      const ae = toAppError(e)
      if (isUnexpectedError(ae.code)) {
        logServerError(ae, { op })
      }
      throw ae
    }
  }
}
```

Note: `toAppError` returns the same instance when passed an `AppError`, which is why the "preserves AppError reference" test passes.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter web test -- logger`
Expected: PASS — all `withServerFn` cases + earlier `logServerError` cases.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/logger.ts apps/web/src/server/logger.test.ts
git commit -m "feat(logging): add withServerFn wrapper"
```

---

## Task 5: Add `withApiHandler` wrapper

**Files:**
- Modify: `apps/web/src/server/logger.ts`
- Modify: `apps/web/src/server/logger.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `apps/web/src/server/logger.test.ts`:

```ts
import { withApiHandler } from './logger'

describe('withApiHandler', () => {
  let errSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    errSpy.mockRestore()
  })

  const fakeReq = { request: new Request('http://x') }

  it('passes the response through when no throw', async () => {
    const ok = new Response('ok')
    const wrapped = withApiHandler('op', async () => ok)
    await expect(wrapped(fakeReq)).resolves.toBe(ok)
    expect(errSpy).not.toHaveBeenCalled()
  })

  it('returns 409 errorResponse for DUPLICATE_NAME', async () => {
    const wrapped = withApiHandler('op', async () => {
      throw new AppError('DUPLICATE_NAME', 'dup')
    })
    const res = await wrapped(fakeReq)
    expect(res.status).toBe(409)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('DUPLICATE_NAME')
    expect(errSpy).not.toHaveBeenCalled()
  })

  it('returns 404 for NOT_FOUND', async () => {
    const wrapped = withApiHandler('op', async () => {
      throw new AppError('NOT_FOUND', 'missing')
    })
    const res = await wrapped(fakeReq)
    expect(res.status).toBe(404)
  })

  it('returns 500 and LOGS for INTERNAL', async () => {
    const wrapped = withApiHandler('op', async () => {
      throw new Error('boom')
    })
    const res = await wrapped(fakeReq)
    expect(res.status).toBe(500)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('INTERNAL')
    expect(errSpy).toHaveBeenCalledTimes(1)
  })

  it('returns 400 for VALIDATION and does NOT log', async () => {
    const wrapped = withApiHandler('op', async () => {
      throw new AppError('VALIDATION', 'bad input')
    })
    const res = await wrapped(fakeReq)
    expect(res.status).toBe(400)
    expect(errSpy).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter web test -- logger`
Expected: FAIL — `withApiHandler` not exported.

- [ ] **Step 3: Add `withApiHandler` to the logger module**

Append to `apps/web/src/server/logger.ts`:

```ts
import { errorResponse, httpStatusForCode } from './api-helpers'

/**
 * Wrap a TanStack Start /api/* handler. On throw: classify, log if
 * unexpected, return an errorResponse with status derived from the code.
 * Pass-through when the handler returns normally.
 */
export function withApiHandler<Ctx extends { request: Request }>(
  op: string,
  fn: (ctx: Ctx) => Promise<Response>,
): (ctx: Ctx) => Promise<Response> {
  return async (ctx) => {
    try {
      return await fn(ctx)
    } catch (e) {
      const ae = toAppError(e)
      if (isUnexpectedError(ae.code)) {
        logServerError(ae, { op })
      }
      return errorResponse(ae.message, httpStatusForCode(ae.code), ae.code)
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter web test -- logger`
Expected: PASS — every case.

- [ ] **Step 5: Type-check the whole web app**

Run: `pnpm --filter web typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/server/logger.ts apps/web/src/server/logger.test.ts
git commit -m "feat(logging): add withApiHandler wrapper"
```

---

## Task 6: Migrate server fns in `categories.tsx`

**Files:**
- Modify: `apps/web/src/routes/categories.tsx:29-58`

- [ ] **Step 1: Replace the three server-fn handlers**

In `apps/web/src/routes/categories.tsx`, replace lines 29-58 with:

```ts
import { withServerFn } from '~/server/logger'
// ^ add this import alongside the existing imports at the top of the file

const createServerCategory = createServerFn({ method: 'POST' })
  .inputValidator(createCategorySchema)
  .handler(withServerFn('server-fn:createServerCategory', async ({ data }) => {
    const db = getDB()
    return await createCategory(db, data)
  }))

const updateServerCategory = createServerFn({ method: 'POST' })
  .inputValidator(updateCategorySchema.extend({ id: z.number() }))
  .handler(withServerFn('server-fn:updateServerCategory', async ({ data }) => {
    const { id, ...rest } = data
    const db = getDB()
    return await updateCategory(db, id, rest)
  }))

const deleteServerCategory = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.number() }))
  .handler(withServerFn('server-fn:deleteServerCategory', async ({ data }) => {
    const db = getDB()
    await deleteCategory(db, data.id)
    return { success: true }
  }))
```

The `try/catch/throw toAppError(e)` blocks are gone — the wrapper does that work. `deleteServerCategory` now gets classification + logging it didn't have before.

The `toAppError` import on line 7 is no longer needed in this file (verify; if no other use, remove it from the import statement).

- [ ] **Step 2: Verify the rest of the file is intact**

Run: `pnpm --filter web typecheck`
Expected: clean.

- [ ] **Step 3: Run the full test suite (regression check)**

Run: `pnpm --filter web test`
Expected: every test passes.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/categories.tsx
git commit -m "refactor(errors): migrate category server fns to withServerFn"
```

---

## Task 7: Migrate `/api/categories.ts` (silent-swallow bug fix)

**Files:**
- Modify: `apps/web/src/routes/api/categories.ts`

- [ ] **Step 1: Rewrite the file**

Replace the contents of `apps/web/src/routes/api/categories.ts`:

```ts
import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { getCategories, createCategory } from '@tracker/db'
import { createCategorySchema } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/categories')({
  server: {
    handlers: {
      GET: withApiHandler('api:GET /api/categories', async () => {
        const db = getDB()
        const categories = await getCategories(db)
        return jsonResponse(categories)
      }),
      POST: withApiHandler('api:POST /api/categories', async ({ request }) => {
        const body = await request.json()
        const parsed = createCategorySchema.safeParse(body)
        if (!parsed.success) {
          return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
        }
        const db = getDB()
        const category = await createCategory(db, parsed.data)
        return jsonResponse(category, 201)
      }),
    },
  },
})
```

Notes:
- The `toAppError` import is dropped — the wrapper handles classification.
- `safeParse` still returns its own response (early return — never throws into the wrapper).
- The previously-implicit-500 `catch {}` on the GET handler now logs through the wrapper.
- The DUPLICATE_NAME branch on POST is gone — the wrapper sees `toAppError(e).code === 'DUPLICATE_NAME'`, picks 409 via `httpStatusForCode`, and emits the AppError's English message in the body.

- [ ] **Step 2: Type-check**

Run: `pnpm --filter web typecheck`
Expected: clean.

- [ ] **Step 3: Manual smoke (dev server)**

Run: `pnpm dev` in one terminal, then in another:

```bash
# Happy path
curl -sS http://localhost:3000/api/categories | head -c 200
# Duplicate (assuming a "Food" category exists or you create one twice)
curl -sS -X POST http://localhost:3000/api/categories \
  -H 'content-type: application/json' \
  -d '{"name":"Food","type":"expense"}'
# Expect: 409, body { error: "...", code: "DUPLICATE_NAME" }
# Expect: NO log line in dev console for the duplicate.
```

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/api/categories.ts
git commit -m "refactor(errors): migrate /api/categories to withApiHandler"
```

---

## Task 8: Migrate the remaining `/api/*` routes

**Files (all in `apps/web/src/routes/api/`):**
- `categories.$id.ts`
- `transactions.ts`
- `transactions.$id.ts`
- `recurring.ts`
- `recurring.$id.ts`
- `investments.ts`
- `investments.$id.ts`
- `stats.monthly-summary.ts`
- `stats.category-breakdown.ts`
- `export.ts`
- `import.ts`

All 11 follow the same `try { ... } catch { return errorResponse('Failed to ...', 500, 'INTERNAL') }` shape. The transformation per handler is mechanical.

- [ ] **Step 1: Apply the same transformation per file**

For each handler in each file:

1. Add `import { withApiHandler } from '~/server/logger'` at the top (one import per file, regardless of how many handlers it has).
2. Replace each handler definition of the shape:

   ```ts
   METHOD: async (ctx) => {
     try {
       // body…
     } catch {
       return errorResponse('Failed to …', 500, 'INTERNAL')
     }
   }
   ```

   with:

   ```ts
   METHOD: withApiHandler('api:METHOD <route>', async (ctx) => {
     // body…
   })
   ```

3. If the handler has a more complex catch (e.g. classifying with `toAppError` and branching on `DUPLICATE_NAME`), delete the catch entirely — the wrapper handles all classification + status mapping.
4. If `toAppError` is no longer used in the file after the migration, remove it from the import statement.
5. Keep `safeParse` early-return branches as-is (they don't throw).

Concrete `op` names to use (keep them in this exact form for grep-ability):

| File | Handler | `op` value |
|---|---|---|
| `categories.$id.ts` | PUT | `api:PUT /api/categories/$id` |
| `categories.$id.ts` | DELETE | `api:DELETE /api/categories/$id` |
| `transactions.ts` | GET | `api:GET /api/transactions` |
| `transactions.ts` | POST | `api:POST /api/transactions` |
| `transactions.$id.ts` | PUT | `api:PUT /api/transactions/$id` |
| `transactions.$id.ts` | DELETE | `api:DELETE /api/transactions/$id` |
| `recurring.ts` | GET | `api:GET /api/recurring` |
| `recurring.ts` | POST | `api:POST /api/recurring` |
| `recurring.$id.ts` | PUT | `api:PUT /api/recurring/$id` |
| `recurring.$id.ts` | DELETE | `api:DELETE /api/recurring/$id` |
| `investments.ts` | GET | `api:GET /api/investments` |
| `investments.ts` | POST | `api:POST /api/investments` |
| `investments.$id.ts` | PUT | `api:PUT /api/investments/$id` |
| `investments.$id.ts` | DELETE | `api:DELETE /api/investments/$id` |
| `stats.monthly-summary.ts` | GET | `api:GET /api/stats/monthly-summary` |
| `stats.category-breakdown.ts` | GET | `api:GET /api/stats/category-breakdown` |
| `export.ts` | GET | `api:GET /api/export` |
| `import.ts` | POST | `api:POST /api/import` |

(If a file has handlers this table doesn't list, follow the same `api:METHOD /api/<path>` convention.)

- [ ] **Step 2: Type-check after each file**

Run: `pnpm --filter web typecheck`
Expected: clean.

Strategy hint for the implementer: migrate one file at a time, type-check, then move on. If a file's catch block does something *other* than the boilerplate (e.g. it re-reads the request body), preserve that logic by keeping the relevant lines inside the wrapper-wrapped handler.

- [ ] **Step 3: Run all tests**

Run: `pnpm --filter web test`
Expected: every test passes (no test changes needed — the wrappers are tested in isolation and the API routes have no unit tests today).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/api/
git commit -m "refactor(errors): migrate remaining /api/* routes to withApiHandler"
```

---

## Task 9: Manual smoke + final verification

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`

- [ ] **Step 2: Exercise the happy path through the UI**

Open the app, create a category, edit a category, delete a category, create a transaction. Confirm the console shows **no error log lines** for any of these flows.

- [ ] **Step 3: Force a duplicate**

Try to create a category with a name that already exists. Confirm:
- UI toast shows the localized `DUPLICATE_NAME` message (EN or FR depending on locale).
- Server console shows **no** error log line (DUPLICATE_NAME is user-caused).

- [ ] **Step 4: Force a real failure (manual)**

Temporarily edit `apps/web/src/server/db.ts` to throw on `getDB()` (or any equivalent way to fake a system error). Reload the app, try to fetch categories.

Confirm the server console emits a single JSON line of the documented shape, including:
- `"level": "error"`
- `"op": "api:GET /api/categories"` (or whichever route you triggered)
- `"code": "INTERNAL"`
- a timestamp
- a stack

Revert the change to `db.ts`.

- [ ] **Step 5: Final type-check + test sweep**

Run from the repo root:

```bash
pnpm typecheck
pnpm test
```

Expected: all clean. (There is no project-wide `lint` script today; nothing to run.)

- [ ] **Step 6: Final commit (if needed)**

If any cleanup happened during smoke testing (unused imports, etc.):

```bash
git add -A
git commit -m "chore(errors): final cleanup after manual smoke"
```

If no cleanup was needed, skip this step.

---

## Self-Review Checklist

After implementation, the following spec requirements should all be satisfied:

- [x] `logServerError` primitive owns `console.error` — Task 3
- [x] `withServerFn` wrapper — Task 4
- [x] `withApiHandler` wrapper — Task 5
- [x] `isUnexpectedError` in `@tracker/shared` — Task 1
- [x] `httpStatusForCode` in `api-helpers` — Task 2
- [x] Stack truncation to ~2 KB — Task 3
- [x] No PII in log entries — implicit (no request body in payload)
- [x] Server fns migrated — Task 6
- [x] All `/api/*` routes migrated — Tasks 7-8
- [x] Silent-swallow fix on `routes/api/categories.ts:15` — Task 7
- [x] Tests for every code's logging decision — Tasks 4, 5
- [x] `packages/shared` stays runtime-pure (no Workers imports) — Tasks 1, all (logger lives in `apps/web`)
- [x] `en.json`/`fr.json` untouched — verified by absence of any translation-key changes in this plan
- [x] `AppError.cause` still not used — verified (logger reads `err.stack`, not `err.cause`)
