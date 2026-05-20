# NOT_FOUND for mutation server fns (deferral #1)

**Status:** design
**Date:** 2026-05-20
**Stacks on:** PR #13 (`feature/server-fn-logging-rollout`)

## Problem

Today, calling an update/delete server fn with a non-existent id silently no-ops at the Drizzle layer:

- Most mutation queries (`updateCategory`, `updateTransaction`, `updateRecurringRule`, `deleteRecurringRule`) already use `.returning().get()` and so return `T | undefined`. But every caller currently *ignores* the undefined case and returns it to the client as-is (= `null` on the wire), or — for `/api/*` routes — runs a separate `getXById` SELECT before mutating, which is duplicative and racy.
- Three raw `.delete()` calls (`deleteTransaction`, `deleteInvestmentSnapshot`, the final delete inside `deleteCategory`) don't use `.returning()` at all, so the caller has no signal whether anything happened.

Net: a stale id in the UI succeeds quietly. The client sees `null` or `{success: true}` and refetches; the user notices the row didn't change but has no clear error.

This was deferral #1 from the i18n project memory ("Drizzle 0-row update/delete doesn't throw, so it needs domain-wide existence checks"). With PR #12's wrapper + PR #13's full rollout in place, the missing piece is the per-mutation existence assertion.

## Goal

Make every mutation server fn and every `/api/*` mutation route throw `AppError('NOT_FOUND', ...)` when the target row doesn't exist. The wrapper already classifies `NOT_FOUND` correctly:

- `withServerFn` re-throws it; the client's `translateApiError` maps to `error.code.NOT_FOUND`.
- `withApiHandler` returns `errorResponse(message, 404, 'NOT_FOUND')` via `httpStatusForCode`.
- Both **skip logging** (per `isUnexpectedError(NOT_FOUND) === false`), which is correct — a stale-id attempt is user-caused, not a server incident.

Non-goals:

- Transactional integrity around `deleteCategory`'s 3-statement sequence (FK-nullify, FK-nullify, delete). That's a separate concern; this PR keeps the existing semantics.
- Adding `NOT_FOUND` to *read* (`getXById`) handlers — they already handle this correctly in `/api/*` and the server-fn read in `transactions_.$id.edit.tsx`.
- Restoring race-free check-then-mutate. The current `/api/*` SELECT-then-UPDATE is racy; switching to "mutate and check the returned row" *removes* the race rather than introducing one.

## Approach

Two pieces:

### 1. `assertFound` helper in `@tracker/shared`

```ts
/**
 * Throw an AppError(NOT_FOUND) if the value is null/undefined. Returns the
 * value otherwise, type-narrowed to NonNullable<T>. Used at server-side
 * mutation call sites where the underlying DB op returns undefined for a
 * missing row (Drizzle's `.returning().get()` on a no-match update/delete).
 */
export function assertFound<T>(value: T | null | undefined, message: string): NonNullable<T> {
  if (value == null) throw new AppError('NOT_FOUND', message)
  return value as NonNullable<T>
}
```

Lives next to `AppError` / `toAppError` / `isUnexpectedError`. No new dependency direction; `packages/shared` stays runtime-pure.

### 2. Three `packages/db` mutation queries get `.returning().get()`

```ts
// deleteTransaction: returns Transaction | undefined
export function deleteTransaction(db: DB, id: number) {
  return db.delete(schema.transactions)
    .where(eq(schema.transactions.id, id))
    .returning().get()
}

// deleteInvestmentSnapshot: returns InvestmentSnapshot | undefined
export function deleteInvestmentSnapshot(db: DB, id: number) {
  return db.delete(schema.investmentSnapshots)
    .where(eq(schema.investmentSnapshots.id, id))
    .returning().get()
}

// deleteCategory: same — the FK-null updates run unconditionally (no-op if
// no transactions/recurring rules reference the id), then the final delete
// returns the deleted row or undefined.
export async function deleteCategory(db: DB, id: number) {
  await db.update(schema.transactions)
    .set({ categoryId: null })
    .where(eq(schema.transactions.categoryId, id))
  await db.update(schema.recurringRules)
    .set({ categoryId: null })
    .where(eq(schema.recurringRules.categoryId, id))
  return db.delete(schema.categories)
    .where(eq(schema.categories.id, id))
    .returning().get()
}
```

SQLite supports `RETURNING` since 3.35; Drizzle wires it through universally on `BaseSQLiteDatabase`.

## Call-site migration

Pattern A (server fns) — wrap each mutation's return value:

```ts
// Before (post-#13)
.handler(withServerFn('server-fn:updateServerCategory', async ({ data }) => {
  const { id, ...rest } = data
  const db = getDB()
  return await updateCategory(db, id, rest)
}))

// After
.handler(withServerFn('server-fn:updateServerCategory', async ({ data }) => {
  const { id, ...rest } = data
  const db = getDB()
  return assertFound(await updateCategory(db, id, rest), 'Category not found')
}))
```

Pattern B (`/api/*` routes) — replace the inline `getXById` check with `assertFound`:

```ts
// Before
PUT: withApiHandler('api:PUT /api/categories/$id', async ({ request, params }) => {
  const id = Number(params.id)
  if (Number.isNaN(id)) return errorResponse('Invalid category ID', 400, 'INVALID_ID')
  const body = await request.json()
  const parsed = updateCategorySchema.safeParse(body)
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
  const db = getDB()
  const existing = await getCategoryById(db, id)
  if (!existing) return errorResponse('Category not found', 404, 'NOT_FOUND')
  const category = await updateCategory(db, id, parsed.data)
  return jsonResponse(category)
}),

// After
PUT: withApiHandler('api:PUT /api/categories/$id', async ({ request, params }) => {
  const id = Number(params.id)
  if (Number.isNaN(id)) return errorResponse('Invalid category ID', 400, 'INVALID_ID')
  const body = await request.json()
  const parsed = updateCategorySchema.safeParse(body)
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
  const db = getDB()
  const category = assertFound(await updateCategory(db, id, parsed.data), 'Category not found')
  return jsonResponse(category)
}),
```

Two SELECTs collapse into one (`UPDATE … RETURNING`), the race between SELECT and UPDATE disappears, and the wrapper handles the 404 conversion via `assertFound`'s thrown `AppError`.

## Inventory

**Server-fn mutations to wrap (10):**

| Fn | File | Pattern |
|---|---|---|
| `updateServerCategory` | `categories.tsx` | A |
| `deleteServerCategory` | `categories.tsx` | A |
| `deleteServerTransaction` | `transactions.tsx` | A (needs `.returning()` on db fn) |
| `updateServerTransaction` | `transactions_.$id.edit.tsx` | A |
| `updateServerRecurringRule` | `recurring.tsx` | A |
| `deleteServerRecurringRule` | `recurring.tsx` | A |
| `toggleServerRecurringRule` | `recurring.tsx` | A |
| `deleteServerSnapshot` | `investments.tsx` | A (needs `.returning()` on db fn) |

`createX` server fns don't need this — INSERT either succeeds or throws (UNIQUE violation, etc.); there's no "id doesn't exist" case for create.

**`/api/*` mutations to migrate (8):**

| Route | Files | Pattern |
|---|---|---|
| PUT /api/categories/$id | `categories.$id.ts` | B |
| DELETE /api/categories/$id | `categories.$id.ts` | B |
| PUT /api/transactions/$id | `transactions.$id.ts` | B |
| DELETE /api/transactions/$id | `transactions.$id.ts` | B |
| PUT /api/recurring/$id | `recurring.$id.ts` | B |
| DELETE /api/recurring/$id | `recurring.$id.ts` | B |
| DELETE /api/investments/$id | `investments.$id.ts` | B |

GET handlers on the same routes still use `getXById` + explicit 404 — those stay as-is (reads don't return `undefined` from an UPDATE/DELETE).

## Testing

### `apps/web/src/i18n/app-error.test.ts` (extend)

```ts
import { assertFound, AppError } from '@tracker/shared'

describe('assertFound', () => {
  it('returns the value when defined', () => {
    expect(assertFound({ id: 1 }, 'not found')).toEqual({ id: 1 })
  })
  it('throws AppError(NOT_FOUND) on undefined', () => {
    expect(() => assertFound(undefined, 'gone')).toThrow(AppError)
    try { assertFound(undefined, 'gone') } catch (e) {
      expect((e as AppError).code).toBe('NOT_FOUND')
      expect((e as AppError).message).toBe('gone')
    }
  })
  it('throws AppError(NOT_FOUND) on null', () => {
    expect(() => assertFound(null, 'gone')).toThrow(AppError)
  })
  it('narrows the type to NonNullable<T>', () => {
    // Type-level — checked at compile time. Runtime: returns value.
    const value: string | undefined = 'x'
    const narrowed: string = assertFound(value, 'msg')
    expect(narrowed).toBe('x')
  })
})
```

### Out of scope for tests

- Per-handler integration tests for the 10 server fns / 8 routes. The wrapper + `assertFound` are tested in isolation; per-site testing would just re-test the composition.

## Invariants preserved

- `packages/shared` stays runtime-pure.
- No new error codes; existing `NOT_FOUND` taxonomy is sufficient.
- Server messages stay English (`'Category not found'`, etc.); client maps via i18n.
- Drizzle's universal `BaseSQLiteDatabase<'async'>` typing still works; `.returning()` is universal across SQLite backends.
- PR #13's `withServerFn` op-naming convention untouched.

## What this does NOT cover

- Multi-row mutations (none currently exist in the codebase).
- `createX` returning `undefined` (Drizzle's INSERT…RETURNING always returns the inserted row; it would only return undefined for a no-op INSERT, which can't happen with the current usage).
- Race between two concurrent updates of the same row (last-write-wins; pre-existing behavior).
