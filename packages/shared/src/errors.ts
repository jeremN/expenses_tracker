export type AppErrorCode =
  | 'NOT_FOUND'
  | 'INVALID_ID'
  | 'VALIDATION'
  | 'DUPLICATE_NAME'
  | 'INTERNAL'
  | 'IMPORT_FAILED'
  | 'EXPORT_FAILED'
  | 'BAD_QUERY'

export interface AppErrorBody {
  error: string
  code: AppErrorCode
}

/** Build a stable, machine-readable error body. `message` stays English. */
export function appError(message: string, code: AppErrorCode): AppErrorBody {
  return { error: message, code }
}
