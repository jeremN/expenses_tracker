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
