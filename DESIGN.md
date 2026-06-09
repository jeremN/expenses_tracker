# Design

Visual system for the Expenses Tracker. Calm, trustworthy, precise. Color strategy: **Restrained** (cool-slate neutrals + one accent). Light and dark are both first-class. All color in OKLCH. See [PRODUCT.md](PRODUCT.md) for strategy and principles.

## Mood

A quiet instrument panel for personal money. Cool, composed neutrals do most of the work; a single deep ink-blue accent marks actions, focus, and selection; gain and loss speak through calm semantic color reinforced by sign and icon. Generous breathing room on overview surfaces, honest density in tables. Numbers are set in a humanist monospace so columns align and figures read as measurements, not decoration.

## Color

Cool-slate neutrals (hue ~260, very low chroma). Not warm cream, not pure black. Surfaces lift through lightness and hairline borders, not heavy shadow.

### Neutrals & UI roles

| Token | Light | Dark | Role |
|---|---|---|---|
| `--background` | `oklch(0.985 0.003 255)` | `oklch(0.171 0.008 262)` | App body |
| `--foreground` | `oklch(0.205 0.012 261)` | `oklch(0.96 0.004 260)` | Primary ink |
| `--card` | `oklch(0.999 0.001 255)` | `oklch(0.208 0.009 262)` | Card / content surface |
| `--card-foreground` | `oklch(0.205 0.012 261)` | `oklch(0.96 0.004 260)` | Text on card |
| `--popover` | `oklch(0.999 0.001 255)` | `oklch(0.225 0.009 262)` | Menus, dialogs |
| `--popover-foreground` | `oklch(0.205 0.012 261)` | `oklch(0.96 0.004 260)` | Text on popover |
| `--sidebar` | `oklch(0.97 0.004 258)` | `oklch(0.155 0.008 262)` | Second neutral layer (nav) |
| `--primary` | `oklch(0.47 0.115 262)` | `oklch(0.7 0.12 262)` | Brand / primary action |
| `--primary-foreground` | `oklch(0.99 0.002 255)` | `oklch(0.17 0.01 262)` | Text on primary |
| `--secondary` | `oklch(0.965 0.005 258)` | `oklch(0.262 0.009 262)` | Secondary fill |
| `--secondary-foreground` | `oklch(0.27 0.012 261)` | `oklch(0.95 0.004 260)` | Text on secondary |
| `--muted` | `oklch(0.965 0.005 258)` | `oklch(0.245 0.008 262)` | Muted fill |
| `--muted-foreground` | `oklch(0.495 0.016 258)` | `oklch(0.705 0.014 258)` | Secondary text (AA on bg) |
| `--accent` | `oklch(0.955 0.008 258)` | `oklch(0.275 0.012 262)` | Hover fill / subtle highlight |
| `--accent-foreground` | `oklch(0.27 0.012 261)` | `oklch(0.96 0.004 260)` | Text on accent |
| `--border` | `oklch(0.916 0.006 256)` | `oklch(0.275 0.009 262)` | Hairline border |
| `--input` | `oklch(0.916 0.006 256)` | `oklch(0.3 0.009 262)` | Input border |
| `--ring` | `oklch(0.55 0.15 262)` | `oklch(0.7 0.13 262)` | Focus ring |
| `--destructive` | `oklch(0.55 0.2 25)` | `oklch(0.68 0.18 23)` | Dangerous action |

Note: in dark mode `--primary` is a lighter blue with **dark** `--primary-foreground` text, so primary buttons read as a calm glow, never neon. Verify all foreground/background pairs at AA before shipping.

### Semantic finance roles

Gain/loss/asset meaning. Always paired with a sign (`+` / `-`) and/or direction icon, never carried by hue alone (colorblind-safe).

| Token | Light | Dark | Role |
|---|---|---|---|
| `--income` | `oklch(0.52 0.13 150)` | `oklch(0.74 0.15 152)` | Income / positive / gain |
| `--income-foreground` | `oklch(0.985 0 0)` | `oklch(0.18 0.02 150)` | Text on income fill |
| `--income-subtle` | `oklch(0.95 0.03 150)` | `oklch(0.26 0.04 152)` | Income tint background |
| `--expense` | `oklch(0.555 0.17 25)` | `oklch(0.71 0.16 23)` | Expense / negative / loss |
| `--expense-foreground` | `oklch(0.985 0 0)` | `oklch(0.18 0.02 25)` | Text on expense fill |
| `--expense-subtle` | `oklch(0.955 0.025 25)` | `oklch(0.27 0.04 25)` | Expense tint background |
| `--investment` | `oklch(0.62 0.11 75)` | `oklch(0.78 0.12 78)` | Investments / portfolio / assets |
| `--investment-foreground` | `oklch(0.99 0 0)` | `oklch(0.2 0.03 75)` | Text on investment fill |
| `--investment-subtle` | `oklch(0.955 0.03 80)` | `oklch(0.28 0.04 78)` | Investment tint background |

`--income` and `--expense` are deliberately a step calmer than pure UI green/red (composure over alarm). When used as *text* on a card surface, use the values above; they clear 4.5:1. When used as large hero figures (≥24px), they have headroom.

### Data visualization (categorical)

Calm, colorblind-aware categorical ramp for charts and category aggregates. Not the neon shadcn defaults. User-defined category colors (stored as hex) take precedence; these are the fallback / aggregate palette.

| Token | Light | Dark |
|---|---|---|
| `--chart-1` | `oklch(0.55 0.13 262)` | `oklch(0.7 0.13 262)` |
| `--chart-2` | `oklch(0.6 0.12 200)` | `oklch(0.72 0.12 200)` |
| `--chart-3` | `oklch(0.62 0.11 75)` | `oklch(0.78 0.12 78)` |
| `--chart-4` | `oklch(0.55 0.14 320)` | `oklch(0.72 0.14 320)` |
| `--chart-5` | `oklch(0.55 0.13 150)` | `oklch(0.74 0.14 152)` |
| `--chart-6` | `oklch(0.6 0.05 258)` | `oklch(0.68 0.04 258)` |

## Typography

Two families, contrast axis (humanist sans + humanist mono). Numerals are the signature.

- `--font-sans`: **Inter Variable**, with `system-ui` fallback. All UI text, headings, labels, body.
- `--font-mono`: **IBM Plex Mono** (400/500/600), with `ui-monospace` fallback. All monetary figures, data-table amounts, chart axis numbers, dates in tables.
- Apply `font-variant-numeric: tabular-nums` wherever numbers align in columns.

Fixed rem scale, ratio ~1.2 (product UI, not fluid):

| Use | Size | Weight | Notes |
|---|---|---|---|
| Hero figure (dashboard balance) | `2rem` (text-3xl) | 600 | mono, tabular |
| Page title (h1) | `1.5rem` (text-2xl) | 600 | sans, `text-wrap: balance` |
| Section / card title | `1rem` (text-base) | 600 | sans |
| Body | `0.875rem` (text-sm) | 400 | sans, dense UI default |
| Prose (settings, help) | `1rem` | 400 | cap 65–75ch |
| Label / meta | `0.75rem` (text-xs) | 500 | sans, `--muted-foreground` |
| Amount (table/list) | `0.875rem` | 500 | mono, tabular |

No all-caps body. No tracked uppercase eyebrows. Headings get weight, not decoration.

## Spacing & layout

- 4px base unit; Tailwind scale.
- Overview surfaces (dashboard) breathe: section gap `1.5rem`, card padding `1.25–1.5rem`.
- Tables run denser: row height ~44px, cell padding `0.625rem 0.75rem`.
- Sidebar: 240px (`w-60`) fixed on `md+`, bottom nav on mobile.
- Content max-width for prose ~`72ch`; data surfaces full width.
- Responsive is structural: collapse sidebar to bottom nav, summary cards `1 → 2 → 3` columns, dashboard chart row stacks below `lg`.

## Elevation & borders

Calm = hairline borders + very soft shadow, never heavy.

- `--radius: 0.625rem` (10px). Inputs/buttons `radius-md` (~8px), cards `radius-lg` (10px).
- Light surfaces lift with a 1px `--border` + `--shadow-soft: 0 1px 2px oklch(0.2 0.02 262 / 0.05), 0 2px 8px oklch(0.2 0.02 262 / 0.04)`.
- Dark surfaces lift with lightness step + 1px border; shadow near-absent (shadows read poorly on dark).
- No nested cards. No side-stripe borders. No glassmorphism.

## Motion

- Durations 150–220ms; easing `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-expo-ish). No bounce, no elastic.
- Motion conveys state only: hover/press feedback, focus, menu/dialog enter, value changes, skeleton → content.
- Optional: a single subtle count-up on the dashboard hero figure on first load, gated behind an already-visible value (never hide content waiting on it).
- `@media (prefers-reduced-motion: reduce)`: crossfade or instant for every transition.

## Iconography

- Lucide, `1.5` stroke, sized `16` (`h-4 w-4`) inline, `20` for nav. One icon style throughout.
- Direction semantics reinforce color: `arrow-up-right`/`trending-up` for income, `arrow-down-right`/`trending-down` for expense.

## Components

Earned familiarity: standard shadcn vocabulary, tuned. Every interactive element ships default / hover / focus-visible / active / disabled, plus loading and error where it applies.

- **Buttons**: primary (brand fill), secondary (muted fill), ghost (text), destructive. One shape across the app.
- **Cards**: hairline border, soft shadow (light) / lightness lift (dark), `1.25–1.5rem` padding. Title `text-base` 600. Never nested.
- **Inputs / selects**: 1px `--input` border, `--ring` focus ring (2px offset), AA placeholder contrast.
- **Tables**: zebra-free; hairline row separators; sticky header on long lists; amounts right-aligned, mono, tabular; income/expense signed and colored.
- **Badges (categories)**: tint = category color at low alpha, text = category color darkened to AA, plus the category name (never color alone).
- **Empty states**: teach the next action (e.g. "Add your first transaction"), not "nothing here." Skeletons for loading, not center spinners.
- **Toasts**: sonner, semantic color matches the action; success/error reinforced with icon.

## Accessibility

- WCAG AA in both themes: body ≥4.5:1, large text ≥3:1, placeholders held to body contrast.
- Colorblind-safe: gain/loss/asset always carry sign + icon + position, not hue alone; category badges always show the name.
- Visible `--ring` focus on every interactive element; full keyboard nav.
- Reduced-motion alternative for every animation.
- Respect bilingual (en/fr) string length and multi-currency symbol widths.
