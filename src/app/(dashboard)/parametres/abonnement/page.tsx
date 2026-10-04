import { getSession } from '@/lib/auth/get-session'
import { getSubscriptionStatus } from '@/lib/stripe/guards'
import { SubscriptionCard } from '@/components/parametres/subscription-card'

export default async function AbonnementPage() {
  const { organization } = await getSession()
  const subStatus = await getSubscriptionStatus(organization.id)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Abonnement</h1>
      <SubscriptionCard
        currentPlan={subStatus.plan}
        status={subStatus.status}
        trialDaysLeft={subStatus.trialDaysLeft}
        isActive={subStatus.isActive}
      />
    </div>
  )
}
