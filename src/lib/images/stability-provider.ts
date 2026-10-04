import type { ImageProvider, ProcessedImage, SceneParams } from './provider'

export class StabilityProvider implements ImageProvider {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.STABILITY_API_KEY ?? ''
  }

  async removeBackground(input: Buffer): Promise<ProcessedImage> {
    const formData = new FormData()
    formData.append('image', new Blob([new Uint8Array(input)]))
    formData.append('output_format', 'png')

    const res = await fetch('https://api.stability.ai/v2beta/stable-image/edit/remove-background', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: 'image/*' },
      body: formData,
    })

    if (!res.ok) throw new Error(`Stability API error: ${res.status}`)

    const buffer = Buffer.from(await res.arrayBuffer())
    return { buffer, mimeType: 'image/png', width: 0, height: 0 }
  }

  async enhance(input: Buffer): Promise<ProcessedImage> {
    const formData = new FormData()
    formData.append('image', new Blob([new Uint8Array(input)]))
    formData.append('prompt', 'enhance photo quality, better lighting, sharper, natural colors')
    formData.append('strength', '0.3')
    formData.append('output_format', 'jpeg')

    const res = await fetch('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: 'image/*' },
      body: formData,
    })

    if (!res.ok) throw new Error(`Stability API error: ${res.status}`)

    const buffer = Buffer.from(await res.arrayBuffer())
    return { buffer, mimeType: 'image/jpeg', width: 0, height: 0 }
  }

  async replaceScene(input: Buffer, params: SceneParams): Promise<ProcessedImage> {
    const prompt = `food photography, ${params.surface} surface, ${params.lighting} lighting, ${params.style} style, professional food styling`

    const formData = new FormData()
    formData.append('image', new Blob([new Uint8Array(input)]))
    formData.append('prompt', prompt)
    formData.append('output_format', 'jpeg')

    const res = await fetch('https://api.stability.ai/v2beta/stable-image/edit/inpaint', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: 'image/*' },
      body: formData,
    })

    if (!res.ok) throw new Error(`Stability API error: ${res.status}`)

    const buffer = Buffer.from(await res.arrayBuffer())
    return { buffer, mimeType: 'image/jpeg', width: 0, height: 0 }
  }

  async generateFromDescription(prompt: string): Promise<ProcessedImage> {
    const formData = new FormData()
    formData.append(
      'prompt',
      `professional food photography, ${prompt}, appetizing, well-lit, high quality`,
    )
    formData.append('output_format', 'jpeg')

    const res = await fetch('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: 'image/*' },
      body: formData,
    })

    if (!res.ok) throw new Error(`Stability API error: ${res.status}`)

    const buffer = Buffer.from(await res.arrayBuffer())
    return { buffer, mimeType: 'image/jpeg', width: 1024, height: 1024 }
  }
}
