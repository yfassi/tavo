import { describe, it, expect } from 'vitest'
import { calculateDailyCostCents } from '@/lib/ai/cost-guard'

describe('calculateDailyCostCents', () => {
  it('sums cost_cents from jobs today', () => {
    const jobs = [
      { cost_cents: 100, created_at: new Date().toISOString() },
      { cost_cents: 200, created_at: new Date().toISOString() },
    ]
    expect(calculateDailyCostCents(jobs)).toBe(300)
  })

  it('returns 0 for empty array', () => {
    expect(calculateDailyCostCents([])).toBe(0)
  })

  it('handles null cost_cents', () => {
    const jobs = [
      { cost_cents: null, created_at: new Date().toISOString() },
      { cost_cents: 150, created_at: new Date().toISOString() },
    ]
    expect(calculateDailyCostCents(jobs)).toBe(150)
  })
})
