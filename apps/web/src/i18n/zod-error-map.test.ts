import { describe, it, expect } from 'vitest'
import { makeZodErrorMap } from './zod-error-map'
import { translate } from './index'

const t = (k: string) => translate('en', k)
const map = makeZodErrorMap(t)

type RawIssue = Parameters<typeof map>[0]

// The error map receives zod's raw issue. These literals mirror the exact
// shapes zod v4 emits (verified empirically): `invalid_type` carries `input`,
// `too_small`/`too_big` carry `origin`, format failures are `invalid_format`.
function msg(issue: unknown): string {
  const r = map(issue as RawIssue)
  return typeof r === 'string' ? r : (r?.message ?? '')
}

describe('makeZodErrorMap', () => {
  it('missing string -> required', () => {
    expect(msg({ code: 'invalid_type', expected: 'string', input: undefined, path: [] })).toBe(translate('en', 'error.zod.required'))
  })
  it('NaN number -> mustBeNumber', () => {
    expect(msg({ code: 'invalid_type', expected: 'number', input: NaN, path: [] })).toBe(translate('en', 'error.zod.mustBeNumber'))
  })
  it('other invalid_type -> invalidType', () => {
    expect(msg({ code: 'invalid_type', expected: 'string', input: 123, path: [] })).toBe(translate('en', 'error.zod.invalidType'))
  })
  it('string too_small minimum 1 -> required', () => {
    expect(msg({ code: 'too_small', minimum: 1, origin: 'string', inclusive: true, input: '', path: [] })).toBe(translate('en', 'error.zod.required'))
  })
  it('string too_small minimum 3 -> tooShort', () => {
    expect(msg({ code: 'too_small', minimum: 3, origin: 'string', inclusive: true, input: 'ab', path: [] })).toBe(translate('en', 'error.zod.tooShort'))
  })
  it('number too_small -> tooSmall', () => {
    expect(msg({ code: 'too_small', minimum: 1, origin: 'number', inclusive: true, input: 0, path: [] })).toBe(translate('en', 'error.zod.tooSmall'))
  })
  it('too_big -> tooBig', () => {
    expect(msg({ code: 'too_big', maximum: 50, origin: 'string', inclusive: true, input: 'x', path: [] })).toBe(translate('en', 'error.zod.tooBig'))
  })
  it('invalid_format -> invalidFormat', () => {
    expect(msg({ code: 'invalid_format', format: 'regex', origin: 'string', input: 'y', path: [] })).toBe(translate('en', 'error.zod.invalidFormat'))
  })
  it('unknown code -> invalid', () => {
    expect(msg({ code: 'custom', path: [], input: undefined })).toBe(translate('en', 'error.zod.invalid'))
  })
})
