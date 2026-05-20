import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AppError } from '@tracker/shared'
import { logServerError } from './logger'

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
