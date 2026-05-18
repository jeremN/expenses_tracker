import { APP_ERROR_CODES, type AppErrorCode } from '@tracker/shared'

const KNOWN: ReadonlySet<string> = new Set(APP_ERROR_CODES)

function extractCode(error: unknown): AppErrorCode | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const c = (error as { code: unknown }).code
    if (typeof c === 'string' && KNOWN.has(c)) {
      return c as AppErrorCode
    }
  }
  return undefined
}

/**
 * Localize an error for display. Reads a stable `code` if present and maps
 * it to `error.code.<CODE>`; otherwise returns the generic message. Never
 * throws and never returns raw server text.
 */
export function translateApiError(
  error: unknown,
  t: (key: string) => string,
): string {
  const code = extractCode(error)
  return code ? t(`error.code.${code}`) : t('error.generic')
}
