# CSV import: amount-safety hardening

**Status:** design
**Date:** 2026-05-20

## Problem

`parseAmount` in `apps/web/src/server/parsers/csv.ts` returns `0` for any unparseable input (empty string, gibberish like `"FOO"`, or — more dangerously — numerics that overflow `Number.MAX_SAFE_INTEGER`). The parsed row then carries `amount: 0`, which **silently inserts a zero-amount transaction** rather than skipping the malformed row.

Concrete failure modes:

- A bank statement with `"$abc"` in the amount cell → a 0 EUR/USD transaction with the right date and description. The user sees the row in their list and assumes their balance is unchanged.
- An attacker-controlled or buggy export with `"99999999999999999"` → `parseFloat` returns `1e17`, `* 100` overflows precision, `Math.round` returns a wrong integer (or just `9999999999999999800`), and the DB stores it. SQLite INTEGER tops out at 2^63-1 ≈ 9.2e18, so SQLite *can* store it, but the value is garbage.
- A cell with `"1e10"` (scientific notation that bypasses any client-side validation expecting decimal) → parses to 1_000_000_000_000 cents.

The existing zod validator on the import endpoint (`apps/web/src/routes/api/import.ts:9`) only enforces `z.number().int()` — not bounds.

## Goal

Reject malformed amount cells at the parser level so they never reach the DB. Failure mode shifts from "silent 0-amount row" to "row skipped during parse, user sees N-1 rows in preview and a count mismatch they can investigate."

Non-goals:

- Surface row-level errors to the UI ("row 3 had a bad amount"). That's a UX project, separate scope.
- Formula injection prevention on import or export — theoretical attack for a single-user app, YAGNI.
- Per-field length caps — no evidence the unbounded fields cause real failures within the 10 MB file cap.
- D1 multi-row INSERT param-limit verification — separate investigation, not a fix.

## Approach

Three changes, mechanical:

### 1. `parseAmount` returns `number | null`

```ts
function parseAmount(str: string): number | null
```

Returns `null` when:

- Input is empty / whitespace-only (was: `0`).
- After symbol-strip, no digits remain (was: `0`).
- `parseFloat` returns `NaN` (was: `0`).
- The result's absolute value exceeds `MAX_SAFE_CENTS` (new) — i.e. parsing succeeded but the magnitude can't survive a round-trip through JS Number.

`MAX_SAFE_CENTS` is `Number.MAX_SAFE_INTEGER / 100` rounded down: roughly 9 × 10^13 cents = €900 trillion. Comfortably above any realistic bank balance; comfortably below the precision cliff.

We also reject **non-finite parses** (scientific notation like `"1e10"`). `parseFloat("1e10")` returns `10000000000` (finite), so the magnitude check handles it. `parseFloat("Infinity")` returns `Infinity`, which is `!isFinite`, so we add an explicit `isFinite` check.

### 2. `parseCSV` skips rows where `parseAmount` returns `null`

Matches the existing pattern (`if (!date) continue` on line 87). One new line above the `rows.push(...)` block.

For the credit/debit two-column case, *both* parses must succeed. If either is null, treat the row as if it had no amount info and skip.

### 3. Tests

Extend `apps/web/src/server/parsers/csv.test.ts`:

- `parseAmount` (covered indirectly by `parseCSV`) rejects `"99999999999999999"`, `"abc"`, `""`, `"Infinity"`.
- `parseCSV` with one good row and one row containing a malformed amount returns only the good row.
- `parseCSV` with credit/debit columns skips rows where either is malformed.

## Behavior changes (intentional)

| Input | Today | After |
|---|---|---|
| `"abc"` | 0-cent row in result | row skipped |
| `""` | 0-cent row | row skipped |
| `"99999999999999999"` | wrong-cent row | row skipped |
| `"1e10"` | wrong-cent row (1 trillion cents) | row skipped |
| `"-100.00"` | -10000 cents | -10000 cents (unchanged) |
| `"1.234,56"` (EUR) | 123456 cents | 123456 cents (unchanged) |

The `0` return value previously did double duty for "unparseable" and "actually zero." Real bank statements virtually never have a literal `0` amount cell (a transaction with no money isn't a transaction), so collapsing both into "skip" doesn't lose useful data.

## Out of scope (deliberate)

- Idempotency for repeat imports. A separate concern; the `bank_imports` table doesn't currently dedupe.
- Investigating whether D1's 100-binding-per-statement limit is hit by `processImport`'s `CHUNK = 250` × ~6 fields = 1500 bindings. The current code works, suggesting either Drizzle splits internally or D1 accepts more. Worth a separate spike.
- Formula injection prevention on `csv-writer.ts`. The export goes only to the user's own disk; not a multi-tenant risk.
- Tightening the server validator's `z.number().int()` with `.safe()`. Defense-in-depth would be nice but the parser fix is the load-bearing one.

## Invariants preserved

- All existing date-parsing, delimiter-detection, and quote-handling behavior unchanged.
- `ParsedRow.amount` type stays `number` (the `null` case never reaches the result array).
- No new validators, no schema changes, no DB migrations.
