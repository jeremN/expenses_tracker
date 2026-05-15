import { describe, it, expect } from 'vitest'
import { formatCents, parseToCents } from './utils'

describe('formatCents', () => {
  it('formats whole dollar amounts', () => {
    expect(formatCents(10000)).toBe('$100.00')
  })

  it('formats cents properly', () => {
    expect(formatCents(1234)).toBe('$12.34')
  })

  it('formats zero', () => {
    expect(formatCents(0)).toBe('$0.00')
  })

  it('formats large amounts with grouping', () => {
    expect(formatCents(123456789)).toBe('$1,234,567.89')
  })

  it('formats negative amounts', () => {
    expect(formatCents(-5000)).toBe('-$50.00')
  })
})

describe('parseToCents', () => {
  it('converts decimal string to cents', () => {
    expect(parseToCents('12.34')).toBe(1234)
  })

  it('handles whole numbers', () => {
    expect(parseToCents('100')).toBe(10000)
  })

  it('rounds fractional cents', () => {
    expect(parseToCents('12.345')).toBe(1235)
  })
})
