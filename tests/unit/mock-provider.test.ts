import { describe, it, expect } from 'vitest'
import { MockProvider } from '@/lib/images/mock-provider'

describe('MockProvider', () => {
  const provider = new MockProvider()

  it('removeBackground returns a buffer after delay', async () => {
    const result = await provider.removeBackground(Buffer.from('test'))
    expect(result.buffer).toBeInstanceOf(Buffer)
    expect(result.mimeType).toBe('image/png')
    expect(result.width).toBeGreaterThan(0)
  }, 10000)

  it('enhance returns a buffer', async () => {
    const result = await provider.enhance(Buffer.from('test'))
    expect(result.buffer).toBeInstanceOf(Buffer)
    expect(result.mimeType).toBe('image/jpeg')
  }, 10000)

  it('replaceScene returns a buffer', async () => {
    const result = await provider.replaceScene(Buffer.from('test'), {
      surface: 'marble',
      lighting: 'warm',
      style: 'modern',
    })
    expect(result.buffer).toBeInstanceOf(Buffer)
  }, 10000)
})
