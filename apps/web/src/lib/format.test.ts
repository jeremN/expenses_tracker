import { describe, it, expect } from 'vitest'
import { formatMoney, formatDate } from './format'

describe('formatMoney', () => {
  it('formats USD for en-US', () => {
    expect(formatMoney(123456, 'en')).toBe('$1,234.56')
    expect(formatMoney(0, 'en')).toBe('$0.00')
    expect(formatMoney(-50000, 'en')).toMatch(/-?\$500\.00/)
  })
  it('formats USD for fr-FR with locale grouping', () => {
    const out = formatMoney(123456, 'fr')
    // fr-FR groups thousands with U+202F (narrow no-break space) and uses
    // a comma decimal separator. ICU currency-symbol rendering varies, so
    // assert on the stable parts, not an exact string.
    // The runner's ICU emits the spec's U+202F (verified: observed output
    // was "1 234,56 $US"), so the grouping literal uses an
    // explicit   rather than a regular space (U+0020).
    expect(out).toContain('1 234')
    expect(out).toContain(',56')
  })
})

describe('formatDate', () => {
  it('formats short date per locale', () => {
    expect(formatDate('2026-05-16', 'en')).toBe('5/16/2026')
    expect(formatDate('2026-05-16', 'fr')).toBe('16/05/2026')
  })
  it('does not shift the day across timezones', () => {
    expect(formatDate('2026-01-01', 'en')).toBe('1/1/2026')
  })
})
