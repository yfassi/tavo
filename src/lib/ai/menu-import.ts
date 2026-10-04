import { getAnthropicClient } from './client'
import { MenuImportSchema, type MenuImportResult } from './schemas'
import { checkAiCostCap, logAiJob, updateAiJob } from './cost-guard'

const IMPORT_PROMPT = `Tu es un assistant qui extrait les données d'une carte de restaurant à partir d'une photo ou d'un PDF.

Règles strictes :
- Retourne un JSON valide avec la structure demandée
- Organise les plats par catégories (Entrées, Plats, Desserts, Boissons, etc.)
- Extrais les prix en CENTIMES (ex: 12,90 € → 1290)
- Si un prix est illisible ou ambigu, mets amountCents à 0 et uncertain à true
- Si un plat ou une ligne est ambiguë, mets uncertain à true sur l'item
- Suggère les allergènes probables dans suggestedAllergens (parmi: gluten, crustaces, oeufs, poissons, arachides, soja, lait, fruits_a_coque, celeri, moutarde, sesame, sulfites, lupin, mollusques)
- Ne devine JAMAIS un prix. Si tu ne le vois pas clairement, c'est uncertain
- Ne mens pas, n'invente pas de plats qui ne sont pas sur la carte

Structure JSON attendue :
{
  "categories": [
    {
      "name": "Nom de la catégorie",
      "items": [
        {
          "name": "Nom du plat",
          "description": "Description optionnelle",
          "prices": [{ "label": "Seul", "amountCents": 1290 }],
          "suggestedAllergens": ["gluten", "lait"],
          "uncertain": false
        }
      ]
    }
  ]
}`

const MODEL = 'claude-sonnet-4-20250514'

export async function importMenuFromImage(
  organizationId: string,
  imageUrl: string,
): Promise<{ jobId: string; result: MenuImportResult }> {
  // Check cost cap
  const { allowed } = await checkAiCostCap(organizationId)
  if (!allowed) {
    throw new Error('Plafond de coût IA journalier atteint')
  }

  // Log the job
  const jobId = await logAiJob({
    organizationId,
    type: 'menu_import',
    model: MODEL,
    inputData: { imageUrl },
  })

  try {
    const client = getAnthropicClient()

    // Fetch the image and convert to base64
    const imageResponse = await fetch(imageUrl)
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
    const base64 = imageBuffer.toString('base64')
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'

    const mediaType = contentType.startsWith('image/png')
      ? ('image/png' as const)
      : contentType.startsWith('image/webp')
        ? ('image/webp' as const)
        : contentType.startsWith('image/gif')
          ? ('image/gif' as const)
          : ('image/jpeg' as const)

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: IMPORT_PROMPT,
            },
          ],
        },
      ],
    })

    const textContent = response.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    // Extract JSON from response (may be wrapped in markdown code block)
    let jsonStr = textContent.text
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }

    const parsed = JSON.parse(jsonStr)
    const validated = MenuImportSchema.parse(parsed)

    const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)
    const costCents = Math.ceil(tokensUsed * 0.0003) // rough estimate

    await updateAiJob(jobId, {
      status: 'completed',
      outputData: validated as unknown as Record<string, unknown>,
      tokensUsed,
      costCents,
    })

    return { jobId, result: validated }
  } catch (error) {
    await updateAiJob(jobId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}
