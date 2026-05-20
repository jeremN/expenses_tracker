import type { AppError } from '@tracker/shared'

type LogContext = { op: string }

const STACK_MAX = 2048

/**
 * Single seam for server-side error logging. Today: console.error JSON
 * (picked up by `wrangler tail` and Workers Logs). Future: swap the body
 * for a Logpush / Axiom / Better Stack call without touching call sites.
 *
 * The caller has already decided this entry is worth logging. This function
 * does not consult isUnexpectedError — that decision lives in the wrappers.
 */
export function logServerError(err: AppError, ctx: LogContext): void {
  const stack = err.stack
  console.error(JSON.stringify({
    level: 'error',
    op: ctx.op,
    code: err.code,
    message: err.message,
    stack: stack && stack.length > STACK_MAX ? stack.slice(0, STACK_MAX) : stack,
    timestamp: new Date().toISOString(),
  }))
}
