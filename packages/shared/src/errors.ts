export const APP_ERROR_CODES = [
  'NOT_FOUND', 'INVALID_ID', 'VALIDATION', 'DUPLICATE_NAME',
  'INTERNAL', 'IMPORT_FAILED', 'EXPORT_FAILED', 'BAD_QUERY',
] as const

export type AppErrorCode = (typeof APP_ERROR_CODES)[number]

export interface AppErrorBody {
  error: string
  code: AppErrorCode
}

/** Build a stable, machine-readable error body. `message` stays English. */
export function appError(message: string, code: AppErrorCode): AppErrorBody {
  return { error: message, code }
}

export class AppError extends Error {
  readonly code: AppErrorCode
  constructor(code: AppErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'AppError'
  }
}

/**
 * Single source of truth for classifying an unknown thrown value into an
 * AppError. Reuses the SQLite UNIQUE-constraint signal already proven in
 * the /api routes. Total — never throws.
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error
  if (error instanceof Error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return new AppError('DUPLICATE_NAME', error.message)
    }
    return new AppError('INTERNAL', error.message)
  }
  return new AppError('INTERNAL', 'Unknown error')
}

const UNEXPECTED_CODES = new Set<AppErrorCode>([
  'INTERNAL', 'IMPORT_FAILED', 'EXPORT_FAILED', 'BAD_QUERY',
])

/**
 * True for system-caused codes (DB outage, internal failure). False for
 * user-caused codes (duplicate name, validation, missing record). Used by
 * the server logger to decide whether an error is worth emitting to logs.
 */
export function isUnexpectedError(code: AppErrorCode): boolean {
  return UNEXPECTED_CODES.has(code)
}

/**
 * Throw an AppError(NOT_FOUND) if value is null/undefined; return the value
 * otherwise (narrowed to NonNullable<T>). Used at mutation call sites where
 * the underlying Drizzle `.returning().get()` returns undefined on a
 * no-match update/delete.
 */
export function assertFound<T>(value: T | null | undefined, message: string): NonNullable<T> {
  if (value == null) throw new AppError('NOT_FOUND', message)
  return value as NonNullable<T>
}
