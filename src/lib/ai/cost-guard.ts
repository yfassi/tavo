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

export async function updateAiJob(jobId: string, updates: Partial<AiJobUpdate>): Promise<void> {
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
