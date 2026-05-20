import { appError, type AppErrorCode } from '@tracker/shared'

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function errorResponse(
  message: string,
  status = 400,
  code?: AppErrorCode,
) {
  const body = code ? appError(message, code) : { error: message }
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function httpStatusForCode(code: AppErrorCode): number {
  switch (code) {
    case 'DUPLICATE_NAME': return 409
    case 'NOT_FOUND': return 404
    case 'UNAUTHORIZED': return 401
    case 'VALIDATION':
    case 'INVALID_ID':
    case 'BAD_QUERY':
      return 400
    case 'INTERNAL':
    case 'IMPORT_FAILED':
    case 'EXPORT_FAILED':
      return 500
  }
}
