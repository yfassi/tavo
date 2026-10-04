export interface ProcessedImage {
  buffer: Buffer
  mimeType: string
  width: number
  height: number
}

export interface SceneParams {
  surface: 'wood' | 'marble' | 'slate' | 'linen' | 'neutral'
  lighting: 'warm' | 'cool' | 'natural' | 'dramatic'
  style: 'rustic' | 'modern' | 'classic'
}

export interface ImageProvider {
  removeBackground(input: Buffer): Promise<ProcessedImage>
  enhance(input: Buffer): Promise<ProcessedImage>
  replaceScene(input: Buffer, params: SceneParams): Promise<ProcessedImage>
  generateFromDescription(prompt: string): Promise<ProcessedImage>
}
