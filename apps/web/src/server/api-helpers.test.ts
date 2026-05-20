import { describe, it, expect } from 'vitest'
import { httpStatusForCode } from './api-helpers'

describe('httpStatusForCode', () => {
  it('returns 409 for DUPLICATE_NAME', () => {
    expect(httpStatusForCode('DUPLICATE_NAME')).toBe(409)
  })
  it('returns 404 for NOT_FOUND', () => {
    expect(httpStatusForCode('NOT_FOUND')).toBe(404)
  })
  it.each(['VALIDATION', 'INVALID_ID', 'BAD_QUERY'] as const)(
    'returns 400 for client-input code %s',
    (code) => {
      expect(httpStatusForCode(code)).toBe(400)
    },
  )
  it.each(['INTERNAL', 'IMPORT_FAILED', 'EXPORT_FAILED'] as const)(
    'returns 500 for system code %s',
    (code) => {
      expect(httpStatusForCode(code)).toBe(500)
    },
  )
})
