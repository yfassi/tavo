import { describe, it, expect } from 'vitest'
import { MockProvider } from '@/lib/images/mock-provider'

describe('MockProvider.generateFromDescription', () => {
  it('returns a buffer with correct metadata', async () => {
    const provider = new MockProvider()
    const result = await provider.generateFromDescription('a bowl of ramen')
    expect(result.buffer).toBeInstanceOf(Buffer)
    expect(result.mimeType).toBe('image/jpeg')
    expect(result.width).toBeGreaterThan(0)
  }, 10000)
})
