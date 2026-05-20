# Server-fn logging rollout (deferral #2)

**Status:** design
**Date:** 2026-05-20

## Problem

PR #12 landed `withServerFn` / `withApiHandler` and migrated the 3 category server fns + all 12 `/api/*` routes. The 21 remaining server fns (transactions, recurring, investments, stats, import, root, dashboard, shared) still throw raw errors with no classification, no logging, and no localized client message — they fall through to the generic route-error UI.

This was deferral #2 from the i18n project memory: "only category create/update were wrapped … other server fns stay localized-generic by design." The design rationale at the time was scope, not principle. With the wrapper now sitting right there, rolling it out is mechanical.

## Goal

Wrap all 21 unwrapped server fns with `withServerFn` so they:

1. Get classified via `toAppError` (instead of falling through as opaque errors).
2. Emit one structured log line per system-caused failure via `logServerError`.
3. Surface localized toasts via the existing `translateApiError(error)` flow at mutation sites — when the wrapped fn throws an `AppError` with a non-INTERNAL code, the client already maps it to the right i18n key.

Non-goals:

- Adding new error codes. The existing `AppErrorCode` set is sufficient.
- Existence checks → `NOT_FOUND` (deferral #1, still out of scope).
- Refactoring the server fns themselves — only the `.handler(...)` body gets wrapped.

## Approach

Inherited decisions from PR #12 — no fresh design needed:

| Decision | Value |
|---|---|
| Wrapper | `withServerFn(op, fn)` from `~/server/logger` |
| Op-name convention | `server-fn:<exported-name>` (e.g. `server-fn:createServerTransaction`) |
| Log policy | Only `isUnexpectedError(code)` — DUPLICATE_NAME / VALIDATION / NOT_FOUND / INVALID_ID stay silent |
| Server message language | English |
| `packages/shared` posture | Unchanged (logger stays app-local) |

The only fresh decision: **import server fns preserve `IMPORT_FAILED`**.

`apps/web/src/routes/import.tsx` has 5 server fns calling into the CSV parser and import-helpers. PR #12's `/api/import.ts` already established the pattern: re-throw a typed `AppError('IMPORT_FAILED', ...)` from a small `catch` so the wrapper logs it as unexpected and the client sees the specific code. The 4 read-side import fns (`parseFile`, `detectFileColumns`, `checkDuplicates`, `suggestCategories`) get the same treatment — they all run user-supplied CSV through parsers that can throw on malformed input.

`importTransactions` (the actual mutation) preserves `IMPORT_FAILED` for the same reason.

## Inventory

The 21 server fns by file (verified against current `master`):

| File | Server fns |
|---|---|
| `apps/web/src/server/shared-fns.ts` | `getServerCategories` |
| `apps/web/src/routes/__root.tsx` | `getInitialLocale` |
| `apps/web/src/routes/index.tsx` | `getDashboardData` |
| `apps/web/src/routes/transactions.tsx` | `getServerTransactions`, `deleteServerTransaction` |
| `apps/web/src/routes/transactions_.new.tsx` | `createServerTransaction` |
| `apps/web/src/routes/transactions_.$id.edit.tsx` | `getServerTransaction`, `updateServerTransaction` |
| `apps/web/src/routes/recurring.tsx` | `getServerRecurringRules`, `createServerRecurringRule`, `updateServerRecurringRule`, `deleteServerRecurringRule`, `toggleServerRecurringRule` |
| `apps/web/src/routes/investments.tsx` | `getServerSnapshots`, `createServerSnapshot`, `deleteServerSnapshot` |
| `apps/web/src/routes/stats.tsx` | `getMonthlyStats`, `getCategoryStats` |
| `apps/web/src/routes/import.tsx` | `parseFile`, `detectFileColumns`, `checkDuplicates`, `suggestCategories`, `importTransactions` |

## Transformation pattern

The generic case — handler body replaced by `withServerFn` call. Read the existing body for each fn first; some have inline `if (!found) throw new Error(...)` checks that should become `throw new AppError('NOT_FOUND', ...)` so the wrapper classifies them correctly.

```ts
// Before
const createServerTransaction = createServerFn({ method: 'POST' })
  .inputValidator(createTransactionSchema)
  .handler(async ({ data }) => {
    const db = getDB()
    return await createTransaction(db, data)
  })

// After
const createServerTransaction = createServerFn({ method: 'POST' })
  .inputValidator(createTransactionSchema)
  .handler(withServerFn('server-fn:createServerTransaction', async ({ data }) => {
    const db = getDB()
    return await createTransaction(db, data)
  }))
```

For `import.tsx` fns that call parsers/import-helpers, the inner try/catch re-throws a typed `AppError('IMPORT_FAILED', ...)` matching the `/api/import.ts` pattern from PR #12.

## Out of scope

- New tests. Wrapper behavior is fully covered in `apps/web/src/server/logger.test.ts` (16 cases). Per-handler unit tests for the wrapped fns would only re-test the wrapper.
- NOT_FOUND existence checks for *mutation* server fns (deferral #1).
- Touching the `inputValidator(...)` schemas.
- Renaming any server fn.

## Invariants preserved

- `packages/shared` untouched (no new exports).
- `en.json` / `fr.json` untouched.
- `AppError.cause` still not used (deferral #3 stays superseded by logging).
- `Ctx = any` constraint on `withApiHandler` not touched (this PR doesn't migrate any API handlers).
