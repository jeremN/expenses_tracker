# Code Review Log

Tracks issues found during code reviews, their resolution status, and deliberate deferrals.

## Review #1 (2026-03-09)

Full review after initial v2 implementation. All critical and important issues resolved.

## Review #2 (2026-03-10)

Second review after applying fixes from review #1. Issues categorized by severity.

### Critical (C1-C4) — All Fixed

| ID | Issue | Fix |
|----|-------|-----|
| C1 | Double `$` in currency display after `formatCents` switched to `Intl.NumberFormat` | Removed manual `$` prefix from 7 component files |
| C2 | Investment date range filter used `LIKE` instead of `>=` (only matched one month) | Changed to `>= from-01` / `<= to-31` in `getInvestmentSnapshots` |
| C3 | `/api/import` POST accepted unvalidated JSON | Added full Zod schema (`importPayloadSchema`) |
| C4 | Recurring generation race condition on concurrent dashboard loads | Added unique index `(recurring_id, date)` + catch `UNIQUE` constraint |

### Important (I1-I6) — All Fixed

| ID | Issue | Fix |
|----|-------|-----|
| I1 | `DELETE /api/investments/:id` returned 200 on missing ID | Added `getInvestmentSnapshotById` existence check, returns 404 |
| I2 | Stats server functions had passthrough validators `(d) => d` | Replaced with Zod schemas (`/^\d{4}$/` for year, `/^\d{4}-\d{2}$/` for month) |
| I3 | `checkDuplicates` loaded ALL transactions regardless of import dates | Now queries only months present in the import data |
| I4 | `suggestCategories` loaded ALL transactions for O(N*M) matching | Uses `getCategorizedDescriptions` SQL query (pre-aggregated by DB) |
| I5 | `PUT /api/recurring/:id` doesn't verify existence | Already handled — `.returning().get()` returns `undefined`, checked on next line |
| I6 | Missing `lang="en"` on `<html>` element | Added to `__root.tsx` |

### Suggestions (S1-S2) — Fixed

| ID | Issue | Fix |
|----|-------|-----|
| S1 | Dependencies pinned to `"latest"` | Replaced with `^x.y.z` ranges across all 3 `package.json` files |
| S2 | No indexes on frequently queried columns | Added indexes on `transactions.date`, `.category_id`, `.type` |

### Deferred

| ID | Issue | Reason |
|----|-------|--------|
| I7 | No pagination on transactions list | Requires new UI components and query changes; better as a separate feature |
| I8 | `processImport` insert + bank import record not atomic | D1 does not support async transactions; `batch()` not available on `BaseSQLiteDatabase` type |
| S3 | CSRF protection | Cloudflare Zero Trust handles auth; low risk for single-user app |
| S4 | Injectable date in `recurring.ts` for testability | Nice-to-have, not blocking |
| S5 | Use Drizzle relational query API for joined queries | Cosmetic; current queries work correctly |
| S6 | Document OFX parser omission | CSV covers the primary use case |
| S7 | Transaction list loads all data in loader | Overlaps with I7 (pagination); defer together |
