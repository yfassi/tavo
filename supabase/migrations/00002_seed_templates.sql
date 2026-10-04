INSERT INTO templates (slug, name, family, formats, loop_duration_ms, version) VALUES
  ('street-01', 'Street Bold', 'street', '{landscape,portrait}', 30000, 1),
  ('street-02', 'Street Neon', 'street', '{landscape,portrait}', 30000, 1),
  ('street-03', 'Street Minimal', 'street', '{landscape,portrait}', 30000, 1),
  ('bistrot-01', 'Bistrot Ardoise', 'bistrot', '{landscape,portrait}', 30000, 1),
  ('bistrot-02', 'Bistrot Élégant', 'bistrot', '{landscape,portrait}', 30000, 1),
  ('bistrot-03', 'Bistrot Marché', 'bistrot', '{landscape,portrait}', 30000, 1)
ON CONFLICT (slug) DO NOTHING;
