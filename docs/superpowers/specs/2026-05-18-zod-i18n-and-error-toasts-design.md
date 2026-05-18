# Zod-message i18n + Error/Success Toasts — Design

**Date:** 2026-05-18 · **Status:** Approved (pending user spec review)

Closes the two narrower follow-ups recorded after PR #9 (error-i18n + multi-currency).
Builds on the i18n architecture in `docs/superpowers/specs/2026-05-16-i18n-design.md`
and `docs/superpowers/specs/2026-05-18-error-i18n-multicurrency-design.md`.

## Goals

1. **Localize zod default validation messages** for forms that bind the shared
   validators directly (`recurring-form`, `category-form`), without coupling
   `packages/shared` to web i18n.
2. **Surface server-mutation failures and successes** to the user via toasts,
   replacing the current silent `console.error`-only catch sites.

## Non-goals (locked scope)

- No changes to `packages/shared` (validators stay framework-agnostic, message-less).
- No server-function → error-`code` plumbing. App mutations call TanStack server
  functions, not `/api/*`; thrown errors may lack a `code`. `translateApiError`
  already degrades to a localized `error.generic` (never raw text). Richer
  propagation is a separate future task.
- No success toasts for non-mutations; no toasts for client-side parse/mapping
  failures (`import.tsx:303/340`) or `stats.tsx` read-fetch failures — those keep
  `console.error` only.
- `console.error` is retained at every site (debugging) in addition to toasts.
- `en.json`/`fr.json` keep identical key sets (parity test enforces this).

## Feature 1 — Localize zod default messages

### Problem

`recurring-form.tsx` and `category-form.tsx` use
`zodResolver(createRecurringRuleSchema)` / `zodResolver(createCategorySchema)`.
The shared schemas in `packages/shared/src/validators.ts` carry no custom
messages, so zod emits English defaults ("Required", "Expected number, received
nan", "Invalid") which render raw through the shared `FormMessage`.

### Approach: client-side locale-bound `ZodErrorMap` + `useZodResolver` hook

A `z.ZodErrorMap` is built from the active locale's `t` and passed to
`zodResolver` via its schema options. zod consults the errorMap **only when a
message is not explicitly set**, so explicit per-field keyed messages
(transaction-form/snapshot-form already have them) keep winning — applying the
errorMap to every form is safe and unifying.

**New files:**

- `apps/web/src/i18n/zod-error-map.ts` — `makeZodErrorMap(t: (k: string) => string): z.ZodErrorMap`.
  Maps by `issue.code`:
  - `invalid_type`: `received === 'undefined'` → `error.zod.required`;
    `received === 'nan'` → `error.zod.mustBeNumber`; else `error.zod.invalidType`
  - `too_small`: `type === 'string'` → (`minimum === 1` ? `error.zod.required`
    : `error.zod.tooShort`); else `error.zod.tooSmall`
  - `too_big`: `error.zod.tooBig`
  - `invalid_string`: `error.zod.invalidFormat`
  - default: `error.zod.invalid`

  Returns `{ message: t(key) }`. Pure; never throws.

- `apps/web/src/i18n/use-zod-resolver.ts` — `useZodResolver(schema)` reads `t`
  from `useTranslation()` and returns
  `zodResolver(schema, { errorMap: makeZodErrorMap(t) })`. Typed generically so
  it is a drop-in for `zodResolver(schema)`.

**Edits:** `recurring-form.tsx` and `category-form.tsx` swap
`resolver: zodResolver(<schema>)` → `resolver: useZodResolver(<schema>)`.
transaction-form/snapshot-form MAY also be switched for consistency (explicit
keyed messages still take precedence); doing so is in scope and low-risk but
optional — the plan will switch all four for uniform behavior.

**i18n keys added (both dicts):** `error.zod.required`,
`error.zod.mustBeNumber`, `error.zod.invalidType`, `error.zod.tooShort`,
`error.zod.tooSmall`, `error.zod.tooBig`, `error.zod.invalidFormat`,
`error.zod.invalid`.

**Rejected alternatives:** per-field keyed messages inside the shared schemas
(couples `packages/shared` to web i18n); form-level wrapper schemas duplicating
the shape (DRY violation).

## Feature 2 — Error/Success toasts (Sonner)

- Add `sonner` dependency to `apps/web`. Mount `<Toaster richColors closeButton />`
  once in `apps/web/src/routes/__root.tsx` inside `LocaleProvider`.
- **Mutation catch sites (in scope):** transaction create
  (`transactions_.new.tsx:44`), transaction update
  (`transactions_.$id.edit.tsx:67`), transaction delete (`transactions.tsx:120`),
  snapshot create (`investments.tsx:124`), snapshot delete
  (`investments.tsx:138`), recurring save (`recurring.tsx:138`), recurring delete
  (`recurring.tsx:152`), recurring toggle (`recurring.tsx:165`), category save
  (`categories.tsx:116`), category delete (`categories.tsx:130`), import action
  (`import.tsx:372`).
- Each such catch block: keep `console.error(...)`, add
  `toast.error(translateApiError(error, t))`.
- Each corresponding success path: add `toast.success(t('toast.<key>'))` where
  `<key>` ∈ {`created`, `updated`, `deleted`, `imported`} appropriate to the
  action. Specifics: recurring "toggle" → `updated`; the recurring and category
  "save" handlers are upserts — use `created` when adding a new record and
  `updated` when editing an existing one (the handler already knows which via
  the presence of an edit target / id).
- **Out of scope (unchanged):** `import.tsx:303` (parse file), `import.tsx:340`
  (process mapping), `stats.tsx:118/131` (read fetches), `api/*` server logs.

**i18n keys added (both dicts):** `toast.created`, `toast.updated`,
`toast.deleted`, `toast.imported`.

## Error handling

- `makeZodErrorMap` and the toast helpers never throw; unknown zod issue codes
  fall back to `error.zod.invalid`; errors without a `code` fall back through
  `translateApiError` to `error.generic`.
- Raw server/zod English text is never shown to users (toasts use
  `translateApiError`; fields use the errorMap keys).

## Testing

- `apps/web/src/i18n/zod-error-map.test.ts`: feed representative `ZodIssue`s
  (missing string → required; nan number → mustBeNumber; regex fail →
  invalidFormat; string `too_small` minimum 1 → required; number `too_small` →
  tooSmall; unknown code → invalid) and assert the resolved string equals
  `translate('en', '<expected key>')`.
- i18n parity test (`src/i18n/index.test.ts`) auto-covers the new keys.
- Existing suite (71) stays green; `pnpm typecheck`, `pnpm build`, drizzle- and
  route-drift guards pass.
- Toast rendering is imperative UI and not unit-tested; its localization logic is
  covered by the existing `translateApiError` tests plus the new errorMap tests.
  Manual EN/FR smoke: trigger a validation error in `recurring`/`category`
  forms and a failed + successful mutation in each entity.

## File structure

| File | Responsibility | Action |
|---|---|---|
| `apps/web/src/i18n/zod-error-map.ts` | locale-bound `ZodErrorMap` factory | Create |
| `apps/web/src/i18n/zod-error-map.test.ts` | errorMap unit tests | Create |
| `apps/web/src/i18n/use-zod-resolver.ts` | `useZodResolver` hook | Create |
| `apps/web/src/i18n/en.json` / `fr.json` | new `error.zod.*` + `toast.*` keys | Modify |
| `apps/web/src/routes/__root.tsx` | mount `<Toaster/>` | Modify |
| `apps/web/src/components/recurring/recurring-form.tsx` | use `useZodResolver` | Modify |
| `apps/web/src/components/categories/category-form.tsx` | use `useZodResolver` | Modify |
| `apps/web/src/components/transactions/transaction-form.tsx` | use `useZodResolver` | Modify |
| `apps/web/src/components/investments/snapshot-form.tsx` | use `useZodResolver` | Modify |
| Mutation route files (11 sites listed above) | add error/success toasts | Modify |
| `apps/web/package.json` | add `sonner` | Modify |
