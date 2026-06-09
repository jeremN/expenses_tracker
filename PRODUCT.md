# Product

## Register

product

## Users

A single owner managing their own money: the developer, behind Cloudflare Zero Trust, so there is exactly one trusted user and no public sign-up surface. They are financially literate and check in periodically rather than living in the app: an evening glance at the month, a monthly reconciliation, a CSV import when a bank statement lands, an occasional investment snapshot. They work in more than one currency and switch between English and French.

The job to be done: see where the money went, stay ahead of recurring commitments, watch net worth move over time, and do all of it in a few minutes without friction or anxiety.

## Product Purpose

A personal finance tracker that records income and expenses, runs recurring rules, imports bank-statement CSVs (European number formats included), and tracks an investment portfolio over time, with monthly trends and category breakdowns. It runs entirely on Cloudflare's free tier (D1 at the edge, no app-level auth, recurring transactions generated lazily on dashboard load).

Success is a tool the owner trusts at a glance: the numbers are unambiguous, the recurring machinery is visibly under control, and reviewing finances never feels like a chore or a source of stress.

## Brand Personality

Calm, trustworthy, precise. The voice is quiet confidence: plain language, no hype, no urgency theater. Bank-grade composure without corporate stuffiness. Numbers are treated as instruments, not decoration; the interface earns trust by being legible and consistent rather than by being loud. Reference feel: Mercury and Copilot Money, calm fintech with generous breathing room, a single restrained accent, and confident, precise figures.

## Anti-references

- **Crypto / neon (explicit no).** No glowing gradients, neon-on-black, hype energy, or full-saturation accents on dark surfaces. Money handled here is real and personal, not a hype asset.
- **The generic shadcn-default look it has today.** Pure-gray neutrals, rainbow default chart colors, and no point of view. The redesign exists to leave this baseline behind.
- **Manufactured urgency.** No alarm-red everywhere, no pulsing "act now" affordances. A negative balance is information, not an emergency.

## Design Principles

1. **Composure over alarm.** Money is emotional; the UI lowers the temperature. Gain/loss is communicated with calm semantic color and clear signs, never with panic. Color is meaning, not decoration.
2. **Numbers are the hero.** The figures are the content. Tabular, aligned, legible numerals and a type hierarchy that makes amounts scannable and comparable. Everything else recedes to serve the data.
3. **Earned familiarity.** Standard affordances done impeccably (the Mercury / Stripe bar). One consistent component vocabulary across every screen; the tool disappears into the task. No invented controls for standard jobs.
4. **Meaning beyond color.** Colorblind-safe by construction: income, expense, and investment are distinguishable by sign, icon, and position, not hue alone. Category colors are reinforced with labels.
5. **One system, two skins.** Light and dark are both first-class and equally considered. The identity reads the same in either; neither is an afterthought.

## Accessibility & Inclusion

- **WCAG AA, plus colorblind-safe.** Body text meets at least 4.5:1, large text at least 3:1, in both themes. Placeholder and muted text held to the same body contrast, not faded for elegance.
- Gain/loss and category meaning never depends on hue alone: pair color with sign (`+` / `-`), direction icons, and position.
- Full keyboard navigation with a visible, high-contrast focus ring on every interactive element.
- Every animation has a `prefers-reduced-motion: reduce` alternative (crossfade or instant).
- Bilingual (en / fr) and multi-currency: layouts tolerate longer French strings and varying currency symbol widths without breaking.
