import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppError } from '@tracker/shared'

// Mutable env shared between the mock and the tests. Each test resets it
// to a known state in beforeEach.
const mockEnv = vi.hoisted(() => ({ values: {} as Record<string, string | undefined> }))

vi.mock('cloudflare:workers', () => ({
  get env() {
    return mockEnv.values
  },
}))

// jwtVerify is mocked per test. The default implementation throws so any
// test that forgets to set up a return value fails loudly instead of
// silently passing the verification step.
const jwtVerifyMock = vi.hoisted(() => vi.fn())
vi.mock('jose', () => ({
  jwtVerify: jwtVerifyMock,
  // createRemoteJWKSet is called once per team domain; return a sentinel
  // (the verify mock ignores the keyset). Type-cast through unknown to
  // satisfy jose's exported type.
  createRemoteJWKSet: vi.fn(() => 'jwks-sentinel'),
}))

// Imported AFTER vi.mock so the mocks are in place.
const { verifyAccessJwt, requireUser } = await import('./access')

const TEAM = 'team.cloudflareaccess.com'
const AUD = 'aud-tag'

function configuredEnv() {
  mockEnv.values = { CF_ACCESS_TEAM_DOMAIN: TEAM, CF_ACCESS_AUD: AUD }
}

function makeRequest(opts: { jwt?: string; cookie?: string } = {}) {
  const headers = new Headers()
  if (opts.jwt) headers.set('Cf-Access-Jwt-Assertion', opts.jwt)
  if (opts.cookie) headers.set('Cookie', opts.cookie)
  return new Request('https://example.test/api/x', { headers })
}

beforeEach(() => {
  mockEnv.values = {}
  jwtVerifyMock.mockReset()
})

describe('verifyAccessJwt', () => {
  it('returns null when CF_ACCESS_TEAM_DOMAIN is unset', async () => {
    mockEnv.values = { CF_ACCESS_AUD: AUD }
    expect(await verifyAccessJwt(makeRequest({ jwt: 'x' }))).toBeNull()
    expect(jwtVerifyMock).not.toHaveBeenCalled()
  })

  it('returns null when CF_ACCESS_AUD is unset', async () => {
    mockEnv.values = { CF_ACCESS_TEAM_DOMAIN: TEAM }
    expect(await verifyAccessJwt(makeRequest({ jwt: 'x' }))).toBeNull()
    expect(jwtVerifyMock).not.toHaveBeenCalled()
  })

  it('returns null when no token is present', async () => {
    configuredEnv()
    expect(await verifyAccessJwt(makeRequest())).toBeNull()
    expect(jwtVerifyMock).not.toHaveBeenCalled()
  })

  it('reads token from Cf-Access-Jwt-Assertion header', async () => {
    configuredEnv()
    jwtVerifyMock.mockResolvedValue({ payload: { email: 'u@x.com', sub: 's' } })
    const user = await verifyAccessJwt(makeRequest({ jwt: 'header-token' }))
    expect(user).toEqual({ email: 'u@x.com', sub: 's', raw: { email: 'u@x.com', sub: 's' } })
    expect(jwtVerifyMock).toHaveBeenCalledWith('header-token', 'jwks-sentinel', {
      issuer: `https://${TEAM}`,
      audience: AUD,
    })
  })

  it('reads token from CF_Authorization cookie when header absent', async () => {
    configuredEnv()
    jwtVerifyMock.mockResolvedValue({ payload: { email: 'u@x.com', sub: 's' } })
    const user = await verifyAccessJwt(
      makeRequest({ cookie: 'other=1; CF_Authorization=cookie-token; trailing=2' }),
    )
    expect(user?.email).toBe('u@x.com')
    expect(jwtVerifyMock).toHaveBeenCalledWith('cookie-token', expect.anything(), expect.anything())
  })

  it('prefers header over cookie when both present', async () => {
    configuredEnv()
    jwtVerifyMock.mockResolvedValue({ payload: { email: 'u@x.com', sub: 's' } })
    await verifyAccessJwt(
      makeRequest({ jwt: 'header-token', cookie: 'CF_Authorization=cookie-token' }),
    )
    expect(jwtVerifyMock).toHaveBeenCalledWith('header-token', expect.anything(), expect.anything())
  })

  it('returns null when jwtVerify throws (bad signature, expired, wrong aud, etc.)', async () => {
    configuredEnv()
    jwtVerifyMock.mockRejectedValue(new Error('bad signature'))
    expect(await verifyAccessJwt(makeRequest({ jwt: 'x' }))).toBeNull()
  })

  it('returns null when payload has no email claim', async () => {
    configuredEnv()
    jwtVerifyMock.mockResolvedValue({ payload: { sub: 's' } })
    expect(await verifyAccessJwt(makeRequest({ jwt: 'x' }))).toBeNull()
  })

  it('returns null when payload has no sub claim', async () => {
    configuredEnv()
    jwtVerifyMock.mockResolvedValue({ payload: { email: 'u@x.com' } })
    expect(await verifyAccessJwt(makeRequest({ jwt: 'x' }))).toBeNull()
  })

  it('returns null when payload has non-string email', async () => {
    configuredEnv()
    jwtVerifyMock.mockResolvedValue({ payload: { email: 42, sub: 's' } })
    expect(await verifyAccessJwt(makeRequest({ jwt: 'x' }))).toBeNull()
  })
})

describe('requireUser', () => {
  it('returns a fake user when CF_ACCESS_DEV_USER_EMAIL is set, without calling jwtVerify', async () => {
    mockEnv.values = { CF_ACCESS_DEV_USER_EMAIL: 'dev@local' }
    const user = await requireUser(makeRequest())
    expect(user.email).toBe('dev@local')
    expect(user.sub).toBe('dev:dev@local')
    expect(jwtVerifyMock).not.toHaveBeenCalled()
  })

  it('dev bypass takes precedence over a present JWT', async () => {
    mockEnv.values = {
      CF_ACCESS_TEAM_DOMAIN: TEAM,
      CF_ACCESS_AUD: AUD,
      CF_ACCESS_DEV_USER_EMAIL: 'dev@local',
    }
    const user = await requireUser(makeRequest({ jwt: 'real-token' }))
    expect(user.email).toBe('dev@local')
    expect(jwtVerifyMock).not.toHaveBeenCalled()
  })

  it('throws AppError(UNAUTHORIZED) when no bypass and no JWT', async () => {
    configuredEnv()
    await expect(requireUser(makeRequest())).rejects.toMatchObject({
      name: 'AppError',
      code: 'UNAUTHORIZED',
    })
  })

  it('throws AppError(UNAUTHORIZED) when env is unconfigured (no silent bypass)', async () => {
    // No env vars at all — verifyAccessJwt returns null, requireUser must throw.
    await expect(requireUser(makeRequest({ jwt: 'x' }))).rejects.toBeInstanceOf(AppError)
  })

  it('throws AppError(UNAUTHORIZED) when JWT verification fails', async () => {
    configuredEnv()
    jwtVerifyMock.mockRejectedValue(new Error('expired'))
    await expect(requireUser(makeRequest({ jwt: 'x' }))).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
  })

  it('returns the verified user when JWT is valid', async () => {
    configuredEnv()
    jwtVerifyMock.mockResolvedValue({ payload: { email: 'u@x.com', sub: 's-123' } })
    const user = await requireUser(makeRequest({ jwt: 'real-token' }))
    expect(user).toMatchObject({ email: 'u@x.com', sub: 's-123' })
  })
})
