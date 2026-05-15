# Expenses Tracker v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a personal finance app with TanStack Start, Cloudflare D1, Drizzle ORM, and shadcn/ui — deployed as a single Cloudflare Worker.

**Architecture:** Turborepo monorepo with a TanStack Start web app (`apps/web`), shared Drizzle schema + queries (`packages/db`), and shared Zod validators/types (`packages/shared`). Pages use server functions, REST API routes exposed for future clients. Cloudflare Zero Trust handles auth.

**Tech Stack:** TanStack Start (React), Drizzle ORM, Cloudflare D1 (SQLite), shadcn/ui, Tailwind CSS v4, Zod, Turborepo + pnpm workspaces.

**Design doc:** `docs/plans/2026-03-09-expenses-tracker-v2-design.md`

---

## Task 1: Initialize Monorepo

**Files:**
- Create: `expenses-tracker-v2/package.json`
- Create: `expenses-tracker-v2/pnpm-workspace.yaml`
- Create: `expenses-tracker-v2/turbo.json`
- Create: `expenses-tracker-v2/.gitignore`
- Create: `expenses-tracker-v2/.npmrc`

**Step 1: Create monorepo root**

```bash
mkdir expenses-tracker-v2 && cd expenses-tracker-v2
git init
pnpm init
```

**Step 2: Configure pnpm workspaces**

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Step 3: Configure Turborepo**

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".output/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "db:generate": {},
    "db:migrate": {}
  }
}
```

**Step 4: Root package.json**

```json
{
  "name": "expenses-tracker-v2",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck"
  },
  "devDependencies": {
    "turbo": "latest",
    "typescript": "^5.7.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

**Step 5: Add .gitignore and .npmrc**

```gitignore
# .gitignore
node_modules
.output
dist
.turbo
.wrangler
.env
.env.local
*.db
```

```ini
# .npmrc
auto-install-peers=true
```

**Step 6: Commit**

```bash
git add .
git commit -m "feat: initialize turborepo monorepo"
```

---

## Task 2: Scaffold TanStack Start Web App

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/src/routes/__root.tsx`
- Create: `apps/web/src/routes/index.tsx`
- Create: `apps/web/src/router.tsx`
- Create: `apps/web/src/entry-client.tsx`
- Create: `apps/web/src/entry-server.tsx`
- Create: `apps/web/src/styles/app.css`

**Step 1: Create apps/web directory and package.json**

```json
{
  "name": "@tracker/web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "start": "node .output/server/index.mjs",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@tanstack/react-router": "latest",
    "@tanstack/react-start": "latest",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "latest",
    "vite": "latest",
    "vite-tsconfig-paths": "latest",
    "typescript": "^5.7.0"
  }
}
```

**Step 2: Configure Vite**

```typescript
// apps/web/vite.config.ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tsconfigPaths(),
    tanstackStart(),
    viteReact(),
  ],
})
```

**Step 3: Configure TypeScript**

```json
// apps/web/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "~/*": ["./src/*"],
      "@tracker/db": ["../../packages/db/src/index.ts"],
      "@tracker/shared": ["../../packages/shared/src/index.ts"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", ".output"]
}
```

**Step 4: Create router, entry points, and root route**

Reference the TanStack Start docs for exact boilerplate:
- `src/router.tsx` — `createRouter()` with route tree
- `src/entry-client.tsx` — `hydrateRoot` with `StartClient`
- `src/entry-server.tsx` — `renderToString` with `StartServer`
- `src/routes/__root.tsx` — `createRootRoute` with HTML shell, head content, layout

**Step 5: Create index route with placeholder**

```tsx
// src/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div>
      <h1>Expenses Tracker v2</h1>
      <p>Coming soon.</p>
    </div>
  )
}
```

**Step 6: Run dev server and verify**

```bash
cd apps/web && pnpm install && pnpm dev
```

Expected: App loads at http://localhost:3000 with "Expenses Tracker v2" heading.

**Step 7: Commit**

```bash
git add apps/web
git commit -m "feat: scaffold TanStack Start web app"
```

---

## Task 3: Set Up Cloudflare D1 + Wrangler

**Files:**
- Create: `apps/web/wrangler.jsonc`
- Modify: `apps/web/vite.config.ts` (add Cloudflare plugin)
- Modify: `apps/web/package.json` (add wrangler + cloudflare deps)

**Step 1: Install Cloudflare dependencies**

```bash
cd apps/web
pnpm add -D wrangler @cloudflare/vite-plugin
```

**Step 2: Configure wrangler.jsonc**

```jsonc
// apps/web/wrangler.jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "expenses-tracker-v2",
  "compatibility_date": "2025-09-02",
  "compatibility_flags": ["nodejs_compat"],
  "main": "@tanstack/react-start/server-entry",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "expenses-tracker-db",
      "database_id": "<FILL_AFTER_CREATION>"
    }
  ]
}
```

**Step 3: Update vite.config.ts with Cloudflare plugin**

```typescript
// apps/web/vite.config.ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import viteReact from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tsconfigPaths(),
    tanstackStart(),
    viteReact(),
  ],
})
```

**Step 4: Create D1 database (remote)**

```bash
npx wrangler d1 create expenses-tracker-db
```

Copy the `database_id` output into `wrangler.jsonc`.

**Step 5: Add deploy script to package.json**

```json
{
  "scripts": {
    "deploy": "pnpm build && wrangler deploy"
  }
}
```

**Step 6: Verify local dev still works**

```bash
pnpm dev
```

Expected: App loads. Wrangler provides local D1 bindings.

**Step 7: Commit**

```bash
git add .
git commit -m "feat: configure Cloudflare D1 and wrangler"
```

---

## Task 4: Set Up packages/db (Drizzle Schema)

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/src/index.ts`
- Create: `packages/db/src/schema.ts`
- Create: `packages/db/drizzle.config.ts`

**Step 1: Create packages/db with dependencies**

```json
// packages/db/package.json
{
  "name": "@tracker/db",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "drizzle-orm": "latest"
  },
  "devDependencies": {
    "drizzle-kit": "latest",
    "typescript": "^5.7.0"
  }
}
```

**Step 2: Define all tables in schema.ts**

```typescript
// packages/db/src/schema.ts
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  color: text('color'),
  icon: text('icon'),
  createdAt: text('created_at').default(sql`(current_timestamp)`).notNull(),
})

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  amount: integer('amount').notNull(), // stored in cents
  description: text('description'),
  date: text('date').notNull(), // YYYY-MM-DD
  categoryId: integer('category_id').references(() => categories.id),
  recurringId: integer('recurring_id').references(() => recurringRules.id),
  createdAt: text('created_at').default(sql`(current_timestamp)`).notNull(),
  updatedAt: text('updated_at').default(sql`(current_timestamp)`).notNull(),
})

export const recurringRules = sqliteTable('recurring_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  amount: integer('amount').notNull(), // stored in cents
  description: text('description'),
  categoryId: integer('category_id').references(() => categories.id),
  frequency: text('frequency', { enum: ['weekly', 'monthly', 'yearly'] }).notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: text('created_at').default(sql`(current_timestamp)`).notNull(),
})

export const investmentSnapshots = sqliteTable('investment_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(), // YYYY-MM-DD
  totalValue: integer('total_value').notNull(), // stored in cents
  note: text('note'),
  createdAt: text('created_at').default(sql`(current_timestamp)`).notNull(),
})

export const bankImports = sqliteTable('bank_imports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  filename: text('filename').notNull(),
  importedAt: text('imported_at').default(sql`(current_timestamp)`).notNull(),
  rowCount: integer('row_count'),
  status: text('status', { enum: ['pending', 'completed', 'partial'] }).default('pending').notNull(),
})
```

**Step 3: Create Drizzle config**

```typescript
// packages/db/drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
})
```

**Step 4: Export from index.ts**

```typescript
// packages/db/src/index.ts
export * from './schema'
```

**Step 5: Generate initial migration**

```bash
cd packages/db
pnpm db:generate
```

Expected: Migration files generated in `packages/db/drizzle/`.

**Step 6: Commit**

```bash
git add packages/db
git commit -m "feat: add Drizzle schema with all tables"
```

---

## Task 5: Set Up packages/shared (Zod Validators + Types)

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/validators.ts`
- Create: `packages/shared/src/types.ts`

**Step 1: Create packages/shared**

```json
// packages/shared/package.json
{
  "name": "@tracker/shared",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

**Step 2: Define Zod validators**

```typescript
// packages/shared/src/validators.ts
import { z } from 'zod'

export const transactionTypeSchema = z.enum(['income', 'expense'])
export const frequencySchema = z.enum(['weekly', 'monthly', 'yearly'])

export const createTransactionSchema = z.object({
  type: transactionTypeSchema,
  amount: z.number().int().positive(), // cents
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoryId: z.number().int().positive().optional(),
})

export const updateTransactionSchema = createTransactionSchema.partial()

export const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().optional(),
})

export const updateCategorySchema = createCategorySchema.partial()

export const createRecurringRuleSchema = z.object({
  type: transactionTypeSchema,
  amount: z.number().int().positive(),
  description: z.string().optional(),
  categoryId: z.number().int().positive().optional(),
  frequency: frequencySchema,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const updateRecurringRuleSchema = createRecurringRuleSchema.partial()

export const createInvestmentSnapshotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalValue: z.number().int().positive(), // cents
  note: z.string().optional(),
})

export const monthQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
})

export const yearQuerySchema = z.object({
  year: z.string().regex(/^\d{4}$/).optional(),
})

export const dateRangeQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}$/).optional(),
})
```

**Step 3: Define TypeScript types derived from Zod**

```typescript
// packages/shared/src/types.ts
import { z } from 'zod'
import type {
  createTransactionSchema,
  updateTransactionSchema,
  createCategorySchema,
  updateCategorySchema,
  createRecurringRuleSchema,
  updateRecurringRuleSchema,
  createInvestmentSnapshotSchema,
} from './validators'

export type CreateTransaction = z.infer<typeof createTransactionSchema>
export type UpdateTransaction = z.infer<typeof updateTransactionSchema>
export type CreateCategory = z.infer<typeof createCategorySchema>
export type UpdateCategory = z.infer<typeof updateCategorySchema>
export type CreateRecurringRule = z.infer<typeof createRecurringRuleSchema>
export type UpdateRecurringRule = z.infer<typeof updateRecurringRuleSchema>
export type CreateInvestmentSnapshot = z.infer<typeof createInvestmentSnapshotSchema>

export type TransactionType = 'income' | 'expense'
export type Frequency = 'weekly' | 'monthly' | 'yearly'
export type ImportStatus = 'pending' | 'completed' | 'partial'

// API response types
export interface Transaction {
  id: number
  type: TransactionType
  amount: number
  description: string | null
  date: string
  categoryId: number | null
  recurringId: number | null
  createdAt: string
  updatedAt: string
  category?: Category | null
}

export interface Category {
  id: number
  name: string
  color: string | null
  icon: string | null
  createdAt: string
}

export interface RecurringRule {
  id: number
  type: TransactionType
  amount: number
  description: string | null
  categoryId: number | null
  frequency: Frequency
  startDate: string
  endDate: string | null
  isActive: boolean
  createdAt: string
  category?: Category | null
}

export interface InvestmentSnapshot {
  id: number
  date: string
  totalValue: number
  note: string | null
  createdAt: string
}

export interface MonthlySummary {
  month: string
  income: number
  expenses: number
  balance: number
}

export interface CategoryBreakdown {
  categoryId: number
  categoryName: string
  categoryColor: string | null
  total: number
  percentage: number
}
```

**Step 4: Export from index.ts**

```typescript
// packages/shared/src/index.ts
export * from './validators'
export * from './types'
```

**Step 5: Commit**

```bash
git add packages/shared
git commit -m "feat: add shared Zod validators and types"
```

---

## Task 6: Set Up packages/db Query Functions

**Files:**
- Create: `packages/db/src/queries.ts`
- Modify: `packages/db/src/index.ts`

**Step 1: Write query functions for all tables**

These are plain functions that accept a Drizzle `db` instance. The web app passes the D1-backed instance; a future desktop app would pass a local SQLite instance.

```typescript
// packages/db/src/queries.ts
import { eq, and, gte, lte, like, desc, sql } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import * as schema from './schema'

type DB = DrizzleD1Database<typeof schema>

// --- Categories ---

export function getCategories(db: DB) {
  return db.select().from(schema.categories).orderBy(schema.categories.name)
}

export function getCategoryById(db: DB, id: number) {
  return db.select().from(schema.categories).where(eq(schema.categories.id, id)).get()
}

export function createCategory(db: DB, data: { name: string; color?: string; icon?: string }) {
  return db.insert(schema.categories).values(data).returning().get()
}

export function updateCategory(db: DB, id: number, data: Partial<{ name: string; color: string; icon: string }>) {
  return db.update(schema.categories).set(data).where(eq(schema.categories.id, id)).returning().get()
}

export function deleteCategory(db: DB, id: number) {
  return db.delete(schema.categories).where(eq(schema.categories.id, id))
}

// --- Transactions ---

export function getTransactions(db: DB, filters?: { month?: string; categoryId?: number; type?: string }) {
  let query = db.select().from(schema.transactions)
    .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
    .orderBy(desc(schema.transactions.date))

  // Filters applied dynamically in implementation
  return query
}

export function getTransactionById(db: DB, id: number) {
  return db.select().from(schema.transactions)
    .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
    .where(eq(schema.transactions.id, id))
    .get()
}

export function createTransaction(db: DB, data: {
  type: string; amount: number; description?: string; date: string;
  categoryId?: number; recurringId?: number;
}) {
  return db.insert(schema.transactions).values(data).returning().get()
}

export function updateTransaction(db: DB, id: number, data: Partial<{
  type: string; amount: number; description: string; date: string; categoryId: number;
}>) {
  return db.update(schema.transactions)
    .set({ ...data, updatedAt: sql`(current_timestamp)` })
    .where(eq(schema.transactions.id, id))
    .returning().get()
}

export function deleteTransaction(db: DB, id: number) {
  return db.delete(schema.transactions).where(eq(schema.transactions.id, id))
}

// --- Recurring Rules ---

export function getRecurringRules(db: DB) {
  return db.select().from(schema.recurringRules)
    .leftJoin(schema.categories, eq(schema.recurringRules.categoryId, schema.categories.id))
    .orderBy(desc(schema.recurringRules.createdAt))
}

export function getActiveRecurringRules(db: DB) {
  return db.select().from(schema.recurringRules)
    .where(eq(schema.recurringRules.isActive, true))
}

export function createRecurringRule(db: DB, data: {
  type: string; amount: number; description?: string; categoryId?: number;
  frequency: string; startDate: string; endDate?: string;
}) {
  return db.insert(schema.recurringRules).values(data).returning().get()
}

export function updateRecurringRule(db: DB, id: number, data: Partial<{
  type: string; amount: number; description: string; categoryId: number;
  frequency: string; startDate: string; endDate: string; isActive: boolean;
}>) {
  return db.update(schema.recurringRules).set(data)
    .where(eq(schema.recurringRules.id, id)).returning().get()
}

export function deleteRecurringRule(db: DB, id: number) {
  // Soft delete: set isActive to false
  return db.update(schema.recurringRules)
    .set({ isActive: false })
    .where(eq(schema.recurringRules.id, id))
    .returning().get()
}

// --- Investment Snapshots ---

export function getInvestmentSnapshots(db: DB, range?: { from?: string; to?: string }) {
  return db.select().from(schema.investmentSnapshots)
    .orderBy(desc(schema.investmentSnapshots.date))
}

export function createInvestmentSnapshot(db: DB, data: { date: string; totalValue: number; note?: string }) {
  return db.insert(schema.investmentSnapshots).values(data).returning().get()
}

export function deleteInvestmentSnapshot(db: DB, id: number) {
  return db.delete(schema.investmentSnapshots).where(eq(schema.investmentSnapshots.id, id))
}

// --- Bank Imports ---

export function createBankImport(db: DB, data: { filename: string; rowCount: number; status: string }) {
  return db.insert(schema.bankImports).values(data).returning().get()
}

export function getBankImports(db: DB) {
  return db.select().from(schema.bankImports).orderBy(desc(schema.bankImports.importedAt))
}

// --- Stats ---

export function getMonthlySummary(db: DB, year: string) {
  return db.run(sql`
    SELECT
      substr(date, 1, 7) as month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses,
      SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as balance
    FROM transactions
    WHERE date LIKE ${year + '%'}
    GROUP BY substr(date, 1, 7)
    ORDER BY month
  `)
}

export function getCategoryBreakdown(db: DB, month: string) {
  return db.run(sql`
    SELECT
      c.id as category_id,
      c.name as category_name,
      c.color as category_color,
      SUM(t.amount) as total
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.date LIKE ${month + '%'} AND t.type = 'expense'
    GROUP BY c.id
    ORDER BY total DESC
  `)
}

// --- Recurring Generation ---

export function getLastGeneratedTransaction(db: DB, recurringId: number) {
  return db.select().from(schema.transactions)
    .where(eq(schema.transactions.recurringId, recurringId))
    .orderBy(desc(schema.transactions.date))
    .limit(1)
    .get()
}
```

**Step 2: Update index.ts exports**

```typescript
// packages/db/src/index.ts
export * from './schema'
export * from './queries'
```

**Step 3: Commit**

```bash
git add packages/db
git commit -m "feat: add reusable Drizzle query functions"
```

---

## Task 7: Set Up Tailwind CSS v4 + shadcn/ui

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/styles/app.css`
- Create: `apps/web/components.json`
- Modify: `apps/web/vite.config.ts`
- Create: `apps/web/src/lib/utils.ts`

**Step 1: Install Tailwind CSS v4**

```bash
cd apps/web
pnpm add tailwindcss @tailwindcss/vite
```

**Step 2: Add Tailwind plugin to vite.config.ts**

Add `tailwindcss()` to the plugins array (before other plugins).

**Step 3: Create app.css with Tailwind import**

```css
/* apps/web/src/styles/app.css */
@import "tailwindcss";
```

**Step 4: Link stylesheet in __root.tsx head**

```tsx
links: [
  { rel: 'stylesheet', href: appCss },
]
```

**Step 5: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

Configure:
- Style: default
- Base color: neutral
- CSS variables: yes
- RSC: no
- Aliases: `@/components` → `~/components`, `@/lib` → `~/lib`

**Step 6: Create lib/utils.ts**

```typescript
// apps/web/src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

export function parseToCents(value: string): number {
  return Math.round(parseFloat(value) * 100)
}
```

**Step 7: Install core shadcn components needed for the app**

```bash
npx shadcn@latest add button card input label select dialog table form date-picker badge separator dropdown-menu sheet tabs chart
```

**Step 8: Verify Tailwind works — add a styled element to index.tsx**

**Step 9: Commit**

```bash
git add .
git commit -m "feat: set up Tailwind CSS v4 and shadcn/ui"
```

---

## Task 8: D1 Database Connection + Server Helpers

**Files:**
- Create: `apps/web/src/server/db.ts`
- Create: `apps/web/src/server/api-helpers.ts`

**Step 1: Create database helper that gets D1 binding**

```typescript
// apps/web/src/server/db.ts
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@tracker/db'

export function getDB(d1: D1Database) {
  return drizzle(d1, { schema })
}
```

How to access `env.DB` from TanStack Start server functions will depend on how Cloudflare bindings are exposed. Consult the TanStack Start Cloudflare hosting docs at implementation time — it may use `getWebRequest()` or `getCloudflareContext()` from the Cloudflare plugin.

**Step 2: Create API response helpers**

```typescript
// apps/web/src/server/api-helpers.ts
export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

**Step 3: Commit**

```bash
git add apps/web/src/server
git commit -m "feat: add D1 database helper and API utilities"
```

---

## Task 9: App Layout (Sidebar + Shell)

**Files:**
- Create: `apps/web/src/components/layout/sidebar.tsx`
- Create: `apps/web/src/components/layout/mobile-nav.tsx`
- Modify: `apps/web/src/routes/__root.tsx`

**Skill:** Use `frontend-design` skill for this task — the layout is the foundation of the entire app's visual identity.

**Step 1: Build sidebar component**

Navigation items:
- Dashboard (`/`)
- Transactions (`/transactions`)
- Recurring (`/recurring`)
- Investments (`/investments`)
- Import (`/import`)
- Categories (`/categories`)
- Stats (`/stats`)

Use shadcn Sheet for mobile sidebar, Lucide icons for nav items. Active route highlighting via TanStack Router's `Link` component with `activeProps`.

**Step 2: Build mobile bottom nav**

Responsive: sidebar visible on `md:` and up, bottom nav on small screens. Show top 5 items in bottom nav.

**Step 3: Integrate into __root.tsx**

Root layout wraps `<Outlet />` with sidebar + main content area.

**Step 4: Verify navigation works between routes**

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add app layout with sidebar navigation"
```

---

## Task 10: Categories CRUD (API + Pages)

**Files:**
- Create: `apps/web/src/routes/api/categories.ts`
- Create: `apps/web/src/routes/categories.tsx`
- Create: `apps/web/src/components/categories/category-form.tsx`
- Create: `apps/web/src/components/categories/category-list.tsx`

**Step 1: Write failing test — category creation API**

Test: POST to `/api/categories` with `{ name: "Food", color: "#22c55e" }` returns 201 with the created category.

**Step 2: Implement API route**

```typescript
// apps/web/src/routes/api/categories.ts
// Handle GET (list), POST (create)
// Validate input with @tracker/shared validators
// Call @tracker/db query functions
```

**Step 3: Run test to verify it passes**

**Step 4: Implement categories page with server functions**

- Loader: fetch all categories
- Category list with color dots and edit/delete actions
- Dialog form for create/edit (name, color picker, icon select)
- Delete confirmation

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add categories CRUD with API and page"
```

---

## Task 11: Transactions CRUD (API + Pages)

**Files:**
- Create: `apps/web/src/routes/api/transactions.ts`
- Create: `apps/web/src/routes/transactions/index.tsx`
- Create: `apps/web/src/routes/transactions/new.tsx`
- Create: `apps/web/src/components/transactions/transaction-form.tsx`
- Create: `apps/web/src/components/transactions/transaction-table.tsx`
- Create: `apps/web/src/components/transactions/transaction-filters.tsx`

**Step 1: Write failing test — transaction creation API**

Test: POST to `/api/transactions` with `{ type: "expense", amount: 2450, date: "2026-03-09", categoryId: 1 }` returns 201.

**Step 2: Implement API routes**

```
GET    /api/transactions?month=2026-03&category=1&type=expense
POST   /api/transactions
PUT    /api/transactions/:id
DELETE /api/transactions/:id
```

Validate with Zod, call query functions, return JSON.

**Step 3: Run test to verify**

**Step 4: Build transaction list page**

- shadcn DataTable with columns: date, description, category (badge with color), amount (green/red), actions
- Filter bar: month picker, category select, income/expense toggle
- Pagination

**Step 5: Build add transaction page**

- Form with: type toggle (income/expense), amount input (with currency formatting), date picker, description text input, category select
- Submit calls server function → creates transaction → redirects to list

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add transactions CRUD with API, list, and form"
```

---

## Task 12: Dashboard

**Files:**
- Modify: `apps/web/src/routes/index.tsx`
- Create: `apps/web/src/components/dashboard/summary-cards.tsx`
- Create: `apps/web/src/components/dashboard/monthly-chart.tsx`
- Create: `apps/web/src/components/dashboard/recent-transactions.tsx`

**Skill:** Use `frontend-design` skill — the dashboard is the main screen users see.

**Step 1: Implement dashboard loader**

Server function that fetches:
- Current month summary (income, expenses, balance)
- Monthly chart data (last 6 months)
- Recent 10 transactions
- Triggers recurring transaction generation (see Task 14)

**Step 2: Build summary cards**

Three cards: Income (green), Expenses (red), Balance (neutral). Show amounts formatted with currency. Show percentage change vs previous month.

**Step 3: Build monthly bar chart**

shadcn chart (bar) showing income vs expenses for last 6 months.

**Step 4: Build recent transactions list**

Compact list of last 10 transactions with category badge, amount, date. "View all" link to `/transactions`.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add dashboard with summary cards, chart, and recent transactions"
```

---

## Task 13: Recurring Rules CRUD

**Files:**
- Create: `apps/web/src/routes/api/recurring.ts`
- Create: `apps/web/src/routes/recurring.tsx`
- Create: `apps/web/src/components/recurring/recurring-form.tsx`
- Create: `apps/web/src/components/recurring/recurring-list.tsx`

**Step 1: Write failing test — recurring rule creation**

**Step 2: Implement API routes**

```
GET    /api/recurring
POST   /api/recurring
PUT    /api/recurring/:id
DELETE /api/recurring/:id  (soft-delete: sets is_active=false)
```

**Step 3: Build recurring rules page**

- List of rules with: description, amount, frequency badge, category, active/paused status
- Toggle active/inactive
- Create/edit dialog form with: type, amount, description, category, frequency select, start date, optional end date

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add recurring rules CRUD with API and page"
```

---

## Task 14: Recurring Transaction Auto-Generation

**Files:**
- Create: `apps/web/src/server/recurring.ts`
- Modify: `apps/web/src/routes/index.tsx` (dashboard loader)

**Step 1: Write failing test — generation logic**

Test: Given a monthly rule starting 2026-01-01 and no transactions, generate Jan, Feb, Mar transactions.
Test: Given same rule with Feb transaction already existing, only generate Mar.

**Step 2: Implement generation function**

```typescript
// apps/web/src/server/recurring.ts
// generateMissingTransactions(db: DB): Promise<number>
//
// 1. Fetch all active recurring rules
// 2. For each rule, find last generated transaction (by recurring_id)
// 3. Calculate all missing dates between (last generated or start_date) and today
// 4. Insert missing transactions
// 5. Return count of generated transactions
```

Date calculation logic per frequency:
- `monthly`: add 1 month to last date, repeat until > today
- `weekly`: add 7 days
- `yearly`: add 1 year

**Step 3: Run tests to verify**

**Step 4: Call from dashboard loader**

In the dashboard's server function, call `generateMissingTransactions(db)` before fetching summary data.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add recurring transaction auto-generation on dashboard load"
```

---

## Task 15: Stats Page

**Files:**
- Create: `apps/web/src/routes/api/stats.ts`
- Create: `apps/web/src/routes/stats.tsx`
- Create: `apps/web/src/components/stats/monthly-trend-chart.tsx`
- Create: `apps/web/src/components/stats/category-breakdown-chart.tsx`

**Step 1: Implement stats API routes**

```
GET /api/stats/monthly-summary?year=2026
GET /api/stats/category-breakdown?month=2026-03
```

**Step 2: Build stats page**

- Year selector (tabs or dropdown)
- Monthly trend line chart (income, expenses, balance over 12 months)
- Category breakdown donut/pie chart for selected month
- Table below donut chart showing category, total, percentage

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add stats page with monthly trends and category breakdown"
```

---

## Task 16: Bank Statement Import (Tier 2)

**Files:**
- Create: `apps/web/src/routes/api/import.ts`
- Create: `apps/web/src/routes/import.tsx`
- Create: `apps/web/src/components/import/file-upload.tsx`
- Create: `apps/web/src/components/import/column-mapper.tsx`
- Create: `apps/web/src/components/import/preview-table.tsx`
- Create: `apps/web/src/server/parsers/csv.ts`
- Create: `apps/web/src/server/parsers/ofx.ts`

**Step 1: Write failing test — CSV parsing**

Test: Given a CSV string with "Date,Description,Amount" header, parse into array of `{ date, description, amount }`.

**Step 2: Implement CSV parser**

Handle: comma/semicolon delimiters, quoted fields, various date formats, negative amounts as expenses.

**Step 3: Implement OFX parser**

Parse OFX/QFX XML-like format into same structure.

**Step 4: Implement import API route**

```
POST /api/import/bank-statement  (multipart form data)
GET  /api/import/history
```

POST returns parsed rows for preview, doesn't persist yet. Client confirms → second POST with selected rows.

**Step 5: Build multi-step import UI**

1. File drop zone (shadcn + native file input)
2. Column mapping step (for CSV: map detected columns to date/description/amount/skip)
3. Preview table with checkboxes, duplicate warnings, category suggestions
4. Confirm button → creates transactions + bank_imports record

**Step 6: Implement duplicate detection**

Match existing transactions by date + amount + similar description (Levenshtein or substring).

**Step 7: Implement category suggestion**

Look up past transactions with similar descriptions, suggest same category.

**Step 8: Commit**

```bash
git add .
git commit -m "feat: add bank statement import with CSV/OFX parsing"
```

---

## Task 17: Investment Snapshots (Tier 2)

**Files:**
- Create: `apps/web/src/routes/api/investments.ts`
- Create: `apps/web/src/routes/investments.tsx`
- Create: `apps/web/src/components/investments/snapshot-form.tsx`
- Create: `apps/web/src/components/investments/growth-chart.tsx`
- Create: `apps/web/src/components/investments/snapshot-history.tsx`

**Step 1: Implement API routes**

```
GET    /api/investments?from=YYYY-MM&to=YYYY-MM
POST   /api/investments
DELETE /api/investments/:id
```

**Step 2: Build investments page**

- Top: current portfolio value (latest snapshot) + total gain/loss %
- Line chart showing value over time
- "Add snapshot" button → dialog with date, amount, optional note
- History list below chart

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add investment snapshots with growth chart"
```

---

## Task 18: Cloudflare Zero Trust Setup

**Files:**
- Modify: `apps/web/wrangler.jsonc` (if needed)

**Step 1: Configure Cloudflare Access**

This is done in the Cloudflare dashboard, not in code:

1. Go to Cloudflare Zero Trust → Access → Applications
2. Create application → Self-hosted
3. Set domain to your app's domain
4. Add policy: allow your email address
5. Set session duration

**Step 2: Deploy and verify**

```bash
cd apps/web
pnpm deploy
```

Verify: accessing the app redirects to Cloudflare Access login. After authenticating with your email, you can access the app.

**Step 3: Commit any config changes**

```bash
git add .
git commit -m "docs: add Cloudflare Zero Trust setup notes"
```

---

## Task 19: Final Polish + Deploy

**Files:**
- Various touch-ups across components

**Step 1: Dark/light theme toggle**

shadcn has built-in support. Add toggle in sidebar footer.

**Step 2: Responsive pass**

Test all pages on mobile viewport. Ensure tables become card lists, sidebar becomes bottom nav, forms are full-width.

**Step 3: Loading states**

Add skeleton loaders (shadcn Skeleton) to dashboard cards, transaction table, charts.

**Step 4: Error boundaries**

Add `errorComponent` to routes for graceful error handling.

**Step 5: Final deploy**

```bash
cd apps/web
pnpm deploy
```

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add dark mode, responsive polish, loading states"
```

---

## Execution Notes

**Recommended skills during implementation:**
- `frontend-design` — Tasks 9, 12 (layout and dashboard)
- `superpowers:test-driven-development` — Tasks 10, 11, 14, 16 (critical logic)
- `superpowers:subagent-driven-development` — Tasks 4+5 (packages), Tasks 10+13 (CRUD), Tasks 16+17 (Tier 2)
- `superpowers:verification-before-completion` — Before each deploy
- `context7` MCP server — For up-to-date API docs on TanStack Start, Drizzle, shadcn/ui

**Parallelizable tasks:**
- Tasks 4 + 5 (packages/db + packages/shared) — independent packages
- Tasks 10 + 13 (transactions + recurring CRUD) — after categories exist
- Tasks 16 + 17 (import + investments) — Tier 2, fully independent

**Dependencies:**
- Task 2 → Task 3 → Task 7 → Task 8 (web app setup chain)
- Task 4 + 5 → Task 6 (schema before queries)
- Task 8 → Tasks 10, 11, 13 (DB connection before CRUD)
- Task 10 → Task 12 (transactions before dashboard)
- Task 13 → Task 14 (rules before auto-generation)
- Task 14 → Task 12 (generation integrated into dashboard)
