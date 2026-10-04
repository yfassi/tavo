interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimiterOptions {
  limit: number
  windowMs: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
}

interface RateLimiter {
  check(identifier: string): Promise<RateLimitResult>
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const store = new Map<string, RateLimitEntry>()

  return {
    async check(identifier: string): Promise<RateLimitResult> {
      const now = Date.now()
      const entry = store.get(identifier)

      if (!entry || now >= entry.resetAt) {
        store.set(identifier, { count: 1, resetAt: now + options.windowMs })
        return { allowed: true, remaining: options.limit - 1 }
      }

      entry.count++

      if (entry.count > options.limit) {
        return { allowed: false, remaining: 0 }
      }

      return { allowed: true, remaining: options.limit - entry.count }
    },
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp

  return '127.0.0.1'
}

// Pre-configured limiters for different endpoints
export const tvDataLimiter = createRateLimiter({ limit: 60, windowMs: 60000 })
export const tvHeartbeatLimiter = createRateLimiter({ limit: 30, windowMs: 60000 })
export const aiLimiter = createRateLimiter({ limit: 10, windowMs: 60000 })
