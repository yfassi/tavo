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
