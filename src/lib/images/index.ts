import type { ImageProvider } from './provider'
import { MockProvider } from './mock-provider'
import { StabilityProvider } from './stability-provider'

export type { ImageProvider, ProcessedImage, SceneParams } from './provider'

let instance: ImageProvider | null = null

export function getImageProvider(): ImageProvider {
  if (!instance) {
    const providerType = process.env.IMAGE_PROVIDER || 'mock'
    instance = providerType === 'stability' ? new StabilityProvider() : new MockProvider()
  }
  return instance
}
