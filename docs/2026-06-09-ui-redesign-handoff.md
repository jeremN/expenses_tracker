# Handoff — UI redesign + features (2026-06-09)

Session that redesigned the UI and shipped four follow-up features. Everything below is **merged to `master`** and verified (typecheck clean, 158/158 tests). Written so a fresh context can pick up without re-deriving anything.

## What's on `master` now

Five squash-merged PRs on top of `ca79425`:

| PR | Commit | What |
|----|--------|------|
| #36 | `e50b3f2` | **Calm-fintech redesign**: design system, semantic tokens, mono numerals, light/dark switch |
| #37 | `7754e3f` | **Security**: deleted legacy v1 app (`expenses-tracker/`), esbuild override → cleared all 6 Dependabot alerts |
| #38 | `4237d11` | **Transactions**: description/category search + client-side pagination (25/page) |
| #39 | `f3a8eaa` | **Budgets**: per-category monthly limits with spend tracking (new `/budgets` route) |
| #40 | `e28924c` | **Polish + onboarding**: dashboard onboarding empty state, balanced columns, calmer recurring badge, settings titles, chart hover |

All feature branches are deleted (local + remote).

## The design system (read these first)

- **`PRODUCT.md`** (repo root) — strategy: register=product, calm/trustworthy, Mercury/Copilot reference, anti-ref = crypto-neon, 5 design principles, AA + colorblind-safe.
- **`DESIGN.md`** (repo root) — the visual system: OKLCH palette (both themes), semantic finance tokens, typography, motion, components. **This is the source of truth for visual decisions.**
- **`apps/web/src/styles/app.css`** — all tokens live here. Cool-slate neutrals + deep ink-blue `--primary`. Semantic finance tokens: `--income` / `--expense` / `--investment` (each with `-subtle` + `-foreground`). Calm categorical `--chart-1..6`. Fonts: **Inter** (`--font-sans`) + **IBM Plex Mono** (`--font-mono`, used for every monetary figure). `--shadow-soft`, `--ease-out-expo`, `@keyframes bar-rise`, global reduced-motion reset.

### Load-bearing components / patterns
- **`~/components/ui/amount.tsx`** — `<Amount cents tone={income|expense|signed|neutral} animate? />`. THE single place money renders: mono, tabular, sign + color (colorblind-safe). Use it for every monetary value; don't hand-roll `text-green/red`.
- **`~/lib/use-count-up.ts`** — SSR-safe count-up (initial render = final value to avoid hydration mismatch; layout effect resets to 0 then rAF eases up; honors `prefers-reduced-motion`). Used by `<Amount animate>` on dashboard hero figures only.
- **`~/components/theme-switch.tsx`** — Light/System/Dark segmented switch in Settings. The `ThemeProvider` already supported all 3 modes; this exposes `system`.
- **`~/lib/format.ts`** — `useFormat()` returns `formatMoney`, `formatDate`, **`currencySymbol`** (locale-aware, EUR→€). Amount inputs use `currencySymbol`, not a hardcoded `$`.
- Badge variants added: `income` / `expense` / `investment` (subtle tints). Recurring "Active" badge uses `income`.

## Budgets feature (the newest, most code)

- **Schema**: `budgets` table (`packages/db/src/schema.ts`) — one row per category (`category_id` unique), `amount` in cents. Migration `packages/db/drizzle/0002_nosy_aqueduct.sql`.
- **Queries** (`packages/db/src/queries.ts`): `getBudgets`, `upsertBudget` (on-conflict upsert), `deleteBudget`, `getBudgetOverview(month)` (one query: categories ⋈ budgets ⋈ summed monthly expense spend). **`deleteCategory` now also deletes the category's budget** (and `queries.test.ts` asserts the 4-op sequence — update it if you change deleteCategory).
- **Shared**: `upsertBudgetSchema`, `Budget` + `BudgetOverviewItem` types.
- **UI**: `~/routes/budgets.tsx` (server fns: overview/set/clear) + `~/components/budgets/budget-list.tsx` (inline-edit rows, progress bars: brand under / expense-red over). Empty state links to Categories.
- **Nav**: added to sidebar (`Target` icon) and mobile-nav — **mobile-nav swapped Categories out for Budgets** to stay at 5 items (Categories is desktop-sidebar only now).

## Local dev state

- **`apps/web/seed-dev.sql`** (committed) — re-runnable local fixture: 10 categories, recurring rules, ~70 transactions across Jan–Jun 2026, investment snapshots. Re-apply: `cd apps/web && npx wrangler d1 execute expenses-tracker-db --local --file ./seed-dev.sql`.
- Local D1 **already has** migration 0002 applied + a few seeded budgets (Courses/Restaurants/Loisirs/Transport). Restaurants budget was set to €20 during testing (over its spend) — re-run the seed or reset if you want it clean.
- Dev server is **stopped**. Start with `pnpm dev` (from `apps/web`), serves `http://localhost:3000`. `.dev.vars` bypasses Cloudflare Access locally.
- Browser verification this session used the Playwright MCP (desktop 1440×900, light + dark, mobile 390).

## ⚠️ Before deploying

- **Apply the budgets migration to remote D1**: `cd apps/web && npx wrangler d1 migrations apply expenses-tracker-db --remote`. Migration 0002 is only applied locally.

## Gotchas / invariants established

- **SSR Intl hydration**: `formatMoney` (Intl) can emit different whitespace on workerd vs the browser. Visible amounts match fine, but combining `formatDate + formatMoney` as adjacent JSX text nodes in an SVG `<title>` mismatched — fixed by making it ONE interpolated string (see `growth-chart.tsx`). Keep money strings as single text nodes in SVG.
- **`<html suppressHydrationWarning>`** in `__root.tsx` — required because the inline theme script sets the `dark` class pre-hydration. Don't remove.
- **esbuild override** in root `package.json` (`pnpm.overrides.esbuild: ">=0.25.0"`) — needed because `drizzle-kit@0.31.10` drags in `esbuild@0.18` via the deprecated `@esbuild-kit/*` loader. Verified `db:generate` still works. If you bump drizzle-kit and it drops `@esbuild-kit`, the override can go.
- **Charts**: bar `height: %` needs a definite-height flex parent (`h-full` on the group div); a reveal animation must leave the default state visible (use `motion-safe:` + a keyframe that settles at the natural state).

## Open follow-ups (not done; roughly priority order)

1. **`/api/budgets` REST route** — every other resource has one (`/api/transactions`, `/api/categories`, …); budgets is SSR-only. Mirror `routes/api/categories.ts` + `categories.$id.ts`. There's an `api/integration.test.ts` to extend.
2. **Tests for new UI primitives** — `Amount` (sign/locale/tone), `useCountUp` (reduced-motion path), `ThemeSwitch`, budget overview query. None covered yet.
3. **Server-side transactions pagination** — current pagination is client-side (fixes DOM render cost; still loads all rows). If the dataset grows large: `getTransactions` + count with LIMIT/OFFSET + URL search params (`validateSearch`). Note `getTransactions` is shared by the dashboard and `/api/*` — keep new params optional.
4. **Dashboard budget widget** — surface budget progress on the dashboard or stats (data layer already exists: `getBudgetOverview`).
5. **Smaller polish** — growth-chart could use a real hover crosshair/tooltip (currently native `<title>` + point enlarge); category `icon` field is stored but unused in the UI.

## Conventions to keep

- Commits: single conventional-commits subject line, **no `Co-Authored-By` trailer** (user's global rule). Run hooks normally.
- Master is protected (ruleset needs a check named exactly `ci`). Work on a branch → PR → squash-merge. Don't push to master directly. Don't rename the CI job.
- Every new string goes in **both** `en.json` and `fr.json` (a test enforces key parity). User locale is French.
- Money is integer cents everywhere; dates are `YYYY-MM-DD` strings.
