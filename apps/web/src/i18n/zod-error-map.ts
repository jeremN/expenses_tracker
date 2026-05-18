import { z } from 'zod'

/**
 * Build a locale-bound zod errorMap. zod consults this only when a schema
 * does not set an explicit message, so existing keyed messages still win.
 * Pure; never throws. Maps issue codes to `error.zod.*` i18n keys.
 */
export function makeZodErrorMap(t: (key: string) => string): z.ZodErrorMap {
  return (issue) => {
    let key = 'error.zod.invalid'
    switch (issue.code) {
      case z.ZodIssueCode.invalid_type:
        key =
          issue.received === 'undefined'
            ? 'error.zod.required'
            : issue.received === 'nan'
              ? 'error.zod.mustBeNumber'
              : 'error.zod.invalidType'
        break
      case z.ZodIssueCode.too_small:
        key =
          issue.type === 'string'
            ? issue.minimum === 1
              ? 'error.zod.required'
              : 'error.zod.tooShort'
            : 'error.zod.tooSmall'
        break
      case z.ZodIssueCode.too_big:
        key = 'error.zod.tooBig'
        break
      case z.ZodIssueCode.invalid_string:
        key = 'error.zod.invalidFormat'
        break
    }
    return { message: t(key) }
  }
}
