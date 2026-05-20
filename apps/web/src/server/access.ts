import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { env } from 'cloudflare:workers'
import { AppError } from '@tracker/shared'

/**
 * Cloudflare Access JWT verification.
 *
 * Requests routed through an Access application carry a signed JWT in the
 * `Cf-Access-Jwt-Assertion` header (and the `CF_Authorization` cookie). We
 * verify it against the team JWKS so a request that bypassed the edge
 * (e.g., a direct workers.dev hit) is rejected.
 *
 * Env vars (declared in wrangler.jsonc `vars`):
 *   CF_ACCESS_TEAM_DOMAIN  e.g. "jeremie-personal.cloudflareaccess.com"
 *   CF_ACCESS_AUD          the application's Audience tag (hex string)
 *
 * The `email` claim is the stable user identifier.
 */

type AccessEnv = {
  CF_ACCESS_TEAM_DOMAIN?: string
  CF_ACCESS_AUD?: string
  /**
   * Dev-only escape hatch. When set (typically in `.dev.vars`), the auth
   * check is replaced with a fake user with this email. Never set this in
   * production — the committed wrangler.jsonc has no such var, so prod
   * deploys cannot be tricked into bypassing auth.
   */
  CF_ACCESS_DEV_USER_EMAIL?: string
}

// Env is read inside functions (matches the db.ts pattern) so tests can stub
// it via `vi.mock('cloudflare:workers', ...)` without dealing with module-init
// timing.
function readEnv(): AccessEnv {
  return env as unknown as AccessEnv
}

// JWKS is cached at module scope, keyed by team domain, so the second
// request onward in an isolate skips the fetch. Lazy-init to keep tests
// from needing to construct it.
let jwksCache: { domain: string; jwks: ReturnType<typeof createRemoteJWKSet> } | null = null
function getJwks(domain: string) {
  if (!jwksCache || jwksCache.domain !== domain) {
    jwksCache = {
      domain,
      jwks: createRemoteJWKSet(new URL(`https://${domain}/cdn-cgi/access/certs`)),
    }
  }
  return jwksCache.jwks
}

export type AccessUser = {
  email: string
  sub: string
  raw: JWTPayload
}

/**
 * Verify a Cf-Access-Jwt-Assertion. Returns the user on success, null on
 * any failure (missing header, bad signature, wrong aud, expired, etc.).
 * Never throws — callers decide policy.
 */
export async function verifyAccessJwt(
  request: Request,
): Promise<AccessUser | null> {
  const { CF_ACCESS_TEAM_DOMAIN, CF_ACCESS_AUD } = readEnv()
  if (!CF_ACCESS_TEAM_DOMAIN || !CF_ACCESS_AUD) return null

  const token =
    request.headers.get('Cf-Access-Jwt-Assertion') ??
    extractCookie(request.headers.get('Cookie'), 'CF_Authorization')

  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, getJwks(CF_ACCESS_TEAM_DOMAIN), {
      issuer: `https://${CF_ACCESS_TEAM_DOMAIN}`,
      audience: CF_ACCESS_AUD,
    })

    const email = typeof payload.email === 'string' ? payload.email : null
    const sub = typeof payload.sub === 'string' ? payload.sub : null
    if (!email || !sub) return null

    return { email, sub, raw: payload }
  } catch {
    return null
  }
}

function extractCookie(header: string | null, name: string): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return null
}

/**
 * Gate an API request. Returns the verified user, or throws an
 * AppError(UNAUTHORIZED) that withApiHandler converts to a 401 JSON
 * response. Safe by default: if env is misconfigured, verifyAccessJwt
 * returns null and this throws — there is no silent bypass.
 */
export async function requireUser(request: Request): Promise<AccessUser> {
  const { CF_ACCESS_DEV_USER_EMAIL } = readEnv()
  if (CF_ACCESS_DEV_USER_EMAIL) {
    return {
      email: CF_ACCESS_DEV_USER_EMAIL,
      sub: `dev:${CF_ACCESS_DEV_USER_EMAIL}`,
      raw: { email: CF_ACCESS_DEV_USER_EMAIL, sub: `dev:${CF_ACCESS_DEV_USER_EMAIL}` },
    }
  }
  const user = await verifyAccessJwt(request)
  if (user) return user
  throw new AppError('UNAUTHORIZED', 'Access JWT missing or invalid')
}
