# Server-side error logging

**Status:** design
**Date:** 2026-05-20

## Problem

The i18n + `AppError` work (PRs #8–#11) deliberately kept server-side error text off the wire. `AppError.cause` is dropped on serialization, so the client only sees a classified `code`. The trade-off: when something goes wrong server-side, **the server has no record of it either**.

Two concrete failure modes today:

1. **Server fns** (`apps/web/src/routes/categories.tsx`) catch the underlying error, classify it with `toAppError`, throw the `AppError`. The original error and its stack are lost.
2. **`/api/*` route handlers** (`apps/web/src/routes/api/categories.ts:15`) have a `catch {}` that returns `errorResponse('Failed to fetch categories', 500, 'INTERNAL')` with **no log at all**. A DB outage looks identical to a no-op.

For a personal app on Cloudflare's free tier this isn't urgent, but it makes any future bug report unactionable: there is no trail.

## Goal

Emit a structured server log every time an *unexpected* error is caught in a server fn or `/api/*` handler, so `wrangler tail` (today) and a persistent sink (later) have something to surface.

Non-goals:

- Persistent log sink. The design isolates `console.error` to a single primitive so a future Logpush / Workers Logs / Axiom integration is a one-line swap.
- Existence-check → `NOT_FOUND` for mutations (deferral #1 from the i18n project memory).
- Rolling `toAppError` out to non-category server fns (deferral #2).
- Restoring `AppError.cause`. This work supersedes the need by giving the server its own visibility channel.

## Approach

A thin app-local logger module in `apps/web/src/server/logger.ts` exposes two wrapper functions — `withServerFn` and `withApiHandler` — which call sites use to wrap their handlers. The wrappers run the handler, catch any thrown value, classify it with `toAppError`, log via `console.error` *only if the code represents an unexpected (system-caused) failure*, and either re-throw the `AppError` (server fns) or return a properly-coded `errorResponse` (API routes).

The classification of which codes are "user-caused" vs "system-caused" lives in `packages/shared` next to the codes themselves; the *decision to log* lives in the app-local logger. This preserves `packages/shared` as runtime-pure (no Workers-isms) while keeping the taxonomy with the type.

### Why two wrappers, not one

TanStack Start server-fn handlers communicate errors by **throwing** (seroval preserves `AppError.code` as an own-enumerable property on the wire). `/api/*` handlers communicate errors by **returning `Response`** objects (via the existing `errorResponse` helper). A single wrapper that handled both would have to runtime-sniff the return type. Two named wrappers grep better and have honest typings.

### Why `console.error`, not a library

Cloudflare Workers' native log path *is* `console.*`. It's picked up by `wrangler tail`, Workers Logs (beta), and Logpush. Pino/Winston add bundle size and Node-isms (process.stdout, sync writes) that don't fit the Workers runtime. The design treats `logServerError` as the single seam for a future structured-sink swap.

## Modules

### `apps/web/src/server/logger.ts` (new)

Public exports:

```ts
type LogContext = { op: string }

function logServerError(err: AppError, ctx: LogContext): void
// Emits one console.error(JSON.stringify({ level, op, code, message, stack, timestamp })).
// No conditional logic — caller decided this entry is worth logging.

function withServerFn<A, R>(
  op: string,
  fn: (args: A) => Promise<R>,
): (args: A) => Promise<R>
// Wraps a server-fn handler.
// On throw: classify with toAppError, log if isUnexpectedError(code), re-throw the AppError.

function withApiHandler(
  op: string,
  fn: (ctx: { request: Request }) => Promise<Response>,
): (ctx: { request: Request }) => Promise<Response>
// Wraps an API handler.
// On throw: classify, log if isUnexpectedError(code), return errorResponse(message, httpStatusForCode(code), code).
```

The JSON shape emitted by `logServerError`:

```json
{
  "level": "error",
  "op": "server-fn:createServerCategory",
  "code": "INTERNAL",
  "message": "<English from AppError>",
  "stack": "<first ~2 KB of err.stack, or omitted>",
  "timestamp": "2026-05-20T12:34:56.789Z"
}
```

Stack is truncated to 2 KB to stay well under the per-invocation Workers log cap (256 KB) and to avoid pathological bundler-mangled stacks bloating output.

PII is **not** included — no request body, no validator input, no headers. Server log messages are in English (matching the existing `AppError` convention).

### `packages/shared/src/errors.ts` (extend)

Add and export:

```ts
const UNEXPECTED_CODES = new Set<AppErrorCode>([
  'INTERNAL', 'IMPORT_FAILED', 'EXPORT_FAILED', 'BAD_QUERY',
])

export function isUnexpectedError(code: AppErrorCode): boolean {
  return UNEXPECTED_CODES.has(code)
}
```

Re-export from `packages/shared/src/index.ts`.

User-caused codes (`DUPLICATE_NAME`, `VALIDATION`, `NOT_FOUND`, `INVALID_ID`) return `false` and are *not* logged. This is the lever that keeps logs signal-rich.

### `apps/web/src/server/api-helpers.ts` (extend)

Add:

```ts
export function httpStatusForCode(code: AppErrorCode): number
// DUPLICATE_NAME → 409
// VALIDATION | INVALID_ID | BAD_QUERY → 400
// NOT_FOUND → 404
// INTERNAL | IMPORT_FAILED | EXPORT_FAILED → 500
```

Used by `withApiHandler` to build a correct `errorResponse` without each call site picking a status.

## Migration

### Server fns (`apps/web/src/routes/categories.tsx`)

Before:

```ts
const createServerCategory = createServerFn({ method: 'POST' })
  .inputValidator(createCategorySchema)
  .handler(async ({ data }) => {
    try {
      const db = getDB()
      return await createCategory(db, data)
    } catch (e) {
      throw toAppError(e)
    }
  })
```

After:

```ts
const createServerCategory = createServerFn({ method: 'POST' })
  .inputValidator(createCategorySchema)
  .handler(withServerFn('server-fn:createServerCategory', async ({ data }) => {
    const db = getDB()
    return await createCategory(db, data)
  }))
```

`updateServerCategory` and `deleteServerCategory` get the same treatment. The previously-unwrapped `deleteServerCategory` now also benefits from `toAppError` classification at no extra cost.

### `/api/*` routes (12 files)

Before (`apps/web/src/routes/api/categories.ts`):

```ts
GET: async () => {
  try {
    const db = getDB()
    const categories = await getCategories(db)
    return jsonResponse(categories)
  } catch {
    return errorResponse('Failed to fetch categories', 500, 'INTERNAL')
  }
},
POST: async ({ request }) => {
  try {
    const body = await request.json()
    const parsed = createCategorySchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
    }
    const db = getDB()
    const category = await createCategory(db, parsed.data)
    return jsonResponse(category, 201)
  } catch (error) {
    if (toAppError(error).code === 'DUPLICATE_NAME') {
      return errorResponse('A category with this name already exists', 409, 'DUPLICATE_NAME')
    }
    return errorResponse('Failed to create category', 500, 'INTERNAL')
  }
},
```

After:

```ts
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
```

The `safeParse` branch still returns its own response (early return — never throws into the wrapper). The DUPLICATE_NAME branch is gone: the wrapper classifies and `httpStatusForCode('DUPLICATE_NAME')` returns 409. The implicit-500 catch is replaced by the wrapper logging the error and returning a 500.

The same shape applies to the remaining route files: `transactions.ts`, `transactions.$id.ts`, `recurring.ts`, `recurring.$id.ts`, `investments.ts`, `investments.$id.ts`, `categories.$id.ts`, `stats.monthly-summary.ts`, `stats.category-breakdown.ts`, `export.ts`, `import.ts`.

## Testing

### `apps/web/src/server/logger.test.ts` (new)

- `logServerError` emits a single `console.error` call with the documented JSON shape (spy on `console.error`).
- `logServerError` truncates `stack` over 2 KB.
- `withServerFn` returns the handler's resolved value when no throw.
- `withServerFn` re-throws the classified `AppError` when the handler throws.
- `withServerFn` does NOT call `console.error` for `DUPLICATE_NAME`, `VALIDATION`, `NOT_FOUND`, `INVALID_ID`.
- `withServerFn` DOES call `console.error` for `INTERNAL`, `IMPORT_FAILED`, `EXPORT_FAILED`, `BAD_QUERY`.
- `withApiHandler` returns the handler's `Response` when no throw.
- `withApiHandler` returns `errorResponse` with status 409 for `DUPLICATE_NAME`, 404 for `NOT_FOUND`, 500 for `INTERNAL`, 400 for `VALIDATION`.
- `withApiHandler` does NOT log for user-caused codes.

### `apps/web/src/i18n/app-error.test.ts` (extend)

- `isUnexpectedError` returns the expected boolean for every `AppErrorCode`.

### Out of scope for tests

- End-to-end test that a real DB outage produces a log line. Hard to fake on Workers without infrastructure; covered by manual `wrangler tail` smoke check.

## Invariants preserved

- `packages/shared` stays runtime-pure (no Workers-specific imports).
- `en.json` / `fr.json` key parity untouched (no new translation keys).
- Server messages remain English; client localization is unchanged.
- `toAppError` remains the single classification point.
- `AppError.cause` is still not used (the reason for that decision now has an explicit replacement: server-side logging).

## Open questions

None blocking. A few worth revisiting after the rollout lands:

- Whether to introduce a `requestId` field once we add real persistent logging (would need TanStack Start middleware to mint one per request).
- Whether `IMPORT_FAILED` should sometimes be user-caused (malformed CSV from the user) rather than always unexpected. Today the code path treats it as system-side; revisit if logs get noisy.
