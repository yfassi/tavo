'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface TrialBannerProps {
  daysLeft: number
}

export function TrialBanner({ daysLeft }: TrialBannerProps) {
  const router = useRouter()

  return (
    <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm">
      <span className="text-amber-800">
        Essai gratuit :{' '}
        <strong>
          {daysLeft} jour{daysLeft > 1 ? 's' : ''}
        </strong>{' '}
        restant{daysLeft > 1 ? 's' : ''}
      </span>
      <Button
        size="sm"
        variant="outline"
        className="border-amber-300 text-amber-800 hover:bg-amber-100"
        onClick={() => router.push('/parametres/abonnement')}
      >
        S&apos;abonner
      </Button>
    </div>
  )
}
