import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export async function getSession() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get the user's first organization and venue
  const { data: membership } = await supabase
    .from('memberships')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    // User exists but has no organization — edge case
    redirect('/login?error=no_organization')
  }

  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', membership.organization_id)
    .single()

  const { data: venue } = await supabase
    .from('venues')
    .select('*')
    .eq('organization_id', membership.organization_id)
    .limit(1)
    .single()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('organization_id', membership.organization_id)
    .single()

  return {
    user,
    role: membership.role,
    organization: organization!,
    venue,
    subscription,
  }
}
