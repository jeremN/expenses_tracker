import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { makeZodErrorMap } from './zod-error-map'
import { translate } from './index'

const t = (k: string) => translate('en', k)
const map = makeZodErrorMap(t)
const ctx = { defaultError: 'DEFAULT', data: undefined }

function msg(issue: z.ZodIssueOptionalMessage): string {
  return map(issue, ctx).message
}

describe('makeZodErrorMap', () => {
  it('missing string -> required', () => {
    expect(msg({ code: 'invalid_type', expected: 'string', received: 'undefined', path: [] })).toBe(translate('en', 'error.zod.required'))
  })
  it('NaN number -> mustBeNumber', () => {
    expect(msg({ code: 'invalid_type', expected: 'number', received: 'nan', path: [] })).toBe(translate('en', 'error.zod.mustBeNumber'))
  })
  it('other invalid_type -> invalidType', () => {
    expect(msg({ code: 'invalid_type', expected: 'string', received: 'number', path: [] })).toBe(translate('en', 'error.zod.invalidType'))
  })
  it('string too_small minimum 1 -> required', () => {
    expect(msg({ code: 'too_small', minimum: 1, type: 'string', inclusive: true, path: [] })).toBe(translate('en', 'error.zod.required'))
  })
  it('string too_small minimum 3 -> tooShort', () => {
    expect(msg({ code: 'too_small', minimum: 3, type: 'string', inclusive: true, path: [] })).toBe(translate('en', 'error.zod.tooShort'))
  })
  it('number too_small -> tooSmall', () => {
    expect(msg({ code: 'too_small', minimum: 1, type: 'number', inclusive: true, path: [] })).toBe(translate('en', 'error.zod.tooSmall'))
  })
  it('too_big -> tooBig', () => {
    expect(msg({ code: 'too_big', maximum: 50, type: 'string', inclusive: true, path: [] })).toBe(translate('en', 'error.zod.tooBig'))
  })
  it('invalid_string -> invalidFormat', () => {
    expect(msg({ code: 'invalid_string', validation: 'regex', path: [] })).toBe(translate('en', 'error.zod.invalidFormat'))
  })
  it('unknown code -> invalid', () => {
    expect(msg({ code: 'custom', path: [] })).toBe(translate('en', 'error.zod.invalid'))
  })
})
