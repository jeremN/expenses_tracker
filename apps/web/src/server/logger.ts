import { type AppError, toAppError, isUnexpectedError } from '@tracker/shared'
import { errorResponse, httpStatusForCode } from './api-helpers'
import { requireUser, type AccessUser } from './access'

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

/**
 * Wrap a TanStack Start server-fn handler. On throw: classify with
 * toAppError, log if the resolved code is system-caused, re-throw the
 * AppError so seroval preserves the .code on the wire to the client.
 */
export function withServerFn<A, R>(
  op: string,
  fn: (args: A) => Promise<R>,
): (args: A) => Promise<R> {
  return async (args) => {
    try {
      return await fn(args)
    } catch (e) {
      const ae = toAppError(e)
      if (isUnexpectedError(ae.code)) {
        logServerError(ae, { op })
      }
      throw ae
    }
  }
}

/**
 * Wrap a TanStack Start /api/* handler. On throw: classify, log if
 * unexpected, return an errorResponse with status derived from the code.
 * Pass-through when the handler returns normally.
 */
// Ctx defaults to `any` so destructuring `{ params }`, `{ request }`, or
// `{ params, request }` all type-check at the call site. The wrapper does
// not inspect ctx — it only passes it through to the handler. TanStack
// Start's per-route handler context shape varies, and constraining Ctx
// here narrowly would force casts at every call site.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withApiHandler<Ctx = any>(
  op: string,
  fn: (ctx: Ctx) => Promise<Response>,
): (ctx: Ctx) => Promise<Response> {
  return async (ctx) => {
    try {
      return await fn(ctx)
    } catch (e) {
      const ae = toAppError(e)
      if (isUnexpectedError(ae.code)) {
        logServerError(ae, { op })
      }
      return errorResponse(ae.message, httpStatusForCode(ae.code), ae.code)
    }
  }
}

/**
 * Auth-gated variant of withApiHandler. Verifies the Cloudflare Access JWT
 * before invoking the handler and injects the resolved user as a second
 * argument. UNAUTHORIZED rebounds through the same error pipeline → 401.
 *
 * Use for every /api/* route that should be user-scoped. Bypass only if
 * the route must be publicly reachable (e.g., a health check).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withAuthApiHandler<Ctx = any>(
  op: string,
  fn: (ctx: Ctx, user: AccessUser) => Promise<Response>,
): (ctx: Ctx) => Promise<Response> {
  return withApiHandler<Ctx>(op, async (ctx) => {
    // Every TanStack Start route ctx exposes `request`; the type is widened
    // here for the same reason as withApiHandler (varying ctx shapes per route).
    const user = await requireUser((ctx as { request: Request }).request)
    return fn(ctx, user)
  })
}
