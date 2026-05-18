# Server-Function Error-Code Propagation — Design

**Date:** 2026-05-18 · **Status:** Approved (pending user spec review)

Closes the final deferred i18n item recorded after PR #10: app mutations call
TanStack **server functions** (not `/api/*`), and thrown errors lack a stable
`code`, so `translateApiError` always degrades to the localized generic message.
Builds on `packages/shared/src/errors.ts` (`AppErrorCode`, `appError`,
`AppErrorBody`) and the client `translateApiError` from PR #9.

## Goal

Make a server-function failure carry a stable `AppErrorCode` across the RPC
boundary so the existing client `toast.error(translateApiError(error, t))`
shows a **specific** localized message for the one genuinely-classifiable,
high-value case: a duplicate unique-name (`DUPLICATE_NAME`).

## Non-goals (locked scope)

- **`NOT_FOUND` for server-fn mutations is out of scope.** Drizzle
  `update`/`delete` on a missing id affects 0 rows and does not throw;
  detecting it requires adding existence checks across the domain layer — the
  "full propagation" scope that was explicitly declined. Update/delete of a
  missing record stays localized-generic (unchanged).
- No new transport/serialization plumbing (seroval already preserves Error
  own-properties — see Risk).
- No client-side changes (the client already reads `error.code` via
  `translateApiError`).
- No result-object refactor; handlers keep throwing.
- No new i18n keys (`error.code.DUPLICATE_NAME` exists from PR #9).
- Only the duplicated UNIQUE-detection in `/api/categories.ts` is consolidated;
  other `/api/*` files are not touched.

## Mechanism

TanStack Start 1.166.4 serializes thrown handler errors with **seroval 1.5.1**.
Verified in source (`seroval/dist/esm/development/index.mjs` `getErrorOptions`):
it copies every own property of an `Error` except `name`/`message` (and `stack`
behind a feature flag). Therefore an `Error` subclass with an own enumerable
`code` property arrives on the client with `code` intact, and the existing
`translateApiError` (`extractCode` reads `'code' in error`) maps it — with zero
client changes.

## Components

### 1. `packages/shared/src/errors.ts` (extend)

```ts
export class AppError extends Error {
  readonly code: AppErrorCode
  constructor(code: AppErrorCode, message: string) {
    super(message)
    this.code = code      // own enumerable property -> seroval preserves it
    this.name = 'AppError'
  }
}

/**
 * Single source of truth for classifying an unknown thrown value into an
 * AppError. Reuses the UNIQUE-constraint signal already proven in the
 * /api routes. Never throws.
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error
  if (error instanceof Error) {
    if (error.message.includes('UNIQUE')) {
      return new AppError('DUPLICATE_NAME', error.message)
    }
    return new AppError('INTERNAL', error.message)
  }
  return new AppError('INTERNAL', 'Unknown error')
}
```

`AppErrorCode`, `appError`, `AppErrorBody`, `APP_ERROR_CODES` stay as-is.

### 2. Server-function handlers (scope: category create/update)

`categories.name` is the `.unique()` column whose collision produces a
user-facing "name already exists". Wrap the two handlers so the raw error is
classified at the throw site:

```ts
.handler(async ({ data }) => {
  try {
    const db = getDB()
    return createCategory(db, data)
  } catch (e) {
    throw toAppError(e)
  }
})
```

Same shape for `updateServerCategory`. No other server-fn handlers are
modified — their failures remain localized-generic (unchanged behaviour).

### 3. `/api/categories.ts` consolidation (DRY)

Replace the hand-rolled
`if (error instanceof Error && error.message.includes('UNIQUE')) …` in the POST
(and PUT, if present) catch with the shared classifier so detection lives in
one place:

```ts
} catch (error) {
  const code = toAppError(error).code
  if (code === 'DUPLICATE_NAME') {
    return errorResponse('A category with this name already exists', 409, 'DUPLICATE_NAME')
  }
  return errorResponse('Failed to create category', 500, 'INTERNAL')
}
```

Message text and HTTP statuses unchanged (preserves the `/api` contract and
its PR #9 behaviour). Only `apps/web/src/routes/api/categories.ts` is touched;
other `/api/*` files keep their explicit codes untouched.

## Data flow

```
createCategory() SQLite UNIQUE error
  -> server-fn handler catch -> throw toAppError(e)  // AppError code=DUPLICATE_NAME
  -> seroval serializes (own `code` preserved)
  -> client handleSave catch (UNCHANGED)
  -> toast.error(translateApiError(error, t))
  -> t('error.code.DUPLICATE_NAME')  (localized EN/FR)
```

## Error handling

- `toAppError` is total: `AppError` pass-through, `Error` → DUPLICATE_NAME or
  INTERNAL, non-Error → INTERNAL. Never throws.
- Unknown/unclassified failures still reach the client as `INTERNAL` →
  `translateApiError` → `error.code.INTERNAL` (localized) — never raw text.
- Existing `console.error` at client catch sites is retained (debugging).

## Testing

- `packages/shared` has **no test runner**; shared code is unit-tested from
  `apps/web`'s vitest (as `apps/web/src/i18n/errors.test.ts` already does,
  importing `@tracker/shared`). New tests live at
  `apps/web/src/i18n/app-error.test.ts`, importing `{ AppError, toAppError }`
  from `@tracker/shared`.
- `toAppError`: existing `AppError` pass-through; `new Error('… UNIQUE
  constraint failed …')` → `DUPLICATE_NAME`; generic `new Error('boom')` →
  `INTERNAL`; non-Error (`'x'`, `undefined`, `null`) → `INTERNAL`.
- `AppError` shape contract test:
  `Object.getOwnPropertyNames(new AppError('INTERNAL','m'))` includes `'code'`
  (the seroval-survival invariant) and `e instanceof Error` is true.
- Existing 80 web tests stay green; i18n parity unaffected (no new keys).
- `pnpm typecheck`, `pnpm build`, drizzle- and routeTree-drift guards pass.
- Manual smoke: create a category with an existing name, in FR and EN →
  toast shows the localized DUPLICATE_NAME message, not the generic one;
  duplicate via the `/api` route still returns the same 409 body as before.

## Risk

Single dependency: seroval preserving Error own-props. Mitigated by (a) source
verification in seroval 1.5.1, (b) the explicit own-property contract test,
(c) graceful degradation — if a future serializer dropped `code`, the client
would fall back to the localized generic message (today's behaviour), never
raw text. No new package added.

## File structure

| File | Responsibility | Action |
|---|---|---|
| `packages/shared/src/errors.ts` | `AppError` class + `toAppError` classifier | Modify |
| `apps/web/src/i18n/app-error.test.ts` | `toAppError` + `AppError` shape tests (vitest; `packages/shared` has no runner) | Create |
| `apps/web/src/routes/categories.tsx` | wrap create/update server-fn handlers | Modify |
| `apps/web/src/routes/api/categories.ts` | use shared classifier (DRY) | Modify |
