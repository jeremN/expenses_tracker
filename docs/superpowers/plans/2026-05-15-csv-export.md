# CSV Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `GET /api/export` endpoint and a `/settings` page that lets the user download a zip containing every D1 table as CSV — a solo-user backup feature.

**Architecture:** A small CSV writer utility (mirror of the existing `parseCSV`) produces UTF-8-with-BOM CSV strings for each table. An orchestration function fetches all five tables in parallel via the existing Drizzle queries and bundles them with `jszip`. The route handler returns the zip bytes with `Content-Disposition: attachment`. The browser triggers download via an anchor click — no Blob/URL.createObjectURL gymnastics.

**Tech Stack:** TanStack Start route handler, Drizzle ORM (existing queries), `jszip` (new dep), shadcn `Card` + `Button`, lucide `Settings` icon, Vitest.

**Spec:** `docs/superpowers/specs/2026-05-15-csv-export-design.md`

**Working directory:** `apps/web` is the package most touched. All shell commands assume `/Users/jeremienehlil/Documents/Code/Personal/expenses_tracker` as repo root.

---

## Task 1: Add `jszip` dependency

**Files:**
- Modify: `apps/web/package.json` (add `jszip` to `dependencies`)
- Modify: `pnpm-lock.yaml` (regenerated)

- [ ] **Step 1: Add the dep via pnpm**

Run:
```bash
cd apps/web && pnpm add jszip
```

Expected: `jszip` added to `apps/web/package.json` under `dependencies`, version `^3.x.x`. `pnpm-lock.yaml` updated. No errors.

- [ ] **Step 2: Verify it installs cleanly**

Run:
```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker && pnpm install --frozen-lockfile
```

Expected: completes without `ERR_PNPM_OUTDATED_LOCKFILE`.

- [ ] **Step 3: Verify jszip imports work in a Workers-compatible way**

Run:
```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker && pnpm build
```

Expected: build succeeds. (jszip declares no Node-only conditional exports, so it bundles cleanly.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "feat(deps): add jszip for CSV export zip building"
```

---

## Task 2: CSV writer utility (TDD)

**Files:**
- Create: `apps/web/src/server/csv-writer.ts`
- Create: `apps/web/src/server/csv-writer.test.ts`

The writer is small (one function), and the existing `parseCSV` provides a natural round-trip target for tests. Use TDD.

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/server/csv-writer.test.ts` with this exact content:

```typescript
import { describe, it, expect } from 'vitest'
import { toCSV } from './csv-writer'
import { parseCSV } from './parsers/csv'

describe('toCSV', () => {
  it('writes a header-only CSV when given no rows', () => {
    const out = toCSV(['a', 'b', 'c'], [])
    // BOM (0xEF 0xBB 0xBF as UTF-16 codepoint 0xFEFF) + header + trailing \n
    expect(out).toBe('﻿a,b,c\n')
  })

  it('writes basic rows', () => {
    const out = toCSV(
      ['id', 'name'],
      [
        { id: 1, name: 'Groceries' },
        { id: 2, name: 'Rent' },
      ],
    )
    expect(out).toBe('﻿id,name\n1,Groceries\n2,Rent\n')
  })

  it('starts with a UTF-8 BOM', () => {
    const out = toCSV(['x'], [{ x: 1 }])
    expect(out.charCodeAt(0)).toBe(0xfeff)
  })

  it('renders null and undefined as empty fields, not "null"/"undefined"', () => {
    const out = toCSV(
      ['a', 'b', 'c'],
      [{ a: 1, b: null, c: undefined }],
    )
    expect(out).toBe('﻿a,b,c\n1,,\n')
  })

  it('renders booleans as 0/1', () => {
    const out = toCSV(['flag'], [{ flag: true }, { flag: false }])
    expect(out).toBe('﻿flag\n1\n0\n')
  })

  it('quotes fields containing commas', () => {
    const out = toCSV(
      ['desc'],
      [{ desc: 'Coffee, tea, etc' }],
    )
    expect(out).toBe('﻿desc\n"Coffee, tea, etc"\n')
  })

  it('quotes fields containing newlines', () => {
    const out = toCSV(['note'], [{ note: 'line1\nline2' }])
    expect(out).toBe('﻿note\n"line1\nline2"\n')
  })

  it('escapes embedded double quotes by doubling them', () => {
    const out = toCSV(['q'], [{ q: 'she said "hi"' }])
    expect(out).toBe('﻿q\n"she said ""hi"""\n')
  })

  it('does not quote fields that do not need it', () => {
    const out = toCSV(['x'], [{ x: 'plain text 123' }])
    expect(out).toBe('﻿x\nplain text 123\n')
  })

  it('round-trips through parseCSV for strings with special chars', () => {
    const rows = [
      { id: 1, description: 'Coffee, tea', amount: 1234 },
      { id: 2, description: 'She said "hi"', amount: -500 },
      { id: 3, description: 'line1\nline2', amount: 0 },
    ]
    const csv = toCSV(['id', 'description', 'amount'], rows)
    // parseCSV with explicit mapping returns ParsedRow shape; verify rawRows.
    // We strip the BOM since parseCSV doesn't expect it; production CSVs from
    // toCSV are meant for spreadsheets, not for round-trip through our parser.
    const stripped = csv.replace(/^﻿/, '')
    const parsed = parseCSV(stripped)
    expect(parsed.headers).toEqual(['id', 'description', 'amount'])
    expect(parsed.rawRows).toEqual([
      { id: '1', description: 'Coffee, tea', amount: '1234' },
      { id: '2', description: 'She said "hi"', amount: '-500' },
      { id: '3', description: 'line1\nline2', amount: '0' },
    ])
  })

  it('uses missing keys as empty fields', () => {
    const out = toCSV(['a', 'b', 'c'], [{ a: 1 }])
    expect(out).toBe('﻿a,b,c\n1,,\n')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
cd apps/web && pnpm vitest run src/server/csv-writer.test.ts
```

Expected: all tests fail with `Cannot find module './csv-writer'` or similar import error.

- [ ] **Step 3: Implement `csv-writer.ts`**

Create `apps/web/src/server/csv-writer.ts`:

```typescript
/**
 * Serialize an array of row objects into a CSV string.
 *
 * Output format:
 * - UTF-8 BOM (﻿) at the start, so Excel detects UTF-8 correctly
 * - Comma delimiter, \n line endings
 * - First line: header row (the `headers` argument, in order)
 * - Each subsequent line: one row, with each field looked up by header key
 * - Fields are quoted only when they contain a comma, newline, carriage
 *   return, or double quote
 * - Embedded double quotes are escaped by doubling: " -> ""
 * - `null` and `undefined` render as empty fields, NOT the literal strings
 *   "null" / "undefined"
 * - Booleans render as 0 / 1 (matches D1's storage; re-imports cleanly)
 * - Missing keys on a row object render as empty fields
 *
 * This is the inverse of `parseCSV` for round-trip integrity, but simpler:
 * no format detection, no date heuristics — just write what it's given.
 */
export function toCSV(headers: string[], rows: Record<string, unknown>[]): string {
  const lines: string[] = []
  lines.push(headers.map(escapeField).join(','))
  for (const row of rows) {
    const fields = headers.map((h) => formatValue(row[h]))
    lines.push(fields.join(','))
  }
  // UTF-8 BOM + body + trailing newline
  return '﻿' + lines.join('\n') + '\n'
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? '1' : '0'
  return escapeField(String(v))
}

function escapeField(s: string): string {
  // Quote only when needed; double up embedded quotes.
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}
```

- [ ] **Step 4: Run the tests again to verify they pass**

Run:
```bash
cd apps/web && pnpm vitest run src/server/csv-writer.test.ts
```

Expected: all 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/csv-writer.ts apps/web/src/server/csv-writer.test.ts
git commit -m "feat: add CSV writer utility with UTF-8 BOM and round-trip tests"
```

---

## Task 3: Export orchestration (TDD)

**Files:**
- Create: `apps/web/src/server/export.ts`
- Create: `apps/web/src/server/export.test.ts`

The orchestration fetches all five tables in parallel and bundles them via jszip.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/server/export.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import JSZip from 'jszip'

// Mock the db module so vitest doesn't try to resolve `cloudflare:workers`.
vi.mock('~/server/db', () => ({
  getDB: () => ({}),
}))

vi.mock('@tracker/db', () => ({
  getTransactions: vi.fn(),
  getCategories: vi.fn(),
  getRecurringRules: vi.fn(),
  getInvestmentSnapshots: vi.fn(),
  getBankImports: vi.fn(),
}))

import { buildExportZip } from './export'
import {
  getTransactions,
  getCategories,
  getRecurringRules,
  getInvestmentSnapshots,
  getBankImports,
} from '@tracker/db'

const mockGetTransactions = vi.mocked(getTransactions)
const mockGetCategories = vi.mocked(getCategories)
const mockGetRecurringRules = vi.mocked(getRecurringRules)
const mockGetInvestmentSnapshots = vi.mocked(getInvestmentSnapshots)
const mockGetBankImports = vi.mocked(getBankImports)

describe('buildExportZip', () => {
  it('produces a zip with the five expected CSV files at the root', async () => {
    // Each query returns the join-row shape its caller already consumes:
    // - getTransactions returns [{ transactions, categories }, ...] joined rows
    // - getRecurringRules returns [{ recurring_rules, categories }, ...] joined rows
    // - Others return flat row arrays
    mockGetTransactions.mockResolvedValue([
      {
        transactions: {
          id: 1, type: 'expense', amount: 1234, description: 'Coffee',
          date: '2026-05-15', categoryId: 1, recurringId: null,
          createdAt: '2026-05-15 10:00:00', updatedAt: '2026-05-15 10:00:00',
        },
        categories: null,
      },
    ] as any)
    mockGetCategories.mockResolvedValue([
      { id: 1, name: 'Groceries', color: '#22c55e', icon: null, createdAt: '2026-05-15 10:00:00' },
    ] as any)
    mockGetRecurringRules.mockResolvedValue([] as any)
    mockGetInvestmentSnapshots.mockResolvedValue([] as any)
    mockGetBankImports.mockResolvedValue([] as any)

    const bytes = await buildExportZip({} as any)

    // Open the zip and verify file names.
    const zip = await JSZip.loadAsync(bytes)
    const names = Object.keys(zip.files).sort()
    expect(names).toEqual([
      'bank_imports.csv',
      'categories.csv',
      'investment_snapshots.csv',
      'recurring_rules.csv',
      'transactions.csv',
    ])
  })

  it('writes the transaction row and category row into their CSVs', async () => {
    mockGetTransactions.mockResolvedValue([
      {
        transactions: {
          id: 1, type: 'expense', amount: 1234, description: 'Coffee',
          date: '2026-05-15', categoryId: 1, recurringId: null,
          createdAt: '2026-05-15 10:00:00', updatedAt: '2026-05-15 10:00:00',
        },
        categories: null,
      },
    ] as any)
    mockGetCategories.mockResolvedValue([
      { id: 1, name: 'Groceries', color: '#22c55e', icon: null, createdAt: '2026-05-15 10:00:00' },
    ] as any)
    mockGetRecurringRules.mockResolvedValue([] as any)
    mockGetInvestmentSnapshots.mockResolvedValue([] as any)
    mockGetBankImports.mockResolvedValue([] as any)

    const bytes = await buildExportZip({} as any)
    const zip = await JSZip.loadAsync(bytes)
    const txCSV = await zip.file('transactions.csv')!.async('string')
    expect(txCSV).toContain('id,type,amount,description,date,category_id,recurring_id,created_at,updated_at')
    expect(txCSV).toContain('1,expense,1234,Coffee,2026-05-15,1,,2026-05-15 10:00:00,2026-05-15 10:00:00')

    const catCSV = await zip.file('categories.csv')!.async('string')
    expect(catCSV).toContain('id,name,color,icon,created_at')
    expect(catCSV).toContain('1,Groceries,#22c55e,,2026-05-15 10:00:00')
  })

  it('writes header-only CSVs for empty tables', async () => {
    mockGetTransactions.mockResolvedValue([] as any)
    mockGetCategories.mockResolvedValue([] as any)
    mockGetRecurringRules.mockResolvedValue([] as any)
    mockGetInvestmentSnapshots.mockResolvedValue([] as any)
    mockGetBankImports.mockResolvedValue([] as any)

    const bytes = await buildExportZip({} as any)
    const zip = await JSZip.loadAsync(bytes)

    for (const name of ['transactions.csv', 'categories.csv', 'recurring_rules.csv', 'investment_snapshots.csv', 'bank_imports.csv']) {
      const content = await zip.file(name)!.async('string')
      // Each starts with BOM + header row + trailing newline; no data rows.
      expect(content.startsWith('﻿')).toBe(true)
      expect(content.split('\n').filter((l) => l.length > 0)).toHaveLength(1)
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
cd apps/web && pnpm vitest run src/server/export.test.ts
```

Expected: fails with `Cannot find module './export'`.

- [ ] **Step 3: Implement `export.ts`**

Create `apps/web/src/server/export.ts`:

```typescript
import JSZip from 'jszip'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'
import {
  getTransactions,
  getCategories,
  getRecurringRules,
  getInvestmentSnapshots,
  getBankImports,
} from '@tracker/db'
import { toCSV } from './csv-writer'

type DB = BaseSQLiteDatabase<'async', any, any>

/**
 * Fetch every D1 table and return a zip of one CSV per table.
 *
 * Tables: transactions, categories, recurring_rules, investment_snapshots,
 * bank_imports. CSVs are at the zip root (no subdirectories).
 *
 * Money fields are written as integer cents (raw); see the design doc for the
 * full format spec.
 */
export async function buildExportZip(db: DB): Promise<Uint8Array> {
  const [txRows, categories, recurringRows, snapshots, imports] = await Promise.all([
    getTransactions(db),
    getCategories(db),
    getRecurringRules(db),
    getInvestmentSnapshots(db),
    getBankImports(db),
  ])

  // getTransactions and getRecurringRules return left-joined shapes;
  // flatten back to the raw table row before writing.
  const transactions = (txRows as Array<{ transactions: Record<string, unknown> }>).map(
    (r) => r.transactions,
  )
  const recurringRules = (recurringRows as Array<{ recurring_rules?: Record<string, unknown>; recurringRules?: Record<string, unknown> }>).map(
    (r) => r.recurring_rules ?? r.recurringRules ?? r,
  )

  const zip = new JSZip()
  zip.file(
    'transactions.csv',
    toCSV(
      ['id', 'type', 'amount', 'description', 'date', 'category_id', 'recurring_id', 'created_at', 'updated_at'],
      transactions.map(snakeCaseKeys),
    ),
  )
  zip.file(
    'categories.csv',
    toCSV(['id', 'name', 'color', 'icon', 'created_at'], categories.map(snakeCaseKeys)),
  )
  zip.file(
    'recurring_rules.csv',
    toCSV(
      ['id', 'type', 'amount', 'description', 'category_id', 'frequency', 'start_date', 'end_date', 'is_active', 'created_at'],
      recurringRules.map(snakeCaseKeys),
    ),
  )
  zip.file(
    'investment_snapshots.csv',
    toCSV(['id', 'date', 'total_value', 'note', 'created_at'], snapshots.map(snakeCaseKeys)),
  )
  zip.file(
    'bank_imports.csv',
    toCSV(
      ['id', 'filename', 'imported_at', 'row_count', 'status'],
      imports.map(snakeCaseKeys),
    ),
  )

  return zip.generateAsync({ type: 'uint8array' })
}

/**
 * Drizzle returns camelCase keys (categoryId, createdAt). The CSV uses
 * snake_case headers matching the DB columns so the export is re-importable
 * via raw SQL or another tool. Convert keys at the boundary.
 */
function snakeCaseKeys(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    out[k.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase())] = v
  }
  return out
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
cd apps/web && pnpm vitest run src/server/export.test.ts
```

Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/export.ts apps/web/src/server/export.test.ts
git commit -m "feat: add export orchestration that bundles all tables into a zip"
```

---

## Task 4: API route handler

**Files:**
- Create: `apps/web/src/routes/api/export.ts`

- [ ] **Step 1: Implement the route handler**

Create `apps/web/src/routes/api/export.ts`:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { buildExportZip } from '~/server/export'
import { errorResponse } from '~/server/api-helpers'

export const Route = createFileRoute('/api/export')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const db = getDB()
          const bytes = await buildExportZip(db)
          // Date in filename uses UTC; Cloudflare Workers don't have a
          // configurable TZ and the user can rename the file post-download.
          const dateStr = new Date().toISOString().slice(0, 10)
          return new Response(bytes, {
            status: 200,
            headers: {
              'Content-Type': 'application/zip',
              'Content-Disposition': `attachment; filename="expenses-tracker-backup-${dateStr}.zip"`,
              'Content-Length': String(bytes.byteLength),
            },
          })
        } catch (e) {
          console.error('export failed:', e)
          return errorResponse('Failed to build export', 500)
        }
      },
    },
  },
})
```

- [ ] **Step 2: Regenerate the TanStack route tree**

Run:
```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker && pnpm build
```

Expected: build succeeds; `apps/web/src/routeTree.gen.ts` updated to register `/api/export`.

- [ ] **Step 3: Verify typecheck still passes**

Run:
```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker && pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Manually verify the endpoint returns a zip**

In one terminal:
```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker/apps/web && pnpm dev
```

In another, after dev server is ready on :3000:
```bash
curl -s -o /tmp/export.zip -w "HTTP %{http_code} ; type %{content_type} ; bytes %{size_download}\n" http://localhost:3000/api/export
file /tmp/export.zip
unzip -l /tmp/export.zip
```

Expected:
- HTTP 200, Content-Type `application/zip`, non-zero bytes
- `file` reports "Zip archive data"
- `unzip -l` lists all 5 CSVs at the root

Stop the dev server (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/api/export.ts apps/web/src/routeTree.gen.ts
git commit -m "feat: add GET /api/export route serving a backup zip"
```

---

## Task 5: Settings page + sidebar nav

**Files:**
- Create: `apps/web/src/routes/settings.tsx`
- Modify: `apps/web/src/components/layout/sidebar.tsx` (add Settings nav item)
- Regenerate: `apps/web/src/routeTree.gen.ts`

- [ ] **Step 1: Add Settings to the sidebar nav array**

Edit `apps/web/src/components/layout/sidebar.tsx` — modify the imports and the `navItems` array.

Replace the import block:

```typescript
import {
  LayoutDashboard,
  ArrowLeftRight,
  RefreshCw,
  TrendingUp,
  Upload,
  Tags,
  BarChart3,
} from 'lucide-react'
```

with:

```typescript
import {
  LayoutDashboard,
  ArrowLeftRight,
  RefreshCw,
  TrendingUp,
  Upload,
  Tags,
  BarChart3,
  Settings,
} from 'lucide-react'
```

Replace the `navItems` constant:

```typescript
const navItems = [
  { to: '/' as const, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions' as const, label: 'Transactions', icon: ArrowLeftRight },
  { to: '/recurring' as const, label: 'Recurring', icon: RefreshCw },
  { to: '/investments' as const, label: 'Investments', icon: TrendingUp },
  { to: '/import' as const, label: 'Import', icon: Upload },
  { to: '/categories' as const, label: 'Categories', icon: Tags },
  { to: '/stats' as const, label: 'Stats', icon: BarChart3 },
]
```

with:

```typescript
const navItems = [
  { to: '/' as const, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions' as const, label: 'Transactions', icon: ArrowLeftRight },
  { to: '/recurring' as const, label: 'Recurring', icon: RefreshCw },
  { to: '/investments' as const, label: 'Investments', icon: TrendingUp },
  { to: '/import' as const, label: 'Import', icon: Upload },
  { to: '/categories' as const, label: 'Categories', icon: Tags },
  { to: '/stats' as const, label: 'Stats', icon: BarChart3 },
  { to: '/settings' as const, label: 'Settings', icon: Settings },
]
```

- [ ] **Step 2: Create the Settings page route**

Create `apps/web/src/routes/settings.tsx`:

```tsx
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Download, Loader2 } from 'lucide-react'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const [isPreparing, setIsPreparing] = useState(false)

  function handleExport() {
    setIsPreparing(true)
    // Anchor-based download. The browser navigates to /api/export; the
    // Content-Disposition header makes it a download, not a navigation.
    // There's no reliable signal for when the download finishes, so the
    // spinner is just a brief affordance — it clears after 1s.
    window.location.href = '/api/export'
    setTimeout(() => setIsPreparing(false), 1000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your data and app preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export data</CardTitle>
          <CardDescription>
            Download a zip containing every table as CSV. For backup or migration.
            Amounts are stored as integer cents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={isPreparing}>
            {isPreparing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparing export…
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export all data
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Regenerate the route tree and verify typecheck**

Run:
```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker && pnpm build
```

Expected: build succeeds; `routeTree.gen.ts` updated to register `/settings`.

Run:
```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker && pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Verify the route handler updated `createFileRoute` if needed**

If `pnpm build` rewrote `apps/web/src/routes/settings.tsx` to use a different route ID (e.g. `/settings_` underscore form), accept the rewrite. Check with `git diff apps/web/src/routes/settings.tsx`. The committed state must be self-consistent with `routeTree.gen.ts`.

- [ ] **Step 5: Manual smoke test**

Start dev server:
```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker/apps/web && pnpm dev
```

Open http://localhost:3000/settings in a browser. Expected: page renders with sidebar "Settings" highlighted, the Export card visible, button clickable.

Click "Export all data". Expected: a zip file downloads. Open it; verify all 5 CSVs are present.

Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/routes/settings.tsx apps/web/src/components/layout/sidebar.tsx apps/web/src/routeTree.gen.ts
git commit -m "feat: add /settings page with export-all-data button"
```

---

## Task 6: Final verification + PR

**Files:** none modified

- [ ] **Step 1: Run the full CI matrix locally**

Run:
```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker && pnpm typecheck && pnpm test && pnpm build
```

Expected: all three pass. Test count should be the previous total + 13 new tests (10 from csv-writer + 3 from export).

- [ ] **Step 2: Verify drift guards stay green**

Run:
```bash
cd /Users/jeremienehlil/Documents/Code/Personal/expenses_tracker && \
pnpm --filter @tracker/db db:generate && \
if ! git diff --quiet -- packages/db/drizzle; then echo "drizzle drift!"; git diff -- packages/db/drizzle; exit 1; fi && \
if ! git diff --quiet -- apps/web/src/routeTree.gen.ts apps/web/src/routes; then echo "route drift!"; git diff -- apps/web/src/routeTree.gen.ts apps/web/src/routes; exit 1; fi && \
echo "drift checks: PASS"
```

Expected: `drift checks: PASS`.

- [ ] **Step 3: Push the branch**

Run:
```bash
git push -u origin feature/csv-export
```

- [ ] **Step 4: Open the PR**

Run:
```bash
gh pr create --title "feat: CSV export — backup all tables as a zip" --body "$(cat <<'EOF'
## Summary

Tier 3 polish, feature 1 of 3 (CSV export → i18n → multi-currency).

Adds \`GET /api/export\` and a new \`/settings\` page with an "Export all data" button. The endpoint streams a zip containing one CSV per D1 table (transactions, categories, recurring rules, investment snapshots, bank imports). Designed for backup — integer cents, snake_case headers matching DB columns, UTF-8 BOM so Excel handles accented descriptions correctly.

## Design

\`docs/superpowers/specs/2026-05-15-csv-export-design.md\`

## Test plan

- [x] \`pnpm test\` — new tests cover the CSV writer (10 cases including round-trip through parseCSV) and the export orchestration (3 cases including empty tables)
- [x] \`pnpm typecheck\` — 0 errors
- [x] \`pnpm build\` — succeeds
- [x] Manual: \`pnpm dev\`, navigate to /settings, click "Export all data", verify zip downloads with all 5 CSVs

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Wait for CI**

CI must run typecheck, test, build, drizzle drift, and route-tree drift. All five must pass.

If CI fails, diagnose and push a fix commit. Do NOT merge until green.

- [ ] **Step 6: Merge**

Once CI is green:
```bash
gh pr merge <PR-NUMBER> --merge --subject "Merge: feat: CSV export"
```

(Use `--merge` not `--squash` — preserve the per-task commit history.)

---

## Execution Notes

- **TDD throughout:** Tasks 2 and 3 write the failing tests first, then implement. This is non-negotiable for the CSV writer (the round-trip test is the actual contract) and the orchestration (the zip layout is the contract).
- **Drift guards:** Tasks 4 and 5 both run `pnpm build` to regenerate the TanStack route tree. The CI drift guard from PR #6 will fail the run if any regenerated file isn't committed — so commit `routeTree.gen.ts` along with the route file in the same commit.
- **No new turbo cache invalidation needed:** the existing test/build/typecheck tasks pick up the new files automatically.
