# Expenses Tracker v2 — Design Document

## Overview

Personal finance app (solo user) for tracking expenses, income, recurring transactions, bank statement imports, and investment snapshots. Replaces the v1 React/Redux/Firebase app with a modern full-stack architecture.

## Tech Stack

| Component | Choice |
|-----------|--------|
| Framework | TanStack Start (React, Vinxi, Vite) |
| Database | Cloudflare D1 (SQLite at edge) + Drizzle ORM |
| Auth | Cloudflare Zero Trust / Access (no app-level code) |
| UI | shadcn/ui + Tailwind CSS v4 |
| Charts | shadcn/ui charts (Recharts under the hood) |
| Validation | Zod (shared client + server) |
| Monorepo | Turborepo + pnpm workspaces |
| Deploy | Single Cloudflare Worker, free tier |

## Architecture

Single TanStack Start app serving both SSR pages (via server functions) and REST API endpoints (for future desktop/mobile clients). Both entry points share the same Drizzle query layer in `packages/db`.

```
Browser  → Page loader (server function) → @tracker/db → D1
Desktop  → /api/transactions             → @tracker/db → D1
Mobile   → /api/transactions             → @tracker/db → D1
                                            ↑ same code
```

## Monorepo Structure

```
expenses-tracker-v2/
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── apps/
│   └── web/                    ← TanStack Start app
│       ├── app/
│       │   ├── routes/         ← pages
│       │   ├── api/            ← REST endpoints
│       │   ├── server/         ← server functions
│       │   └── components/     ← app-specific UI
│       ├── drizzle/            ← migrations
│       ├── wrangler.toml       ← Cloudflare config
│       └── package.json
├── packages/
│   ├── db/                     ← Drizzle schema + query functions
│   │   ├── schema.ts
│   │   ├── queries.ts
│   │   └── package.json
│   ├── shared/                 ← Zod schemas, types, constants
│   │   ├── validators.ts
│   │   ├── types.ts
│   │   └── package.json
│   └── ui/                     ← shadcn/ui components (for future sharing)
│       └── package.json
```

## Data Model

All monetary amounts stored as integers (cents) to avoid floating point errors.

### categories

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| name | TEXT NOT NULL UNIQUE | |
| color | TEXT | hex color for charts |
| icon | TEXT | optional icon identifier |
| created_at | TIMESTAMP | |

### transactions

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| type | TEXT NOT NULL | 'income' or 'expense' |
| amount | INTEGER NOT NULL | stored in cents |
| description | TEXT | |
| date | TEXT NOT NULL | YYYY-MM-DD |
| category_id | INTEGER FK → categories | |
| recurring_id | INTEGER FK → recurring_rules | NULL if one-off |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### recurring_rules

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| type | TEXT NOT NULL | 'income' or 'expense' |
| amount | INTEGER NOT NULL | stored in cents |
| description | TEXT | |
| category_id | INTEGER FK → categories | |
| frequency | TEXT NOT NULL | 'weekly', 'monthly', 'yearly' |
| start_date | TEXT NOT NULL | |
| end_date | TEXT | NULL = ongoing |
| is_active | BOOLEAN DEFAULT true | |
| created_at | TIMESTAMP | |

### investment_snapshots

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| date | TEXT NOT NULL | YYYY-MM-DD |
| total_value | INTEGER NOT NULL | stored in cents |
| note | TEXT | e.g. "added 500 to ETF" |
| created_at | TIMESTAMP | |

### bank_imports

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| filename | TEXT NOT NULL | |
| imported_at | TIMESTAMP | |
| row_count | INTEGER | transactions imported |
| status | TEXT | 'pending', 'completed', 'partial' |

## API Endpoints

```
GET    /api/transactions?month=YYYY-MM&category=slug
POST   /api/transactions
PUT    /api/transactions/:id
DELETE /api/transactions/:id

GET    /api/categories
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id

GET    /api/recurring
POST   /api/recurring
PUT    /api/recurring/:id
DELETE /api/recurring/:id

GET    /api/investments?from=YYYY-MM&to=YYYY-MM
POST   /api/investments
DELETE /api/investments/:id

POST   /api/import/bank-statement    (multipart file upload)
GET    /api/import/history

GET    /api/stats/monthly-summary?year=YYYY
GET    /api/stats/category-breakdown?month=YYYY-MM
```

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Dashboard — monthly summary cards, charts, recent transactions |
| `/transactions` | Full transaction list with filters, sort, pagination |
| `/transactions/new` | Add transaction form |
| `/recurring` | Manage recurring rules |
| `/investments` | Investment snapshot timeline + growth chart |
| `/import` | Upload bank statement, review & confirm |
| `/categories` | Manage categories (name, color, icon) |
| `/stats` | Detailed analytics — trends, category breakdown |

## UI Design

- Sidebar navigation + main content area
- Summary cards at top of dashboard (income, expenses, balance)
- shadcn DataTable (TanStack Table) for transaction lists
- shadcn Form (React Hook Form + Zod) for all forms
- Responsive: sidebar collapses to bottom nav on mobile
- Dark/light theme via shadcn theme support

## Key Behaviors

### Recurring Transaction Generation

Generated on dashboard load (no cron). Server function checks active rules, finds latest generated transaction per rule, backfills all missing occurrences up to today.

- Edit amount → future transactions use new amount, past untouched
- Pause rule → `is_active = false`, no new transactions
- Delete rule → soft-delete, past transactions remain

### Bank Statement Import

Multi-step guided flow:

1. Upload file (CSV or OFX)
2. Auto-detect format
3. CSV: column mapping step (remembered per bank pattern)
4. Preview parsed transactions with duplicate detection
5. Category suggestion based on past transactions with similar descriptions
6. User reviews, selects rows, confirms import

### Investment Tracking

Simple manual snapshots: date + total portfolio value + optional note. Line chart shows growth over time. Summary shows total gain/loss % since first snapshot.

## Feature Tiers

### Tier 1 — Core (MVP)

- Transactions: add, edit, delete (income + expense)
- Categories: create, assign, color/icon
- Recurring rules with auto-generation
- Dashboard with summary cards + charts
- Transaction list with filters/sort/pagination
- Stats page with trends + category breakdown

### Tier 2 — Soon After

- Bank statement import (CSV/OFX)
- Investment snapshots
- Budget goals per category

### Tier 3 — Nice to Have

- Multi-currency support
- Data export (CSV)
- i18n (EN/FR)
- Dark/light theme

## Deployment

- Single Cloudflare Worker on free tier (100K requests/day, 5M D1 reads/day)
- Cloudflare Zero Trust for auth (free for up to 50 users)
- D1 for database (5GB storage free)
- No background jobs — all processing happens on request
