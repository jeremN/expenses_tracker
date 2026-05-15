# CSV Export — Design

**Status:** approved during brainstorm 2026-05-15
**Scope:** Tier 3 polish, feature 1 of 3 (CSV export → i18n → multi-currency)
**Implementation target:** single PR

## Goal

Solo-user backup. One click → download a zip containing every D1 table as CSV. Optimized for completeness and lossless round-trips, not human readability.

## Non-goals

- Per-table export buttons (always full export)
- Date range filter (always all-time)
- Re-import / "restore from backup" flow (separate feature; CSVs are *meant to be* re-importable, but the inverse isn't shipped this round)
- JSON-formatted export (the REST API already exists for programmatic access)
- Human-readable formatting (no decimal-converted amounts, no category-name resolution)

## Architecture

### Server route

`GET /api/export`

- File: `apps/web/src/routes/api/export.ts`
- No request body or query params — always full export
- Response:
  - Status: `200`
  - Headers:
    - `Content-Type: application/zip`
    - `Content-Disposition: attachment; filename="expenses-tracker-backup-YYYY-MM-DD.zip"` (date computed via `new Date().toISOString().slice(0, 10)` — UTC; Cloudflare Workers don't have a configurable TZ)
  - Body: zip bytes (built in-memory via `jszip`)
- Reuses the same Drizzle query layer as page loaders:
  `getTransactions`, `getCategories`, `getRecurringRules`, `getInvestmentSnapshots`, `getBankImports`

### Page route

`/settings`

- File: `apps/web/src/routes/settings.tsx`
- Layout: single shadcn `Card` titled "Export data" with description text and an "Export all data" button (shadcn `Button` `variant="default"`)
- The page is intentionally future-proofed — i18n's language selector and multi-currency's display-currency selector will land as additional Cards on this same route
- Sidebar nav: add **Settings** (lucide `Settings` icon) after **Stats**
- Mobile bottom-nav: do not add Settings (the 7-item limit is already in use; Settings is a rare-use page)

### Library choice: `jszip`

- Works in Cloudflare Workers (no Node-only APIs required)
- Personal-finance datasets are KBs to low MBs; no need for streaming compression
- `fflate` is smaller but adds API friction; `jszip` is the safe default

## CSV format

Uniform across all 5 files:

| Aspect | Choice |
|---|---|
| Encoding | UTF-8 **with BOM** (Excel needs the BOM to detect UTF-8; without it, accented descriptions render as mojibake) |
| Delimiter | Comma |
| Line endings | `\n` |
| Header row | Column names in `snake_case` matching DB columns (`id, type, amount, description, date, category_id, recurring_id, created_at, updated_at`, etc.) |
| Strings | Quoted with `"..."` only when needed (contains `,`, `\n`, or `"`); embedded `"` doubled to `""` |
| `null` values | Empty field (not the literal string `"null"`) |
| Booleans | `0` / `1` (matches D1's storage; re-imports cleanly) |
| Dates | `YYYY-MM-DD` string as-is |
| Timestamps | DB string format (`2026-05-15 10:14:53`) |
| Money | Integer cents, raw (`amount`, `total_value`) — no decimal conversion, no currency symbol |

### Empty tables

Still write the CSV with just the header row. Consistent shape on re-import.

### No manifest

The zip filename carries the date. No separate `manifest.json`.

## Zip layout

```
expenses-tracker-backup-YYYY-MM-DD.zip
├── transactions.csv
├── categories.csv
├── recurring_rules.csv
├── investment_snapshots.csv
└── bank_imports.csv
```

CSVs are at the zip root, no nested directory.

## UX flow

1. User navigates to `/settings`
2. Sees the "Export data" card with description and "Export all data" button
3. Clicks the button → `<a href="/api/export" download>` triggers
4. Browser navigates to `/api/export`; server streams zip with `Content-Disposition: attachment`
5. Browser saves the file (native download UI handles progress)
6. Button briefly shows a spinner / disabled state for ~1s, then returns to idle
   - There's no reliable way to know when the download finishes; the timeout is purely so the spinner doesn't stick

### Why anchor-download, not server-fn + Blob

`Content-Disposition: attachment` works natively with anchor navigation. The server-fn alternative would require reading the whole zip into a `Blob`, calling `URL.createObjectURL`, then synthesizing a click — three additional sources of bugs. Anchor navigation also gives the user the browser's native download UI for free.

## Error handling

- The handler wraps the export logic in `try/catch`; on failure returns 500 + JSON error
- This means a failure will navigate the browser away from `/settings` to the JSON error page (mildly bad UX)
- Mitigation deferred: a HEAD probe could surface failures inline, but D1 read errors on this read-only flow are very unlikely, and the dataset is small enough that timeout is implausible
- If the export ever does fail in production, add the probe then
- All server-side errors log to `console.error` for diagnostics

### Cloudflare Worker CPU budget

The Worker free tier has a 30s CPU limit. The zip is built in-memory before streaming. For a solo personal-finance app (~10s of thousands of rows max over a decade), we're nowhere near this. Skip mitigation. Revisit if the dataset ever grows substantially.

## CSV writer utility

New file: `apps/web/src/server/csv-writer.ts`

Signature:

```ts
function toCSV(headers: string[], rows: Record<string, unknown>[]): string
```

- Single function, ~50 LOC
- Inverse of the existing `parseCSV` in `apps/web/src/server/parsers/csv.ts`, but much simpler:
  - No format detection
  - No date heuristics
  - Just write what it's given, following the format rules in the table above
- Prepends `﻿` (UTF-8 BOM, 3 bytes: `0xEF 0xBB 0xBF`)
- Quoting algorithm: a field is quoted iff it contains `,`, `\n`, `\r`, or `"`. Inside quotes, `"` is escaped as `""`.
- Booleans (`true` / `false`) and numbers stringified as-is
- `null` and `undefined` → empty string
- All other values: `String(value)`

## Orchestration

New file: `apps/web/src/server/export.ts`

```ts
async function buildExportZip(db: DB): Promise<Uint8Array>
```

- Fetches all 5 tables in parallel via `Promise.all`
- Calls `toCSV` for each
- Builds a `JSZip` instance, adds each CSV as a file at the zip root
- Returns the zip bytes via `zip.generateAsync({ type: 'uint8array' })`

The route handler in `apps/web/src/routes/api/export.ts` calls `buildExportZip`, wraps the bytes in a `Response`, sets headers. Date in filename is computed at handler time (`new Date().toISOString().slice(0, 10)`).

## Testing

| Test file | Cases |
|---|---|
| `apps/web/src/server/csv-writer.test.ts` | (1) basic write produces expected output; (2) strings with comma/quote/newline round-trip through existing `parseCSV` and come back identical; (3) `null` columns emit empty fields; (4) output starts with `﻿`; (5) empty rows produces header-only output |
| `apps/web/src/server/export.test.ts` | Mock the 5 query functions, call `buildExportZip`, unzip the response, verify all 5 CSVs exist, each starts with the right header row, transactions CSV has the expected row count |

No end-to-end test (would need a running worker). Manual QA after deploy: download, unzip, open each CSV in Excel — verify accented characters render correctly, amounts look right.

## File plan

| File | Action | Purpose |
|---|---|---|
| `apps/web/package.json` | modify | Add `jszip` dependency |
| `apps/web/src/server/csv-writer.ts` | create | CSV writer utility (~50 LOC) |
| `apps/web/src/server/csv-writer.test.ts` | create | Tests |
| `apps/web/src/server/export.ts` | create | Orchestration: fetch all 5 tables, build zip |
| `apps/web/src/server/export.test.ts` | create | Mocked-DB test of orchestration |
| `apps/web/src/routes/api/export.ts` | create | `GET /api/export` route handler |
| `apps/web/src/routes/settings.tsx` | create | New page with Export card |
| `apps/web/src/components/layout/sidebar.tsx` | modify | Add Settings nav item (lucide `Settings` icon, after Stats) |
| `apps/web/src/routeTree.gen.ts` | regenerate | TanStack regenerates on `pnpm build`; will be committed |

## Effort estimate

Roughly 200-300 LOC implementation + ~150 LOC tests. Single PR. Probably 30-60 min of focused work.
