import type { ImageProvider, ProcessedImage, SceneParams } from './provider'

function createMockImage(width: number, height: number, label: string): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#e0e0e0"/>
    <text x="50%" y="45%" text-anchor="middle" font-size="24" fill="#666">MOCK</text>
    <text x="50%" y="60%" text-anchor="middle" font-size="16" fill="#999">${label}</text>
  </svg>`
  return Buffer.from(svg)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class MockProvider implements ImageProvider {
  async removeBackground(_input: Buffer): Promise<ProcessedImage> {
    await delay(2000)
    return {
      buffer: createMockImage(800, 600, 'Background Removed'),
      mimeType: 'image/png',
      width: 800,
      height: 600,
    }
  }

  async enhance(_input: Buffer): Promise<ProcessedImage> {
    await delay(2000)
    return {
      buffer: createMockImage(800, 600, 'Enhanced'),
      mimeType: 'image/jpeg',
      width: 800,
      height: 600,
    }
  }

  async replaceScene(_input: Buffer, params: SceneParams): Promise<ProcessedImage> {
    await delay(2000)
    return {
      buffer: createMockImage(800, 600, `Scene: ${params.surface}`),
      mimeType: 'image/jpeg',
      width: 800,
      height: 600,
    }
  }
}
