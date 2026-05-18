import type { AppErrorCode } from '@tracker/shared'

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
  return new Response(JSON.stringify({ error: message, ...(code && { code }) }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
