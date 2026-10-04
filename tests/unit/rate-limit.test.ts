import { describe, it, expect } from 'vitest'
import { createRateLimiter } from '@/lib/rate-limit'

describe('createRateLimiter', () => {
  it('allows requests under the limit', async () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60000 })
    const r1 = await limiter.check('test-ip')
    const r2 = await limiter.check('test-ip')
    const r3 = await limiter.check('test-ip')
    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(true)
    expect(r3.allowed).toBe(true)
    expect(r3.remaining).toBe(0)
  })

  it('blocks requests over the limit', async () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60000 })
    await limiter.check('test-ip')
    await limiter.check('test-ip')
    const r3 = await limiter.check('test-ip')
    expect(r3.allowed).toBe(false)
    expect(r3.remaining).toBe(0)
  })

  it('tracks different identifiers separately', async () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60000 })
    const r1 = await limiter.check('ip-a')
    const r2 = await limiter.check('ip-b')
    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(true)
  })
})
