import { describe, it, expect } from 'vitest'
import { formatMoney, formatDate } from './format'

describe('formatMoney', () => {
  it('formats USD for en', () => {
    expect(formatMoney(123456, 'en', 'USD')).toBe('$1,234.56')
    expect(formatMoney(0, 'en', 'USD')).toBe('$0.00')
  })
  it('formats EUR for en', () => {
    expect(formatMoney(1234, 'en', 'EUR')).toBe('€12.34')
  })
  it('formats GBP for en', () => {
    expect(formatMoney(1234, 'en', 'GBP')).toBe('£12.34')
  })
  it('formats EUR for fr with locale grouping and trailing symbol', () => {
    const out = formatMoney(123456, 'fr', 'EUR')
    expect(out).toContain('1 234')
    expect(out).toContain(',56')
    expect(out).toContain('€')
  })
  it('formats USD for fr', () => {
    const out = formatMoney(123456, 'fr', 'USD')
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
