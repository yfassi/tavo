# Phase 2: AI Import + Template Library + Scheduling

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AI-powered menu import (photo/PDF → structured data with review), 4 additional templates, image generation from description, template library with live preview, and time-slot scheduling for TV screens.

**Architecture:** Menu import uses Anthropic Claude vision API with structured JSON output validated by Zod. The review screen shows extracted data with uncertain fields highlighted. Templates follow the existing self-contained module pattern. Scheduling adds day/time-slot management to the existing scenes system. Image generation adds `generateFromDescription` to the ImageProvider interface.

**Tech Stack:** Anthropic SDK (`@anthropic-ai/sdk`), Zod, existing template system, existing ImageProvider abstraction.

## Global Constraints

- TypeScript strict mode
- UI text in French (France), code and comments in English
- pnpm, Conventional Commits
- Amounts as integer cents, displayed via `formatPrice()`
- Server-side only for AI calls (Anthropic, Stability)
- Zod for all external input validation
- shadcn/ui uses `@base-ui/react` — use `render` prop, not `asChild`
- Existing interfaces: `createServerClient()`, `createBrowserClient()`, `getSession()`, `getImageProvider()`, `getTemplate()`, `getAllTemplates()`, `mapMenuToSlotData()`, `formatPrice()`
- AI cost cap: check `daily_ai_costs` before every call, default 500 cents/day/org
- Every AI call logged in `ai_jobs` table

---

### Task 1: Anthropic SDK + AI Client + Cost Guard

**Files:**
- Create: `src/lib/ai/client.ts`
- Create: `src/lib/ai/cost-guard.ts`
- Create: `tests/unit/cost-guard.test.ts`

**Interfaces:**
- Consumes: `createServerClient()` from `@/lib/supabase/server`
- Produces:
  - `getAnthropicClient(): Anthropic` — singleton, server-side only
  - `checkAiCostCap(organizationId: string): Promise<{ allowed: boolean; remainingCents: number }>` — checks daily spend against cap
  - `logAiJob(params: LogAiJobParams): Promise<string>` — creates `ai_jobs` record, returns job ID
  - `updateAiJob(jobId: string, updates: Partial<AiJobUpdate>): Promise<void>`

- [ ] **Step 1: Install Anthropic SDK**

```bash
pnpm add @anthropic-ai/sdk
```

- [ ] **Step 2: Write failing test for cost guard**

Create `tests/unit/cost-guard.test.ts`:

```ts
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
```

- [ ] **Step 3: Run test, verify it fails**

```bash
pnpm test -- tests/unit/cost-guard.test.ts
```

- [ ] **Step 4: Implement the AI client and cost guard**

Create `src/lib/ai/client.ts`:

```ts
import Anthropic from '@anthropic-ai/sdk'

let instance: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!instance) {
    instance = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }
  return instance
}
```

Create `src/lib/ai/cost-guard.ts`:

```ts
import { createServerClient } from '@/lib/supabase/server'

interface AiJobRow {
  cost_cents: number | null
  created_at: string
}

export function calculateDailyCostCents(jobs: AiJobRow[]): number {
  return jobs.reduce((sum, job) => sum + (job.cost_cents ?? 0), 0)
}

export async function checkAiCostCap(
  organizationId: string,
): Promise<{ allowed: boolean; remainingCents: number }> {
  const supabase = await createServerClient()
  const capCents = parseInt(process.env.AI_DAILY_COST_CAP_CENTS ?? '500', 10)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: jobs } = await supabase
    .from('ai_jobs')
    .select('cost_cents, created_at')
    .eq('organization_id', organizationId)
    .gte('created_at', today.toISOString())

  const spent = calculateDailyCostCents(jobs ?? [])
  const remaining = Math.max(0, capCents - spent)

  return { allowed: remaining > 0, remainingCents: remaining }
}

export interface LogAiJobParams {
  organizationId: string
  type: 'menu_import' | 'text_generation' | 'allergen_suggestion'
  model: string
  inputData?: Record<string, unknown>
}

export interface AiJobUpdate {
  status: 'processing' | 'completed' | 'failed'
  outputData: Record<string, unknown>
  tokensUsed: number
  costCents: number
  errorMessage: string
}

export async function logAiJob(params: LogAiJobParams): Promise<string> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('ai_jobs')
    .insert({
      organization_id: params.organizationId,
      type: params.type,
      status: 'processing',
      model: params.model,
      input_data: params.inputData ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id
}

export async function updateAiJob(
  jobId: string,
  updates: Partial<AiJobUpdate>,
): Promise<void> {
  const supabase = await createServerClient()
  await supabase
    .from('ai_jobs')
    .update({
      status: updates.status,
      output_data: updates.outputData,
      tokens_used: updates.tokensUsed,
      cost_cents: updates.costCents,
      error_message: updates.errorMessage,
    })
    .eq('id', jobId)
}
```

- [ ] **Step 5: Run test, verify it passes**

```bash
pnpm test -- tests/unit/cost-guard.test.ts
```

- [ ] **Step 6: Verify and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat: add Anthropic SDK client with AI cost guard and job logging"
```

---

### Task 2: AI Menu Import — Backend

**Files:**
- Create: `src/lib/ai/menu-import.ts`
- Create: `src/lib/ai/schemas.ts`
- Create: `src/lib/actions/import.ts`
- Create: `tests/unit/menu-import-schema.test.ts`

**Interfaces:**
- Consumes: `getAnthropicClient()`, `checkAiCostCap()`, `logAiJob()`, `updateAiJob()` from Task 1, `createServerClient()`, `getSession()`
- Produces:
  - `MenuImportSchema` — Zod schema for Claude's structured output
  - `type MenuImportResult = z.infer<typeof MenuImportSchema>` — parsed import data
  - `importMenuFromImage(organizationId: string, imageUrl: string): Promise<{ jobId: string; result: MenuImportResult }>` — sends image to Claude, returns structured menu data
  - `confirmImport(menuId: string, importData: MenuImportResult): Promise<void>` — server action that creates categories/items/prices/allergens from validated import data
  - `uploadMenuImage(formData: FormData): Promise<{ assetId: string; imageUrl: string }>` — server action to upload menu photo/PDF

- [ ] **Step 1: Write test for import schema validation**

Create `tests/unit/menu-import-schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { MenuImportSchema } from '@/lib/ai/schemas'

describe('MenuImportSchema', () => {
  it('validates a correct import result', () => {
    const data = {
      categories: [
        {
          name: 'Entrées',
          items: [
            {
              name: 'Soupe à l\'oignon',
              description: 'Gratinée au fromage',
              prices: [{ label: 'Seul', amountCents: 750 }],
              suggestedAllergens: ['gluten', 'lait'],
              uncertain: false,
            },
          ],
        },
      ],
    }
    const result = MenuImportSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('allows uncertain items', () => {
    const data = {
      categories: [
        {
          name: 'Plats',
          items: [
            {
              name: 'Plat du jour',
              prices: [{ label: 'Seul', amountCents: 0, uncertain: true }],
              suggestedAllergens: [],
              uncertain: true,
            },
          ],
        },
      ],
    }
    const result = MenuImportSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.categories[0].items[0].uncertain).toBe(true)
    }
  })

  it('rejects missing category name', () => {
    const data = {
      categories: [{ items: [] }],
    }
    const result = MenuImportSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

```bash
pnpm test -- tests/unit/menu-import-schema.test.ts
```

- [ ] **Step 3: Implement the Zod schema**

Create `src/lib/ai/schemas.ts`:

```ts
import { z } from 'zod'

export const MenuImportSchema = z.object({
  categories: z.array(
    z.object({
      name: z.string().min(1),
      items: z.array(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          prices: z.array(
            z.object({
              label: z.string().default('Seul'),
              amountCents: z.number().int().min(0),
              uncertain: z.boolean().optional(),
            }),
          ),
          suggestedAllergens: z.array(z.string()),
          uncertain: z.boolean().optional(),
        }),
      ),
    }),
  ),
})

export type MenuImportResult = z.infer<typeof MenuImportSchema>

export const TextGenerationSchema = z.object({
  caption: z.string().min(1),
  hashtags: z.array(z.string()),
})

export type TextGenerationResult = z.infer<typeof TextGenerationSchema>
```

- [ ] **Step 4: Run test, verify it passes**

```bash
pnpm test -- tests/unit/menu-import-schema.test.ts
```

- [ ] **Step 5: Implement the menu import function**

Create `src/lib/ai/menu-import.ts`:

```ts
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
      ? 'image/png' as const
      : contentType.startsWith('image/webp')
        ? 'image/webp' as const
        : contentType.startsWith('image/gif')
          ? 'image/gif' as const
          : 'image/jpeg' as const

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
```

- [ ] **Step 6: Create import server actions**

Create `src/lib/actions/import.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { importMenuFromImage } from '@/lib/ai/menu-import'
import type { MenuImportResult } from '@/lib/ai/schemas'

export async function uploadMenuImage(formData: FormData) {
  const { organization } = await getSession()
  const supabase = await createServerClient()
  const file = formData.get('menu_image') as File
  if (!file) throw new Error('No file provided')

  const ext = file.name.split('.').pop()
  const path = `imports/${organization.id}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('assets')
    .upload(path, file)

  if (uploadError) throw new Error(uploadError.message)

  const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(path)

  return { imageUrl: publicUrl }
}

export async function runMenuImport(imageUrl: string) {
  const { organization } = await getSession()
  const { jobId, result } = await importMenuFromImage(organization.id, imageUrl)
  return { jobId, result }
}

export async function confirmImport(menuId: string, importData: MenuImportResult) {
  const supabase = await createServerClient()

  for (const [catIndex, category] of importData.categories.entries()) {
    // Create category
    const { data: cat, error: catError } = await supabase
      .from('menu_categories')
      .insert({
        menu_id: menuId,
        name: category.name,
        sort_order: catIndex,
      })
      .select('id')
      .single()

    if (catError || !cat) continue

    for (const [itemIndex, item] of category.items.entries()) {
      // Create item
      const { data: menuItem, error: itemError } = await supabase
        .from('menu_items')
        .insert({
          category_id: cat.id,
          name: item.name,
          description: item.description ?? null,
          sort_order: itemIndex,
        })
        .select('id')
        .single()

      if (itemError || !menuItem) continue

      // Create prices
      if (item.prices.length > 0) {
        await supabase.from('menu_item_prices').insert(
          item.prices.map((p, i) => ({
            item_id: menuItem.id,
            label: p.label,
            amount_cents: p.amountCents,
            sort_order: i,
          })),
        )
      }

      // Create suggested allergens (not confirmed)
      if (item.suggestedAllergens.length > 0) {
        await supabase.from('menu_item_allergens').insert(
          item.suggestedAllergens.map((allergen) => ({
            item_id: menuItem.id,
            allergen,
            is_confirmed: false,
          })),
        )
      }
    }
  }

  revalidatePath('/carte')
  revalidatePath('/tv', 'layout')
  revalidatePath('/m', 'layout')
}
```

- [ ] **Step 7: Verify and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat: add AI menu import with Claude vision, Zod validation, and cost guard"
```

---

### Task 3: AI Menu Import — Review UI

**Files:**
- Create: `src/app/(dashboard)/carte/import/page.tsx`
- Create: `src/components/carte/import-upload.tsx`
- Create: `src/components/carte/import-review.tsx`
- Create: `src/components/carte/import-item-row.tsx`

**Interfaces:**
- Consumes: `uploadMenuImage()`, `runMenuImport()`, `confirmImport()` from Task 2, `getSession()`, `formatPrice()`, `ALLERGEN_LABELS`, shadcn/ui components
- Produces: `/carte/import` page with upload → AI processing → review screen with uncertain fields highlighted → confirm import

- [ ] **Step 1: Create the import upload component**

Create `src/components/carte/import-upload.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { uploadMenuImage, runMenuImport } from '@/lib/actions/import'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, Loader2 } from 'lucide-react'
import type { MenuImportResult } from '@/lib/ai/schemas'

interface ImportUploadProps {
  onResult: (result: MenuImportResult) => void
}

export function ImportUpload({ onResult }: ImportUploadProps) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing'>('idle')
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    const formData = new FormData()
    formData.append('menu_image', file)

    startTransition(async () => {
      try {
        setStatus('uploading')
        const { imageUrl } = await uploadMenuImage(formData)

        setStatus('analyzing')
        const { result } = await runMenuImport(imageUrl)

        onResult(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors de l\'import')
      } finally {
        setStatus('idle')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importer une carte</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Prenez en photo votre carte ou importez un PDF. L&apos;IA analysera le contenu et
          extraira les plats, prix et catégories.
        </p>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {isPending ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {status === 'uploading' ? 'Envoi de l\'image...' : 'Analyse en cours par l\'IA...'}
            </p>
          </div>
        ) : (
          <label className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-8 cursor-pointer hover:bg-muted/50">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <span className="text-sm font-medium">Photo ou PDF de votre carte</span>
            <Input
              type="file"
              accept="image/*,.pdf"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button type="button" variant="outline">
              Choisir un fichier
            </Button>
          </label>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create the import item row**

Create `src/components/carte/import-item-row.tsx`:

```tsx
'use client'

import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { ALLERGEN_LABELS, type Allergen } from '@/lib/types/menu'
import { formatPriceRaw } from '@/lib/format'

interface ImportItemData {
  name: string
  description?: string
  prices: { label: string; amountCents: number; uncertain?: boolean }[]
  suggestedAllergens: string[]
  uncertain?: boolean
}

interface ImportItemRowProps {
  item: ImportItemData
  onChange: (updated: ImportItemData) => void
  onDelete: () => void
}

export function ImportItemRow({ item, onChange, onDelete }: ImportItemRowProps) {
  return (
    <div className={`rounded-lg border p-3 space-y-2 ${item.uncertain ? 'border-yellow-500 bg-yellow-50' : ''}`}>
      {item.uncertain && (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
          À vérifier
        </Badge>
      )}

      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2">
          <Input
            value={item.name}
            onChange={(e) => onChange({ ...item, name: e.target.value })}
            placeholder="Nom du plat"
            className={item.uncertain ? 'border-yellow-500' : ''}
          />
          <Input
            value={item.description ?? ''}
            onChange={(e) => onChange({ ...item, description: e.target.value || undefined })}
            placeholder="Description (optionnel)"
          />
        </div>

        <div className="space-y-1">
          {item.prices.map((price, i) => (
            <div key={i} className="flex items-center gap-1">
              <Input
                className={`w-20 ${price.uncertain ? 'border-yellow-500 bg-yellow-50' : ''}`}
                value={price.amountCents > 0 ? formatPriceRaw(price.amountCents) : ''}
                onChange={(e) => {
                  const cents = Math.round(parseFloat(e.target.value.replace(',', '.')) * 100)
                  const newPrices = [...item.prices]
                  newPrices[i] = { ...price, amountCents: isNaN(cents) ? 0 : cents, uncertain: false }
                  onChange({ ...item, prices: newPrices })
                }}
                placeholder="Prix"
              />
              <span className="text-xs text-muted-foreground">€</span>
            </div>
          ))}
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {item.suggestedAllergens.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.suggestedAllergens.map((allergen) => (
            <Badge key={allergen} variant="secondary" className="text-xs border-yellow-500">
              {ALLERGEN_LABELS[allergen as Allergen] ?? allergen} ?
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create the import review component**

Create `src/components/carte/import-review.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { confirmImport } from '@/lib/actions/import'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ImportItemRow } from './import-item-row'
import { Check, ArrowLeft } from 'lucide-react'
import type { MenuImportResult } from '@/lib/ai/schemas'

interface ImportReviewProps {
  menuId: string
  initialData: MenuImportResult
  onBack: () => void
}

export function ImportReview({ menuId, initialData, onBack }: ImportReviewProps) {
  const [data, setData] = useState(initialData)
  const [isPending, startTransition] = useTransition()

  const totalItems = data.categories.reduce((sum, cat) => sum + cat.items.length, 0)
  const uncertainItems = data.categories.reduce(
    (sum, cat) => sum + cat.items.filter((i) => i.uncertain).length,
    0,
  )
  const uncertainPrices = data.categories.reduce(
    (sum, cat) =>
      sum + cat.items.reduce((s, i) => s + i.prices.filter((p) => p.uncertain).length, 0),
    0,
  )

  function updateCategory(catIndex: number, name: string) {
    const newData = { ...data }
    newData.categories = [...newData.categories]
    newData.categories[catIndex] = { ...newData.categories[catIndex], name }
    setData(newData)
  }

  function updateItem(catIndex: number, itemIndex: number, item: MenuImportResult['categories'][0]['items'][0]) {
    const newData = { ...data }
    newData.categories = [...newData.categories]
    newData.categories[catIndex] = {
      ...newData.categories[catIndex],
      items: [...newData.categories[catIndex].items],
    }
    newData.categories[catIndex].items[itemIndex] = item
    setData(newData)
  }

  function deleteItem(catIndex: number, itemIndex: number) {
    const newData = { ...data }
    newData.categories = [...newData.categories]
    newData.categories[catIndex] = {
      ...newData.categories[catIndex],
      items: newData.categories[catIndex].items.filter((_, i) => i !== itemIndex),
    }
    // Remove empty categories
    newData.categories = newData.categories.filter((c) => c.items.length > 0)
    setData(newData)
  }

  function deleteCategory(catIndex: number) {
    const newData = { ...data }
    newData.categories = newData.categories.filter((_, i) => i !== catIndex)
    setData(newData)
  }

  function handleConfirm() {
    startTransition(async () => {
      await confirmImport(menuId, data)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
        <div className="text-sm text-muted-foreground">
          {totalItems} plat{totalItems > 1 ? 's' : ''} détecté{totalItems > 1 ? 's' : ''}
          {uncertainItems > 0 && (
            <span className="ml-2 text-yellow-600">
              ({uncertainItems} à vérifier)
            </span>
          )}
          {uncertainPrices > 0 && (
            <span className="ml-2 text-yellow-600">
              ({uncertainPrices} prix incertain{uncertainPrices > 1 ? 's' : ''})
            </span>
          )}
        </div>
      </div>

      {data.categories.map((category, catIndex) => (
        <Card key={catIndex}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Input
                className="text-lg font-semibold border-none bg-transparent p-0 h-auto"
                value={category.name}
                onChange={(e) => updateCategory(catIndex, e.target.value)}
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive text-xs"
                onClick={() => deleteCategory(catIndex)}
              >
                Supprimer
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {category.items.map((item, itemIndex) => (
              <ImportItemRow
                key={itemIndex}
                item={item}
                onChange={(updated) => updateItem(catIndex, itemIndex, updated)}
                onDelete={() => deleteItem(catIndex, itemIndex)}
              />
            ))}
          </CardContent>
        </Card>
      ))}

      <Button onClick={handleConfirm} disabled={isPending || totalItems === 0} className="w-full" size="lg">
        <Check className="mr-2 h-4 w-4" />
        {isPending ? 'Import en cours...' : `Importer ${totalItems} plat${totalItems > 1 ? 's' : ''}`}
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Create the import page**

Create `src/app/(dashboard)/carte/import/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { ImportUpload } from '@/components/carte/import-upload'
import { ImportReview } from '@/components/carte/import-review'
import type { MenuImportResult } from '@/lib/ai/schemas'
import { useRouter } from 'next/navigation'

export default function ImportPage() {
  const [importResult, setImportResult] = useState<MenuImportResult | null>(null)
  const router = useRouter()

  // Note: menuId will need to be passed or fetched
  // For now, we'll need to get it from the URL or context
  // This is a client page, so we'll fetch it

  if (importResult) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Vérifier l&apos;import</h1>
        <ImportReview
          menuId="" // Will be set by a wrapper
          initialData={importResult}
          onBack={() => setImportResult(null)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Importer une carte</h1>
      <ImportUpload onResult={setImportResult} />
    </div>
  )
}
```

This page needs the menuId. Let me create a server wrapper.

Replace `src/app/(dashboard)/carte/import/page.tsx` with a server component that passes menuId:

```tsx
import { getSession } from '@/lib/auth/get-session'
import { getMenuWithItems } from '@/lib/queries/menu'
import { ImportPageClient } from '@/components/carte/import-page-client'

export default async function ImportPage() {
  const { venue } = await getSession()
  if (!venue) return <p className="text-muted-foreground">Aucun établissement configuré.</p>

  const menu = await getMenuWithItems(venue.id)
  if (!menu) return <p className="text-muted-foreground">Aucune carte active.</p>

  return <ImportPageClient menuId={menu.id} />
}
```

Create `src/components/carte/import-page-client.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImportUpload } from '@/components/carte/import-upload'
import { ImportReview } from '@/components/carte/import-review'
import type { MenuImportResult } from '@/lib/ai/schemas'

export function ImportPageClient({ menuId }: { menuId: string }) {
  const [importResult, setImportResult] = useState<MenuImportResult | null>(null)
  const router = useRouter()

  if (importResult) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Vérifier l&apos;import</h1>
        <ImportReview
          menuId={menuId}
          initialData={importResult}
          onBack={() => setImportResult(null)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Importer une carte</h1>
      <ImportUpload onResult={setImportResult} />
    </div>
  )
}
```

- [ ] **Step 5: Add import link to the carte page**

Modify `src/app/(dashboard)/carte/page.tsx` — add an "Importer" button next to "Ajouter une catégorie":

Add to the header section, next to `<AddCategoryDialog>`:

```tsx
import Link from 'next/link'
// In the JSX, add:
<Link href="/carte/import">
  <Button variant="outline">
    <Upload className="mr-2 h-4 w-4" /> Importer une carte
  </Button>
</Link>
```

Import `Upload` from `lucide-react` and `Button` if not already imported.

- [ ] **Step 6: Verify and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat: add AI menu import review UI with uncertain field highlighting"
```

---

### Task 4: Four Additional Templates

**Files:**
- Create: `templates/street-02/manifest.json`, `schema.ts`, `Template.tsx`, `Template.module.css`
- Create: `templates/street-03/manifest.json`, `schema.ts`, `Template.tsx`, `Template.module.css`
- Create: `templates/bistrot-02/manifest.json`, `schema.ts`, `Template.tsx`, `Template.module.css`
- Create: `templates/bistrot-03/manifest.json`, `schema.ts`, `Template.tsx`, `Template.module.css`
- Modify: `src/lib/templates/registry.ts` — add 4 new templates

**Interfaces:**
- Consumes: `TemplateProps`, `TemplateSlotData`, `formatPrice()` from existing code
- Produces: 4 new template components registered in the registry, each with 2 color variants

Templates to create (from spec):
- `street-02` "Street Neon": dark background, glowing accents, urban feel
- `street-03` "Street Minimal": clean, large type, photo-forward
- `bistrot-02` "Bistrot Elegant": serif fonts, muted tones, fine dining
- `bistrot-03` "Bistrot Market": fresh, green accents, organic feel

Each follows the exact same pattern as street-01 and bistrot-01: manifest.json, schema.ts (re-exports), Template.tsx, Template.module.css. Container queries, CSS-only animations (transform+opacity), prefers-reduced-motion support.

- [ ] **Step 1: Create street-02 (Neon)**

Create `templates/street-02/manifest.json`:

```json
{
  "slug": "street-02",
  "name": "Street Neon",
  "family": "street",
  "formats": ["landscape", "portrait"],
  "loopDurationMs": 30000,
  "maxItemsPerScreen": 8,
  "colorVariants": [
    { "name": "Nuit", "tokens": { "bg": "#0a0a0a", "text": "#e0e0e0", "accent": "#00ff88" } },
    { "name": "Violet", "tokens": { "bg": "#0f0a1a", "text": "#e0e0e0", "accent": "#bf5af2" } }
  ],
  "version": 1
}
```

Create `templates/street-02/schema.ts`:

```ts
export { templateSlotSchema } from '@/lib/types/template'
```

Create `templates/street-02/Template.module.css`:

```css
.container {
  container-type: size;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.wrapper {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
  font-family: var(--font-body, 'Inter', sans-serif);
  color: var(--color-text);
  background: var(--color-bg);
}

.header {
  display: flex;
  align-items: center;
  gap: 2cqw;
  padding: 2.5cqh 3cqw;
  border-bottom: 0.2cqh solid var(--color-accent);
  box-shadow: 0 0 2cqw color-mix(in srgb, var(--color-accent) 30%, transparent);
}

.logo {
  width: 5cqw;
  height: 5cqw;
  object-fit: contain;
}

.venueName {
  font-size: 3cqw;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-accent);
  text-shadow: 0 0 1cqw color-mix(in srgb, var(--color-accent) 50%, transparent);
}

.content {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2cqw;
  padding: 2cqh 3cqw;
  overflow: hidden;
}

.category {
  animation: glowIn 0.5s ease-out both;
}

.categoryName {
  font-size: 1.8cqw;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--color-accent);
  margin-bottom: 1cqh;
  padding-bottom: 0.5cqh;
  border-bottom: 1px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
}

.item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 0.5cqh 0;
}

.itemName {
  font-size: 1.6cqw;
  font-weight: 500;
}

.itemPrice {
  font-size: 1.6cqw;
  font-weight: 700;
  color: var(--color-accent);
}

.dailySpecial {
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  padding: 0.4cqh 0.8cqw;
  border-radius: 0.3cqw;
  border: 1px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
}

@keyframes glowIn {
  from { opacity: 0; transform: translateY(0.5cqh); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .category { animation: none; }
}
```

Create `templates/street-02/Template.tsx`:

```tsx
import type { TemplateProps } from '@/lib/types/template'
import { formatPrice } from '@/lib/format'
import styles from './Template.module.css'

export function StreetNeonTemplate({ data, format }: TemplateProps) {
  const style = {
    '--color-bg': '#0a0a0a',
    '--color-text': '#e0e0e0',
    '--color-accent': data.accentColor,
  } as React.CSSProperties

  const maxItems = format === 'landscape' ? 8 : 6

  return (
    <div className={styles.container}>
      <div className={styles.wrapper} style={style}>
        <div className={styles.header}>
          {data.logo && <img className={styles.logo} src={data.logo} alt="" />}
          <span className={styles.venueName}>{data.venueName}</span>
        </div>
        <div className={styles.content}>
          {data.categories.map((cat, ci) => (
            <div key={ci} className={styles.category} style={{ animationDelay: `${ci * 0.15}s` }}>
              <div className={styles.categoryName}>{cat.name}</div>
              {cat.items.slice(0, maxItems).map((item, ii) => (
                <div key={ii} className={`${styles.item} ${item.isDailySpecial ? styles.dailySpecial : ''}`}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemPrice}>
                    {item.prices[0] && formatPrice(item.prices[0].amountCents)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create street-03 (Minimal), bistrot-02 (Elegant), bistrot-03 (Market)**

Follow the same pattern for each. Each has unique:
- `manifest.json` with slug, name, family, colorVariants
- `Template.module.css` with distinct visual style
- `Template.tsx` with the component

**street-03 "Street Minimal"**: Light background, large typography, photo-forward layout, minimal decoration.

**bistrot-02 "Bistrot Elegant"**: Serif fonts (Playfair Display), muted earth tones, fine dining aesthetic, centered layout.

**bistrot-03 "Bistrot Market"**: Fresh green accents, organic feel, sans-serif clean type, leaf/organic decorative touches via CSS.

Each template re-exports the schema: `export { templateSlotSchema } from '@/lib/types/template'`

- [ ] **Step 3: Register all 4 new templates in the registry**

Modify `src/lib/templates/registry.ts` — add imports and entries for street-02, street-03, bistrot-02, bistrot-03:

```ts
import streetNeonManifest from '../../../templates/street-02/manifest.json'
import streetMinimalManifest from '../../../templates/street-03/manifest.json'
import bistrotElegantManifest from '../../../templates/bistrot-02/manifest.json'
import bistrotMarketManifest from '../../../templates/bistrot-03/manifest.json'
import { StreetNeonTemplate } from '../../../templates/street-02/Template'
import { StreetMinimalTemplate } from '../../../templates/street-03/Template'
import { BistrotElegantTemplate } from '../../../templates/bistrot-02/Template'
import { BistrotMarketTemplate } from '../../../templates/bistrot-03/Template'

// Add to registry:
'street-02': { manifest: streetNeonManifest as TemplateManifest, Component: StreetNeonTemplate },
'street-03': { manifest: streetMinimalManifest as TemplateManifest, Component: StreetMinimalTemplate },
'bistrot-02': { manifest: bistrotElegantManifest as TemplateManifest, Component: BistrotElegantTemplate },
'bistrot-03': { manifest: bistrotMarketManifest as TemplateManifest, Component: BistrotMarketTemplate },
```

- [ ] **Step 4: Seed the 4 new templates into the database migration**

Create `supabase/migrations/00002_seed_templates.sql`:

```sql
INSERT INTO templates (slug, name, family, formats, loop_duration_ms, version) VALUES
  ('street-01', 'Street Bold', 'street', '{landscape,portrait}', 30000, 1),
  ('street-02', 'Street Neon', 'street', '{landscape,portrait}', 30000, 1),
  ('street-03', 'Street Minimal', 'street', '{landscape,portrait}', 30000, 1),
  ('bistrot-02', 'Bistrot Élégant', 'bistrot', '{landscape,portrait}', 30000, 1),
  ('bistrot-03', 'Bistrot Marché', 'bistrot', '{landscape,portrait}', 30000, 1)
ON CONFLICT (slug) DO NOTHING;
```

- [ ] **Step 5: Verify and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat: add 4 additional templates (street-02, street-03, bistrot-02, bistrot-03)"
```

---

### Task 5: Template Library + Live Preview

**Files:**
- Create: `src/app/(dashboard)/tv/templates/page.tsx`
- Create: `src/components/tv/template-library.tsx`
- Create: `src/components/tv/template-preview-card.tsx`

**Interfaces:**
- Consumes: `getAllTemplates()` from `@/lib/templates/registry`, `getMenuWithItems()`, `mapMenuToSlotData()`, `getSession()`, `getBrandKit()`, `TemplateRenderer`
- Produces: `/tv/templates` page showing all available templates with live preview using the client's actual menu data

- [ ] **Step 1: Create the template preview card**

Create `src/components/tv/template-preview-card.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TemplateRenderer } from '@/components/templates/template-renderer'
import type { TemplateSlotData, TemplateManifest } from '@/lib/types/template'

interface TemplatePreviewCardProps {
  manifest: TemplateManifest
  slotData: TemplateSlotData
}

export function TemplatePreviewCard({ manifest, slotData }: TemplatePreviewCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{manifest.name}</CardTitle>
          <Badge variant="secondary">{manifest.family}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border" style={{ aspectRatio: '16/9' }}>
          <TemplateRenderer slug={manifest.slug} data={slotData} format="landscape" />
        </div>
        <div className="mt-2 flex gap-2">
          {manifest.colorVariants.map((v) => (
            <div
              key={v.name}
              className="flex items-center gap-1 text-xs text-muted-foreground"
            >
              <div
                className="h-3 w-3 rounded-full border"
                style={{ background: v.tokens.bg }}
              />
              {v.name}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create the template library page**

Create `src/app/(dashboard)/tv/templates/page.tsx`:

```tsx
import { getSession } from '@/lib/auth/get-session'
import { getMenuWithItems } from '@/lib/queries/menu'
import { getBrandKit } from '@/lib/queries/brand'
import { getAllTemplates } from '@/lib/templates/registry'
import { mapMenuToSlotData } from '@/lib/templates/data-mapper'
import { TemplatePreviewCard } from '@/components/tv/template-preview-card'
import type { TemplateSlotData } from '@/lib/types/template'

export default async function TemplateLibraryPage() {
  const { venue } = await getSession()
  const templates = getAllTemplates()

  let slotData: TemplateSlotData | null = null

  if (venue) {
    const [menu, brandKit] = await Promise.all([
      getMenuWithItems(venue.id),
      getBrandKit(venue.id),
    ])

    if (menu && brandKit) {
      slotData = mapMenuToSlotData(menu, venue, brandKit)
    }
  }

  // Fallback data if no menu exists
  const previewData: TemplateSlotData = slotData ?? {
    venueName: 'Mon Restaurant',
    accentColor: '#c2185b',
    categories: [
      {
        name: 'Entrées',
        items: [
          { name: 'Soupe du jour', prices: [{ label: 'Seul', amountCents: 750 }], isAvailable: true },
          { name: 'Salade verte', prices: [{ label: 'Seul', amountCents: 650 }], isAvailable: true },
        ],
      },
      {
        name: 'Plats',
        items: [
          { name: 'Steak-frites', prices: [{ label: 'Seul', amountCents: 1690 }], isDailySpecial: true, isAvailable: true },
          { name: 'Poulet rôti', prices: [{ label: 'Seul', amountCents: 1490 }], isAvailable: true },
        ],
      },
    ],
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bibliothèque de templates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Aperçu avec {slotData ? 'votre carte' : 'des données de démonstration'}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <TemplatePreviewCard
            key={t.manifest.slug}
            manifest={t.manifest}
            slotData={previewData}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add link to template library from the TV page**

Modify `src/app/(dashboard)/tv/page.tsx` — add a link to `/tv/templates`:

```tsx
import Link from 'next/link'
// Add to the header area:
<Link href="/tv/templates">
  <Button variant="outline">Voir les templates</Button>
</Link>
```

- [ ] **Step 4: Verify and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat: add template library with live preview using client menu data"
```

---

### Task 6: Schedule Management (Time Slots)

**Files:**
- Create: `src/lib/actions/schedule.ts`
- Create: `src/lib/queries/schedule.ts`
- Create: `src/components/tv/schedule-editor.tsx`
- Create: `src/app/(dashboard)/tv/[screenId]/page.tsx`

**Interfaces:**
- Consumes: `createServerClient()`, `getSession()`, existing screen/scene/schedule tables
- Produces:
  - `getScreenWithSchedules(screenId: string): Promise<ScreenWithSchedules>`
  - `createSchedule(sceneId, data): Promise<void>` — add a time-slot schedule
  - `updateSchedule(scheduleId, data): Promise<void>`
  - `deleteSchedule(scheduleId): Promise<void>`
  - `updateSceneTemplate(sceneId, templateSlug): Promise<void>` — change the template for a scene
  - `/tv/[screenId]` page with schedule editor per screen

- [ ] **Step 1: Create schedule queries**

Create `src/lib/queries/schedule.ts`:

```ts
import { createServerClient } from '@/lib/supabase/server'

export async function getScreenWithSchedules(screenId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('screens')
    .select('*, scenes(*, template:templates(*), schedules(*))')
    .eq('id', screenId)
    .single()

  if (error) throw new Error(error.message)
  return data
}
```

- [ ] **Step 2: Create schedule actions**

Create `src/lib/actions/schedule.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'

const DAY_LABELS: Record<number, string> = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
  7: 'Dimanche',
}

export { DAY_LABELS }

export async function createSchedule(
  sceneId: string,
  data: {
    label: string
    daysOfWeek: number[]
    startTime: string
    endTime: string
  },
) {
  const supabase = await createServerClient()
  const { error } = await supabase.from('schedules').insert({
    scene_id: sceneId,
    label: data.label,
    days_of_week: data.daysOfWeek,
    start_time: data.startTime,
    end_time: data.endTime,
    is_active: true,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/tv')
}

export async function updateSchedule(
  scheduleId: string,
  data: {
    label?: string
    daysOfWeek?: number[]
    startTime?: string
    endTime?: string
    isActive?: boolean
  },
) {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('schedules')
    .update({
      label: data.label,
      days_of_week: data.daysOfWeek,
      start_time: data.startTime,
      end_time: data.endTime,
      is_active: data.isActive,
    })
    .eq('id', scheduleId)
  if (error) throw new Error(error.message)
  revalidatePath('/tv')
}

export async function deleteSchedule(scheduleId: string) {
  const supabase = await createServerClient()
  const { error } = await supabase.from('schedules').delete().eq('id', scheduleId)
  if (error) throw new Error(error.message)
  revalidatePath('/tv')
}

export async function updateSceneTemplate(sceneId: string, templateId: string) {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('scenes')
    .update({ template_id: templateId })
    .eq('id', sceneId)
  if (error) throw new Error(error.message)
  revalidatePath('/tv')
}
```

- [ ] **Step 3: Create schedule editor component**

Create `src/components/tv/schedule-editor.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { createSchedule, updateSchedule, deleteSchedule, DAY_LABELS } from '@/lib/actions/schedule'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, Clock } from 'lucide-react'

interface Schedule {
  id: string
  label: string | null
  days_of_week: number[]
  start_time: string
  end_time: string
  is_active: boolean
}

interface ScheduleEditorProps {
  sceneId: string
  schedules: Schedule[]
}

const PRESETS = [
  { label: 'Déjeuner', startTime: '11:30', endTime: '14:30', days: [1, 2, 3, 4, 5] },
  { label: 'Soir', startTime: '18:00', endTime: '23:00', days: [1, 2, 3, 4, 5, 6] },
  { label: 'Happy Hour', startTime: '17:00', endTime: '19:00', days: [1, 2, 3, 4, 5] },
  { label: 'Week-end', startTime: '10:00', endTime: '23:00', days: [6, 7] },
]

export function ScheduleEditor({ sceneId, schedules }: ScheduleEditorProps) {
  const [isPending, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newStart, setNewStart] = useState('11:30')
  const [newEnd, setNewEnd] = useState('14:30')
  const [newDays, setNewDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7])

  function handleAddPreset(preset: typeof PRESETS[0]) {
    startTransition(async () => {
      await createSchedule(sceneId, {
        label: preset.label,
        daysOfWeek: preset.days,
        startTime: preset.startTime,
        endTime: preset.endTime,
      })
    })
  }

  function handleAdd() {
    if (!newLabel.trim()) return
    startTransition(async () => {
      await createSchedule(sceneId, {
        label: newLabel.trim(),
        daysOfWeek: newDays,
        startTime: newStart,
        endTime: newEnd,
      })
      setShowAdd(false)
      setNewLabel('')
    })
  }

  function handleToggle(scheduleId: string, isActive: boolean) {
    startTransition(() => updateSchedule(scheduleId, { isActive }))
  }

  function handleDelete(scheduleId: string) {
    if (confirm('Supprimer cette plage horaire ?')) {
      startTransition(() => deleteSchedule(scheduleId))
    }
  }

  function toggleDay(day: number) {
    setNewDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    )
  }

  return (
    <Card className={isPending ? 'opacity-50' : ''}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" /> Plages horaires
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {schedules.length === 0 && !showAdd && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Ajoutez des plages horaires ou utilisez un preset :</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button key={preset.label} variant="outline" size="sm" onClick={() => handleAddPreset(preset)}>
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {schedules.map((sch) => (
          <div key={sch.id} className="flex items-center gap-3 rounded-lg border p-3">
            <Switch checked={sch.is_active} onCheckedChange={(v) => handleToggle(sch.id, v)} />
            <div className="flex-1">
              <p className="text-sm font-medium">{sch.label ?? 'Sans nom'}</p>
              <p className="text-xs text-muted-foreground">
                {sch.start_time.slice(0, 5)} — {sch.end_time.slice(0, 5)} ·{' '}
                {sch.days_of_week.map((d) => DAY_LABELS[d]?.slice(0, 3)).join(', ')}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(sch.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}

        {showAdd ? (
          <div className="space-y-3 rounded-lg border p-3">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Déjeuner, Soir, Happy Hour..." />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Début</Label>
                <Input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fin</Label>
                <Input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <Badge
                  key={day}
                  variant={newDays.includes(day) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleDay(day)}
                >
                  {DAY_LABELS[day]?.slice(0, 3)}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>Ajouter</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Annuler</Button>
            </div>
          </div>
        ) : (
          schedules.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter une plage
            </Button>
          )
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Create the screen detail page**

Create `src/app/(dashboard)/tv/[screenId]/page.tsx`:

```tsx
import { getSession } from '@/lib/auth/get-session'
import { getScreenWithSchedules } from '@/lib/queries/schedule'
import { ScheduleEditor } from '@/components/tv/schedule-editor'
import { getAllTemplates } from '@/lib/templates/registry'
import { Badge } from '@/components/ui/badge'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Monitor } from 'lucide-react'

export default async function ScreenDetailPage({
  params,
}: {
  params: Promise<{ screenId: string }>
}) {
  const { screenId } = await params
  await getSession() // Ensure authenticated

  const screen = await getScreenWithSchedules(screenId)
  if (!screen) notFound()

  const templates = getAllTemplates()
  const scene = screen.scenes?.[0] // Use first scene for now

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/tv">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="h-5 w-5" /> {screen.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {screen.orientation === 'landscape' ? 'Paysage 16:9' : 'Portrait 9:16'}
          </p>
        </div>
        <Badge variant={screen.last_seen_at ? 'default' : 'secondary'} className="ml-auto">
          {screen.last_seen_at ? 'En ligne' : 'Jamais connecté'}
        </Badge>
      </div>

      {scene && (
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium mb-2">Template actuel</p>
            <Badge>{scene.template?.name ?? scene.template?.slug ?? 'Inconnu'}</Badge>
          </div>

          <ScheduleEditor sceneId={scene.id} schedules={scene.schedules ?? []} />
        </div>
      )}

      {!scene && (
        <p className="text-muted-foreground">Aucune scène configurée pour cet écran.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Make screens clickable in the screen list**

Modify `src/components/tv/screen-list.tsx` — wrap each screen card with a Link to `/tv/[screenId]`:

Add `import Link from 'next/link'` and wrap the Card with `<Link href={'/tv/' + screen.id}>`.

- [ ] **Step 6: Verify and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat: add schedule management with time-slot presets and per-screen detail page"
```

---

### Task 7: Image Generation from Description (Phase 2 Option)

**Files:**
- Modify: `src/lib/images/provider.ts` — add `generateFromDescription` method
- Modify: `src/lib/images/mock-provider.ts` — implement mock
- Modify: `src/lib/images/stability-provider.ts` — implement stub
- Create: `src/lib/actions/generate-image.ts`
- Create: `src/components/studio/generate-image-dialog.tsx`
- Modify: `src/app/(dashboard)/studio/page.tsx` — add generate button
- Create: `tests/unit/mock-provider-generate.test.ts`

**Interfaces:**
- Consumes: `ImageProvider`, `getImageProvider()`, `getSession()`, credit system
- Produces:
  - `ImageProvider.generateFromDescription(prompt: string): Promise<ProcessedImage>` — generates an image from text
  - `generateImage(prompt: string, itemId?: string): Promise<void>` — server action that generates, stores, and deducts credits
  - Generated assets have `ai_generated: true` and display "Illustration IA, non contractuelle"

- [ ] **Step 1: Write test for mock generate**

Create `tests/unit/mock-provider-generate.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test, verify it fails**

```bash
pnpm test -- tests/unit/mock-provider-generate.test.ts
```

- [ ] **Step 3: Create migration to make source_asset_id nullable**

Create `supabase/migrations/00003_nullable_source_asset.sql`:

```sql
ALTER TABLE image_jobs ALTER COLUMN source_asset_id DROP NOT NULL;
```

- [ ] **Step 4: Add generateFromDescription to the interface and implementations**

Modify `src/lib/images/provider.ts` — add to the `ImageProvider` interface:

```ts
generateFromDescription(prompt: string): Promise<ProcessedImage>
```

Modify `src/lib/images/mock-provider.ts` — add method:

```ts
async generateFromDescription(prompt: string): Promise<ProcessedImage> {
  await delay(2000)
  return {
    buffer: createMockImage(800, 600, `Generated: ${prompt.slice(0, 20)}`),
    mimeType: 'image/jpeg',
    width: 800,
    height: 600,
  }
}
```

Modify `src/lib/images/stability-provider.ts` — add method:

```ts
async generateFromDescription(prompt: string): Promise<ProcessedImage> {
  const formData = new FormData()
  formData.append('prompt', `professional food photography, ${prompt}, appetizing, well-lit, high quality`)
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
```

- [ ] **Step 4: Run test, verify it passes**

```bash
pnpm test -- tests/unit/mock-provider-generate.test.ts
```

- [ ] **Step 5: Create server action for image generation**

Create `src/lib/actions/generate-image.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { getImageProvider } from '@/lib/images'

export async function generateImage(prompt: string, itemId?: string) {
  const { organization } = await getSession()
  const supabase = await createServerClient()

  // Check credits
  const { data: lastCredit } = await supabase
    .from('credit_ledger')
    .select('balance_after')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const balance = lastCredit?.balance_after ?? 0
  if (balance <= 0) throw new Error('Quota mensuel atteint')

  // Create job
  const { data: job } = await supabase
    .from('image_jobs')
    .insert({
      organization_id: organization.id,
      source_asset_id: null,
      type: 'generate',
      status: 'processing',
      params: { prompt },
    })
    .select()
    .single()

  try {
    const provider = getImageProvider()
    const result = await provider.generateFromDescription(prompt)

    // Upload result
    const path = `generated/${organization.id}/${crypto.randomUUID()}.jpg`
    await supabase.storage.from('assets').upload(path, result.buffer, {
      contentType: result.mimeType,
    })

    const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(path)

    // Create asset with ai_generated flag
    const { data: asset } = await supabase
      .from('assets')
      .insert({
        organization_id: organization.id,
        type: 'generated',
        original_url: publicUrl,
        mime_type: result.mimeType,
        width: result.width,
        height: result.height,
        ai_generated: true,
      })
      .select()
      .single()

    // Update job
    await supabase.from('image_jobs').update({
      status: 'completed',
      result_asset_id: asset?.id,
    }).eq('id', job!.id)

    // If itemId provided, link the asset to the menu item
    if (itemId && asset) {
      await supabase.from('menu_items').update({ photo_asset_id: asset.id }).eq('id', itemId)
    }

    // Consume credit
    await supabase.from('credit_ledger').insert({
      organization_id: organization.id,
      type: 'consume',
      amount: -1,
      balance_after: balance - 1,
      description: 'Génération d\'image IA',
      image_job_id: job!.id,
    })
  } catch (err) {
    await supabase.from('image_jobs').update({
      status: 'failed',
      error_message: err instanceof Error ? err.message : 'Unknown error',
    }).eq('id', job!.id)
    throw err
  }

  revalidatePath('/studio')
}
```

- [ ] **Step 6: Create the generate image dialog**

Create `src/components/studio/generate-image-dialog.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { generateImage } from '@/lib/actions/generate-image'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Sparkles } from 'lucide-react'

export function GenerateImageDialog({ credits }: { credits: number }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [prompt, setPrompt] = useState('')

  function handleGenerate() {
    if (!prompt.trim()) return
    startTransition(async () => {
      await generateImage(prompt.trim())
      setPrompt('')
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={credits <= 0}>
          <Sparkles className="mr-2 h-4 w-4" /> Générer une image
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Générer une image de plat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Badge variant="secondary" className="text-xs">
            Illustration IA, non contractuelle
          </Badge>
          <p className="text-sm text-muted-foreground">
            Décrivez le plat que vous souhaitez illustrer. L&apos;image générée portera la mention
            &quot;Illustration IA&quot;.
          </p>
          <div className="space-y-2">
            <Label>Description du plat</Label>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Un bol de ramen fumant avec des œufs mollets, du porc chashu et des oignons verts"
            />
          </div>
          <Button onClick={handleGenerate} disabled={isPending || !prompt.trim()} className="w-full">
            {isPending ? 'Génération en cours...' : 'Générer (1 crédit)'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 7: Add generate button to studio page**

Modify `src/app/(dashboard)/studio/page.tsx` — import `GenerateImageDialog` and add it next to `PhotoUpload`:

```tsx
import { GenerateImageDialog } from '@/components/studio/generate-image-dialog'
// Add after <PhotoUpload>:
<GenerateImageDialog credits={credits} />
```

- [ ] **Step 8: Verify and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat: add AI image generation from description with IA label"
```

---

### Task 8: Final Verification + CLAUDE.md Update

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: everything from Tasks 1-7
- Produces: updated docs, verified quality

- [ ] **Step 1: Run all quality checks**

```bash
rm -rf node_modules .next && pnpm install
pnpm lint && pnpm typecheck && pnpm test
```

- [ ] **Step 2: Update CLAUDE.md**

Add to the directory/conventions section:
- `src/lib/ai/` — Anthropic client, cost guard, menu import, schemas
- `src/lib/actions/import.ts` — AI menu import server actions
- `src/lib/actions/generate-image.ts` — AI image generation
- `src/lib/actions/schedule.ts` — Time-slot schedule management
- AI calls require `ANTHROPIC_API_KEY` env var
- AI cost cap checked before every call (default 500 cents/day/org)
- AI-generated images always flagged with `ai_generated: true`
- 6 templates total: street-01/02/03, bistrot-01/02/03

- [ ] **Step 3: Commit and tag**

```bash
git add -A
git commit -m "docs: update CLAUDE.md for Phase 2"
git tag phase-2-complete
```
