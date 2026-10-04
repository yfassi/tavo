export interface PlanLimit {
  venues: number
  screens: number
  monthlyCredits: number
}

export const PLAN_LIMITS: Record<string, PlanLimit> = {
  trial: { venues: 3, screens: 3, monthlyCredits: 100 },
  starter: { venues: 1, screens: 1, monthlyCredits: 30 },
  pro: { venues: 3, screens: 3, monthlyCredits: 100 },
}

export function isPlanActive(status: string): boolean {
  return status === 'trialing' || status === 'active'
}

export function getTrialDaysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null
  const diff = new Date(trialEndsAt).getTime() - Date.now()
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
