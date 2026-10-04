import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { TVPlayer } from '@/components/tv/tv-player'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export default async function TVPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  // Fetch initial data via API
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/tv/data/${tokenHash}`, { cache: 'no-store' })

  if (!res.ok) {
    notFound()
  }

  const data = await res.json()

  // Get venue_id for Realtime channel
  const { data: screen } = await supabase
    .from('screens')
    .select('venue_id')
    .eq('token_hash', tokenHash)
    .single()

  if (!screen) notFound()

  return <TVPlayer tokenHash={tokenHash} venueId={screen.venue_id} initialData={data} />
}
