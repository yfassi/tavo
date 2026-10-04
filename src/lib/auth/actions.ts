'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createServerClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/login?error=invalid_credentials')
  }

  revalidatePath('/', 'layout')
  redirect('/carte')
}

export async function signup(formData: FormData) {
  const supabase = await createServerClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const venueName = formData.get('venue_name') as string

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { venue_name: venueName },
    },
  })

  if (error) {
    redirect('/signup?error=signup_failed')
  }

  // Create organization, membership, venue, brand kit via service role
  if (authData.user) {
    const { createClient } = await import('@supabase/supabase-js')
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Create organization
    const { data: org } = await adminClient
      .from('organizations')
      .insert({ name: venueName })
      .select('id')
      .single()

    if (org) {
      // Create membership
      await adminClient.from('memberships').insert({
        organization_id: org.id,
        user_id: authData.user.id,
        role: 'owner',
      })

      // Create venue with slug
      const slug = venueName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      const { data: venue } = await adminClient
        .from('venues')
        .insert({
          organization_id: org.id,
          name: venueName,
          public_slug: slug,
        })
        .select('id')
        .single()

      if (venue) {
        // Create default brand kit
        await adminClient.from('brand_kits').insert({ venue_id: venue.id })

        // Create default menu
        await adminClient.from('menus').insert({ venue_id: venue.id })
      }

      // Create trial subscription
      await adminClient.from('subscriptions').insert({
        organization_id: org.id,
        plan: 'trial',
        status: 'trialing',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        monthly_image_credits: 100,
      })

      // Initial credit grant
      await adminClient.from('credit_ledger').insert({
        organization_id: org.id,
        type: 'grant',
        amount: 100,
        balance_after: 100,
        description: 'Attribution initiale essai gratuit',
      })
    }
  }

  revalidatePath('/', 'layout')
  redirect('/carte')
}

export async function loginWithMagicLink(formData: FormData) {
  const supabase = await createServerClient()

  const { error } = await supabase.auth.signInWithOtp({
    email: formData.get('email') as string,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    redirect('/login?error=magic_link_failed')
  }

  redirect('/login?message=magic_link_sent')
}
