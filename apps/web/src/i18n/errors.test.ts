import { describe, it, expect } from 'vitest'
import { translateApiError } from './errors'
import { translate } from './index'

const t = (k: string) => translate('en', k)

describe('translateApiError', () => {
  it('maps a known code to its key', () => {
    expect(translateApiError({ code: 'NOT_FOUND' }, t)).toBe(
      translate('en', 'error.code.NOT_FOUND'),
    )
  })
  it('reads code off an Error with a code property', () => {
    const e = Object.assign(new Error('raw db text'), { code: 'INTERNAL' })
    expect(translateApiError(e, t)).toBe(translate('en', 'error.code.INTERNAL'))
  })
  it('falls back to generic for an unknown code', () => {
    expect(translateApiError({ code: 'NOPE' }, t)).toBe(
      translate('en', 'error.generic'),
    )
  })
  it('falls back to generic when there is no code', () => {
    expect(translateApiError(new Error('boom'), t)).toBe(
      translate('en', 'error.generic'),
    )
  })
  it('handles non-object input without throwing', () => {
    expect(translateApiError('a string', t)).toBe(translate('en', 'error.generic'))
    expect(translateApiError(undefined, t)).toBe(translate('en', 'error.generic'))
  })
})
