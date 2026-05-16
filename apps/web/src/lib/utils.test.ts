import { describe, it, expect } from 'vitest'
import { parseToCents } from './utils'

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
