@AGENTS.md

# Tavo — Project Guide

## Vision

AI-powered communication assistant for French restaurant owners. Provides TV menu boards, interactive mobile menus, AI photo studio, and social media post generation.

## Stack

- **Framework:** Next.js 16 (App Router), TypeScript strict, Tailwind CSS + shadcn/ui
- **Database & Auth:** Supabase (hosted, project `wdicazfetgqseqohambv`)
- **AI:** Anthropic Claude (menu import, text generation), Stability AI (image processing)
- **Payments:** Stripe (subscriptions)
- **Hosting:** Vercel (auto-deploy on push to main)

## Commands

| Command           | Purpose                      |
| ----------------- | ---------------------------- |
| `pnpm dev`        | Start dev server (Turbopack) |
| `pnpm build`      | Production build             |
| `pnpm lint`       | ESLint + Prettier check      |
| `pnpm lint:fix`   | Auto-fix lint/format issues  |
| `pnpm typecheck`  | TypeScript type checking     |
| `pnpm test`       | Run unit tests (Vitest)      |
| `pnpm test:watch` | Run tests in watch mode      |
| `pnpm test:e2e`   | Run e2e tests (Playwright)   |

## Directory Structure

- `src/app/(auth)/` — Login, signup, magic link pages
- `src/app/(dashboard)/` — Private dashboard (carte, tv, studio, posts, parametres, admin)
- `src/app/tv/[token]/` — Public TV player
- `src/app/m/[slug]/` — Public interactive menu
- `src/app/api/` — API routes (webhooks, AI, images, TV)
- `src/lib/types/` — Shared TypeScript types (menu, brand, template)
- `src/lib/ai/` — Anthropic client, cost guard, menu import, Zod schemas
- `src/lib/actions/` — Server actions (menu, brand, screen, studio, import, generate-image, schedule, gdpr)
- `src/lib/queries/` — Data queries (menu, brand, screen, studio, schedule)
- `src/lib/templates/` — Template registry and data mapper
- `src/lib/images/` — ImageProvider abstraction (mock + stability)
- `src/lib/stripe/` — Stripe client, plan limits (PLAN_LIMITS), subscription guards
- `src/lib/rate-limit.ts` — In-memory rate limiter for public endpoints
- `src/lib/actions/gdpr.ts` — Data export and account deletion
- `src/app/legal/` — Privacy policy and legal pages
- `docs/DEPLOYMENT.md` — Full deployment guide
- `src/lib/format.ts` — Price formatting (`formatPrice`, `formatPriceRaw`)
- `src/lib/queries/admin.ts` — Admin queries (service-role, bypasses RLS)
- `src/lib/` — Shared logic (supabase, ai)
- `src/components/ui/` — shadcn/ui primitives
- `src/components/carte/` — Menu editor components
- `src/components/tv/` — TV player and screen management
- `src/components/studio/` — Photo studio components
- `src/components/parametres/` — Brand kit, QR code, subscription, trial banner
- `src/components/templates/` — Template renderer
- `templates/` — Template definitions (manifest, schema, component, CSS)
- `supabase/migrations/` — SQL migrations (versioned)
- `supabase/seed.sql` — Demo data (Chez Rosalie)
- `tests/unit/` — Vitest unit tests
- `tests/e2e/` — Playwright e2e tests

## Code Conventions

- Code and comments in English, UI text in French (France)
- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`)
- Amounts stored as integer cents, displayed as EUR TTC (`Intl.NumberFormat('fr-FR')`)
- All business tables have RLS via `organization_id`
- No API keys or secrets in code — use `.env` variables
- Server actions for mutations, API routes for webhooks and external calls
- Zod for all external input validation (AI responses, form data, API payloads)
- `IMAGE_PROVIDER=mock` for local dev (no Stability API key needed)
- Templates are self-contained in `templates/` with manifest.json, schema.ts, Template.tsx
- TV player at `/tv/[token]` uses Supabase Realtime for live updates
- Interactive menu at `/m/[slug]` uses ISR with 60-second revalidation
- shadcn/ui uses `@base-ui/react` — use `render` prop, NOT `asChild`
- AI calls require `ANTHROPIC_API_KEY` env var; cost cap checked before every call (default 500 cents/day/org)
- AI-generated images always flagged with `ai_generated: true` and labeled "Illustration IA, non contractuelle"
- 6 templates total: street-01/02/03, bistrot-01/02/03
- AI menu import: photo/PDF → Claude vision → Zod-validated JSON → review screen → confirm
- Stripe webhook requires `STRIPE_WEBHOOK_SECRET` for signature verification
- Plan limits enforced on: screen creation, image processing, AI import
- Rate limiting applied on public API endpoints via `src/lib/rate-limit.ts` (in-memory, per-IP)
- E2E tests in `tests/e2e/` require `pnpm test:e2e` with a running server
- Admin role set directly in DB (`memberships.role = 'admin'`), shown in sidebar conditionally
- Prices configured in Stripe Dashboard — code only knows plan slugs and their limits

## Non-Negotiable Rules

- **Allergens:** 14 EU mandatory allergens must be displayable on every dish
- **Prices:** Always TTC, French format (`12,90 €`)
- **Photo fidelity:** Processed images must match the real dish (no ingredients added/removed)
- **AI-generated images:** Must be labeled "Illustration IA, non contractuelle"
- **Public menu:** Zero cookies, zero personal data, fast on mobile
- **TV player:** Must work offline via service worker cache
