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
- `src/lib/` — Shared logic (supabase, stripe, ai, images, templates)
- `src/components/ui/` — shadcn/ui primitives
- `src/components/` — Feature components (carte, templates, studio, tv)
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

## Non-Negotiable Rules

- **Allergens:** 14 EU mandatory allergens must be displayable on every dish
- **Prices:** Always TTC, French format (`12,90 €`)
- **Photo fidelity:** Processed images must match the real dish (no ingredients added/removed)
- **AI-generated images:** Must be labeled "Illustration IA, non contractuelle"
- **Public menu:** Zero cookies, zero personal data, fast on mobile
- **TV player:** Must work offline via service worker cache
