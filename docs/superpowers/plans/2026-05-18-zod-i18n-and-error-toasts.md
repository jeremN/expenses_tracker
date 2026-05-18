# Zod-message i18n + Error/Success Toasts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localize zod default validation messages via a locale-bound errorMap, and surface server-mutation failures/successes through Sonner toasts.

**Architecture:** A pure `makeZodErrorMap(t)` maps zod issue codes → `error.zod.*` i18n keys; a `useZodResolver(schema)` hook injects it into `zodResolver` (shared validators untouched; explicit keyed messages still win). Sonner's `<Toaster/>` mounts once in `__root`; each in-scope mutation catch site keeps `console.error` and adds `toast.error(translateApiError(error, t))`, each success path adds `toast.success(t('toast.<key>'))`.

**Tech Stack:** zod v3, @hookform/resolvers v5, react-hook-form, sonner, TanStack Start, vitest.

**Spec:** `docs/superpowers/specs/2026-05-18-zod-i18n-and-error-toasts-design.md`

**Branch:** `feature/zod-i18n-error-toasts` (created; spec committed).

**Commit author block** (local git has no user — established repo pattern, NOT a security issue; prepend to every commit):
```bash
GIT_AUTHOR_NAME="Jérémie Néhlil" GIT_AUTHOR_EMAIL="jeremienehlil@MacBookPro.lan" \
GIT_COMMITTER_NAME="Jérémie Néhlil" GIT_COMMITTER_EMAIL="jeremienehlil@MacBookPro.lan" \
git commit -m "$(cat <<'EOF'
<subject>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Test command:** `cd apps/web && pnpm exec vitest run <path>` (NOT `pnpm test` — its turbo wrapper intermittently dies on an RTK-proxy artifact). Always `cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker` before any `git`/`pnpm typecheck`/`pnpm build` (cwd drifts to `apps/web` after those).

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `apps/web/src/i18n/zod-error-map.ts` | locale-bound `z.ZodErrorMap` factory | Create |
| `apps/web/src/i18n/zod-error-map.test.ts` | errorMap unit tests | Create |
| `apps/web/src/i18n/use-zod-resolver.ts` | `useZodResolver` hook | Create |
| `apps/web/src/i18n/en.json` / `fr.json` | `error.zod.*` + `toast.*` keys | Modify |
| `apps/web/src/routes/__root.tsx` | mount `<Toaster/>` | Modify |
| 4 form components | swap to `useZodResolver` | Modify |
| 8 mutation route files | error/success toasts | Modify |
| `apps/web/package.json` | add `sonner` | Modify |

---

## Task 1: Locale-bound zod errorMap

**Files:**
- Create: `apps/web/src/i18n/zod-error-map.ts`
- Test: `apps/web/src/i18n/zod-error-map.test.ts`
- Modify: `apps/web/src/i18n/en.json`, `apps/web/src/i18n/fr.json`

- [ ] **Step 1: Add `error.zod.*` keys to BOTH dicts** (valid JSON, match existing formatting/indentation; the parity test compares sorted key sets).

en.json:
```json
"error.zod.required": "This field is required",
"error.zod.mustBeNumber": "Must be a number",
"error.zod.invalidType": "Invalid value",
"error.zod.tooShort": "Too short",
"error.zod.tooSmall": "Value is too small",
"error.zod.tooBig": "Value is too large",
"error.zod.invalidFormat": "Invalid format",
"error.zod.invalid": "Invalid value"
```
fr.json:
```json
"error.zod.required": "Ce champ est requis",
"error.zod.mustBeNumber": "Doit être un nombre",
"error.zod.invalidType": "Valeur invalide",
"error.zod.tooShort": "Trop court",
"error.zod.tooSmall": "La valeur est trop petite",
"error.zod.tooBig": "La valeur est trop grande",
"error.zod.invalidFormat": "Format invalide",
"error.zod.invalid": "Valeur invalide"
```

- [ ] **Step 2: Write failing tests** — `apps/web/src/i18n/zod-error-map.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { makeZodErrorMap } from './zod-error-map'
import { translate } from './index'

const t = (k: string) => translate('en', k)
const map = makeZodErrorMap(t)
// zod v3 errorMap ctx provides the default message; we only assert our overrides.
const ctx = { defaultError: 'DEFAULT', data: undefined }

function msg(issue: z.ZodIssueOptionalMessage): string {
  return map(issue, ctx).message
}

describe('makeZodErrorMap', () => {
  it('missing string -> required', () => {
    expect(
      msg({ code: 'invalid_type', expected: 'string', received: 'undefined', path: [] }),
    ).toBe(translate('en', 'error.zod.required'))
  })
  it('NaN number -> mustBeNumber', () => {
    expect(
      msg({ code: 'invalid_type', expected: 'number', received: 'nan', path: [] }),
    ).toBe(translate('en', 'error.zod.mustBeNumber'))
  })
  it('other invalid_type -> invalidType', () => {
    expect(
      msg({ code: 'invalid_type', expected: 'string', received: 'number', path: [] }),
    ).toBe(translate('en', 'error.zod.invalidType'))
  })
  it('string too_small minimum 1 -> required', () => {
    expect(
      msg({ code: 'too_small', minimum: 1, type: 'string', inclusive: true, path: [] }),
    ).toBe(translate('en', 'error.zod.required'))
  })
  it('string too_small minimum 3 -> tooShort', () => {
    expect(
      msg({ code: 'too_small', minimum: 3, type: 'string', inclusive: true, path: [] }),
    ).toBe(translate('en', 'error.zod.tooShort'))
  })
  it('number too_small -> tooSmall', () => {
    expect(
      msg({ code: 'too_small', minimum: 1, type: 'number', inclusive: true, path: [] }),
    ).toBe(translate('en', 'error.zod.tooSmall'))
  })
  it('too_big -> tooBig', () => {
    expect(
      msg({ code: 'too_big', maximum: 50, type: 'string', inclusive: true, path: [] }),
    ).toBe(translate('en', 'error.zod.tooBig'))
  })
  it('invalid_string -> invalidFormat', () => {
    expect(
      msg({ code: 'invalid_string', validation: 'regex', path: [] }),
    ).toBe(translate('en', 'error.zod.invalidFormat'))
  })
  it('unknown code -> invalid', () => {
    expect(msg({ code: 'custom', path: [] })).toBe(translate('en', 'error.zod.invalid'))
  })
})
```

- [ ] **Step 3: Run — verify fail**

Run: `cd apps/web && pnpm exec vitest run src/i18n/zod-error-map.test.ts`
Expected: FAIL — `./zod-error-map` not found.

- [ ] **Step 4: Implement** — `apps/web/src/i18n/zod-error-map.ts`:

```ts
import { z } from 'zod'

/**
 * Build a locale-bound zod errorMap. zod consults this only when a schema
 * does not set an explicit message, so existing keyed messages still win.
 * Pure; never throws. Maps issue codes to `error.zod.*` i18n keys.
 */
export function makeZodErrorMap(t: (key: string) => string): z.ZodErrorMap {
  return (issue) => {
    let key = 'error.zod.invalid'
    switch (issue.code) {
      case z.ZodIssueCode.invalid_type:
        key =
          issue.received === 'undefined'
            ? 'error.zod.required'
            : issue.received === 'nan'
              ? 'error.zod.mustBeNumber'
              : 'error.zod.invalidType'
        break
      case z.ZodIssueCode.too_small:
        key =
          issue.type === 'string'
            ? issue.minimum === 1
              ? 'error.zod.required'
              : 'error.zod.tooShort'
            : 'error.zod.tooSmall'
        break
      case z.ZodIssueCode.too_big:
        key = 'error.zod.tooBig'
        break
      case z.ZodIssueCode.invalid_string:
        key = 'error.zod.invalidFormat'
        break
    }
    return { message: t(key) }
  }
}
```

- [ ] **Step 5: Run — verify pass + parity**

Run: `cd apps/web && pnpm exec vitest run src/i18n/zod-error-map.test.ts src/i18n/index.test.ts`
Expected: both PASS (9 errorMap tests; parity equal, count +8).

- [ ] **Step 6: Typecheck**

Run: `cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker && pnpm typecheck`
Expected: PASS. (If `z.ZodErrorMap`/`z.ZodIssueCode` type names differ in the installed zod v3.25, adjust to the correct exported names — the runtime behavior and keys must stay exactly as specified.)

- [ ] **Step 7: Commit**

```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker
git add apps/web/src/i18n/zod-error-map.ts apps/web/src/i18n/zod-error-map.test.ts apps/web/src/i18n/en.json apps/web/src/i18n/fr.json
# author block; subject: feat(i18n): add locale-bound zod errorMap
```

---

## Task 2: `useZodResolver` hook + swap all four forms

**Files:**
- Create: `apps/web/src/i18n/use-zod-resolver.ts`
- Modify: `apps/web/src/components/recurring/recurring-form.tsx`, `apps/web/src/components/categories/category-form.tsx`, `apps/web/src/components/transactions/transaction-form.tsx`, `apps/web/src/components/investments/snapshot-form.tsx`

- [ ] **Step 1: Create the hook** — `apps/web/src/i18n/use-zod-resolver.ts`:

```ts
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { useTranslation } from '~/i18n'
import { makeZodErrorMap } from '~/i18n/zod-error-map'

/**
 * Drop-in replacement for `zodResolver(schema)` that injects the
 * locale-bound errorMap so zod-default messages are localized. Explicit
 * per-field messages in the schema still take precedence.
 */
export function useZodResolver<T extends z.ZodTypeAny>(schema: T) {
  const { t } = useTranslation()
  return zodResolver(schema, { errorMap: makeZodErrorMap(t) })
}
```

- [ ] **Step 2: Swap `recurring-form.tsx`**

Remove the `import { zodResolver } from '@hookform/resolvers/zod'` line; add `import { useZodResolver } from '~/i18n/use-zod-resolver'`. Change:
```ts
    resolver: zodResolver(createRecurringRuleSchema),
```
to:
```ts
    resolver: useZodResolver(createRecurringRuleSchema),
```

- [ ] **Step 3: Swap `category-form.tsx`** — same edit: drop the `zodResolver` import, add the `useZodResolver` import, change `resolver: zodResolver(createCategorySchema)` → `resolver: useZodResolver(createCategorySchema)`.

- [ ] **Step 4: Swap `transaction-form.tsx`** — drop the `zodResolver` import, add the `useZodResolver` import, change `resolver: zodResolver(transactionFormSchema)` → `resolver: useZodResolver(transactionFormSchema)`. (Explicit keyed messages in `transactionFormSchema` still win — behavior unchanged for those fields.)

- [ ] **Step 5: Swap `snapshot-form.tsx`** — drop the `zodResolver` import, add the `useZodResolver` import, change `resolver: zodResolver(formSchema)` → `resolver: useZodResolver(formSchema)`.

- [ ] **Step 6: Typecheck + build**

Run: `cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker && pnpm typecheck && pnpm build`
Expected: both PASS. (`useZodResolver` returns exactly what `zodResolver` returns, so `useForm`'s resolver type is satisfied.)

- [ ] **Step 7: Parity sanity**

Run: `cd apps/web && pnpm exec vitest run src/i18n/index.test.ts`
Expected: PASS (no key changes in this task).

- [ ] **Step 8: Commit**

```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker
git add apps/web/src/i18n/use-zod-resolver.ts apps/web/src/components/recurring/recurring-form.tsx apps/web/src/components/categories/category-form.tsx apps/web/src/components/transactions/transaction-form.tsx apps/web/src/components/investments/snapshot-form.tsx
# subject: feat(i18n): localize zod defaults via useZodResolver in all forms
```

---

## Task 3: Add Sonner + Toaster + toast keys

**Files:**
- Modify: `apps/web/package.json`, `apps/web/src/routes/__root.tsx`, `apps/web/src/i18n/en.json`, `apps/web/src/i18n/fr.json`

- [ ] **Step 1: Add the dependency**

Run: `cd apps/web && pnpm add sonner`
Expected: `sonner` added to `apps/web/package.json` dependencies; lockfile updated.

- [ ] **Step 2: Add toast keys to BOTH dicts**

en.json:
```json
"toast.created": "Created successfully",
"toast.updated": "Updated successfully",
"toast.deleted": "Deleted successfully",
"toast.imported": "Import completed"
```
fr.json:
```json
"toast.created": "Créé avec succès",
"toast.updated": "Modifié avec succès",
"toast.deleted": "Supprimé avec succès",
"toast.imported": "Import terminé"
```

- [ ] **Step 3: Mount `<Toaster/>` in `__root.tsx`**

Add import near the other component imports: `import { Toaster } from 'sonner'`.

In `RootDocument`, place `<Toaster richColors closeButton />` inside `<LocaleProvider>` (so it lives under the same providers), immediately before the closing `</LocaleProvider>`:

```tsx
        <LocaleProvider initial={locale}>
          <ThemeProvider>
            <div className="flex min-h-screen">
              <Sidebar className="hidden md:flex" />
              <main className="flex-1 md:ml-60 p-6 pb-20 md:pb-6">
                {children}
              </main>
              <MobileNav className="md:hidden" />
            </div>
          </ThemeProvider>
          <Toaster richColors closeButton />
        </LocaleProvider>
```

- [ ] **Step 4: Typecheck + build + parity**

Run: `cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker && pnpm typecheck && pnpm build`
Expected: both PASS.
Run: `cd apps/web && pnpm exec vitest run src/i18n/index.test.ts`
Expected: PASS (parity equal, count +4).

- [ ] **Step 5: Commit**

```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker
git add apps/web/package.json pnpm-lock.yaml apps/web/src/routes/__root.tsx apps/web/src/i18n/en.json apps/web/src/i18n/fr.json
# subject: feat(ui): add sonner Toaster + toast i18n keys
```

---

## Task 4: Wire error + success toasts into mutation sites

**Files (modify):** `apps/web/src/routes/transactions_.new.tsx`, `apps/web/src/routes/transactions_.$id.edit.tsx`, `apps/web/src/routes/transactions.tsx`, `apps/web/src/routes/investments.tsx`, `apps/web/src/routes/recurring.tsx`, `apps/web/src/routes/categories.tsx`, `apps/web/src/routes/import.tsx`

For EACH file below: ensure `import { toast } from 'sonner'` and `import { translateApiError } from '~/i18n/errors'` are present, and that `t` is available (most route components already have `const { t } = useTranslation()`; if a target file does not, add it from the existing `~/i18n` import — do NOT add a second `useTranslation` if one exists). In every listed catch block, KEEP the existing `console.error(...)` line and ADD a `toast.error(...)` line after it. Add `toast.success(...)` on the success path as specified. Make NO other logic changes.

- [ ] **Step 1: `transactions_.new.tsx`** (create)

```ts
    try {
      await createServerTransaction({ data })
      toast.success(t('toast.created'))
      router.navigate({ to: '/transactions' })
    } catch (error) {
      console.error('Failed to create transaction:', error)
      toast.error(translateApiError(error, t))
    } finally {
      setIsSubmitting(false)
    }
```

- [ ] **Step 2: `transactions_.$id.edit.tsx`** (update) — on success after the update call add `toast.success(t('toast.updated'))`; in the catch (line ~67) keep `console.error('Failed to update transaction:', error)` and add `toast.error(translateApiError(error, t))`.

- [ ] **Step 3: `transactions.tsx`** (delete) — success path after `deleteServerTransaction(...)` add `toast.success(t('toast.deleted'))`; catch (line ~120) keep console.error, add `toast.error(translateApiError(error, t))`.

- [ ] **Step 4: `investments.tsx`** (snapshot create + delete)
  - create handler: after `createServer...snapshot` success add `toast.success(t('toast.created'))`; catch (~124) keep console.error, add `toast.error(translateApiError(error, t))`.
  - delete handler: after delete success add `toast.success(t('toast.deleted'))`; catch (~138) keep console.error, add `toast.error(translateApiError(error, t))`.

- [ ] **Step 5: `recurring.tsx`** (save / delete / toggle)
  - save handler (upsert): inside the `try`, set success per branch — after `updateServerRecurringRule(...)` use `toast.success(t('toast.updated'))`; after `createServerRecurringRule(...)` use `toast.success(t('toast.created'))`. Catch (~138) keep console.error, add `toast.error(translateApiError(error, t))`.
  - delete handler: after `deleteServerRecurringRule(...)` add `toast.success(t('toast.deleted'))`; catch (~152) keep console.error, add `toast.error(translateApiError(error, t))`.
  - toggle handler: after `toggleServerRecurringRule(...)` add `toast.success(t('toast.updated'))`; catch (~165) keep console.error, add `toast.error(translateApiError(error, t))`.

  Concrete save/delete shape:
```ts
    try {
      if (editingRule) {
        await updateServerRecurringRule({ data: { ...data, id: editingRule.id } })
        toast.success(t('toast.updated'))
      } else {
        await createServerRecurringRule({ data })
        toast.success(t('toast.created'))
      }
      setFormOpen(false)
      setEditingRule(null)
      router.invalidate()
    } catch (error) {
      console.error('Failed to save recurring rule:', error)
      toast.error(translateApiError(error, t))
    } finally {
      setIsSubmitting(false)
    }
```

- [ ] **Step 6: `categories.tsx`** (save / delete) — same upsert shape as recurring:
```ts
      if (editingCategory) {
        await updateServerCategory({ data: { ...data, id: editingCategory.id } })
        toast.success(t('toast.updated'))
      } else {
        await createServerCategory({ data })
        toast.success(t('toast.created'))
      }
      setFormOpen(false)
      setEditingCategory(null)
      router.invalidate()
    } catch (error) {
      console.error('Failed to save category:', error)
      toast.error(translateApiError(error, t))
    } finally {
      setIsSubmitting(false)
    }
```
  delete handler (~130): after `deleteServerCategory(...)` add `toast.success(t('toast.deleted'))`; catch keep console.error, add `toast.error(translateApiError(error, t))`.

- [ ] **Step 7: `import.tsx`** (import action ONLY, line ~372)

In the import-execution handler only: on success add `toast.success(t('toast.imported'))`; in its catch keep `console.error('Failed to import:', error)` and add `toast.error(translateApiError(error, t))`. Do NOT touch the `console.error` at lines ~303 (parse file) or ~340 (process mapping) — out of scope.

- [ ] **Step 8: Typecheck + build**

Run: `cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker && pnpm typecheck && pnpm build`
Expected: both PASS.

- [ ] **Step 9: Verify scope (no stray edits)**

Run: `grep -rn "toast.error\|toast.success" apps/web/src/routes`
Expected: only the sites listed above. Run `grep -rn "console.error" apps/web/src/routes/import.tsx` and confirm lines ~303 and ~340 still have NO adjacent `toast.error`.

- [ ] **Step 10: Commit**

```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker
git add apps/web/src/routes/transactions_.new.tsx apps/web/src/routes/transactions_.\$id.edit.tsx apps/web/src/routes/transactions.tsx apps/web/src/routes/investments.tsx apps/web/src/routes/recurring.tsx apps/web/src/routes/categories.tsx apps/web/src/routes/import.tsx
# subject: feat(ux): localized error/success toasts on mutations
```

---

## Task 5: Full CI matrix + ship

**Files:** none (verification + PR)

- [ ] **Step 1: Full local CI matrix**

```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker
pnpm typecheck && pnpm build && \
pnpm --filter @tracker/db db:generate && \
git diff --quiet -- packages/db/drizzle && echo "drizzle OK" && \
git diff --quiet -- apps/web/src/routeTree.gen.ts apps/web/src/routes && echo "route OK"
```
Expected: all pass, `drizzle OK`. NOTE: this plan edits files under `apps/web/src/routes/` (route components, not new routes), so the `git diff --quiet -- apps/web/src/routes` guard WILL report changes — that guard is only meaningful pre-commit. Run it BEFORE committing Task 4, or scope it to `apps/web/src/routeTree.gen.ts` only here. The real invariant: `routeTree.gen.ts` must be unchanged (no routes added/removed). Verify: `git diff --quiet -- apps/web/src/routeTree.gen.ts && echo "routeTree OK"`.

- [ ] **Step 2: Full test suite**

Run: `cd apps/web && pnpm exec vitest run`
Expected: all green — prior 71 + new `zod-error-map.test.ts` (9); i18n parity 7/7 with grown key count (+12: 8 zod + 4 toast).

- [ ] **Step 3: Manual EN/FR smoke (recommended)**

Start dev server. In FR and EN: submit the recurring and category forms empty → field errors localized (no raw "Required"/"Expected number…"). Trigger a failed mutation (e.g. create a duplicate category name) → localized error toast. Complete a successful create/update/delete → localized success toast. (If dev server 500s with "no such table", re-apply local D1 migrations — see the original i18n handoff for the `wrangler d1 execute` commands.)

- [ ] **Step 4: Push + PR**

```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker
git push -u origin feature/zod-i18n-error-toasts   # if creds error: gh auth setup-git, then retry
gh pr create --base master --head feature/zod-i18n-error-toasts \
  --title "feat(i18n): zod-message i18n + error/success toasts" \
  --body "<summary of both features; link the spec; restate locked scope: shared validators untouched, no server-fn code plumbing (generic-fallback toast acceptable), mutations-only toast scope, console.error retained>"
```

- [ ] **Step 5: CI green → merge (preserve history, do NOT squash)**

```bash
gh pr checks <N>    # poll until ci + GitGuardian pass
gh pr merge <N> --merge
git checkout master && git pull --ff-only origin master && git branch -d feature/zod-i18n-error-toasts
```

---

## Self-Review

**Spec coverage:**
- Feature 1 errorMap + key mapping → Task 1. ✔
- `useZodResolver` hook + swap all 4 forms (shared validators untouched) → Task 2. ✔
- Sonner dep + `<Toaster/>` in `__root` inside LocaleProvider → Task 3. ✔
- `toast.*` keys → Task 3. ✔
- Error+success toasts on the 11 listed mutation sites; console.error retained; parse/stats out of scope → Task 4 (with scope-verification step 9). ✔
- Upsert success-key nuance (recurring/category create vs update; toggle→updated) → Task 4 steps 5–6 explicit. ✔
- Testing: errorMap unit tests, parity, full suite, CI → Tasks 1, 5. ✔
- Non-goals respected: no `packages/shared` edits (no task touches it); no server-fn code plumbing (Task 4 relies on existing `translateApiError` generic fallback). ✔

**Placeholder scan:** No TBD/TODO. Every code step shows full code. The only `<...>` is the PR-body prose in Task 5 (author judgement, not a code placeholder).

**Type consistency:** `makeZodErrorMap(t): z.ZodErrorMap` (Task 1) consumed by `useZodResolver` (Task 2) with matching signature. `useZodResolver(schema)` returns `zodResolver(...)`'s type → drop-in for `useForm({ resolver })` (Task 2). `translateApiError(error, t)` matches its existing PR #9 signature (Task 4). Toast keys `toast.{created,updated,deleted,imported}` defined Task 3, used Task 4 — consistent. errorMap keys `error.zod.*` defined Task 1, asserted in Task 1 tests — consistent.

**Note on route-drift guard:** flagged inline in Task 5 Step 1 — this plan modifies route *component* files (not the route tree); the meaningful guard is `routeTree.gen.ts` unchanged. Corrected there to avoid a false failure.
