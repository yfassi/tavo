# Phase 0: Foundations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up a working Next.js app with Supabase auth, database schema with RLS, seed data ("Chez Rosalie"), CI pipeline, and base dashboard layout — so that `pnpm dev`, `pnpm test`, and `pnpm lint` all pass on a clean machine.

**Architecture:** Next.js 15 App Router with TypeScript strict mode, Tailwind CSS + shadcn/ui for UI, Supabase hosted (project `wdicazfetgqseqohambv`) for auth/DB/storage. Migrations versioned in the repo. Auto-deploy to Vercel on push to `main`.

**Tech Stack:** Next.js 15, TypeScript 5, Tailwind CSS 4, shadcn/ui, Supabase (Auth, Postgres, RLS), pnpm, Vitest, Playwright, ESLint, Prettier, GitHub Actions.

## Global Constraints

- Language: TypeScript strict mode (`"strict": true` in tsconfig)
- UI text in French (France), code and comments in English
- Package manager: pnpm (no npm or yarn)
- Amounts always stored as integer cents, displayed as `Intl.NumberFormat('fr-FR')` EUR TTC
- All business tables have `organization_id` with RLS policies
- No API keys, secrets, or real credentials in code — `.env.example` with empty values
- Conventional Commits for all commit messages

---

### Task 1: Scaffold Next.js Project + Tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `.eslintrc.json`, `.prettierrc`, `.gitignore`, `.env.example`, `.nvmrc`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: working `pnpm dev` that shows a page at `localhost:3000`

- [ ] **Step 1: Initialize Next.js project with pnpm**

```bash
cd /Users/Yassine/orca/workspaces/tavo/flatback
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --turbopack
```

When prompted, accept defaults. This creates the base project structure.

- [ ] **Step 2: Verify the generated project runs**

```bash
pnpm dev &
sleep 5
curl -s http://localhost:3000 | head -20
kill %1
```

Expected: HTML output from the Next.js default page.

- [ ] **Step 3: Add Prettier and configure formatting**

```bash
pnpm add -D prettier eslint-config-prettier
```

Create `.prettierrc`:

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

Update `.eslintrc.json` — add `"prettier"` to the end of the `extends` array.

- [ ] **Step 4: Add `.env.example` with all required environment variables**

Create `.env.example`:

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

- [ ] **Step 5: Create `.nvmrc`**

```
22
```

- [ ] **Step 6: Update `.gitignore`**

Ensure these entries exist (Next.js template may already include most):

```gitignore
node_modules
.next
.env
.env.local
.env.*.local
*.tsbuildinfo
```

- [ ] **Step 7: Add npm scripts for test and lint**

Edit `package.json` — add to `"scripts"`:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint && prettier --check .",
    "lint:fix": "next lint --fix && prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 8: Install Vitest**

```bash
pnpm add -D vitest @vitejs/plugin-react
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 9: Write a smoke test to verify Vitest works**

Create `tests/unit/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('smoke test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Run: `pnpm test`
Expected: 1 test passed.

- [ ] **Step 10: Verify lint passes**

```bash
pnpm lint
```

Expected: no errors. If Prettier flags generated files, add them to `.prettierignore`:

```
.next
node_modules
pnpm-lock.yaml
```

- [ ] **Step 11: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 project with TypeScript, Tailwind, Vitest, Prettier"
```

---

### Task 2: Initialize shadcn/ui

**Files:**
- Modify: `package.json` (new deps), `tailwind.config.ts`, `src/app/globals.css`
- Create: `components.json`, `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/label.tsx`, `src/components/ui/card.tsx`
- Create: `src/lib/utils.ts`

**Interfaces:**
- Consumes: working Next.js project from Task 1
- Produces: `cn()` utility at `@/lib/utils`, shadcn/ui components importable from `@/components/ui/*`

- [ ] **Step 1: Initialize shadcn/ui**

```bash
pnpm dlx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Neutral
- CSS variables: Yes

This creates `components.json` and updates `tailwind.config.ts` and `globals.css`.

- [ ] **Step 2: Add base components we'll need for the dashboard**

```bash
pnpm dlx shadcn@latest add button input label card separator avatar dropdown-menu sheet sidebar
```

- [ ] **Step 3: Verify build still works**

```bash
pnpm typecheck && pnpm lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: initialize shadcn/ui with base components"
```

---

### Task 3: Supabase Setup + Database Schema Migration

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/00001_initial_schema.sql`
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`
- Modify: `package.json` (new deps)

**Interfaces:**
- Consumes: working Next.js project from Task 1
- Produces:
  - `createBrowserClient()` from `@/lib/supabase/client`
  - `createServerClient()` from `@/lib/supabase/server`
  - `updateSession(request)` from `@/lib/supabase/middleware`
  - All database tables created with RLS policies

- [ ] **Step 1: Initialize Supabase in the project**

```bash
cd /Users/Yassine/orca/workspaces/tavo/flatback
npx supabase init
```

This creates `supabase/config.toml`.

- [ ] **Step 2: Install Supabase JS client packages**

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 3: Create the initial migration file**

Create `supabase/migrations/00001_initial_schema.sql`:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Organizations & Memberships
-- ============================================================

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_memberships_organization_id ON memberships(organization_id);

-- ============================================================
-- Venues & Brand Kits
-- ============================================================

CREATE TABLE venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  cuisine_type text,
  timezone text NOT NULL DEFAULT 'Europe/Paris',
  public_slug text UNIQUE,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_venues_organization_id ON venues(organization_id);
CREATE INDEX idx_venues_public_slug ON venues(public_slug);

CREATE TABLE brand_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL UNIQUE REFERENCES venues(id) ON DELETE CASCADE,
  primary_color text NOT NULL DEFAULT '#000000',
  secondary_color text,
  accent_color text,
  font_heading text NOT NULL DEFAULT 'Inter',
  font_body text NOT NULL DEFAULT 'Inter',
  tone_of_voice text NOT NULL DEFAULT 'chaleureux',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Menus
-- ============================================================

CREATE TABLE menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Carte principale',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_menus_venue_id ON menus(venue_id);

CREATE TABLE menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_categories_menu_id ON menu_categories(menu_id);

-- Assets table (needed before menu_items for the FK)
CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('photo', 'logo', 'generated')),
  original_url text NOT NULL,
  processed_url text,
  thumbnail_url text,
  filename text,
  mime_type text,
  width integer,
  height integer,
  has_background_removed boolean NOT NULL DEFAULT false,
  rights_confirmed boolean NOT NULL DEFAULT false,
  ai_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_organization_id ON assets(organization_id);

CREATE TABLE menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_available boolean NOT NULL DEFAULT true,
  is_daily_special boolean NOT NULL DEFAULT false,
  photo_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);

CREATE TABLE menu_item_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Seul',
  amount_cents integer NOT NULL,
  tva_rate numeric(4,2) NOT NULL DEFAULT 10.00,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_item_prices_item_id ON menu_item_prices(item_id);

-- Allergens
CREATE TYPE allergen AS ENUM (
  'gluten', 'crustaces', 'oeufs', 'poissons', 'arachides',
  'soja', 'lait', 'fruits_a_coque', 'celeri', 'moutarde',
  'sesame', 'sulfites', 'lupin', 'mollusques'
);

CREATE TABLE menu_item_allergens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  allergen allergen NOT NULL,
  is_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, allergen)
);

CREATE INDEX idx_menu_item_allergens_item_id ON menu_item_allergens(item_id);

-- ============================================================
-- Image Jobs & Credit Ledger
-- ============================================================

CREATE TABLE image_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  result_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('enhance', 'remove_bg', 'scene', 'generate')),
  provider text NOT NULL DEFAULT 'stability',
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'rejected')),
  params jsonb,
  error_message text,
  cost_cents integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_image_jobs_organization_id ON image_jobs(organization_id);

CREATE TABLE credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('grant', 'consume', 'refund')),
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  description text,
  image_job_id uuid REFERENCES image_jobs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_ledger_organization_id ON credit_ledger(organization_id);

-- ============================================================
-- Templates & TV
-- ============================================================

CREATE TABLE templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  family text NOT NULL CHECK (family IN ('street', 'bistrot')),
  formats text[] NOT NULL DEFAULT '{landscape,portrait}',
  loop_duration_ms integer NOT NULL DEFAULT 30000,
  color_variants jsonb,
  slot_schema jsonb,
  version integer NOT NULL DEFAULT 1,
  min_plan text NOT NULL DEFAULT 'starter',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE screens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Ecran principal',
  orientation text NOT NULL CHECK (orientation IN ('landscape', 'portrait')),
  token_hash text UNIQUE NOT NULL,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_screens_venue_id ON screens(venue_id);

CREATE TABLE scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id uuid NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  brand_overrides jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_scenes_screen_id ON scenes(screen_id);

CREATE TABLE schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  days_of_week integer[] NOT NULL DEFAULT '{1,2,3,4,5,6,7}',
  start_time time NOT NULL DEFAULT '00:00',
  end_time time NOT NULL DEFAULT '23:59',
  label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_schedules_scene_id ON schedules(scene_id);

-- ============================================================
-- Posts
-- ============================================================

CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  template_id uuid REFERENCES templates(id) ON DELETE SET NULL,
  format text NOT NULL CHECK (format IN ('1:1', '4:5', '9:16')),
  image_url text,
  video_url text,
  caption text,
  status text NOT NULL CHECK (status IN ('draft', 'approved', 'exported')) DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_organization_id ON posts(organization_id);

-- ============================================================
-- Subscriptions
-- ============================================================

CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text NOT NULL CHECK (plan IN ('trial', 'starter', 'pro')),
  status text NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  monthly_image_credits integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- AI Jobs
-- ============================================================

CREATE TABLE ai_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('menu_import', 'text_generation', 'allergen_suggestion')),
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  input_data jsonb,
  output_data jsonb,
  model text,
  tokens_used integer,
  cost_cents integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_jobs_organization_id ON ai_jobs(organization_id);

-- ============================================================
-- updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

-- Helper function: get organization IDs for current user
CREATE OR REPLACE FUNCTION user_organization_ids()
RETURNS SETOF uuid AS $$
  SELECT organization_id FROM memberships WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_allergens ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;

-- Organizations: members can read, owners can update
CREATE POLICY "members can view their organizations"
  ON organizations FOR SELECT
  USING (id IN (SELECT user_organization_ids()));

CREATE POLICY "owners can update their organizations"
  ON organizations FOR UPDATE
  USING (id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND role = 'owner'));

-- Memberships: members can view, owners can manage
CREATE POLICY "members can view memberships in their orgs"
  ON memberships FOR SELECT
  USING (organization_id IN (SELECT user_organization_ids()));

CREATE POLICY "owners can insert memberships"
  ON memberships FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND role = 'owner'));

CREATE POLICY "owners can delete memberships"
  ON memberships FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND role = 'owner'));

-- Venues: members can read, owners/editors can write
CREATE POLICY "members can view venues"
  ON venues FOR SELECT
  USING (organization_id IN (SELECT user_organization_ids()));

CREATE POLICY "members can insert venues"
  ON venues FOR INSERT
  WITH CHECK (organization_id IN (SELECT user_organization_ids()));

CREATE POLICY "members can update venues"
  ON venues FOR UPDATE
  USING (organization_id IN (SELECT user_organization_ids()));

CREATE POLICY "owners can delete venues"
  ON venues FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND role = 'owner'));

-- Brand kits: access via venue's organization
CREATE POLICY "members can view brand kits"
  ON brand_kits FOR SELECT
  USING (venue_id IN (SELECT id FROM venues WHERE organization_id IN (SELECT user_organization_ids())));

CREATE POLICY "members can insert brand kits"
  ON brand_kits FOR INSERT
  WITH CHECK (venue_id IN (SELECT id FROM venues WHERE organization_id IN (SELECT user_organization_ids())));

CREATE POLICY "members can update brand kits"
  ON brand_kits FOR UPDATE
  USING (venue_id IN (SELECT id FROM venues WHERE organization_id IN (SELECT user_organization_ids())));

-- Menus: access via venue's organization
CREATE POLICY "members can view menus"
  ON menus FOR SELECT
  USING (venue_id IN (SELECT id FROM venues WHERE organization_id IN (SELECT user_organization_ids())));

CREATE POLICY "members can insert menus"
  ON menus FOR INSERT
  WITH CHECK (venue_id IN (SELECT id FROM venues WHERE organization_id IN (SELECT user_organization_ids())));

CREATE POLICY "members can update menus"
  ON menus FOR UPDATE
  USING (venue_id IN (SELECT id FROM venues WHERE organization_id IN (SELECT user_organization_ids())));

CREATE POLICY "members can delete menus"
  ON menus FOR DELETE
  USING (venue_id IN (SELECT id FROM venues WHERE organization_id IN (SELECT user_organization_ids())));

-- Menu categories: access via menu's venue's organization
CREATE POLICY "members can view menu categories"
  ON menu_categories FOR SELECT
  USING (menu_id IN (
    SELECT m.id FROM menus m
    JOIN venues v ON v.id = m.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

CREATE POLICY "members can insert menu categories"
  ON menu_categories FOR INSERT
  WITH CHECK (menu_id IN (
    SELECT m.id FROM menus m
    JOIN venues v ON v.id = m.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

CREATE POLICY "members can update menu categories"
  ON menu_categories FOR UPDATE
  USING (menu_id IN (
    SELECT m.id FROM menus m
    JOIN venues v ON v.id = m.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

CREATE POLICY "members can delete menu categories"
  ON menu_categories FOR DELETE
  USING (menu_id IN (
    SELECT m.id FROM menus m
    JOIN venues v ON v.id = m.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

-- Menu items: access via category's menu's venue's organization
CREATE POLICY "members can view menu items"
  ON menu_items FOR SELECT
  USING (category_id IN (
    SELECT mc.id FROM menu_categories mc
    JOIN menus m ON m.id = mc.menu_id
    JOIN venues v ON v.id = m.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

CREATE POLICY "members can insert menu items"
  ON menu_items FOR INSERT
  WITH CHECK (category_id IN (
    SELECT mc.id FROM menu_categories mc
    JOIN menus m ON m.id = mc.menu_id
    JOIN venues v ON v.id = m.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

CREATE POLICY "members can update menu items"
  ON menu_items FOR UPDATE
  USING (category_id IN (
    SELECT mc.id FROM menu_categories mc
    JOIN menus m ON m.id = mc.menu_id
    JOIN venues v ON v.id = m.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

CREATE POLICY "members can delete menu items"
  ON menu_items FOR DELETE
  USING (category_id IN (
    SELECT mc.id FROM menu_categories mc
    JOIN menus m ON m.id = mc.menu_id
    JOIN venues v ON v.id = m.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

-- Menu item prices: access via item's category chain
CREATE POLICY "members can view menu item prices"
  ON menu_item_prices FOR SELECT
  USING (item_id IN (
    SELECT mi.id FROM menu_items mi
    JOIN menu_categories mc ON mc.id = mi.category_id
    JOIN menus m ON m.id = mc.menu_id
    JOIN venues v ON v.id = m.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

CREATE POLICY "members can insert menu item prices"
  ON menu_item_prices FOR INSERT
  WITH CHECK (item_id IN (
    SELECT mi.id FROM menu_items mi
    JOIN menu_categories mc ON mc.id = mi.category_id
    JOIN menus m ON m.id = mc.menu_id
    JOIN venues v ON v.id = m.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

CREATE POLICY "members can update menu item prices"
  ON menu_item_prices FOR UPDATE
  USING (item_id IN (
    SELECT mi.id FROM menu_items mi
    JOIN menu_categories mc ON mc.id = mi.category_id
    JOIN menus m ON m.id = mc.menu_id
    JOIN venues v ON v.id = m.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

CREATE POLICY "members can delete menu item prices"
  ON menu_item_prices FOR DELETE
  USING (item_id IN (
    SELECT mi.id FROM menu_items mi
    JOIN menu_categories mc ON mc.id = mi.category_id
    JOIN menus m ON m.id = mc.menu_id
    JOIN venues v ON v.id = m.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

-- Menu item allergens: same chain as prices
CREATE POLICY "members can view menu item allergens"
  ON menu_item_allergens FOR SELECT
  USING (item_id IN (
    SELECT mi.id FROM menu_items mi
    JOIN menu_categories mc ON mc.id = mi.category_id
    JOIN menus m ON m.id = mc.menu_id
    JOIN venues v ON v.id = m.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

CREATE POLICY "members can insert menu item allergens"
  ON menu_item_allergens FOR INSERT
  WITH CHECK (item_id IN (
    SELECT mi.id FROM menu_items mi
    JOIN menu_categories mc ON mc.id = mi.category_id
    JOIN menus m ON m.id = mc.menu_id
    JOIN venues v ON v.id = m.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

CREATE POLICY "members can update menu item allergens"
  ON menu_item_allergens FOR UPDATE
  USING (item_id IN (
    SELECT mi.id FROM menu_items mi
    JOIN menu_categories mc ON mc.id = mi.category_id
    JOIN menus m ON m.id = mc.menu_id
    JOIN venues v ON v.id = m.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

CREATE POLICY "members can delete menu item allergens"
  ON menu_item_allergens FOR DELETE
  USING (item_id IN (
    SELECT mi.id FROM menu_items mi
    JOIN menu_categories mc ON mc.id = mi.category_id
    JOIN menus m ON m.id = mc.menu_id
    JOIN venues v ON v.id = m.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

-- Assets: org-scoped
CREATE POLICY "members can view assets"
  ON assets FOR SELECT
  USING (organization_id IN (SELECT user_organization_ids()));

CREATE POLICY "members can insert assets"
  ON assets FOR INSERT
  WITH CHECK (organization_id IN (SELECT user_organization_ids()));

CREATE POLICY "members can update assets"
  ON assets FOR UPDATE
  USING (organization_id IN (SELECT user_organization_ids()));

CREATE POLICY "members can delete assets"
  ON assets FOR DELETE
  USING (organization_id IN (SELECT user_organization_ids()));

-- Image jobs: org-scoped
CREATE POLICY "members can view image jobs"
  ON image_jobs FOR SELECT
  USING (organization_id IN (SELECT user_organization_ids()));

CREATE POLICY "members can insert image jobs"
  ON image_jobs FOR INSERT
  WITH CHECK (organization_id IN (SELECT user_organization_ids()));

-- Credit ledger: org-scoped, read-only for members (writes via server only)
CREATE POLICY "members can view credit ledger"
  ON credit_ledger FOR SELECT
  USING (organization_id IN (SELECT user_organization_ids()));

-- Templates: readable by all authenticated, writable by admin only
CREATE POLICY "authenticated can view active templates"
  ON templates FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "admin can manage templates"
  ON templates FOR ALL
  USING (is_admin());

-- Screens: access via venue's organization
CREATE POLICY "members can view screens"
  ON screens FOR SELECT
  USING (venue_id IN (SELECT id FROM venues WHERE organization_id IN (SELECT user_organization_ids())));

CREATE POLICY "members can insert screens"
  ON screens FOR INSERT
  WITH CHECK (venue_id IN (SELECT id FROM venues WHERE organization_id IN (SELECT user_organization_ids())));

CREATE POLICY "members can update screens"
  ON screens FOR UPDATE
  USING (venue_id IN (SELECT id FROM venues WHERE organization_id IN (SELECT user_organization_ids())));

CREATE POLICY "members can delete screens"
  ON screens FOR DELETE
  USING (venue_id IN (SELECT id FROM venues WHERE organization_id IN (SELECT user_organization_ids())));

-- Scenes: access via screen's venue's organization
CREATE POLICY "members can view scenes"
  ON scenes FOR SELECT
  USING (screen_id IN (
    SELECT s.id FROM screens s
    JOIN venues v ON v.id = s.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

CREATE POLICY "members can insert scenes"
  ON scenes FOR INSERT
  WITH CHECK (screen_id IN (
    SELECT s.id FROM screens s
    JOIN venues v ON v.id = s.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

CREATE POLICY "members can update scenes"
  ON scenes FOR UPDATE
  USING (screen_id IN (
    SELECT s.id FROM screens s
    JOIN venues v ON v.id = s.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

CREATE POLICY "members can delete scenes"
  ON scenes FOR DELETE
  USING (screen_id IN (
    SELECT s.id FROM screens s
    JOIN venues v ON v.id = s.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

-- Schedules: access via scene's screen's venue's organization
CREATE POLICY "members can view schedules"
  ON schedules FOR SELECT
  USING (scene_id IN (
    SELECT sc.id FROM scenes sc
    JOIN screens s ON s.id = sc.screen_id
    JOIN venues v ON v.id = s.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

CREATE POLICY "members can insert schedules"
  ON schedules FOR INSERT
  WITH CHECK (scene_id IN (
    SELECT sc.id FROM scenes sc
    JOIN screens s ON s.id = sc.screen_id
    JOIN venues v ON v.id = s.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

CREATE POLICY "members can update schedules"
  ON schedules FOR UPDATE
  USING (scene_id IN (
    SELECT sc.id FROM scenes sc
    JOIN screens s ON s.id = sc.screen_id
    JOIN venues v ON v.id = s.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

CREATE POLICY "members can delete schedules"
  ON schedules FOR DELETE
  USING (scene_id IN (
    SELECT sc.id FROM scenes sc
    JOIN screens s ON s.id = sc.screen_id
    JOIN venues v ON v.id = s.venue_id
    WHERE v.organization_id IN (SELECT user_organization_ids())
  ));

-- Posts: org-scoped
CREATE POLICY "members can view posts"
  ON posts FOR SELECT
  USING (organization_id IN (SELECT user_organization_ids()));

CREATE POLICY "members can insert posts"
  ON posts FOR INSERT
  WITH CHECK (organization_id IN (SELECT user_organization_ids()));

CREATE POLICY "members can update posts"
  ON posts FOR UPDATE
  USING (organization_id IN (SELECT user_organization_ids()));

CREATE POLICY "members can delete posts"
  ON posts FOR DELETE
  USING (organization_id IN (SELECT user_organization_ids()));

-- Subscriptions: org-scoped, read-only for members
CREATE POLICY "members can view subscriptions"
  ON subscriptions FOR SELECT
  USING (organization_id IN (SELECT user_organization_ids()));

-- AI jobs: org-scoped
CREATE POLICY "members can view ai jobs"
  ON ai_jobs FOR SELECT
  USING (organization_id IN (SELECT user_organization_ids()));

CREATE POLICY "members can insert ai jobs"
  ON ai_jobs FOR INSERT
  WITH CHECK (organization_id IN (SELECT user_organization_ids()));

-- Admin: full access to everything
CREATE POLICY "admin full access organizations"
  ON organizations FOR ALL USING (is_admin());
CREATE POLICY "admin full access memberships"
  ON memberships FOR ALL USING (is_admin());
CREATE POLICY "admin full access venues"
  ON venues FOR ALL USING (is_admin());
CREATE POLICY "admin full access brand_kits"
  ON brand_kits FOR ALL USING (is_admin());
CREATE POLICY "admin full access menus"
  ON menus FOR ALL USING (is_admin());
CREATE POLICY "admin full access menu_categories"
  ON menu_categories FOR ALL USING (is_admin());
CREATE POLICY "admin full access menu_items"
  ON menu_items FOR ALL USING (is_admin());
CREATE POLICY "admin full access menu_item_prices"
  ON menu_item_prices FOR ALL USING (is_admin());
CREATE POLICY "admin full access menu_item_allergens"
  ON menu_item_allergens FOR ALL USING (is_admin());
CREATE POLICY "admin full access assets"
  ON assets FOR ALL USING (is_admin());
CREATE POLICY "admin full access image_jobs"
  ON image_jobs FOR ALL USING (is_admin());
CREATE POLICY "admin full access credit_ledger"
  ON credit_ledger FOR ALL USING (is_admin());
CREATE POLICY "admin full access screens"
  ON screens FOR ALL USING (is_admin());
CREATE POLICY "admin full access scenes"
  ON scenes FOR ALL USING (is_admin());
CREATE POLICY "admin full access schedules"
  ON schedules FOR ALL USING (is_admin());
CREATE POLICY "admin full access posts"
  ON posts FOR ALL USING (is_admin());
CREATE POLICY "admin full access subscriptions"
  ON subscriptions FOR ALL USING (is_admin());
CREATE POLICY "admin full access ai_jobs"
  ON ai_jobs FOR ALL USING (is_admin());

-- ============================================================
-- Public access policies (for TV player and interactive menu)
-- ============================================================

-- Venues: public read by slug (for /m/[slug])
CREATE POLICY "public can view venues by slug"
  ON venues FOR SELECT
  USING (public_slug IS NOT NULL);

-- Brand kits: public read via venue
CREATE POLICY "public can view brand kits"
  ON brand_kits FOR SELECT
  USING (true);

-- Menus: public read for active menus
CREATE POLICY "public can view active menus"
  ON menus FOR SELECT
  USING (is_active = true);

-- Menu categories, items, prices, allergens: public read
CREATE POLICY "public can view menu categories"
  ON menu_categories FOR SELECT
  USING (true);

CREATE POLICY "public can view menu items"
  ON menu_items FOR SELECT
  USING (true);

CREATE POLICY "public can view menu item prices"
  ON menu_item_prices FOR SELECT
  USING (true);

CREATE POLICY "public can view menu item allergens"
  ON menu_item_allergens FOR SELECT
  USING (true);

-- Screens: public read by token_hash (for /tv/[token])
CREATE POLICY "public can view screens by token"
  ON screens FOR SELECT
  USING (true);

-- Scenes and schedules: public read (for TV player)
CREATE POLICY "public can view scenes"
  ON scenes FOR SELECT
  USING (true);

CREATE POLICY "public can view schedules"
  ON schedules FOR SELECT
  USING (true);

-- Templates: public read for active templates
CREATE POLICY "public can view templates"
  ON templates FOR SELECT
  USING (is_active = true);

-- Assets: public read (photos displayed on TV/menu)
CREATE POLICY "public can view assets"
  ON assets FOR SELECT
  USING (true);
```

- [ ] **Step 4: Push migration to the hosted Supabase project**

```bash
npx supabase db push --linked
```

Expected: migration applies successfully. If the project is not linked yet:

```bash
npx supabase link --project-ref wdicazfetgqseqohambv
npx supabase db push
```

- [ ] **Step 5: Create Supabase browser client**

Create `src/lib/supabase/client.ts`:

```ts
import { createBrowserClient as createClient } from '@supabase/ssr'

export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

- [ ] **Step 6: Create Supabase server client**

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient as createClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const cookieStore = await cookies()

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // setAll is called from Server Components where cookies
            // cannot be set. This can be safely ignored when the
            // middleware is refreshing the session.
          }
        },
      },
    },
  )
}
```

- [ ] **Step 7: Create Supabase middleware helper**

Create `src/lib/supabase/middleware.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh the session — important for Server Components
  await supabase.auth.getUser()

  return supabaseResponse
}
```

- [ ] **Step 8: Create barrel export**

Create `src/lib/supabase/index.ts`:

```ts
export { createBrowserClient } from './client'
export { createServerClient } from './server'
export { updateSession } from './middleware'
```

- [ ] **Step 9: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add Supabase schema migration with RLS and client helpers"
```

---

### Task 4: Seed Data — "Chez Rosalie"

**Files:**
- Create: `supabase/seed.sql`

**Interfaces:**
- Consumes: database schema from Task 3
- Produces: a complete demo restaurant with menu, brand kit, screen, and subscription data

- [ ] **Step 1: Create seed file**

Create `supabase/seed.sql`:

```sql
-- ============================================================
-- Seed: "Chez Rosalie" — demo bistrot for development
-- ============================================================

-- Organization
INSERT INTO organizations (id, name) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Chez Rosalie SARL');

-- Venue
INSERT INTO venues (id, organization_id, name, address, cuisine_type, public_slug, timezone) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Chez Rosalie', '12 rue des Lilas, 75011 Paris', 'bistrot', 'chez-rosalie', 'Europe/Paris');

-- Brand kit
INSERT INTO brand_kits (venue_id, primary_color, secondary_color, accent_color, font_heading, font_body, tone_of_voice) VALUES
  ('b0000000-0000-0000-0000-000000000001', '#1a1a1a', '#f5f0e8', '#c2185b', 'Inter', 'Inter', 'chaleureux et authentique');

-- Menu
INSERT INTO menus (id, venue_id, name, is_active) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Carte principale', true);

-- Categories
INSERT INTO menu_categories (id, menu_id, name, sort_order) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Entrées', 0),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Plats', 1),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'Desserts', 2),
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'Boissons', 3);

-- Menu items — Entrées
INSERT INTO menu_items (id, category_id, name, description, sort_order) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Soupe à l''oignon', 'Gratinée au fromage, croûtons maison', 0),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Salade de chèvre chaud', 'Mesclun, miel, noix, toast de chèvre', 1),
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Terrine de campagne', 'Cornichons, pain de campagne grillé', 2),
  ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'Œuf mayo', 'Œuf bio, mayonnaise maison', 3);

-- Menu items — Plats
INSERT INTO menu_items (id, category_id, name, description, is_daily_special, sort_order) VALUES
  ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000002', 'Steak-frites', 'Bavette d''Aubrac, frites maison, sauce béarnaise', true, 0),
  ('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000002', 'Confit de canard', 'Pommes sarladaises, salade verte', false, 1),
  ('e0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000002', 'Pavé de saumon', 'Écrasé de pommes de terre, beurre blanc', false, 2),
  ('e0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000002', 'Burger Rosalie', 'Steak haché frais, cheddar affiné, oignons confits', false, 3),
  ('e0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000002', 'Risotto aux champignons', 'Champignons de saison, parmesan, truffe', false, 4);

-- Menu items — Desserts
INSERT INTO menu_items (id, category_id, name, description, sort_order) VALUES
  ('e0000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000003', 'Crème brûlée', 'Vanille de Madagascar', 0),
  ('e0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000003', 'Tarte Tatin', 'Pommes caramélisées, crème fraîche', 1),
  ('e0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000003', 'Mousse au chocolat', 'Chocolat noir 70%, chantilly', 2);

-- Menu items — Boissons
INSERT INTO menu_items (id, category_id, name, sort_order) VALUES
  ('e0000000-0000-0000-0000-000000000013', 'd0000000-0000-0000-0000-000000000004', 'Eau minérale', 0),
  ('e0000000-0000-0000-0000-000000000014', 'd0000000-0000-0000-0000-000000000004', 'Coca-Cola', 1),
  ('e0000000-0000-0000-0000-000000000015', 'd0000000-0000-0000-0000-000000000004', 'Verre de vin rouge', 2),
  ('e0000000-0000-0000-0000-000000000016', 'd0000000-0000-0000-0000-000000000004', 'Café', 3);

-- Prices (all in cents, TTC)
INSERT INTO menu_item_prices (item_id, label, amount_cents, tva_rate) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'Seul', 750, 10.00),
  ('e0000000-0000-0000-0000-000000000002', 'Seul', 990, 10.00),
  ('e0000000-0000-0000-0000-000000000003', 'Seul', 850, 10.00),
  ('e0000000-0000-0000-0000-000000000004', 'Seul', 500, 10.00),
  ('e0000000-0000-0000-0000-000000000005', 'Seul', 1690, 10.00),
  ('e0000000-0000-0000-0000-000000000006', 'Seul', 1850, 10.00),
  ('e0000000-0000-0000-0000-000000000007', 'Seul', 1790, 10.00),
  ('e0000000-0000-0000-0000-000000000008', 'Seul', 1490, 10.00),
  ('e0000000-0000-0000-0000-000000000008', 'Menu', 1890, 10.00),
  ('e0000000-0000-0000-0000-000000000009', 'Seul', 1550, 10.00),
  ('e0000000-0000-0000-0000-000000000010', 'Seul', 750, 10.00),
  ('e0000000-0000-0000-0000-000000000011', 'Seul', 850, 10.00),
  ('e0000000-0000-0000-0000-000000000012', 'Seul', 700, 10.00),
  ('e0000000-0000-0000-0000-000000000013', 'Seul', 350, 10.00),
  ('e0000000-0000-0000-0000-000000000014', 'Seul', 400, 10.00),
  ('e0000000-0000-0000-0000-000000000015', 'Seul', 550, 20.00),
  ('e0000000-0000-0000-0000-000000000016', 'Seul', 250, 10.00);

-- Allergens (confirmed)
INSERT INTO menu_item_allergens (item_id, allergen, is_confirmed) VALUES
  -- Soupe à l'oignon: gluten (croûtons), lait (fromage)
  ('e0000000-0000-0000-0000-000000000001', 'gluten', true),
  ('e0000000-0000-0000-0000-000000000001', 'lait', true),
  -- Salade de chèvre chaud: lait (chèvre), fruits_a_coque (noix), gluten (toast)
  ('e0000000-0000-0000-0000-000000000002', 'lait', true),
  ('e0000000-0000-0000-0000-000000000002', 'fruits_a_coque', true),
  ('e0000000-0000-0000-0000-000000000002', 'gluten', true),
  -- Terrine de campagne: gluten (pain)
  ('e0000000-0000-0000-0000-000000000003', 'gluten', true),
  -- Œuf mayo: oeufs
  ('e0000000-0000-0000-0000-000000000004', 'oeufs', true),
  -- Steak-frites: oeufs (béarnaise), lait (béarnaise)
  ('e0000000-0000-0000-0000-000000000005', 'oeufs', true),
  ('e0000000-0000-0000-0000-000000000005', 'lait', true),
  -- Confit de canard: (none typical)
  -- Pavé de saumon: poissons, lait (beurre blanc)
  ('e0000000-0000-0000-0000-000000000007', 'poissons', true),
  ('e0000000-0000-0000-0000-000000000007', 'lait', true),
  -- Burger Rosalie: gluten (pain), lait (cheddar), oeufs
  ('e0000000-0000-0000-0000-000000000008', 'gluten', true),
  ('e0000000-0000-0000-0000-000000000008', 'lait', true),
  ('e0000000-0000-0000-0000-000000000008', 'oeufs', true),
  -- Risotto: lait (parmesan)
  ('e0000000-0000-0000-0000-000000000009', 'lait', true),
  -- Crème brûlée: oeufs, lait
  ('e0000000-0000-0000-0000-000000000010', 'oeufs', true),
  ('e0000000-0000-0000-0000-000000000010', 'lait', true),
  -- Tarte Tatin: gluten, lait (crème fraîche)
  ('e0000000-0000-0000-0000-000000000011', 'gluten', true),
  ('e0000000-0000-0000-0000-000000000011', 'lait', true),
  -- Mousse au chocolat: oeufs, lait (chantilly), soja (chocolat)
  ('e0000000-0000-0000-0000-000000000012', 'oeufs', true),
  ('e0000000-0000-0000-0000-000000000012', 'lait', true),
  ('e0000000-0000-0000-0000-000000000012', 'soja', true);

-- Template: bistrot-01 (for the seed screen)
INSERT INTO templates (id, slug, name, family, formats, loop_duration_ms, version) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'bistrot-01', 'Bistrot Ardoise', 'bistrot',
   '{landscape,portrait}', 30000, 1);

-- Screen: 1 landscape screen
-- Token: 'demo-tv-token-chez-rosalie' → SHA-256 hash
-- SHA-256 of 'demo-tv-token-chez-rosalie' = precomputed below
INSERT INTO screens (id, venue_id, name, orientation, token_hash) VALUES
  ('10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'Écran principal', 'landscape',
   encode(sha256('demo-tv-token-chez-rosalie'::bytea), 'hex'));

-- Scene: bistrot-01 template with seed data
INSERT INTO scenes (id, screen_id, template_id, data, sort_order) VALUES
  ('11000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   'f0000000-0000-0000-0000-000000000001',
   '{}',
   0);

-- Schedule: all week, all day
INSERT INTO schedules (scene_id, days_of_week, start_time, end_time, label) VALUES
  ('11000000-0000-0000-0000-000000000001', '{1,2,3,4,5,6,7}', '00:00', '23:59', 'Toute la journée');

-- Subscription: trial, 14 days
INSERT INTO subscriptions (organization_id, plan, status, trial_ends_at, monthly_image_credits) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'trial', 'trialing',
   now() + interval '14 days', 100);

-- Credit ledger: initial grant
INSERT INTO credit_ledger (organization_id, type, amount, balance_after, description) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'grant', 100, 100, 'Attribution initiale essai gratuit');
```

- [ ] **Step 2: Run the seed against the hosted Supabase**

```bash
npx supabase db reset --linked
```

This re-applies migrations and runs `seed.sql`. If `db reset` is not available on hosted, use:

```bash
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

Expected: all inserts succeed, no errors.

- [ ] **Step 3: Verify seed data exists**

Use the Supabase MCP tool to run:

```sql
SELECT v.name, v.public_slug, bk.accent_color,
       (SELECT count(*) FROM menu_items mi
        JOIN menu_categories mc ON mc.id = mi.category_id
        JOIN menus m ON m.id = mc.menu_id
        WHERE m.venue_id = v.id) AS item_count
FROM venues v
JOIN brand_kits bk ON bk.venue_id = v.id
WHERE v.public_slug = 'chez-rosalie';
```

Expected: `Chez Rosalie | chez-rosalie | #c2185b | 16`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Supabase seed data for Chez Rosalie demo restaurant"
```

---

### Task 5: Authentication (Signup, Login, Middleware)

**Files:**
- Create: `src/middleware.ts`
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/signup/page.tsx`
- Create: `src/app/(auth)/auth/callback/route.ts`
- Create: `src/lib/auth/actions.ts`
- Modify: `src/app/page.tsx` (redirect to dashboard or login)

**Interfaces:**
- Consumes: `updateSession()` from `@/lib/supabase/middleware`, `createServerClient()` from `@/lib/supabase/server`, `createBrowserClient()` from `@/lib/supabase/client`
- Produces:
  - Middleware that protects `/(dashboard)/*` routes, allows `/tv/*`, `/m/*`, `/api/*` public routes
  - `login(formData: FormData): Promise<void>` server action
  - `signup(formData: FormData): Promise<void>` server action
  - `loginWithMagicLink(formData: FormData): Promise<void>` server action

- [ ] **Step 1: Create the Next.js middleware**

Create `src/middleware.ts`:

```ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public folder files
     * - TV player and interactive menu (public routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: Create auth actions (login, signup, magic link)**

Create `src/lib/auth/actions.ts`:

```ts
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
```

- [ ] **Step 3: Create the auth callback route**

Create `src/app/(auth)/auth/callback/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/carte'

  if (code) {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
```

- [ ] **Step 4: Create the auth layout**

Create `src/app/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-6">{children}</div>
    </div>
  )
}
```

- [ ] **Step 5: Create the login page**

Create `src/app/(auth)/login/page.tsx`:

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login, loginWithMagicLink } from '@/lib/auth/actions'
import Link from 'next/link'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const { error, message } = await searchParams

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Connexion</CardTitle>
        <CardDescription>Connectez-vous à votre compte Tavo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error === 'invalid_credentials' && (
          <p className="text-sm text-red-600">Email ou mot de passe incorrect.</p>
        )}
        {error === 'magic_link_failed' && (
          <p className="text-sm text-red-600">Erreur lors de l&apos;envoi du lien magique.</p>
        )}
        {message === 'magic_link_sent' && (
          <p className="text-sm text-green-600">
            Un lien de connexion a été envoyé à votre adresse email.
          </p>
        )}

        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <Button formAction={login} className="w-full">
            Se connecter
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-muted-foreground">ou</span>
          </div>
        </div>

        <form>
          <div className="space-y-2">
            <Label htmlFor="magic-email">Connexion par lien magique</Label>
            <Input id="magic-email" name="email" type="email" placeholder="votre@email.fr" required />
          </div>
          <Button formAction={loginWithMagicLink} variant="outline" className="mt-2 w-full">
            Recevoir un lien de connexion
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{' '}
          <Link href="/signup" className="text-primary underline">
            Créer un compte
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 6: Create the signup page**

Create `src/app/(auth)/signup/page.tsx`:

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signup } from '@/lib/auth/actions'
import Link from 'next/link'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Créer un compte</CardTitle>
        <CardDescription>
          Commencez votre essai gratuit de 14 jours
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error === 'signup_failed' && (
          <p className="mb-4 text-sm text-red-600">
            Erreur lors de la création du compte. Vérifiez vos informations.
          </p>
        )}

        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="venue_name">Nom de l&apos;établissement</Label>
            <Input id="venue_name" name="venue_name" placeholder="Chez Rosalie" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" name="password" type="password" minLength={8} required />
          </div>
          <Button formAction={signup} className="w-full">
            Créer mon compte
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-primary underline">
            Se connecter
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 7: Update root page to redirect**

Replace `src/app/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/carte')
  } else {
    redirect('/login')
  }
}
```

- [ ] **Step 8: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add authentication with login, signup, magic link, and middleware"
```

---

### Task 6: Dashboard Layout + Navigation

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/app/(dashboard)/carte/page.tsx` (placeholder)
- Create: `src/components/dashboard/app-sidebar.tsx`
- Create: `src/components/dashboard/user-nav.tsx`
- Create: `src/lib/auth/get-session.ts`

**Interfaces:**
- Consumes: `createServerClient()` from `@/lib/supabase/server`, shadcn `Sidebar`, `SidebarProvider`, `SidebarTrigger` components
- Produces:
  - Protected dashboard layout with sidebar navigation
  - `getSession()` helper returning `{ user, organization, venue, subscription }`
  - Placeholder `/carte` page

- [ ] **Step 1: Create session helper**

Create `src/lib/auth/get-session.ts`:

```ts
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
```

- [ ] **Step 2: Create the sidebar navigation**

Create `src/components/dashboard/app-sidebar.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { UtensilsCrossed, Tv, Camera, ImageIcon, Settings } from 'lucide-react'

const navigation = [
  { name: 'Carte', href: '/carte', icon: UtensilsCrossed },
  { name: 'Affichage TV', href: '/tv', icon: Tv },
  { name: 'Studio photo', href: '/studio', icon: Camera },
  { name: 'Posts', href: '/posts', icon: ImageIcon },
  { name: 'Paramètres', href: '/parametres', icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <span className="text-xl font-bold">Tavo</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  )
}
```

- [ ] **Step 3: Create user navigation (top bar)**

Create `src/components/dashboard/user-nav.tsx`:

```tsx
'use client'

import { createBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function UserNav({ email, venueName }: { email: string; venueName: string }) {
  const router = useRouter()
  const supabase = createBrowserClient()

  const initials = email.slice(0, 2).toUpperCase()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground">{venueName}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-xs text-muted-foreground">{email}</DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut}>Déconnexion</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
```

- [ ] **Step 4: Install lucide-react**

```bash
pnpm add lucide-react
```

- [ ] **Step 5: Create the dashboard layout**

Create `src/app/(dashboard)/layout.tsx`:

```tsx
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { UserNav } from '@/components/dashboard/user-nav'
import { getSession } from '@/lib/auth/get-session'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, venue } = await getSession()

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <header className="flex h-14 items-center justify-between border-b px-4">
          <SidebarTrigger />
          <UserNav email={user.email ?? ''} venueName={venue?.name ?? ''} />
        </header>
        <div className="p-6">{children}</div>
      </main>
    </SidebarProvider>
  )
}
```

- [ ] **Step 6: Create placeholder carte page**

Create `src/app/(dashboard)/carte/page.tsx`:

```tsx
export default function CartePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Carte</h1>
      <p className="mt-2 text-muted-foreground">L&apos;éditeur de carte arrive en Phase 1.</p>
    </div>
  )
}
```

- [ ] **Step 7: Verify typecheck and lint pass**

```bash
pnpm typecheck && pnpm lint
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add dashboard layout with sidebar navigation and session helper"
```

---

### Task 7: CI Pipeline + CLAUDE.md + README

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `CLAUDE.md`
- Create: `README.md`

**Interfaces:**
- Consumes: `pnpm lint`, `pnpm typecheck`, `pnpm test` scripts from Task 1
- Produces: CI that runs on every push and PR, project documentation

- [ ] **Step 1: Create GitHub Actions CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    name: Lint, Types, Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm typecheck

      - name: Unit tests
        run: pnpm test
```

- [ ] **Step 2: Create CLAUDE.md**

Create `CLAUDE.md`:

```markdown
# Tavo — Project Guide

## Vision

AI-powered communication assistant for French restaurant owners. Provides TV menu boards, interactive mobile menus, AI photo studio, and social media post generation.

## Stack

- **Framework:** Next.js 15 (App Router), TypeScript strict, Tailwind CSS + shadcn/ui
- **Database & Auth:** Supabase (hosted, project `wdicazfetgqseqohambv`)
- **AI:** Anthropic Claude (menu import, text generation), Stability AI (image processing)
- **Payments:** Stripe (subscriptions)
- **Hosting:** Vercel (auto-deploy on push to main)

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Start dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint + Prettier check |
| `pnpm lint:fix` | Auto-fix lint/format issues |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:e2e` | Run e2e tests (Playwright) |

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
```

- [ ] **Step 3: Create README**

Create `README.md`:

```markdown
# Tavo

Assistant de communication IA pour restaurateurs, bars et cafés.

## Démarrage rapide

### Prérequis

- Node.js 22+
- pnpm 10+
- Compte Supabase (projet configuré)

### Installation

```bash
# Cloner le repo
git clone <repo-url>
cd flatback

# Installer les dépendances
pnpm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Remplir les valeurs dans .env.local

# Lancer le serveur de développement
pnpm dev
```

### Variables d'environnement

Voir `.env.example` pour la liste complète. Au minimum :

- `NEXT_PUBLIC_SUPABASE_URL` — URL du projet Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Clé publique Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — Clé service (serveur uniquement)

### Commandes

```bash
pnpm dev          # Serveur de développement
pnpm build        # Build de production
pnpm lint         # Vérification lint + format
pnpm typecheck    # Vérification des types
pnpm test         # Tests unitaires
pnpm test:e2e     # Tests end-to-end
```

### Base de données

Les migrations Supabase sont dans `supabase/migrations/`. Pour appliquer :

```bash
npx supabase link --project-ref wdicazfetgqseqohambv
npx supabase db push
```

Données de démo (restaurant fictif "Chez Rosalie") :

```bash
npx supabase db reset --linked
```

## Licence

Propriétaire — Tous droits réservés.
```

- [ ] **Step 4: Verify everything passes**

```bash
pnpm lint && pnpm typecheck && pnpm test
```

Expected: all three pass with zero errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: add CI pipeline, CLAUDE.md, and README"
```

---

### Task 8: Final Verification

**Files:** None (verification only)

**Interfaces:**
- Consumes: everything from Tasks 1-7
- Produces: confidence that Phase 0 acceptance criteria are met

- [ ] **Step 1: Clean install test**

```bash
rm -rf node_modules .next
pnpm install
```

Expected: install succeeds with no errors.

- [ ] **Step 2: Run all quality checks**

```bash
pnpm lint && pnpm typecheck && pnpm test
```

Expected: all three pass.

- [ ] **Step 3: Run dev server and verify pages load**

```bash
pnpm dev &
sleep 5
# Root should redirect to /login
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# Login page should return 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login
# Signup page should return 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/signup
kill %1
```

Expected: 307 (redirect), 200, 200.

- [ ] **Step 4: Verify database schema exists on hosted Supabase**

Use Supabase MCP or dashboard to verify all 19 tables exist:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected: `ai_jobs`, `assets`, `brand_kits`, `credit_ledger`, `image_jobs`, `menu_categories`, `menu_item_allergens`, `menu_item_prices`, `menu_items`, `menus`, `memberships`, `organizations`, `posts`, `scenes`, `schedules`, `screens`, `subscriptions`, `templates`, `venues`.

- [ ] **Step 5: Verify seed data**

```sql
SELECT count(*) FROM menu_items
WHERE category_id IN (
  SELECT id FROM menu_categories
  WHERE menu_id = 'c0000000-0000-0000-0000-000000000001'
);
```

Expected: 16.

- [ ] **Step 6: Commit any final fixes and tag the phase**

```bash
git tag phase-0-complete
```
