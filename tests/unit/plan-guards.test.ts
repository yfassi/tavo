import { describe, it, expect } from 'vitest'
import { PLAN_LIMITS, isPlanActive } from '@/lib/stripe/plans'

describe('PLAN_LIMITS', () => {
  it('has correct limits for trial', () => {
    expect(PLAN_LIMITS.trial.venues).toBe(3)
    expect(PLAN_LIMITS.trial.screens).toBe(3)
    expect(PLAN_LIMITS.trial.monthlyCredits).toBe(100)
  })

  it('has correct limits for starter', () => {
    expect(PLAN_LIMITS.starter.venues).toBe(1)
    expect(PLAN_LIMITS.starter.screens).toBe(1)
    expect(PLAN_LIMITS.starter.monthlyCredits).toBe(30)
  })

  it('has correct limits for pro', () => {
    expect(PLAN_LIMITS.pro.venues).toBe(3)
    expect(PLAN_LIMITS.pro.screens).toBe(3)
    expect(PLAN_LIMITS.pro.monthlyCredits).toBe(100)
  })
})

describe('isPlanActive', () => {
  it('returns true for trialing status', () => {
    expect(isPlanActive('trialing')).toBe(true)
  })

  it('returns true for active status', () => {
    expect(isPlanActive('active')).toBe(true)
  })

  it('returns false for canceled status', () => {
    expect(isPlanActive('canceled')).toBe(false)
  })

  it('returns false for past_due status', () => {
    expect(isPlanActive('past_due')).toBe(false)
  })
})
