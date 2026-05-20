import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AppError } from '@tracker/shared'
import { logServerError, withServerFn, withApiHandler } from './logger'

describe('logServerError', () => {
  let errSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    errSpy.mockRestore()
  })

  it('emits one structured JSON line', () => {
    const err = new AppError('INTERNAL', 'boom')
    logServerError(err, { op: 'test-op' })

    expect(errSpy).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(errSpy.mock.calls[0][0] as string)
    expect(payload).toMatchObject({
      level: 'error',
      op: 'test-op',
      code: 'INTERNAL',
      message: 'boom',
    })
    expect(typeof payload.timestamp).toBe('string')
    expect(new Date(payload.timestamp).toString()).not.toBe('Invalid Date')
  })

  it('includes stack when present', () => {
    const err = new AppError('INTERNAL', 'with stack')
    logServerError(err, { op: 'op' })
    const payload = JSON.parse(errSpy.mock.calls[0][0] as string)
    expect(payload.stack).toContain('AppError')
  })

  it('truncates stack over 2 KB', () => {
    const err = new AppError('INTERNAL', 'big stack')
    err.stack = 'x'.repeat(5000)
    logServerError(err, { op: 'op' })
    const payload = JSON.parse(errSpy.mock.calls[0][0] as string)
    expect(payload.stack.length).toBeLessThanOrEqual(2048)
  })
})

describe('withServerFn', () => {
  let errSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    errSpy.mockRestore()
  })

  it('returns the handler value when no throw', async () => {
    const wrapped = withServerFn('op', async (x: number) => x * 2)
    await expect(wrapped(3)).resolves.toBe(6)
    expect(errSpy).not.toHaveBeenCalled()
  })

  it('re-throws the classified AppError on raw throw', async () => {
    const wrapped = withServerFn('op', async () => {
      throw new Error('UNIQUE constraint failed: categories.name')
    })
    await expect(wrapped(undefined as never)).rejects.toMatchObject({
      name: 'AppError', code: 'DUPLICATE_NAME',
    })
  })

  it('does NOT log for user-caused codes', async () => {
    const wrapped = withServerFn('op', async () => {
      throw new AppError('DUPLICATE_NAME', 'dup')
    })
    await expect(wrapped(undefined as never)).rejects.toThrow()
    expect(errSpy).not.toHaveBeenCalled()
  })

  it.each(['INTERNAL', 'IMPORT_FAILED', 'EXPORT_FAILED', 'BAD_QUERY'] as const)(
    'logs unexpected code %s',
    async (code) => {
      const wrapped = withServerFn('op', async () => {
        throw new AppError(code, 'boom')
      })
      await expect(wrapped(undefined as never)).rejects.toThrow()
      expect(errSpy).toHaveBeenCalledTimes(1)
    },
  )

  it('preserves the AppError reference (does not re-wrap)', async () => {
    const original = new AppError('INTERNAL', 'orig')
    const wrapped = withServerFn('op', async () => { throw original })
    await expect(wrapped(undefined as never)).rejects.toBe(original)
  })
})

describe('withApiHandler', () => {
  let errSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    errSpy.mockRestore()
  })

  const fakeReq = { request: new Request('http://x') }

  it('passes the response through when no throw', async () => {
    const ok = new Response('ok')
    const wrapped = withApiHandler('op', async () => ok)
    await expect(wrapped(fakeReq)).resolves.toBe(ok)
    expect(errSpy).not.toHaveBeenCalled()
  })

  it('returns 409 errorResponse for DUPLICATE_NAME', async () => {
    const wrapped = withApiHandler('op', async () => {
      throw new AppError('DUPLICATE_NAME', 'dup')
    })
    const res = await wrapped(fakeReq)
    expect(res.status).toBe(409)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('DUPLICATE_NAME')
    expect(errSpy).not.toHaveBeenCalled()
  })

  it('returns 404 for NOT_FOUND', async () => {
    const wrapped = withApiHandler('op', async () => {
      throw new AppError('NOT_FOUND', 'missing')
    })
    const res = await wrapped(fakeReq)
    expect(res.status).toBe(404)
  })

  it('returns 500 and LOGS for INTERNAL', async () => {
    const wrapped = withApiHandler('op', async () => {
      throw new Error('boom')
    })
    const res = await wrapped(fakeReq)
    expect(res.status).toBe(500)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('INTERNAL')
    expect(errSpy).toHaveBeenCalledTimes(1)
  })

  it('returns 400 for VALIDATION and does NOT log', async () => {
    const wrapped = withApiHandler('op', async () => {
      throw new AppError('VALIDATION', 'bad input')
    })
    const res = await wrapped(fakeReq)
    expect(res.status).toBe(400)
    expect(errSpy).not.toHaveBeenCalled()
  })
})
