# Deployment Guide

## Prerequisites

- Node.js 22+
- pnpm 10+
- Supabase project (hosted)
- Stripe account
- Vercel account

## Environment Variables

Copy `.env.example` to `.env.local` and fill in all values.

### Supabase Setup

1. Link the project:
   ```bash
   npx supabase link --project-ref wdicazfetgqseqohambv
   ```

2. Push database migrations:
   ```bash
   npx supabase db push
   ```

3. Run seed data (optional, for demo):
   ```bash
   npx supabase db reset --linked
   ```

4. Create Storage buckets in Supabase Dashboard:
   - `assets` (public) — for photos, logos, processed images

5. Enable Realtime on tables (Supabase Dashboard → Database → Replication):
   - `menu_items`
   - `menu_item_prices`
   - `menu_categories`
   - `brand_kits`
   - `venues`

6. Copy the project URL and keys to `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Stripe Setup

1. Create products and prices in Stripe Dashboard:
   - Starter: 29 EUR/month
   - Pro: 59 EUR/month

2. Copy the price IDs to the subscription card component
   (`src/components/parametres/subscription-card.tsx`)

3. Set up the webhook endpoint:
   - URL: `https://your-domain.vercel.app/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `invoice.paid`,
     `invoice.payment_failed`, `customer.subscription.updated`,
     `customer.subscription.deleted`

4. Copy keys to `.env.local`:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### AI Services

1. Get an Anthropic API key and set `ANTHROPIC_API_KEY`
2. Get a Stability AI API key and set `STABILITY_API_KEY`
3. Or set `IMAGE_PROVIDER=mock` for local development

### Admin Setup

To make yourself admin, update the database directly:

```sql
UPDATE memberships SET role = 'admin'
WHERE user_id = 'your-user-uuid';
```

## Vercel Deployment

1. Connect the repo to Vercel
2. Set all environment variables in Vercel Dashboard
3. Set the Vercel region to `cdg1` (Paris) for GDPR compliance
4. Auto-deploy is configured on push to `main`

## Local Development

```bash
pnpm install
cp .env.example .env.local
# Fill in .env.local
pnpm dev
```

## Quality Checks

```bash
pnpm lint        # ESLint + Prettier
pnpm typecheck   # TypeScript
pnpm test        # Unit tests (Vitest)
pnpm test:e2e    # E2E tests (Playwright, requires running server)
```
