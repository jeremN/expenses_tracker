import { z } from 'zod'

/**
 * Build a locale-bound zod errorMap. zod consults this only when a schema
 * does not set an explicit message, so existing keyed messages still win.
 * Pure; never throws. Maps issue codes to `error.zod.*` i18n keys.
 *
 * zod v4 issue shapes (differ from v3): `invalid_type` carries `input`
 * (`undefined` = missing field, `NaN` = not-a-number); `too_small`/`too_big`
 * carry `origin` ("string" | "number" | ...) where v3 used `type`; string
 * format failures are `invalid_format` (v3 called this `invalid_string`).
 */
export function makeZodErrorMap(t: (key: string) => string): z.ZodErrorMap {
  return (issue) => {
    let key = 'error.zod.invalid'
    switch (issue.code) {
      case 'invalid_type':
        key =
          issue.input === undefined
            ? 'error.zod.required'
            : typeof issue.input === 'number' && Number.isNaN(issue.input)
              ? 'error.zod.mustBeNumber'
              : 'error.zod.invalidType'
        break
      case 'too_small':
        key =
          issue.origin === 'string'
            ? issue.minimum === 1
              ? 'error.zod.required'
              : 'error.zod.tooShort'
            : 'error.zod.tooSmall'
        break
      case 'too_big':
        key = 'error.zod.tooBig'
        break
      case 'invalid_format':
        key = 'error.zod.invalidFormat'
        break
    }
    return { message: t(key) }
  }
}
