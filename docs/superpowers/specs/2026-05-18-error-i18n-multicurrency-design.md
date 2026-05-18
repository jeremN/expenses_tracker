# Error-message i18n + Multi-currency — Design

**Date:** 2026-05-18 · **Status:** Approved (pending user spec review)

Resolves the two follow-ups deferred by the i18n project (PR #8). See
`docs/superpowers/specs/2026-05-16-i18n-design.md` for the base i18n architecture
this builds on.

## Goals

1. **Error-message i18n** — user-visible error and validation text is localized
   (EN/FR), consistent with the rest of the UI.
2. **Multi-currency** — a global, display-only currency selector (EUR/USD/GBP),
   replacing the hardcoded `'USD'` in `formatMoney`.

## Non-goals (locked scope)

- No FX conversion, no per-transaction currency, no DB column, no migration.
- Server/API code stays English; localization happens only at the client boundary.
- App-UI mutation errors that are currently swallowed (`console.error` only, not
  shown to the user) are **not** rewired here — that is a UX gap, tracked as a
  follow-up below, not i18n work.
- `fr.json` wording stays v1-anchored; the user has final say post-merge.

## Feature 1 — Error-message i18n

### Landscape (as found)

- **Client form validation:** zod schemas in form components / route files use
  literal English messages (`'Amount is required'`, `'Must be a positive number'`,
  `'Valid date required'`, etc.). These are the common, always-visible case.
- **`/api/*` REST routes:** return `{ error: message }` JSON via
  `errorResponse(message, status)` with a finite, structured set of ~33 strings
  (e.g. `'Transaction not found'` 404, `'Invalid transaction ID'` 400,
  `'Failed to update transaction'` 500, zod `issues[0].message` 400). This is a
  programmatic API surface.
- **`route-error.tsx`:** the React error boundary; currently renders
  `error.message` raw.
- **App-UI mutations:** call TanStack Start server functions; errors are mostly
  swallowed today (`console.error`, not surfaced). Out of scope (see Non-goals).

### Approach

**A1 — Client form validation: messages-as-keys, translate at render.**
zod schemas keep module scope and purity; their `message` becomes a stable key
(e.g. `'error.form.amountRequired'`). The field-error display passes the key
through `t()`. No React coupling in schemas; schemas stay unit-testable; single
render-time translation point. (Rejected: building schemas inside components with
`t` injected — recreated per render, harder to test; zod global `errorMap` —
obscure, fights existing per-field literals.)

**B1 — Server/API: stable error code in the contract.**
Introduce a typed error-code enum so client localization keys off a code, not a
brittle English-string match.

- `packages/shared/src/errors.ts` (new):
  ```ts
  export type AppErrorCode =
    | 'NOT_FOUND' | 'INVALID_ID' | 'VALIDATION' | 'DUPLICATE_NAME'
    | 'INTERNAL' | 'IMPORT_FAILED' | 'EXPORT_FAILED' | 'BAD_QUERY'
  export interface AppError { error: string; code: AppErrorCode }
  export function appError(message: string, code: AppErrorCode): AppError
  ```
- `apps/web/src/server/api-helpers.ts`: `errorResponse(message, status, code?)`
  — `code` is optional and additive to the JSON body. Existing callers keep
  working unchanged; codes are added incrementally to every call site as part of
  implementation. Body shape: `{ error: string, code?: AppErrorCode }`.
- `apps/web/src/i18n/errors.ts` (new): `translateApiError(error, t)` — pure,
  never throws, defensively narrows `unknown`. If a code is present →
  `t('error.code.<CODE>')`; otherwise → `t('error.generic')`. Raw text is never
  shown to users.
- `route-error.tsx`: render `translateApiError(error, t)`; the raw
  `error.message` moves into a `<details>` dev affordance (not the primary text).

### i18n keys added (both en.json and fr.json — parity-enforced)

- `error.generic`
- `error.code.NOT_FOUND`, `error.code.INVALID_ID`, `error.code.VALIDATION`,
  `error.code.DUPLICATE_NAME`, `error.code.INTERNAL`,
  `error.code.IMPORT_FAILED`, `error.code.EXPORT_FAILED`,
  `error.code.BAD_QUERY`
- `error.form.amountRequired`, `error.form.positiveNumber`,
  `error.form.validDate`, `error.form.nameRequired`, plus any other literal
  form messages discovered during implementation (each added to both dicts).

## Feature 2 — Multi-currency

Global, display-only. Default **EUR**; options **EUR, USD, GBP**.

- `apps/web/src/i18n/index.ts`: extend the existing locale context to also hold
  `currency: Currency` and `setCurrency`, persisted to `localStorage` under key
  `'currency'`, default `'EUR'`. Reuses the proven locale provider pattern
  (post-mount `localStorage` override, no SSR header — there is no
  `Accept-Currency` equivalent) rather than adding a parallel provider.
- `apps/web/src/lib/format.ts`: signature becomes
  `formatMoney(cents, locale, currency)`; `useFormat()` sources `currency` from
  context. The hardcoded `'USD'` is the only behavioral change point.
- Settings: add a Currency `<Select>` card mirroring the Language card,
  including the screen-reader labelling pattern from commit `4e5eb8f`.
- `Currency = 'EUR' | 'USD' | 'GBP'`; a `CURRENCIES` constant drives the
  selector options.

**Behavioral note:** default EUR changes today's USD display. There is no stored
per-amount currency to preserve (amounts are bare integer cents), so existing
data simply renders in the selected currency. Acceptable and intended.

## Error handling

- Missing/unknown error code → `t('error.generic')`. Raw text only in a dev
  `<details>`, never as primary user-facing text.
- `translateApiError` is total: handles `Error`, plain objects with `code`,
  strings, and `unknown` without throwing.

## Testing

- `translateApiError`: unit tests for known code, unknown code, absent code,
  and non-Error input.
- i18n parity test (existing `src/i18n/index.test.ts`): continues to enforce
  identical EN/FR key sets; expected key count grows from 204 by ~15–20.
- `formatMoney`: extend `src/lib/format.test.ts` with the
  {EUR,USD,GBP} × {en,fr} matrix (e.g. `fr`+`EUR` → `12,34 €`,
  `en`+`USD` → `$12.34`, `en`+`GBP` → `£12.34`).
- Full existing suite (63 tests) stays green; `pnpm typecheck`, `pnpm build`,
  drizzle-drift and route-tree-drift guards all pass (CI matrix unchanged).

## Tracked follow-ups (not built here)

- **Swallowed mutation-error UX:** the `console.error`-only catch sites in route
  components do not surface errors to the user. Translating them has no visible
  effect until they are surfaced. Surfacing them (toasts/inline) is a separate
  UX task; the i18n infra built here (`translateApiError`) is ready for it.
