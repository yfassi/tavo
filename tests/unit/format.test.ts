import { describe, it, expect } from 'vitest'
import { formatPrice, formatPriceRaw } from '@/lib/format'

describe('formatPrice', () => {
  it('formats cents to EUR TTC French format', () => {
    expect(formatPrice(1290)).toBe('12,90\u00a0€')
  })

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('0,00\u00a0€')
  })

  it('formats single digit cents', () => {
    expect(formatPrice(500)).toBe('5,00\u00a0€')
  })
})

describe('formatPriceRaw', () => {
  it('formats without currency symbol', () => {
    expect(formatPriceRaw(1290)).toBe('12,90')
  })
})
