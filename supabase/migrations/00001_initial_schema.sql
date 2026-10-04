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
