import { cn } from '~/lib/utils'
import { useFormat } from '~/lib/format'
import { useCountUp } from '~/lib/use-count-up'

/**
 * Monetary tone. Income reads positive (green, leading +), expense reads
 * negative (red, leading −), neutral is plain ink, and `signed` derives both
 * color and sign from the value's own sign (use for balances / net figures).
 *
 * Color is never the only carrier of meaning: a sign always accompanies it,
 * so income/expense stay distinguishable without relying on hue (WCAG-safe).
 */
export type AmountTone = 'income' | 'expense' | 'neutral' | 'signed'

const MINUS = '−' // U+2212 MINUS SIGN, matches the width/weight of '+'

interface AmountProps {
  /** Value in integer cents. For income/expense tones, pass the magnitude. */
  cents: number
  tone?: AmountTone
  /** Show the leading +/− sign. Defaults to true for typed/signed tones. */
  sign?: boolean
  /** Count up from zero on first mount (reserve for hero figures). */
  animate?: boolean
  className?: string
}

export function Amount({ cents, tone = 'neutral', sign, animate = false, className }: AmountProps) {
  const { formatMoney } = useFormat()

  const isIncome = tone === 'income' || (tone === 'signed' && cents >= 0)
  const isExpense = tone === 'expense' || (tone === 'signed' && cents < 0)
  const showSign = sign ?? tone !== 'neutral'

  const prefix = showSign ? (isIncome ? '+' : isExpense ? MINUS : '') : ''
  const display = useCountUp(Math.abs(cents), animate)

  return (
    <span
      className={cn(
        'font-mono tabular-nums tracking-tight',
        isIncome && 'text-income',
        isExpense && 'text-expense',
        className,
      )}
    >
      {prefix}
      {formatMoney(display)}
    </span>
  )
}
