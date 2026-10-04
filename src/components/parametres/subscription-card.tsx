'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'

interface Plan {
  name: string
  slug: string
  price: string
  priceId: string
  features: string[]
  highlighted?: boolean
}

const PLANS: Plan[] = [
  {
    name: 'Starter',
    slug: 'starter',
    price: '29 €/mois',
    priceId: '', // Set via env or Stripe Dashboard
    features: [
      '1 établissement',
      '1 écran TV',
      '30 crédits photo/mois',
      '6 templates',
      'Menu interactif',
    ],
  },
  {
    name: 'Pro',
    slug: 'pro',
    price: '59 €/mois',
    priceId: '', // Set via env or Stripe Dashboard
    features: [
      '3 établissements',
      '3 écrans TV',
      '100 crédits photo/mois',
      '6 templates',
      'Menu interactif',
    ],
    highlighted: true,
  },
]

interface SubscriptionCardProps {
  currentPlan: string
  status: string
  trialDaysLeft: number | null
  isActive: boolean
}

export function SubscriptionCard({
  currentPlan,
  status,
  trialDaysLeft,
  isActive,
}: SubscriptionCardProps) {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleCheckout(priceId: string) {
    if (!priceId) {
      alert('Les identifiants de prix Stripe ne sont pas encore configurés.')
      return
    }
    setLoading(priceId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } finally {
      setLoading(null)
    }
  }

  async function handlePortal() {
    setLoading('portal')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const { url } = await res.json()
      if (url) window.location.href = url
    } finally {
      setLoading(null)
    }
  }

  const statusLabels: Record<string, string> = {
    trialing: 'Essai gratuit',
    active: 'Actif',
    past_due: 'Paiement en retard',
    canceled: 'Annulé',
  }

  return (
    <div className="space-y-6">
      {/* Current status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Votre abonnement</span>
            <Badge variant={isActive ? 'default' : 'destructive'}>
              {statusLabels[status] ?? status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Plan actuel :{' '}
            <strong>
              {currentPlan === 'trial'
                ? 'Essai gratuit'
                : currentPlan === 'starter'
                  ? 'Starter'
                  : 'Pro'}
            </strong>
            {trialDaysLeft !== null && trialDaysLeft > 0 && (
              <span>
                {' '}
                — {trialDaysLeft} jour{trialDaysLeft > 1 ? 's' : ''} restant
                {trialDaysLeft > 1 ? 's' : ''}
              </span>
            )}
          </p>
          {status !== 'trialing' && status !== 'canceled' && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={handlePortal}
              disabled={loading === 'portal'}
            >
              {loading === 'portal' ? 'Chargement...' : 'Gérer mon abonnement'}
            </Button>
          )}
          {status === 'canceled' && (
            <p className="mt-2 text-sm text-destructive">
              Votre abonnement est annulé. Choisissez une offre pour continuer.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Plan comparison */}
      {(status === 'trialing' || status === 'canceled') && (
        <div className="grid gap-4 md:grid-cols-2">
          {PLANS.map((plan) => (
            <Card key={plan.slug} className={plan.highlighted ? 'border-primary' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {plan.highlighted && <Badge>Recommandé</Badge>}
                </CardTitle>
                <p className="text-2xl font-bold">{plan.price}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.highlighted ? 'default' : 'outline'}
                  onClick={() => handleCheckout(plan.priceId)}
                  disabled={loading === plan.priceId}
                >
                  {loading === plan.priceId ? 'Chargement...' : 'Choisir'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
