# Tavo — Design Specification

**Date:** 2026-10-04
**Status:** Draft
**Author:** Claude (validated by Yassine)

---

## 1. Vision

Tavo is an **AI-powered communication assistant for restaurant owners, bars, and cafes** in France. It provides:

- A **template library** for animated TV menu boards
- A **TV player** fed by the restaurant's menu data
- An **interactive mobile menu** (public web page, QR code)
- An **AI photo studio** for dish photos (enhance, remove background, scene replacement)
- **Social media visuals** (posts, stories) generated from the menu
- **AI-powered menu import** (photo/PDF → structured data)

**Promise:** "Send your menu, Tavo handles your TV, visuals, and posts."

**Target user:** Independent restaurant owner (1-3 venues), pressed for time, low technical skills, works primarily on mobile.

**Out of scope for MVP:** Auto-publish to Instagram/Facebook/Google, POS integrations, native mobile app, multi-language, template marketplace, on-premise hosting, image generation from text-only descriptions (Phase 2).

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), TypeScript strict |
| UI | Tailwind CSS + shadcn/ui |
| Database & Auth | Supabase (hosted, project `wdicazfetgqseqohambv`): Postgres, Auth, Storage, RLS, Realtime |
| Payments | Stripe (Checkout, Customer Portal, webhooks) |
| AI (text/vision) | Anthropic Claude (`claude-sonnet-4-20250514`) via server-side SDK, Zod-validated output |
| AI (images) | Stability AI (Remove BG, Image-to-Image, Inpaint) via `ImageProvider` abstraction |
| Video export | Playwright headless + FFmpeg (async worker) |
| Hosting | Vercel (auto-deploy on push to `main`, preview on PR) |
| Package manager | pnpm |
| Testing | Vitest (unit), Playwright (e2e) |
| CI | GitHub Actions (lint, typecheck, unit tests) |

---

## 3. Repository Structure

```
flatback/
├── CLAUDE.md
├── README.md
├── .env.example
├── .github/workflows/ci.yml
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   └── seed.sql                # "Chez Rosalie" demo restaurant
├── src/
│   ├── app/
│   │   ├── (auth)/             # Login, signup, magic link
│   │   ├── (dashboard)/        # Private layout (sidebar, nav)
│   │   │   ├── carte/          # Menu editor
│   │   │   ├── tv/             # Screen config + preview
│   │   │   ├── studio/         # AI photo studio
│   │   │   ├── posts/          # Social media generator
│   │   │   ├── parametres/     # Brand kit, subscription, team
│   │   │   └── admin/          # Back-office (admin only)
│   │   ├── tv/[token]/         # Public TV player
│   │   ├── m/[slug]/           # Public interactive menu
│   │   └── api/
│   │       ├── webhooks/stripe/
│   │       ├── ai/
│   │       ├── images/
│   │       └── tv/
│   ├── lib/
│   │   ├── supabase/           # Clients, middleware, generated types
│   │   ├── stripe/             # Helpers, guards, plan limits
│   │   ├── ai/                 # Prompts, Zod parsers, Anthropic client
│   │   ├── images/             # ImageProvider abstraction + implementations
│   │   └── templates/          # Render engine, registry, types
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives
│   │   ├── carte/
│   │   ├── templates/
│   │   ├── studio/
│   │   └── tv/
│   └── hooks/
├── templates/                   # Template definitions
│   ├── _registry.ts
│   ├── _types.ts
│   ├── street-01/
│   │   ├── manifest.json
│   │   ├── schema.ts
│   │   ├── Template.tsx
│   │   └── Template.module.css
│   ├── street-02/
│   ├── street-03/
│   ├── bistrot-01/
│   ├── bistrot-02/
│   └── bistrot-03/
├── public/
├── tests/
│   ├── unit/
│   └── e2e/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── vitest.config.ts
```

---

## 4. Data Model

All business tables have `organization_id` with RLS policies. Amounts stored as integers (cents), displayed as EUR TTC.

### 4.1 Organizations & Users

```sql
organizations (
  id uuid PK, name text, created_at timestamptz, updated_at timestamptz
)

memberships (
  id uuid PK, organization_id FK, user_id FK (auth.users),
  role text CHECK (role IN ('owner', 'editor', 'admin')),
  UNIQUE (organization_id, user_id)
)
```

### 4.2 Venues & Brand Kit

```sql
venues (
  id uuid PK, organization_id FK,
  name text, address text, cuisine_type text,
  timezone text DEFAULT 'Europe/Paris',
  public_slug text UNIQUE,
  logo_url text,
  created_at timestamptz, updated_at timestamptz
)

brand_kits (
  id uuid PK, venue_id FK UNIQUE,
  primary_color text DEFAULT '#000000',
  secondary_color text, accent_color text,
  font_heading text DEFAULT 'Inter',
  font_body text DEFAULT 'Inter',
  tone_of_voice text DEFAULT 'chaleureux',
  created_at timestamptz, updated_at timestamptz
)
```

### 4.3 Menu

```sql
menus (
  id uuid PK, venue_id FK,
  name text DEFAULT 'Carte principale',
  is_active boolean DEFAULT true,
  created_at timestamptz, updated_at timestamptz
)

menu_categories (
  id uuid PK, menu_id FK,
  name text, sort_order integer,
  created_at timestamptz, updated_at timestamptz
)

menu_items (
  id uuid PK, category_id FK,
  name text NOT NULL, description text,
  is_available boolean DEFAULT true,
  is_daily_special boolean DEFAULT false,
  photo_asset_id FK (assets) NULL,
  sort_order integer,
  created_at timestamptz, updated_at timestamptz
)

menu_item_prices (
  id uuid PK, item_id FK,
  label text DEFAULT 'Seul',
  amount_cents integer NOT NULL,
  tva_rate numeric(4,2) DEFAULT 10.00,
  sort_order integer,
  created_at timestamptz, updated_at timestamptz
)

CREATE TYPE allergen AS ENUM (
  'gluten', 'crustaces', 'oeufs', 'poissons', 'arachides',
  'soja', 'lait', 'fruits_a_coque', 'celeri', 'moutarde',
  'sesame', 'sulfites', 'lupin', 'mollusques'
);

menu_item_allergens (
  id uuid PK, item_id FK,
  allergen allergen NOT NULL,
  is_confirmed boolean DEFAULT false,
  UNIQUE (item_id, allergen)
)
```

### 4.4 Assets & Photo Studio

```sql
assets (
  id uuid PK, organization_id FK,
  type text CHECK (type IN ('photo', 'logo', 'generated')),
  original_url text NOT NULL,
  processed_url text, thumbnail_url text,
  filename text, mime_type text,
  width integer, height integer,
  has_background_removed boolean DEFAULT false,
  rights_confirmed boolean DEFAULT false,
  ai_generated boolean DEFAULT false,
  created_at timestamptz, updated_at timestamptz
)

image_jobs (
  id uuid PK, organization_id FK,
  source_asset_id FK (assets),
  result_asset_id FK (assets) NULL,
  type text CHECK (type IN ('enhance', 'remove_bg', 'scene', 'generate')),
  provider text DEFAULT 'stability',
  status text CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'rejected')),
  params jsonb,
  error_message text,
  cost_cents integer,
  created_at timestamptz, updated_at timestamptz
)

credit_ledger (
  id uuid PK, organization_id FK,
  type text CHECK (type IN ('grant', 'consume', 'refund')),
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  description text,
  image_job_id FK NULL,
  created_at timestamptz
)
```

### 4.5 Templates & TV

```sql
templates (
  id uuid PK, slug text UNIQUE,
  name text, family text CHECK (family IN ('street', 'bistrot')),
  formats text[] DEFAULT '{landscape,portrait}',
  loop_duration_ms integer DEFAULT 30000,
  color_variants jsonb,
  slot_schema jsonb,
  version integer DEFAULT 1,
  min_plan text DEFAULT 'starter',
  is_active boolean DEFAULT true,
  created_at timestamptz, updated_at timestamptz
)

screens (
  id uuid PK, venue_id FK,
  name text DEFAULT 'Ecran principal',
  orientation text CHECK (orientation IN ('landscape', 'portrait')),
  token_hash text UNIQUE NOT NULL,
  last_seen_at timestamptz,
  created_at timestamptz, updated_at timestamptz
)

scenes (
  id uuid PK, screen_id FK, template_id FK,
  data jsonb NOT NULL,
  brand_overrides jsonb,
  sort_order integer,
  created_at timestamptz, updated_at timestamptz
)

schedules (
  id uuid PK, scene_id FK,
  days_of_week integer[] DEFAULT '{1,2,3,4,5,6,7}',
  start_time time DEFAULT '00:00',
  end_time time DEFAULT '23:59',
  label text,
  is_active boolean DEFAULT true,
  created_at timestamptz, updated_at timestamptz
)
```

### 4.6 Posts & Subscriptions

```sql
posts (
  id uuid PK, organization_id FK, venue_id FK,
  template_id FK NULL,
  format text CHECK (format IN ('1:1', '4:5', '9:16')),
  image_url text, video_url text,
  caption text,
  status text CHECK (status IN ('draft', 'approved', 'exported')) DEFAULT 'draft',
  created_at timestamptz, updated_at timestamptz
)

subscriptions (
  id uuid PK, organization_id FK UNIQUE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text CHECK (plan IN ('trial', 'starter', 'pro')),
  status text CHECK (status IN ('trialing', 'active', 'past_due', 'canceled')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  monthly_image_credits integer DEFAULT 50,
  created_at timestamptz, updated_at timestamptz
)

ai_jobs (
  id uuid PK, organization_id FK,
  type text CHECK (type IN ('menu_import', 'text_generation', 'allergen_suggestion')),
  status text CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  input_data jsonb,
  output_data jsonb,
  model text,
  tokens_used integer,
  cost_cents integer,
  error_message text,
  created_at timestamptz, updated_at timestamptz
)
```

---

## 5. Template System

### 5.1 Contract

Each template is a **self-contained module** in `templates/`:

- `manifest.json`: name, family, formats, loop duration, color variants, version
- `schema.ts`: Zod schema for slot data (venue name, logo, categories, items, prices, allergens, photos, accent color)
- `Template.tsx`: pure render component, receives only data, zero business logic
- `Template.module.css`: CSS animations

### 5.2 Rendering Rules

- **Container queries**: templates live inside a container with `aspect-ratio: 16/9` or `9/16`. All sizes in `cqw`/`cqh`.
- **Auto-pagination**: if a category exceeds available space, the template paginates and cycles (fade in/out).
- **Overflow**: text truncated with `line-clamp`, never scrolls, never hidden at rest.
- **Animations**: only `transform` and `opacity` (GPU-compositable). No animated `box-shadow`, `filter`, or `backdrop-filter`. Target 30fps on Fire Stick 4K.
- **`prefers-reduced-motion`**: animations disabled, static content readable.
- **Photo placeholder**: subtle gradient based on `accentColor` + SVG utensil icon.
- **Allergens**: standardized icons (14 pictograms) under each item with tooltip. Unconfirmed show `?` badge.
- **Prices**: formatted via `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })` → `12,90 €`.
- **Originality**: no third-party logos/names/visuals, no reproduction of existing designs.

### 5.3 Initial Templates

| Slug | Family | Style | Description |
|---|---|---|---|
| `street-01` | Street | Bold | High contrast, dense grid, accent color bars |
| `street-02` | Street | Neon | Dark bg, glowing accents, urban feel |
| `street-03` | Street | Minimal | Clean, large type, photo-forward |
| `bistrot-01` | Bistrot | Chalkboard | Warm, handwritten feel, cream/dark |
| `bistrot-02` | Bistrot | Elegant | Serif fonts, muted tones, fine dining |
| `bistrot-03` | Bistrot | Market | Fresh, green accents, organic feel |

Each has 2 color variants (dark/light).

---

## 6. TV Player (`/tv/[token]`)

### 6.1 Architecture

- Public page, no authentication, no dashboard layout.
- Token (UUID v4) in URL → server looks up `screens` by `SHA-256(token)`.
- Loads scheduled scenes for current time (day of week + time range).
- Injects data into template component, cycles between scenes with fade transitions.

### 6.2 Real-time Updates

- Supabase Realtime channel `venue:{venue_id}` — broadcasts on menu/brand changes.
- Player listens, reloads scene data on change (< 5 seconds).

### 6.3 Offline Resilience

- **Service Worker** (Workbox): `stale-while-revalidate` for data, `cache-first` for images/fonts.
- Network loss: player continues with cached data, no visible interruption.
- Auto-reconnect on Realtime client (exponential backoff, built-in).
- **Wake Lock API**: prevents screen sleep.
- **Auto-reload**: on major update (template change, new version), clean `location.reload()` during transition.

### 6.4 Heartbeat

- Ping every 60s to `/api/tv/heartbeat` → updates `screens.last_seen_at`.
- Dashboard shows connection status per screen.

### 6.5 Security

- Token hash stored in DB (SHA-256), never plaintext.
- Token is revocable (delete screen = dead token).
- Rate limiting: 60 req/min per IP on TV API.

---

## 7. AI Photo Studio

### 7.1 ImageProvider Abstraction

```ts
interface ImageProvider {
  removeBackground(input: Buffer): Promise<ProcessedImage>
  enhance(input: Buffer): Promise<ProcessedImage>
  replaceScene(input: Buffer, params: SceneParams): Promise<ProcessedImage>
  generateFromDescription(prompt: string): Promise<ProcessedImage>  // Phase 2
}
```

Implementations: `StabilityProvider` (prod), `MockProvider` (dev — returns test image with "MOCK" overlay, 2s delay).

### 7.2 Processing Pipeline

1. **Upload** → `assets` table + Supabase Storage `originals` bucket
2. **Enhance** → Stability Image-to-Image (low strength ~0.3) → `processed` bucket
3. **Remove BG** → Stability Remove Background → transparent PNG
4. **Scene replacement** (optional) → Stability Inpaint (background only, dish untouched)
5. **Before/after comparison** in dashboard → restaurateur validates or rejects

### 7.3 Dish Fidelity Rule (Non-negotiable)

- Enhance uses low strength: corrects lighting, never transforms the dish.
- Background removal touches only the background.
- Scene replacement inpaints ONLY the environment around the cutout dish.
- No ingredients added/removed, no portion resized.
- Rejected images get `status: rejected`, never used.
- Human validation (before/after) required before any processed image is published.

### 7.4 Credits

- Each operation (enhance, remove_bg, scene) = 1 credit.
- Full pipeline (enhance + remove_bg + scene) = 3 credits.
- "Regenerate" consumes credits again.
- Balance visible in dashboard (progress bar).
- At 0 credits: button disabled, message "Monthly quota reached. Renewal on [date]."
- All transactions tracked in `credit_ledger`.

### 7.5 Batch Processing

- Drag & drop or multi-select import.
- Each photo = independent `image_job`.
- Progress grid: pending → processing → before/after.
- "Validate all" or per-item validation.
- Insufficient credits: process what's possible, clear message on the rest.

### 7.6 Mobile Capture (Phase 1, simple)

- Dashboard is responsive PWA (installable via manifest.json).
- `/studio` on mobile: "Take photo" button → `<input type="file" accept="image/*" capture="environment">`.
- Tips displayed above: "Natural light, top-down or 45° angle, plain background if possible."
- No AR grid overlay at MVP.

---

## 8. AI Menu Import

### 8.1 Flow

1. Upload photo/PDF → Supabase Storage `imports` bucket
2. Create `ai_jobs` (type: `menu_import`)
3. Send to Claude (vision) with structured prompt
4. Validate response with Zod (`MenuImportSchema`)
5. Review screen: uncertain fields highlighted yellow, suggested allergens with "To verify" badge
6. Restaurateur corrects, confirms, deletes → "Import" creates menu data

### 8.2 Prompt Principles

- Model: `claude-sonnet-4-20250514`
- Structured JSON output validated by Zod
- Uncertain fields → `uncertain: true` (never guess prices)
- Allergens: suggested only, never auto-confirmed
- Input: image or PDF (max 10 MB, server-side resize before send if needed)
- Estimated cost: ~$0.01-0.03 per import

### 8.3 Text Generation (Posts)

- Model: `claude-sonnet-4-20250514`
- Prompt uses `brand_kit.tone_of_voice` and `cuisine_type`
- Never invents information not in the menu data
- Output: `{ caption: string, hashtags: string[] }` (Zod-validated)

### 8.4 Cost Controls

- Daily cap per org: default 5 EUR (500 cents)
- Materialized view `daily_ai_costs` aggregates by org/day
- Pre-flight check before every AI call, clean error if exceeded
- All calls logged in `ai_jobs` (type, model, tokens, cost, input ref, output, status)
- No raw client content in logs — only references (asset_id, job_id)

---

## 9. Interactive Menu (`/m/[slug]`)

### 9.1 Architecture

- Public page, zero authentication, zero non-essential cookies.
- SSR with ISR (`revalidate: 60`).
- OG metadata for social sharing.

### 9.2 UI

- Header: logo + venue name + brand color
- Daily special highlight (if exists)
- Categories as native `<details>/<summary>` accordions (0 JS), CSS animated
- Items: prices, description, photo, allergens
- Allergen filter: clickable chips at top, grays out matching items
- Footer: "Powered by Tavo" + legal mentions

### 9.3 Constraints

- Target: < 100 KB JS, < 1.5s LCP on 3G
- No personal data collected, no third-party analytics, no fingerprinting
- Simple view counter (slug/day in Supabase, no IP or user agent)
- Accessibility: keyboard nav, AA contrast, readable mobile text
- AI-generated images labeled "AI illustration, non-contractual"
- Allergen disclaimer in footer

### 9.4 QR Code

- Generated client-side with `qrcode` lib (lightweight, SVG)
- Dashboard page: `/parametres/qr-code` — preview + download PNG/SVG
- URL: `https://{NEXT_PUBLIC_APP_URL}/m/{slug}`
- Optional: restaurant logo embedded in QR center

---

## 10. Social Media Posts (Phase 3)

### 10.1 Flow

1. Select a dish (or daily special, or new item)
2. Choose format: 1:1, 4:5, 9:16
3. Choose post template (real-time preview with dish data)
4. AI caption generated, editable
5. Approve → status = approved
6. Export PNG (Playwright screenshot) or MP4 (Playwright frames + FFmpeg encode)
7. Direct download (no auto-publish at MVP)

### 10.2 MP4 Pipeline

- API route `/api/posts/export` creates async job
- Playwright headless: viewport at target resolution (1080px variants)
- Capture frames at 30fps for loop duration
- FFmpeg: H.264, `-crf 23 -preset medium -pix_fmt yuv420p`
- Upload to Supabase Storage `exports` bucket
- Notification when ready

---

## 11. Stripe & Subscriptions

### 11.1 Plans

| | Trial | Starter | Pro |
|---|---|---|---|
| Price | Free (14 days) | 29 EUR/month | 59 EUR/month |
| Venues | 3 | 1 | 3 |
| TV screens | 3 | 1 | 3 |
| Templates | All 6 | All 6 | All 6 |
| Photo credits/month | 100 | 30 | 100 |
| Posts/month | Unlimited | 12 | Unlimited |
| Interactive menu | Yes | Yes | Yes |
| Credit card required | No | Yes | Yes |

### 11.2 Flow

1. Signup → trial (14 days, full Pro access, no CC)
2. Banner "Trial: X days left" in dashboard
3. `/parametres/abonnement` → Stripe Checkout (hosted)
4. Webhook `checkout.session.completed` → create subscription + grant credits
5. Ongoing: Customer Portal for plan changes, CC updates, cancellation

### 11.3 Webhooks

| Event | Action |
|---|---|
| `checkout.session.completed` | Create subscription, grant credits |
| `invoice.paid` | Renew monthly credits, update `current_period_end` |
| `invoice.payment_failed` | Set `status: past_due`, alert banner |
| `customer.subscription.updated` | Sync plan and status |
| `customer.subscription.deleted` | Set `status: canceled`, read-only access |

### 11.4 Plan Limits

```ts
const PLAN_LIMITS = {
  trial: { venues: 3, screens: 3, monthlyCredits: 100, monthlyPosts: Infinity },
  starter: { venues: 1, screens: 1, monthlyCredits: 30, monthlyPosts: 12 },
  pro: { venues: 3, screens: 3, monthlyCredits: 100, monthlyPosts: Infinity },
} as const
```

Prices live in Stripe Dashboard. Code only knows plan slugs and their limits.

---

## 12. Admin Back-office (`/admin`)

Accessible only to users with a special `admin` role (set directly in DB).

| Page | Content |
|---|---|
| `/admin` | Dashboard: org count, active screens, AI jobs today |
| `/admin/clients` | Org list: name, plan, status, remaining credits, last activity |
| `/admin/templates` | Template list: activate/deactivate, usage stats |
| `/admin/ai-jobs` | AI call log: type, cost, status, recent errors |
| `/admin/image-jobs` | Image processing log |

No template editor in admin at MVP. Templates are managed in code.

---

## 13. Security & Legal

### 13.1 Security

- RLS on all business tables via `organization_id` through `memberships`
- Next.js middleware: Supabase session check, redirect if unauthenticated
- TV tokens: UUID v4, SHA-256 hashed in DB, revocable
- Rate limiting on public + AI endpoints (Vercel Edge middleware)
- API keys (Anthropic, Stability, Stripe) server-side env vars only
- AI cost cap per org/day (configurable)
- Stripe webhook signature verification
- Server-side input validation on all endpoints

### 13.2 GDPR

- EU hosting: Supabase `eu-west`, Vercel Edge `cdg1` (Paris)
- Privacy policy: static page `/legal/confidentialite`
- Data export: button in `/parametres` → ZIP (JSON) of all org data
- Account deletion: soft delete (anonymization), Storage files deleted after 30 days, email confirmation
- Cookies: session cookie only (functional, exempt from consent). No cookie banner needed.
- Public menu: zero cookies, zero personal data, legal footer

### 13.3 Business Rules (Non-negotiable)

- **Allergens**: 14 EU mandatory allergens displayable on every dish, on TV and visuals
- **Prices**: always TTC, French format (`12,90 €`)
- **Photos & rights**: client certifies ownership on import (checkbox). Templates use no copyrighted content.
- **Dish fidelity**: processed image must match the real dish served. AI-generated images (Phase 2) labeled "AI illustration, non-contractual". "Non-contractual image" toggle available everywhere. Legal review required before commercial launch.
- **Interactive menu**: no client account required, no personal data, no non-essential cookies, fast on mobile

---

## 14. Phases & Acceptance Criteria

### Phase 0: Foundations

Repo, CI, CLAUDE.md, Supabase local (migrations + seed: "Chez Rosalie"), auth, base layout, design tokens.

**Accepted if:** `pnpm dev`, `pnpm test`, `pnpm lint` pass on a clean machine following the README.

### Phase 1: Menu + First Template + TV

Menu editor, 2 templates (1 Street, 1 Bistrot), data-driven render engine, TV player `/tv/[token]` with real-time updates and offline cache, brand kit, interactive menu `/m/[slug]` with QR code, photo studio (enhance + remove_bg + scene from restaurateur photo, before/after, credits).

**Accepted if:** modifying a price in the editor updates the TV in < 5 seconds; player survives a 2-minute network outage; QR code opens the updated menu on a phone; a phone photo comes out cutout and enhanced in the template without changing the dish.

### Phase 2: AI Import + Library

Photo/PDF import with review, 4 additional templates, image generation from description (optional, AI-labeled, credit-based), animated preview with client menu, hourly scheduling, portrait and landscape formats.

**Accepted if:** a real menu photo produces an exploitable menu in < 3 minutes with limited human correction.

### Phase 3: Posts + Subscription

Social visuals generator (3 formats), AI captions, 1-click approval, PNG & MP4 export via worker, Stripe (trial, subscription, portal, webhooks), library access control by plan, minimal admin back-office.

**Accepted if:** a new user can sign up, import their menu, display their TV, export a post, and subscribe without help.

### Phase 4: Hardening

Playwright e2e tests for critical flows, accessibility, player performance on low-end hardware, logging, error monitoring, deployment documentation.

---

## 15. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Slow MP4 rendering | 30s animation → 2-3 min export | Async job, notification when ready, queue with priority |
| TV player on weak hardware | Janky animations on 1st gen Fire Stick | CSS GPU-only animations, real hardware testing, degraded mode |
| Unpredictable AI costs | Client importing 50 menus/day | Daily cap per org (5 EUR), monthly quota, admin alerts |
| Stability AI cutout quality | Poor results on some dishes | Fallback to Remove.bg via ImageProvider, mandatory human validation |
| Dish fidelity after scene replacement | Modified dish = misleading commercial practice | Background-only inpainting, mandatory before/after, rejection option |
| Supabase Realtime limits | Too many simultaneous connections | 1 channel per venue (not per screen), broadcast mode |
| Service Worker stale data | Outdated info on TV | stale-while-revalidate, short max-age (5 min), force-refresh on Realtime |
| No domain | QR codes and TV links not publicly usable | Vercel free domain (*.vercel.app), `NEXT_PUBLIC_APP_URL` env var |

---

## 16. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Stability AI
STABILITY_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Image provider (stability | mock)
IMAGE_PROVIDER=mock

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AI cost cap (cents per org per day)
AI_DAILY_COST_CAP_CENTS=500
```

---

## 17. Demo Seed: "Chez Rosalie"

Fictional restaurant for development and testing:

- **Name:** Chez Rosalie
- **Type:** Bistrot français
- **Slug:** `chez-rosalie`
- **Brand:** Primary `#1a1a1a`, accent `#c2185b`, font Inter, tone "chaleureux et authentique"
- **Menu:**
  - Entrées (4 items): Soupe à l'oignon (7,50 €), Salade de chèvre chaud (9,90 €), Terrine de campagne (8,50 €), Œuf mayo (5,00 €)
  - Plats (5 items): Steak-frites (16,90 €, plat du jour), Confit de canard (18,50 €), Pavé de saumon (17,90 €), Burger Rosalie (14,90 € seul / 18,90 € menu), Risotto aux champignons (15,50 €)
  - Desserts (3 items): Crème brûlée (7,50 €), Tarte Tatin (8,50 €), Mousse au chocolat (7,00 €)
  - Boissons (4 items): Eau minérale (3,50 €), Coca-Cola (4,00 €), Verre de vin rouge (5,50 €), Café (2,50 €)
- **Allergens:** Pre-populated and confirmed for all items
- **Assets:** Placeholder images (colored rectangles with dish names)
- **Screen:** 1 landscape screen with token, bistrot-01 template
- **Subscription:** trial, 14 days remaining
