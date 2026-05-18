# Error-message i18n + Multi-currency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localize all user-visible error/validation text (EN/FR) and add a global display-only currency selector (EUR/USD/GBP, default EUR).

**Architecture:** Server stays English and gains a typed `code` on error responses; the client maps `code` → translation key via a pure `translateApiError`. Form zod messages become stable keys translated at the single shared `FormMessage` render point. Currency mirrors the existing locale context: extra context field + `localStorage` + Settings `<Select>`, threaded into `formatMoney`.

**Tech Stack:** TanStack Start, React, react-hook-form + zodResolver, zod, shadcn/ui, vitest, Intl.NumberFormat.

**Spec:** `docs/superpowers/specs/2026-05-18-error-i18n-multicurrency-design.md`

**Commit author block** (local git has no user — established repo pattern; prepend to every `git commit`):
```bash
GIT_AUTHOR_NAME="Jérémie Néhlil" GIT_AUTHOR_EMAIL="jeremienehlil@MacBookPro.lan" \
GIT_COMMITTER_NAME="Jérémie Néhlil" GIT_COMMITTER_EMAIL="jeremienehlil@MacBookPro.lan" \
git commit -m "$(cat <<'EOF'
<subject>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Test command** (the `pnpm test` turbo wrapper intermittently dies on an RTK-proxy artifact — NOT a real failure; use this instead):
```bash
cd apps/web && pnpm exec vitest run <path>
```
Always `cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker` before any `git`/`pnpm typecheck`/`pnpm build` (cwd drifts to `apps/web` after those).

**Branch:** `feature/error-i18n-multicurrency` (already created; spec already committed).

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `packages/shared/src/errors.ts` | `AppErrorCode` enum + `appError()` helper — single source of truth | Create |
| `packages/shared/src/index.ts` | Re-export errors | Modify |
| `apps/web/src/server/api-helpers.ts` | `errorResponse` gains optional `code` | Modify |
| `apps/web/src/i18n/errors.ts` | Pure `translateApiError(error, t)` | Create |
| `apps/web/src/i18n/errors.test.ts` | Unit tests for `translateApiError` | Create |
| `apps/web/src/i18n/en.json` / `fr.json` | New `error.*` keys (parity-enforced) | Modify |
| `apps/web/src/components/ui/form.tsx` | `FormMessage` translates its body via `t()` | Modify |
| `apps/web/src/components/route-error.tsx` | Localized error + dev `<details>` | Modify |
| `apps/web/src/lib/format.ts` | `formatMoney(cents, locale, currency)` + context currency | Modify |
| `apps/web/src/lib/format.test.ts` | Currency matrix tests | Modify |
| `apps/web/src/i18n/index.ts` | Context holds `currency` + `setCurrency`, `Currency` type, `CURRENCIES` | Modify |
| `apps/web/src/routes/settings.tsx` | Currency `<Select>` card | Modify |
| Form schemas: `transaction-form.tsx`, `snapshot-form.tsx` + inline route schemas | zod messages → keys | Modify |
| `apps/web/src/routes/api/*.ts` | Pass `code` to `errorResponse` | Modify |

---

## Task 1: Currency type + context

**Files:**
- Modify: `apps/web/src/i18n/index.ts`

- [ ] **Step 1: Add `Currency` type, `CURRENCIES`, extend context**

In `apps/web/src/i18n/index.ts`, after the `export type Locale = 'en' | 'fr'` line add:

```ts
export type Currency = 'EUR' | 'USD' | 'GBP'

/** Selector options. EUR is the default (see design doc). */
export const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP']
```

Change `LocaleContextValue`:

```ts
interface LocaleContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  currency: Currency
  setCurrency: (c: Currency) => void
}
```

In `LocaleProvider`, add state + persistence mirroring the locale pattern. After the existing `const [locale, setLocaleState] = useState<Locale>(initial)`:

```ts
  const [currency, setCurrencyState] = useState<Currency>('EUR')
```

Add a post-mount effect next to the existing stored-locale effect:

```ts
  // Post-mount: a stored currency overrides the EUR default.
  useEffect(() => {
    const stored = localStorage.getItem('currency')
    if (stored === 'EUR' || stored === 'USD' || stored === 'GBP') {
      setCurrencyState(stored)
    }
  }, [])
```

Add the setter next to `setLocale`:

```ts
  function setCurrency(next: Currency) {
    setCurrencyState(next)
    localStorage.setItem('currency', next)
  }
```

Add `currency, setCurrency` to the Provider `value` object. In `useLocale()`'s returned `ctx` nothing changes (it returns the whole ctx). Leave `useTranslation` as-is.

- [ ] **Step 2: Typecheck**

Run: `cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker && pnpm typecheck`
Expected: PASS (no consumers of the new fields yet; context shape widened).

- [ ] **Step 3: Commit**

```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker
git add apps/web/src/i18n/index.ts
# author block + message: feat(i18n): add Currency type and currency context state
```

---

## Task 2: `formatMoney` takes a currency

**Files:**
- Modify: `apps/web/src/lib/format.ts`
- Test: `apps/web/src/lib/format.test.ts`

- [ ] **Step 1: Write failing tests**

Replace the body of `apps/web/src/lib/format.test.ts`'s first `describe('formatMoney', ...)` block with the currency matrix (keep the `formatDate` describe untouched):

```ts
import { describe, it, expect } from 'vitest'
import { formatMoney, formatDate } from './format'

describe('formatMoney', () => {
  it('formats USD for en', () => {
    expect(formatMoney(123456, 'en', 'USD')).toBe('$1,234.56')
    expect(formatMoney(0, 'en', 'USD')).toBe('$0.00')
  })
  it('formats EUR for en', () => {
    expect(formatMoney(1234, 'en', 'EUR')).toBe('€12.34')
  })
  it('formats GBP for en', () => {
    expect(formatMoney(1234, 'en', 'GBP')).toBe('£12.34')
  })
  it('formats EUR for fr with locale grouping and trailing symbol', () => {
    const out = formatMoney(123456, 'fr', 'EUR')
    // fr-FR: comma decimal, U+202F grouping, trailing € (ICU-version stable parts)
    expect(out).toContain('1 234')
    expect(out).toContain(',56')
    expect(out).toContain('€')
  })
  it('formats USD for fr', () => {
    const out = formatMoney(123456, 'fr', 'USD')
    expect(out).toContain('1 234')
    expect(out).toContain(',56')
  })
})
```

- [ ] **Step 2: Run — verify it fails**

Run: `cd apps/web && pnpm exec vitest run src/lib/format.test.ts`
Expected: FAIL — `formatMoney` currently takes 2 args; `'USD'` hardcoded so EUR/GBP assertions fail / TS arity error.

- [ ] **Step 3: Implement**

In `apps/web/src/lib/format.ts`, import `Currency` and change `formatMoney`:

```ts
import { useTranslation, useLocale, type Locale, type Currency } from '~/i18n'

// ...

export function formatMoney(
  cents: number,
  locale: Locale,
  currency: Currency,
): string {
  return new Intl.NumberFormat(TAGS[locale], {
    style: 'currency',
    currency,
  }).format(cents / 100)
}
```

Update the JSDoc above `formatMoney` to drop the "hardcoded to USD" note and say currency is supplied by the caller (default sourced from context). Change `useFormat()`:

```ts
export function useFormat() {
  const { locale, currency } = useLocale()
  return {
    formatMoney: (cents: number) => formatMoney(cents, locale, currency),
    formatDate: (iso: string) => formatDate(iso, locale),
  }
}
```

(Note: switch the hook to `useLocale()` since it now needs `currency` too; `useLocale` returns the full context.)

- [ ] **Step 4: Run — verify pass**

Run: `cd apps/web && pnpm exec vitest run src/lib/format.test.ts`
Expected: PASS (all formatMoney + formatDate tests).

- [ ] **Step 5: Typecheck (catches every `formatMoney`/`useFormat` caller)**

Run: `cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker && pnpm typecheck`
Expected: May FAIL if any code calls `formatMoney(x, locale)` directly. `useFormat()` consumers are unaffected (same returned API). Fix any direct `formatMoney` callers by passing a currency (search: `grep -rn "formatMoney(" apps/web/src --include=*.tsx --include=*.ts | grep -v format.ts`). Re-run until PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker
git add apps/web/src/lib/format.ts apps/web/src/lib/format.test.ts
# + any caller files touched
# feat(i18n): thread currency through formatMoney/useFormat
```

---

## Task 3: Currency selector in Settings

**Files:**
- Modify: `apps/web/src/routes/settings.tsx`
- Modify: `apps/web/src/i18n/en.json`, `apps/web/src/i18n/fr.json`

- [ ] **Step 1: Add i18n keys (both dicts, identical key set)**

Add to `apps/web/src/i18n/en.json`:
```json
"settings.currency.title": "Currency",
"settings.currency.description": "Currency used to display all amounts."
```
Add to `apps/web/src/i18n/fr.json`:
```json
"settings.currency.title": "Devise",
"settings.currency.description": "Devise utilisée pour afficher tous les montants."
```
(Insert near the existing `settings.language.*` keys to keep the files readable. JSON key order does not matter to the parity test — it compares sorted key sets.)

- [ ] **Step 2: Add the Currency card**

In `apps/web/src/routes/settings.tsx`, update the import to pull `useLocale` (already imported), `CURRENCIES`, and `type Currency`:

```ts
import { useTranslation, useLocale, type Locale, type Currency } from '~/i18n'
import { CURRENCIES } from '~/i18n'
```

In `SettingsPage`, extend the destructure:

```ts
  const { locale, setLocale, currency, setCurrency } = useLocale()
```

Insert this `<Card>` immediately after the Language `</Card>` (line ~56) and before the Export `<Card>`:

```tsx
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.currency.title')}</CardTitle>
          <CardDescription>{t('settings.currency.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={currency}
            onValueChange={(v) => setCurrency(v as Currency)}
          >
            <SelectTrigger className="w-48" aria-label={t('settings.currency.title')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
```

- [ ] **Step 3: Parity test + typecheck**

Run: `cd apps/web && pnpm exec vitest run src/i18n/index.test.ts`
Expected: PASS (en/fr key sets still identical, count +2).
Run: `cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker && pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker
git add apps/web/src/routes/settings.tsx apps/web/src/i18n/en.json apps/web/src/i18n/fr.json
# feat(i18n): add currency selector to settings
```

---

## Task 4: Shared error-code module

**Files:**
- Create: `packages/shared/src/errors.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create the module**

`packages/shared/src/errors.ts`:

```ts
export type AppErrorCode =
  | 'NOT_FOUND'
  | 'INVALID_ID'
  | 'VALIDATION'
  | 'DUPLICATE_NAME'
  | 'INTERNAL'
  | 'IMPORT_FAILED'
  | 'EXPORT_FAILED'
  | 'BAD_QUERY'

export interface AppErrorBody {
  error: string
  code: AppErrorCode
}

/** Build a stable, machine-readable error body. `message` stays English. */
export function appError(message: string, code: AppErrorCode): AppErrorBody {
  return { error: message, code }
}
```

- [ ] **Step 2: Re-export**

In `packages/shared/src/index.ts`, add (match the file's existing export style — likely `export * from './errors'`):

```ts
export * from './errors'
```

- [ ] **Step 3: Typecheck**

Run: `cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker && pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker
git add packages/shared/src/errors.ts packages/shared/src/index.ts
# feat(errors): add shared AppErrorCode enum
```

---

## Task 5: `translateApiError` (pure, tested)

**Files:**
- Create: `apps/web/src/i18n/errors.ts`
- Create: `apps/web/src/i18n/errors.test.ts`
- Modify: `apps/web/src/i18n/en.json`, `apps/web/src/i18n/fr.json`

- [ ] **Step 1: Add error i18n keys (both dicts)**

Add to `en.json`:
```json
"error.generic": "Something went wrong. Please try again.",
"error.code.NOT_FOUND": "The requested item was not found.",
"error.code.INVALID_ID": "That identifier is not valid.",
"error.code.VALIDATION": "Some of the information provided is invalid.",
"error.code.DUPLICATE_NAME": "An item with this name already exists.",
"error.code.INTERNAL": "Something went wrong on our side. Please try again.",
"error.code.IMPORT_FAILED": "The import could not be completed.",
"error.code.EXPORT_FAILED": "The export could not be completed.",
"error.code.BAD_QUERY": "The request parameters are invalid."
```
Add to `fr.json`:
```json
"error.generic": "Une erreur s'est produite. Veuillez réessayer.",
"error.code.NOT_FOUND": "L'élément demandé est introuvable.",
"error.code.INVALID_ID": "Cet identifiant n'est pas valide.",
"error.code.VALIDATION": "Certaines informations fournies sont invalides.",
"error.code.DUPLICATE_NAME": "Un élément portant ce nom existe déjà.",
"error.code.INTERNAL": "Une erreur interne s'est produite. Veuillez réessayer.",
"error.code.IMPORT_FAILED": "L'import n'a pas pu être effectué.",
"error.code.EXPORT_FAILED": "L'export n'a pas pu être effectué.",
"error.code.BAD_QUERY": "Les paramètres de la requête sont invalides."
```

- [ ] **Step 2: Write failing tests**

`apps/web/src/i18n/errors.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { translateApiError } from './errors'
import { translate } from './index'

// Bind the real translator at locale 'en' for assertions.
const t = (k: string) => translate('en', k)

describe('translateApiError', () => {
  it('maps a known code to its key', () => {
    expect(translateApiError({ code: 'NOT_FOUND' }, t)).toBe(
      translate('en', 'error.code.NOT_FOUND'),
    )
  })
  it('reads code off an Error with a code property', () => {
    const e = Object.assign(new Error('raw db text'), { code: 'INTERNAL' })
    expect(translateApiError(e, t)).toBe(translate('en', 'error.code.INTERNAL'))
  })
  it('falls back to generic for an unknown code', () => {
    expect(translateApiError({ code: 'NOPE' }, t)).toBe(
      translate('en', 'error.generic'),
    )
  })
  it('falls back to generic when there is no code', () => {
    expect(translateApiError(new Error('boom'), t)).toBe(
      translate('en', 'error.generic'),
    )
  })
  it('handles non-object input without throwing', () => {
    expect(translateApiError('a string', t)).toBe(translate('en', 'error.generic'))
    expect(translateApiError(undefined, t)).toBe(translate('en', 'error.generic'))
  })
})
```

- [ ] **Step 3: Run — verify it fails**

Run: `cd apps/web && pnpm exec vitest run src/i18n/errors.test.ts`
Expected: FAIL — `./errors` module not found.

- [ ] **Step 4: Implement**

`apps/web/src/i18n/errors.ts`:

```ts
import type { AppErrorCode } from '@tracker/shared'

const KNOWN: readonly AppErrorCode[] = [
  'NOT_FOUND', 'INVALID_ID', 'VALIDATION', 'DUPLICATE_NAME',
  'INTERNAL', 'IMPORT_FAILED', 'EXPORT_FAILED', 'BAD_QUERY',
]

function extractCode(error: unknown): AppErrorCode | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const c = (error as { code: unknown }).code
    if (typeof c === 'string' && (KNOWN as readonly string[]).includes(c)) {
      return c as AppErrorCode
    }
  }
  return undefined
}

/**
 * Localize an error for display. Reads a stable `code` if present and maps
 * it to `error.code.<CODE>`; otherwise returns the generic message. Never
 * throws and never returns raw server text.
 */
export function translateApiError(
  error: unknown,
  t: (key: string) => string,
): string {
  const code = extractCode(error)
  return code ? t(`error.code.${code}`) : t('error.generic')
}
```

- [ ] **Step 5: Run — verify pass + parity**

Run: `cd apps/web && pnpm exec vitest run src/i18n/errors.test.ts src/i18n/index.test.ts`
Expected: PASS (both — parity still equal, count +10).

- [ ] **Step 6: Commit**

```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker
git add apps/web/src/i18n/errors.ts apps/web/src/i18n/errors.test.ts apps/web/src/i18n/en.json apps/web/src/i18n/fr.json
# feat(i18n): add translateApiError + error message keys
```

---

## Task 6: Localize `route-error.tsx`

**Files:**
- Modify: `apps/web/src/components/route-error.tsx`

- [ ] **Step 1: Replace raw message with localized text + dev details**

Rewrite `apps/web/src/components/route-error.tsx`:

```tsx
import { Button } from '~/components/ui/button'
import { useTranslation } from '~/i18n'
import { translateApiError } from '~/i18n/errors'

export function RouteError({ error }: { error: Error }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-center p-12">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">
          {t('error.title')}
        </h2>
        <p className="text-muted-foreground">{translateApiError(error, t)}</p>
        {import.meta.env.DEV && error?.message && (
          <details className="text-left text-xs text-muted-foreground">
            <summary>Details (dev only)</summary>
            <pre className="whitespace-pre-wrap">{error.message}</pre>
          </details>
        )}
        <Button onClick={() => window.location.reload()}>
          {t('error.tryAgain')}
        </Button>
      </div>
    </div>
  )
}
```

(`error.title` / `error.tryAgain` already exist in both dicts from the prior i18n work — no key changes here.)

- [ ] **Step 2: Typecheck + build**

Run: `cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker && pnpm typecheck && pnpm build`
Expected: PASS (`import.meta.env.DEV` is valid under Vite).

- [ ] **Step 3: Commit**

```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker
git add apps/web/src/components/route-error.tsx
# feat(i18n): localize route error boundary, hide raw text behind dev details
```

---

## Task 7: Translate form validation messages

**Files:**
- Modify: `apps/web/src/components/ui/form.tsx`
- Modify: `apps/web/src/components/transactions/transaction-form.tsx`
- Modify: `apps/web/src/components/investments/snapshot-form.tsx`
- Modify: `apps/web/src/i18n/en.json`, `apps/web/src/i18n/fr.json`

- [ ] **Step 1: Add form-message keys (both dicts)**

Add to `en.json`:
```json
"error.form.amountRequired": "Amount is required",
"error.form.positiveNumber": "Must be a positive number",
"error.form.validDate": "Valid date required",
"error.form.totalValueRequired": "Total value is required"
```
Add to `fr.json`:
```json
"error.form.amountRequired": "Le montant est requis",
"error.form.positiveNumber": "Doit être un nombre positif",
"error.form.validDate": "Date valide requise",
"error.form.totalValueRequired": "La valeur totale est requise"
```

- [ ] **Step 2: Translate at the single shared render point**

In `apps/web/src/components/ui/form.tsx`, `FormMessage` (around line 143). Add the translation import at top of file:

```ts
import { useTranslation } from '~/i18n'
```

Inside `FormMessage`, after `const { error, formMessageId } = useFormField()`:

```ts
  const { t } = useTranslation()
  const raw = error ? String(error?.message ?? '') : children
  // Messages are i18n keys; translate() falls back to the key itself for
  // any non-key string, so plain literals still render unchanged.
  const body = typeof raw === 'string' && raw ? t(raw) : raw
```

Replace the existing `const body = ...` line with the above (remove the old `body` definition). Keep the `if (!body) return null` and the `<p>` render using `body`.

- [ ] **Step 3: Swap literals for keys in transaction-form**

In `apps/web/src/components/transactions/transaction-form.tsx`, change the schema messages:

```ts
const transactionFormSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.string().min(1, 'error.form.amountRequired').refine(
    (val) => {
      const num = parseFloat(val)
      return !isNaN(num) && num > 0
    },
    { message: 'error.form.positiveNumber' },
  ),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'error.form.validDate'),
  categoryId: z.string().optional(),
})
```

- [ ] **Step 4: Swap literals for keys in snapshot-form**

In `apps/web/src/components/investments/snapshot-form.tsx`:
- Line ~20: `totalValue: z.string().min(1, 'error.form.totalValueRequired'),`
- Line ~53: `form.setError('totalValue', { message: 'error.form.positiveNumber' })`

- [ ] **Step 5: Sweep for any remaining literal form messages**

Run: `grep -rn "\.min(1, '\|message: '\|regex([^,]*, '" apps/web/src/components apps/web/src/routes --include=*.tsx`
For every human-readable literal still used as a zod/`setError` message, add a key to BOTH dicts (`error.form.<camelCase>`) and replace the literal. Do not translate user data or non-message strings.

- [ ] **Step 6: Parity + typecheck + targeted test**

Run: `cd apps/web && pnpm exec vitest run src/i18n/index.test.ts`
Expected: PASS (en/fr equal, count grew by the added keys).
Run: `cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker && pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker
git add apps/web/src/components/ui/form.tsx apps/web/src/components/transactions/transaction-form.tsx apps/web/src/components/investments/snapshot-form.tsx apps/web/src/i18n/en.json apps/web/src/i18n/fr.json
# feat(i18n): translate form validation messages via shared FormMessage
```

---

## Task 8: Wire error codes into the API surface

**Files:**
- Modify: `apps/web/src/server/api-helpers.ts`
- Modify: all `apps/web/src/routes/api/*.ts` that call `errorResponse`

- [ ] **Step 1: Extend `errorResponse` (backward-compatible)**

`apps/web/src/server/api-helpers.ts`:

```ts
import type { AppErrorCode } from '@tracker/shared'

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function errorResponse(
  message: string,
  status = 400,
  code?: AppErrorCode,
) {
  return new Response(JSON.stringify({ error: message, ...(code && { code }) }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 2: Add codes at every call site**

Enumerate call sites: `grep -rn "errorResponse(" apps/web/src/routes/api`. Apply this mapping (message text unchanged — only add the 3rd arg):

| Message pattern | code |
|---|---|
| `Invalid * ID` | `'INVALID_ID'` |
| `* not found` | `'NOT_FOUND'` |
| `A category with this name already exists` | `'DUPLICATE_NAME'` |
| `Failed to import transactions` | `'IMPORT_FAILED'` |
| `Failed to build export` | `'EXPORT_FAILED'` |
| `Failed to fetch/create/update/delete *` | `'INTERNAL'` |
| `month must be * / year must be *` | `'BAD_QUERY'` |
| `parsed.error.issues[0].message` | `'VALIDATION'` |

Example transforms:
```ts
return errorResponse('Transaction not found', 404, 'NOT_FOUND')
return errorResponse('Invalid transaction ID', 400, 'INVALID_ID')
return errorResponse('Failed to update transaction', 500, 'INTERNAL')
return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
return errorResponse('A category with this name already exists', 409, 'DUPLICATE_NAME')
```
(Keep existing status codes; only add the `DUPLICATE_NAME` status as-is if it was already set — do not change statuses.)

- [ ] **Step 3: Typecheck + build**

Run: `cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker && pnpm typecheck && pnpm build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker
git add apps/web/src/server/api-helpers.ts apps/web/src/routes/api
# feat(errors): attach stable error codes to API responses
```

---

## Task 9: Full CI matrix + ship

**Files:** none (verification + PR)

- [ ] **Step 1: Full local CI matrix**

```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker
pnpm typecheck && pnpm build && \
pnpm --filter @tracker/db db:generate && \
git diff --quiet -- packages/db/drizzle && echo "drizzle OK" && \
git diff --quiet -- apps/web/src/routeTree.gen.ts apps/web/src/routes && echo "route OK"
```
Expected: all pass, `drizzle OK`, `route OK`. (No schema or route changes in this plan — `route OK` should hold; api files under `routes/api` are not route-tree pages. If `route OK` fails, inspect the diff — only `routeTree.gen.ts` regeneration would be unexpected here.)

- [ ] **Step 2: Full test suite**

Run: `cd apps/web && pnpm exec vitest run`
Expected: all suites green — prior 63 + new `errors.test.ts` (5) + expanded `format.test.ts`; i18n parity 7/7 with the grown key count.

- [ ] **Step 3: Manual EN/FR/currency smoke (optional but recommended)**

Start dev server. In Settings: switch currency EUR↔USD↔GBP and confirm all amounts reformat; switch language and confirm error/validation text localizes. Trigger a form validation error (empty amount) in both locales. (If dev server 500s with "no such table", re-apply local D1 migrations — see the prior i18n handoff for the exact `wrangler d1 execute` commands.)

- [ ] **Step 4: Push + PR**

```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker
git push -u origin feature/error-i18n-multicurrency   # if creds error: gh auth setup-git, then retry
gh pr create --base master --head feature/error-i18n-multicurrency \
  --title "feat(i18n): error-message i18n + multi-currency" \
  --body "<summary of both features; link the spec; restate locked scope: server English, code-keyed client mapping, global display-only currency default EUR, swallowed-mutation-error UX is a tracked follow-up>"
```

- [ ] **Step 5: CI green → merge (preserve history, do NOT squash)**

```bash
gh pr checks <N>    # poll until ci + GitGuardian pass
gh pr merge <N> --merge
git checkout master && git pull --ff-only origin master && git branch -d feature/error-i18n-multicurrency
```

---

## Self-Review

**Spec coverage:**
- Error i18n / client form validation → Tasks 5–7 (keys, FormMessage, schema literals→keys). ✔
- Error i18n / server code contract (B1) → Tasks 4, 8 (`appError`/`AppErrorCode`, `errorResponse` code, call sites). ✔
- `translateApiError` pure + tested → Task 5. ✔
- `route-error.tsx` localized + dev `<details>` → Task 6. ✔
- Multi-currency context + persistence (default EUR) → Task 1. ✔
- `formatMoney(cents, locale, currency)` → Task 2. ✔
- Settings currency `<Select>` → Task 3. ✔
- Testing: `translateApiError` cases, parity growth, formatMoney matrix, full suite/CI → Tasks 5, 2, 3, 9. ✔
- Non-goals respected: no FX/no per-tx currency/no migration (no schema task); swallowed-mutation-error UX explicitly deferred (not a task; restated in PR body Task 9). ✔

**Placeholder scan:** No TBD/TODO; every code step shows full code; the only `<...>` is the PR body prose in Task 9 (intentional author judgement, not a code placeholder).

**Type consistency:** `AppErrorCode` (Task 4) used identically in `errors.ts` (Task 5), `api-helpers.ts` (Task 8). `Currency`/`CURRENCIES` (Task 1) consumed in `format.ts` (Task 2) and `settings.tsx` (Task 3). `translateApiError(error, t)` signature consistent across Task 5 (def/tests) and Task 6 (use). `formatMoney(cents, locale, currency)` consistent Task 2 ↔ test. No drift found.
