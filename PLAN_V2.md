# Finance App v2.0 — Architecture & Implementation Plan

## Overview

A complete rewrite of the expenses tracker into a **full-stack personal finance platform** using **TanStack Start** (full-stack React framework with SSR, file-based routing, and server functions).

---

## Recommended Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | TanStack Start | Full-stack React, SSR, file-based routing, server functions, type-safe |
| **Language** | TypeScript (strict) | End-to-end type safety |
| **Database** | PostgreSQL | Relational data (transactions, categories, accounts) fits perfectly |
| **ORM** | Drizzle ORM | Lightweight, type-safe, SQL-like, great DX with migrations |
| **Auth** | Better Auth | Modern, self-hosted, supports OAuth + email/password, session-based |
| **Validation** | Zod | Schema validation shared between client & server |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Utility-first CSS + accessible component primitives |
| **Charts** | Recharts (keep) | Already familiar, React-native, good enough for dashboards |
| **State** | TanStack Router built-in (search params + loaders) | No need for Redux — loader data + URL state covers 90% of cases |
| **Forms** | TanStack Form | Type-safe forms, integrates with Zod |
| **Tables** | TanStack Table | Headless, sortable, filterable, paginated tables |
| **Date handling** | date-fns | Tree-shakeable, modern replacement for moment.js |
| **File parsing** | Papa Parse (CSV) + custom OFX parser | Bank statement import |
| **i18n** | Paraglide.js (or keep i18next) | Compile-time i18n, tree-shakeable, type-safe |
| **Deployment** | Docker / VPS or Vercel | Self-hostable by default |

---

## Database Schema (Drizzle / PostgreSQL)

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   users      │     │   accounts       │     │   categories     │
├──────────────┤     ├──────────────────┤     ├──────────────────┤
│ id (PK)      │────<│ userId (FK)      │     │ id (PK)          │
│ email        │     │ id (PK)          │     │ userId (FK)      │
│ name         │     │ name             │     │ name             │
│ password     │     │ type (checking/  │     │ type (expense/   │
│ currency     │     │   savings/cash/  │     │   income/both)   │
│ locale       │     │   investment)    │     │ icon             │
│ createdAt    │     │ currency         │     │ color            │
│ updatedAt    │     │ balance          │     │ parentId (FK,    │
└──────────────┘     │ institution      │     │   self-ref)      │
                     │ createdAt        │     │ createdAt        │
                     └──────────────────┘     └──────────────────┘
                            │                        │
                            │                        │
                     ┌──────────────────┐            │
                     │  transactions    │            │
                     ├──────────────────┤            │
                     │ id (PK)          │            │
                     │ userId (FK)      │────────────┘
                     │ accountId (FK)   │
                     │ categoryId (FK)  │
                     │ type (income/    │
                     │   expense/       │
                     │   transfer)      │
                     │ amount           │
                     │ description      │
                     │ date             │
                     │ isRecurring      │
                     │ recurringRuleId  │
                     │ importSource     │
                     │ importId (dedup) │
                     │ notes            │
                     │ createdAt        │
                     └──────────────────┘
                            │
                     ┌──────────────────┐     ┌──────────────────┐
                     │ recurring_rules  │     │   budgets        │
                     ├──────────────────┤     ├──────────────────┤
                     │ id (PK)          │     │ id (PK)          │
                     │ userId (FK)      │     │ userId (FK)      │
                     │ categoryId (FK)  │     │ categoryId (FK)  │
                     │ accountId (FK)   │     │ amount           │
                     │ type             │     │ period (monthly/ │
                     │ amount           │     │   weekly/yearly) │
                     │ description      │     │ startDate        │
                     │ frequency (daily/│     │ endDate          │
                     │  weekly/monthly/ │     │ createdAt        │
                     │  yearly)         │     └──────────────────┘
                     │ interval         │
                     │ dayOfMonth       │     ┌──────────────────┐
                     │ dayOfWeek        │     │  investments     │
                     │ startDate        │     ├──────────────────┤
                     │ endDate          │     │ id (PK)          │
                     │ nextOccurrence   │     │ userId (FK)      │
                     │ isActive         │     │ accountId (FK)   │
                     │ createdAt        │     │ symbol/ticker    │
                     └──────────────────┘     │ name             │
                                              │ type (stock/etf/ │
                                              │   crypto/bond/   │
                                              │   mutual_fund)   │
                                              │ shares           │
                                              │ avgCostBasis     │
                                              │ currency         │
                                              │ createdAt        │
                                              │ updatedAt        │
                                              └──────────────────┘

                     ┌──────────────────┐
                     │  import_logs     │
                     ├──────────────────┤
                     │ id (PK)          │
                     │ userId (FK)      │
                     │ accountId (FK)   │
                     │ filename         │
                     │ format (csv/ofx/ │
                     │   qif)           │
                     │ rowsImported     │
                     │ rowsSkipped      │
                     │ importedAt       │
                     └──────────────────┘
```

---

## Route Structure (file-based routing)

```
app/
├── routes/
│   ├── __root.tsx                    # Root layout (nav, sidebar, theme)
│   ├── index.tsx                     # Landing / marketing page
│   ├── _authed.tsx                   # Auth-guarded layout
│   ├── _authed/
│   │   ├── dashboard.tsx             # Main dashboard (overview)
│   │   ├── transactions.tsx          # Transaction list + filters
│   │   ├── transactions.$id.tsx      # Transaction detail/edit
│   │   ├── transactions.new.tsx      # Add transaction
│   │   ├── recurring.tsx             # Manage recurring transactions
│   │   ├── budgets.tsx               # Budget management
│   │   ├── categories.tsx            # Category management
│   │   ├── accounts.tsx              # Account management
│   │   ├── import.tsx                # Bank statement import
│   │   ├── investments.tsx           # Investment portfolio
│   │   ├── statistics.tsx            # Charts & analytics
│   │   └── settings.tsx              # Profile, preferences, export
│   ├── login.tsx
│   ├── signup.tsx
│   └── forgot-password.tsx
├── components/                       # Shared UI components
├── server/                           # Server functions & API logic
│   ├── db/
│   │   ├── schema.ts                 # Drizzle schema definitions
│   │   └── index.ts                  # DB connection
│   ├── functions/
│   │   ├── transactions.ts           # Transaction CRUD server fns
│   │   ├── categories.ts
│   │   ├── accounts.ts
│   │   ├── recurring.ts
│   │   ├── budgets.ts
│   │   ├── investments.ts
│   │   ├── import.ts                 # Bank statement parsing
│   │   └── stats.ts                  # Aggregation queries
│   └── auth.ts                       # Better Auth config
├── lib/
│   ├── validators.ts                 # Zod schemas (shared client/server)
│   ├── currency.ts                   # Currency formatting
│   ├── date.ts                       # Date helpers
│   └── import-parsers/               # CSV/OFX/QIF parsers
└── styles/
    └── globals.css                   # Tailwind base + theme tokens
```

---

## Feature Breakdown

### Phase 1 — Core Foundation
> Get the app running with the essential features that match (and exceed) v1.

1. **Project scaffolding**
   - TanStack Start project with TypeScript
   - Tailwind v4 + shadcn/ui setup
   - Drizzle ORM + PostgreSQL connection + initial migrations
   - Better Auth setup (email/password + Google OAuth)
   - i18n setup (EN/FR)

2. **Authentication**
   - Sign up / Log in / Log out
   - Password reset flow
   - OAuth (Google) — new in v2
   - Session-based auth (more secure than token-in-localStorage)
   - Protected route layout (`_authed.tsx`)

3. **Accounts**
   - CRUD for financial accounts (checking, savings, cash)
   - Each account has its own balance and currency
   - Default account for quick entry

4. **Categories**
   - CRUD with icon + color picker
   - Hierarchical categories (parent/child, e.g. "Food > Groceries")
   - Seeded defaults (rent, groceries, salary, utilities, etc.)
   - Category type: income / expense / both

5. **Transactions (Expenses & Income)**
   - Add / edit / delete transactions
   - Assign to account + category
   - Date picker, amount, description, notes
   - Type: income / expense / transfer (between accounts)
   - Quick-add form on dashboard
   - Full list with search, sort, filter (TanStack Table)
   - Pagination with URL-based state (search params)

6. **Dashboard**
   - Monthly overview: total income, total expenses, net savings
   - Trend indicators (vs. previous month, %)
   - Recent transactions list
   - Spending by category (donut/bar chart)
   - Monthly cash flow chart (income vs expenses over 12 months)

### Phase 2 — Recurring & Budgets
> Automate repetitive entries and set spending goals.

7. **Recurring Transactions**
   - Define rules: amount, category, frequency (daily/weekly/monthly/yearly)
   - Auto-generate upcoming transactions
   - Dashboard widget: "Upcoming this week/month"
   - Pause / resume / edit / delete rules
   - Smart detection: suggest recurring patterns from transaction history

8. **Budgets**
   - Set monthly/weekly/yearly budget per category
   - Progress bars showing spent vs. budget
   - Alerts when approaching or exceeding budget (80% / 100%)
   - Budget overview page with all categories
   - Historical budget vs. actual comparison

### Phase 3 — Import & Data
> Bring in external financial data.

9. **Bank Statement Import**
   - Upload CSV / OFX / QIF files
   - Column mapping UI for CSV (map columns to: date, amount, description)
   - Preview imported rows before confirming
   - Duplicate detection (by date + amount + description hash)
   - Auto-categorization suggestions (based on description matching)
   - Import history log
   - Save mapping templates per bank for reuse

10. **Data Export**
    - Export transactions as CSV / JSON
    - Date range and account filters
    - Full data export (GDPR-style)

### Phase 4 — Investments
> Track portfolio and net worth.

11. **Investment Portfolio**
    - Add holdings: stock/ETF/crypto/bond with ticker, shares, cost basis
    - Current price fetching (free API: Yahoo Finance via unofficial API, or Alpha Vantage free tier)
    - Portfolio dashboard: total value, total gain/loss, allocation pie chart
    - Individual holding cards with performance
    - Historical value tracking (daily snapshots stored in DB)
    - Support multiple investment accounts (brokerage, retirement, crypto)

12. **Net Worth Tracker**
    - Aggregate: all account balances + investment portfolio value
    - Monthly net worth snapshot (auto-recorded)
    - Net worth over time chart
    - Breakdown by account type

### Phase 5 — Polish & Advanced
> Power-user features and refinements.

13. **Advanced Statistics**
    - Spending trends (month-over-month, year-over-year)
    - Income vs. expenses over custom date ranges
    - Category breakdown with drill-down
    - Average daily spending
    - Savings rate percentage
    - Filter by account, category, date range, type

14. **Search & Filters**
    - Global transaction search (description, notes, category, amount range)
    - Saved filter presets
    - URL-driven filters (shareable/bookmarkable)

15. **UI/UX Enhancements**
    - Dark mode / light mode toggle (Tailwind + CSS variables)
    - Keyboard shortcuts (Cmd+N for new transaction, etc.)
    - Mobile-responsive design (works great on phone)
    - Onboarding wizard for first-time setup
    - Toast notifications for actions

16. **Multi-currency Support**
    - Per-account currency
    - Automatic conversion for dashboard totals
    - Historical exchange rates

---

## Architecture Principles

### Server Functions (no separate API)
TanStack Start server functions replace the need for a REST API. Each function is colocated, type-safe, and called like a normal async function from the client:

```ts
// server/functions/transactions.ts
export const getTransactions = createServerFn('GET', async (filters) => {
  const session = await getSession()
  return db.select().from(transactions)
    .where(and(
      eq(transactions.userId, session.userId),
      // ...filters
    ))
})
```

### Data Loading Strategy
- **Route loaders** prefetch data before render (no loading spinners for initial load)
- **Search params** drive filter/sort/pagination state (URL = source of truth)
- **Optimistic updates** for mutations (instant UI feedback)

### Validation
- Zod schemas defined once in `lib/validators.ts`
- Shared between client-side forms (TanStack Form) and server functions
- Single source of truth for types via `z.infer<typeof schema>`

### Security
- Server functions run server-side only — no API keys or DB credentials leak
- Session-based auth (httpOnly cookies, not localStorage)
- All DB queries scoped to `userId` — no cross-user data access
- Input validation on both client and server
- CSRF protection via Better Auth

---

## Migration Path from v1

| v1 (Current) | v2 (New) |
|--------------|----------|
| React 16 + CRA | TanStack Start (Vinxi/Vite) |
| Redux + Thunks | Route loaders + server state |
| Firebase Realtime DB | PostgreSQL + Drizzle |
| Axios + REST | Server functions (RPC-style) |
| Firebase Auth | Better Auth (self-hosted) |
| SCSS Modules | Tailwind CSS v4 + shadcn/ui |
| moment.js | date-fns |
| Class components | Function components + hooks |
| localStorage tokens | httpOnly session cookies |

The v2 is a **full rewrite** — no incremental migration. The v1 codebase serves as feature reference only. A data export script can be written to migrate existing Firebase data into PostgreSQL if needed.

---

## Implementation Order

```
Phase 1 (Core)        ██████████████████████████  ~60% of effort
Phase 2 (Recurring)   ██████████                  ~15% of effort
Phase 3 (Import)      ██████████                  ~12% of effort
Phase 4 (Investments) ██████                      ~8% of effort
Phase 5 (Polish)      ████                        ~5% of effort
```

Start with Phase 1 — it delivers a fully usable app. Each subsequent phase adds a self-contained feature set that can be shipped independently.

---

## Suggested Initial File to Start

Begin with project scaffolding:
1. `npx create-start-app@latest` (TanStack Start)
2. Add Drizzle + PostgreSQL
3. Add Better Auth
4. Add Tailwind + shadcn/ui
5. Create DB schema + run first migration
6. Build auth pages (login/signup)
7. Build the dashboard shell with sidebar nav
8. Implement transactions CRUD — this unlocks the core loop

Once transactions work end-to-end, everything else builds on top.
