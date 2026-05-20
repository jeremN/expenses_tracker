import { describe, it, expect } from 'vitest'
import { AppError, toAppError, isUnexpectedError } from '@tracker/shared'

describe('AppError', () => {
  it('is an Error with a code', () => {
    const e = new AppError('INTERNAL', 'boom')
    expect(e).toBeInstanceOf(Error)
    expect(e.code).toBe('INTERNAL')
    expect(e.message).toBe('boom')
    expect(e.name).toBe('AppError')
  })
  it('exposes code as an own enumerable property (seroval-survival contract)', () => {
    const e = new AppError('DUPLICATE_NAME', 'dup')
    expect(Object.getOwnPropertyNames(e)).toContain('code')
  })
})

describe('toAppError', () => {
  it('passes through an existing AppError unchanged', () => {
    const original = new AppError('DUPLICATE_NAME', 'dup')
    expect(toAppError(original)).toBe(original)
  })
  it('maps a UNIQUE-constraint Error to DUPLICATE_NAME', () => {
    const e = toAppError(new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: categories.name'))
    expect(e).toBeInstanceOf(AppError)
    expect(e.code).toBe('DUPLICATE_NAME')
  })
  it('maps a generic Error to INTERNAL', () => {
    expect(toAppError(new Error('boom')).code).toBe('INTERNAL')
  })
  it('maps non-Error values to INTERNAL', () => {
    expect(toAppError('a string').code).toBe('INTERNAL')
    expect(toAppError(undefined).code).toBe('INTERNAL')
    expect(toAppError(null).code).toBe('INTERNAL')
  })
  it('does not misclassify a non-constraint message containing the word UNIQUE', () => {
    expect(toAppError(new Error('The value must be UNIQUE across records')).code).toBe('INTERNAL')
  })
})

describe('isUnexpectedError', () => {
  it.each(['INTERNAL', 'IMPORT_FAILED', 'EXPORT_FAILED', 'BAD_QUERY'] as const)(
    'returns true for system code %s',
    (code) => {
      expect(isUnexpectedError(code)).toBe(true)
    },
  )

  it.each(['DUPLICATE_NAME', 'VALIDATION', 'NOT_FOUND', 'INVALID_ID'] as const)(
    'returns false for user-caused code %s',
    (code) => {
      expect(isUnexpectedError(code)).toBe(false)
    },
  )
})
