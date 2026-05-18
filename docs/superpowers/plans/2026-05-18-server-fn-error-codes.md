# Server-Function Error-Code Propagation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a duplicate-name server-function failure carry `AppErrorCode` across the RPC boundary so the existing client toast shows a specific localized `DUPLICATE_NAME` message instead of the generic fallback.

**Architecture:** A shared `AppError extends Error` (own enumerable `code`, preserved by seroval) + a total `toAppError` classifier reused as the single source of truth; the two category server-fn handlers throw `toAppError(e)`; `/api/categories.ts`'s hand-rolled UNIQUE detection is consolidated onto the same classifier. Client unchanged (`translateApiError` already reads `error.code`).

**Tech Stack:** TanStack Start 1.166.4 (seroval 1.5.1 error serialization), zod, vitest, `@tracker/shared`.

**Spec:** `docs/superpowers/specs/2026-05-18-server-fn-error-codes-design.md`

**Branch:** `feature/server-fn-error-codes` (created; spec committed).

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

**Test command:** `cd apps/web && pnpm exec vitest run <path>` (NOT `pnpm test` — turbo wrapper intermittently dies on an RTK-proxy artifact). `packages/shared` has NO test runner — its code is tested from `apps/web`'s vitest. Always `cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker` before `git`/`pnpm typecheck`/`pnpm build` (cwd drifts to `apps/web`).

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `packages/shared/src/errors.ts` | `AppError` class + `toAppError` classifier | Modify |
| `apps/web/src/i18n/app-error.test.ts` | `toAppError` + `AppError` shape tests | Create |
| `apps/web/src/routes/categories.tsx` | wrap create/update server-fn handlers | Modify |
| `apps/web/src/routes/api/categories.ts` | use shared classifier (DRY) | Modify |

`toAppError`/`AppError` auto-export via the existing `export * from './errors'` in `packages/shared/src/index.ts` (no index edit needed).

---

## Task 1: `AppError` class + `toAppError` classifier

**Files:**
- Modify: `packages/shared/src/errors.ts`
- Create: `apps/web/src/i18n/app-error.test.ts`

- [ ] **Step 1: Write the failing tests** — `apps/web/src/i18n/app-error.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { AppError, toAppError } from '@tracker/shared'

describe('AppError', () => {
  it('is an Error with a code', () => {
    const e = new AppError('INTERNAL', 'boom')
    expect(e).toBeInstanceOf(Error)
    expect(e.code).toBe('INTERNAL')
    expect(e.message).toBe('boom')
    expect(e.name).toBe('AppError')
  })
  it('exposes code as an own enumerable property (seroval-survival contract)', () => {
    const e = new AppError('DUPLICATE_NAME', 'dup')
    expect(Object.getOwnPropertyNames(e)).toContain('code')
  })
})

describe('toAppError', () => {
  it('passes through an existing AppError unchanged', () => {
    const original = new AppError('DUPLICATE_NAME', 'dup')
    expect(toAppError(original)).toBe(original)
  })
  it('maps a UNIQUE-constraint Error to DUPLICATE_NAME', () => {
    const e = toAppError(new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: categories.name'))
    expect(e).toBeInstanceOf(AppError)
    expect(e.code).toBe('DUPLICATE_NAME')
  })
  it('maps a generic Error to INTERNAL', () => {
    expect(toAppError(new Error('boom')).code).toBe('INTERNAL')
  })
  it('maps non-Error values to INTERNAL', () => {
    expect(toAppError('a string').code).toBe('INTERNAL')
    expect(toAppError(undefined).code).toBe('INTERNAL')
    expect(toAppError(null).code).toBe('INTERNAL')
  })
})
```

- [ ] **Step 2: Run — verify it fails**

Run: `cd apps/web && pnpm exec vitest run src/i18n/app-error.test.ts`
Expected: FAIL — `AppError`/`toAppError` not exported from `@tracker/shared`.

- [ ] **Step 3: Implement** — append to `packages/shared/src/errors.ts` (keep the existing `APP_ERROR_CODES`, `AppErrorCode`, `AppErrorBody`, `appError` exactly as-is):

```ts
export class AppError extends Error {
  readonly code: AppErrorCode
  constructor(code: AppErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'AppError'
  }
}

/**
 * Single source of truth for classifying an unknown thrown value into an
 * AppError. Reuses the SQLite UNIQUE-constraint signal already proven in
 * the /api routes. Total — never throws.
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

- [ ] **Step 4: Run — verify pass**

Run: `cd apps/web && pnpm exec vitest run src/i18n/app-error.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Typecheck**

Run: `cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker
git add packages/shared/src/errors.ts apps/web/src/i18n/app-error.test.ts
# subject: feat(errors): add AppError class + toAppError classifier
```

---

## Task 2: Classify in the category server-fn handlers

**Files:**
- Modify: `apps/web/src/routes/categories.tsx`

- [ ] **Step 1: Add the import**

In `apps/web/src/routes/categories.tsx`, add `toAppError` to the existing `@tracker/shared` import. The file already imports from `@tracker/shared` (e.g. `createCategorySchema`, `updateCategorySchema`); add `toAppError` to that import list. If the existing import is `import { createCategorySchema, updateCategorySchema } from '@tracker/shared'`, change it to `import { createCategorySchema, updateCategorySchema, toAppError } from '@tracker/shared'`.

- [ ] **Step 2: Wrap `createServerCategory` handler**

Replace:
```ts
  .handler(async ({ data }) => {
    const db = getDB()
    return createCategory(db, data)
  })
```
with:
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

- [ ] **Step 3: Wrap `updateServerCategory` handler**

Replace:
```ts
  .handler(async ({ data }) => {
    const { id, ...rest } = data
    const db = getDB()
    return updateCategory(db, id, rest)
  })
```
with:
```ts
  .handler(async ({ data }) => {
    try {
      const { id, ...rest } = data
      const db = getDB()
      return updateCategory(db, id, rest)
    } catch (e) {
      throw toAppError(e)
    }
  })
```

Do NOT modify `deleteServerCategory` or any other handler. (`createCategory`/`updateCategory` return promises; if they are `async` and the rejection isn't caught by a synchronous try/catch, ensure the body `await`s them so the catch fires. Concretely: if `createCategory(db, data)` returns a promise, change `return createCategory(db, data)` to `return await createCategory(db, data)` inside the try so a rejected promise is caught here. Same for `updateCategory`.)

- [ ] **Step 4: Typecheck + build**

Run: `cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker && pnpm typecheck && pnpm build`
Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker
git add apps/web/src/routes/categories.tsx
# subject: feat(errors): classify category server-fn failures via toAppError
```

---

## Task 3: Consolidate `/api/categories.ts` onto the shared classifier

**Files:**
- Modify: `apps/web/src/routes/api/categories.ts`

- [ ] **Step 1: Add the import**

Change line 4 from:
```ts
import { createCategorySchema } from '@tracker/shared'
```
to:
```ts
import { createCategorySchema, toAppError } from '@tracker/shared'
```

- [ ] **Step 2: Replace the hand-rolled UNIQUE detection**

In the `POST` handler catch (currently lines 31–36):
```ts
        } catch (error) {
          if (error instanceof Error && error.message.includes('UNIQUE')) {
            return errorResponse('A category with this name already exists', 409, 'DUPLICATE_NAME')
          }
          return errorResponse('Failed to create category', 500, 'INTERNAL')
        }
```
with:
```ts
        } catch (error) {
          if (toAppError(error).code === 'DUPLICATE_NAME') {
            return errorResponse('A category with this name already exists', 409, 'DUPLICATE_NAME')
          }
          return errorResponse('Failed to create category', 500, 'INTERNAL')
        }
```

Message text (`'A category with this name already exists'` / `'Failed to create category'`) and HTTP statuses (409 / 500) are UNCHANGED — the `/api` wire contract and its PR #9 behaviour are preserved exactly. Do not touch the `GET` handler or any other `/api/*` file.

- [ ] **Step 3: Typecheck + build**

Run: `cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker && pnpm typecheck && pnpm build`
Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker
git add apps/web/src/routes/api/categories.ts
# subject: refactor(errors): consolidate /api/categories UNIQUE detection onto toAppError
```

---

## Task 4: Full CI matrix + ship

**Files:** none (verification + PR)

- [ ] **Step 1: Full local CI matrix**

```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker
pnpm typecheck && pnpm build && \
pnpm --filter @tracker/db db:generate && \
git diff --quiet -- packages/db/drizzle && echo "drizzle OK" && \
git diff --quiet -- apps/web/src/routeTree.gen.ts && echo "routeTree OK"
```
Expected: all pass, `drizzle OK`, `routeTree OK`. (This plan adds no routes/schema; `routeTree.gen.ts` must be unchanged.)

- [ ] **Step 2: Full test suite**

Run: `cd apps/web && pnpm exec vitest run`
Expected: all green — prior 80 + new `app-error.test.ts` (6) = 86; i18n parity 7/7 (no key changes).

- [ ] **Step 3: Manual smoke (recommended)**

Start dev server. Create a category, then create another with the same name — in EN and FR. Expected: an error toast with the localized `error.code.DUPLICATE_NAME` message ("An item with this name already exists." / "Un élément portant ce nom existe déjà."), NOT the generic `error.generic`. Sanity: a normal create/update still works and shows the success toast. (If dev server 500s with "no such table", re-apply local D1 migrations — see the original i18n handoff for the `wrangler d1 execute` commands.) Optional: `curl -X POST /api/categories` with a duplicate name still returns HTTP 409 `{"error":"A category with this name already exists","code":"DUPLICATE_NAME"}` (unchanged contract).

- [ ] **Step 4: Push + PR**

```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker
git push -u origin feature/server-fn-error-codes   # if creds error: gh auth setup-git, then retry
gh pr create --base master --head feature/server-fn-error-codes \
  --title "feat(errors): propagate AppErrorCode from category server functions" \
  --body "<summary; link spec; restate scope: DUPLICATE_NAME-only, NOT_FOUND deferred, client unchanged, /api contract preserved, seroval-survival contract test>"
```

- [ ] **Step 5: CI green → merge (preserve history, do NOT squash)**

```bash
gh pr checks <N>    # poll until ci + GitGuardian pass
gh pr merge <N> --merge
git checkout master && git pull --ff-only origin master && git branch -d feature/server-fn-error-codes
```

---

## Self-Review

**Spec coverage:**
- `AppError` class (own enumerable `code`) + `toAppError` total classifier → Task 1. ✔
- Tests run from `apps/web` vitest, incl. own-property seroval-survival contract → Task 1 Step 1. ✔
- Wrap `createServerCategory`/`updateServerCategory` only → Task 2. ✔
- `/api/categories.ts` DRY consolidation, message/status preserved, other `/api/*` untouched → Task 3. ✔
- No new i18n keys (DUPLICATE_NAME exists) — confirmed: no key task. ✔
- Non-goals: NOT_FOUND excluded (no task adds existence checks); no client changes (no client task); no transport plumbing (relies on seroval). ✔
- Manual smoke incl. `/api` contract unchanged → Task 4 Step 3. ✔

**Placeholder scan:** No TBD/TODO. Every code step shows full before/after code. The only `<...>` is the PR-body prose in Task 4 (author judgement, not a code placeholder).

**Type consistency:** `AppError`/`toAppError` defined Task 1 with signatures `new AppError(code: AppErrorCode, message: string)` and `toAppError(error: unknown): AppError`; consumed identically in Task 2 (`throw toAppError(e)`) and Task 3 (`toAppError(error).code === 'DUPLICATE_NAME'`). `code` values (`'DUPLICATE_NAME'`, `'INTERNAL'`) are members of the existing `APP_ERROR_CODES`. Consistent throughout.

**Async-catch note:** Task 2 Step 3 explicitly calls out the promise-rejection caveat (`return await` inside the try) so the synchronous try/catch actually traps a rejected DB promise — the one correctness subtlety in this plan.
