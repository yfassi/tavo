import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: Request) {
  const { tokenHash } = await request.json()

  if (!tokenHash) {
    return NextResponse.json({ error: 'Missing tokenHash' }, { status: 400 })
  }

  const { error } = await supabase
    .from('screens')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('token_hash', tokenHash)

  if (error) {
    return NextResponse.json({ error: 'Screen not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
