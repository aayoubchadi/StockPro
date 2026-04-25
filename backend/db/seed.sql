-- StockPro seed data (multi-tenant)
-- Run with:
--   PGPASSWORD="<postgres_password>" "C:\\Path_To_Your_PostGreSQL\\bin\\psql.exe" -U postgres -h localhost -p 9100 -d stockpro_db -f backend/db/seed.sql

-- Dev seeded login credentials (DO NOT use in production):
-- 1) admin@acme.local     -> Admin@123
-- 2) employee1@acme.local -> Employee@123
-- 3) admin@nova.local     -> NovaAdmin@123
-- 4) stockpro@admin.com   -> StockPro@Admin2026 (platform/master admin)
-- 5) ayoubchadi@stockpro.com -> StockPro@Admin2026 (platform/master admin)
-- Password hashes are generated with pgcrypto crypt(..., gen_salt('bf')).

-- Reset auth sessions for seeded accounts so reseeding does not keep stale sessions.
WITH seeded_auth_emails (email) AS (
  VALUES
    ('admin@acme.local'::citext),
    ('employee1@acme.local'::citext),
    ('admin@nova.local'::citext),
    ('stockpro@admin.com'::citext),
    ('ayoubchadi@stockpro.com'::citext)
)
DELETE FROM auth_sessions s
USING seeded_auth_emails sae
WHERE s.email = sae.email;

DELETE FROM auth_access_token_blacklist
WHERE expires_at <= NOW();

INSERT INTO platform_admins (email, password_hash, full_name, is_active)
VALUES
  ('stockpro@admin.com', crypt('StockPro@Admin2026', gen_salt('bf', 10)), 'StockPro Master Admin', TRUE),
  ('ayoubchadi@stockpro.com', crypt('StockPro@Admin2026', gen_salt('bf', 10)), 'StockPro Co-Admin', TRUE)
ON CONFLICT (email) DO UPDATE
SET
  password_hash = EXCLUDED.password_hash,
  full_name = EXCLUDED.full_name,
  is_active = TRUE;

INSERT INTO subscription_plans (
  code,
  name,
  monthly_price_cents,
  currency_code,
  max_employees,
  can_export_reports,
  can_use_advanced_analytics
)
VALUES
  ('demo_free', 'Demo Free', 0, 'USD', 20, FALSE, FALSE),
  ('starter_20', 'Starter 20', 7900, 'EUR', 20, FALSE, FALSE),
  ('growth_50', 'Growth 50', 14900, 'EUR', 50, TRUE, FALSE),
  ('enterprise_150', 'Enterprise 150', 29900, 'EUR', 150, TRUE, TRUE)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  currency_code = EXCLUDED.currency_code,
  max_employees = EXCLUDED.max_employees,
  can_export_reports = EXCLUDED.can_export_reports,
  can_use_advanced_analytics = EXCLUDED.can_use_advanced_analytics;

INSERT INTO companies (name, slug, subscription_plan_id)
SELECT 'Acme Logistics', 'acme-logistics', sp.id
FROM subscription_plans sp
WHERE sp.code = 'growth_50'
ON CONFLICT (slug) DO UPDATE
SET subscription_plan_id = EXCLUDED.subscription_plan_id;

INSERT INTO companies (name, slug, subscription_plan_id)
SELECT 'Nova Retail', 'nova-retail', sp.id
FROM subscription_plans sp
WHERE sp.code = 'starter_20'
ON CONFLICT (slug) DO UPDATE
SET subscription_plan_id = EXCLUDED.subscription_plan_id;

INSERT INTO company_subscriptions (
  company_id,
  subscription_plan_id,
  provider,
  provider_order_id,
  status,
  amount_cents,
  currency_code,
  payer_email,
  starts_at,
  raw_payload
)
SELECT
  c.id,
  sp.id,
  'paypal',
  'SEED-ACME-GROWTH-2026',
  'active',
  sp.monthly_price_cents,
  sp.currency_code,
  'admin@acme.local',
  NOW() - INTERVAL '14 days',
  jsonb_build_object('source', 'seed', 'note', 'Seeded active subscription for Acme')
FROM companies c
JOIN subscription_plans sp ON sp.id = c.subscription_plan_id
WHERE c.slug = 'acme-logistics'
ON CONFLICT (provider_order_id) DO UPDATE
SET
  subscription_plan_id = EXCLUDED.subscription_plan_id,
  status = 'active',
  amount_cents = EXCLUDED.amount_cents,
  currency_code = EXCLUDED.currency_code,
  payer_email = EXCLUDED.payer_email,
  starts_at = EXCLUDED.starts_at,
  raw_payload = EXCLUDED.raw_payload,
  updated_at = NOW();

INSERT INTO company_subscriptions (
  company_id,
  subscription_plan_id,
  provider,
  provider_order_id,
  status,
  amount_cents,
  currency_code,
  payer_email,
  starts_at,
  raw_payload
)
SELECT
  c.id,
  sp.id,
  'paypal',
  'SEED-NOVA-STARTER-2026',
  'active',
  sp.monthly_price_cents,
  sp.currency_code,
  'admin@nova.local',
  NOW() - INTERVAL '9 days',
  jsonb_build_object('source', 'seed', 'note', 'Seeded active subscription for Nova')
FROM companies c
JOIN subscription_plans sp ON sp.id = c.subscription_plan_id
WHERE c.slug = 'nova-retail'
ON CONFLICT (provider_order_id) DO UPDATE
SET
  subscription_plan_id = EXCLUDED.subscription_plan_id,
  status = 'active',
  amount_cents = EXCLUDED.amount_cents,
  currency_code = EXCLUDED.currency_code,
  payer_email = EXCLUDED.payer_email,
  starts_at = EXCLUDED.starts_at,
  raw_payload = EXCLUDED.raw_payload,
  updated_at = NOW();

INSERT INTO users (company_id, full_name, email, password_hash, role, permissions)
SELECT c.id, 'Acme Admin', 'admin@acme.local', crypt('Admin@123', gen_salt('bf', 10)), 'company_admin', '{}'::jsonb
FROM companies c
WHERE c.slug = 'acme-logistics'
ON CONFLICT (company_id, email) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  is_active = TRUE;

INSERT INTO users (company_id, full_name, email, password_hash, role, permissions)
SELECT c.id, 'Acme Employee', 'employee1@acme.local', crypt('Employee@123', gen_salt('bf', 10)), 'employee',
  jsonb_build_object(
    'inventory.view', TRUE,
    'reports.view', TRUE,
    'stock.move', TRUE
  )
FROM companies c
WHERE c.slug = 'acme-logistics'
ON CONFLICT (company_id, email) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  is_active = TRUE;

INSERT INTO users (company_id, full_name, email, password_hash, role, permissions)
SELECT c.id, 'Nova Admin', 'admin@nova.local', crypt('NovaAdmin@123', gen_salt('bf', 10)), 'company_admin', '{}'::jsonb
FROM companies c
WHERE c.slug = 'nova-retail'
ON CONFLICT (company_id, email) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  is_active = TRUE;

INSERT INTO products (company_id, sku, name, description, unit_price, quantity_in_stock, low_stock_threshold)
SELECT c.id, 'SKU-CHAIR-01', 'Office Chair', 'Ergonomic chair', 120.00, 40, 10
FROM companies c
WHERE c.slug = 'acme-logistics'
ON CONFLICT (company_id, sku) DO NOTHING;

INSERT INTO products (company_id, sku, name, description, unit_price, quantity_in_stock, low_stock_threshold)
SELECT c.id, 'SKU-CHAIR-01', 'Office Chair', 'Same SKU, different tenant', 110.00, 20, 5
FROM companies c
WHERE c.slug = 'nova-retail'
ON CONFLICT (company_id, sku) DO NOTHING;

INSERT INTO stock_movements (company_id, product_id, movement_type, quantity, note, moved_by)
SELECT
  c.id,
  p.id,
  'in',
  25,
  'Initial inbound stock',
  u.id
FROM companies c
JOIN products p ON p.company_id = c.id AND p.sku = 'SKU-CHAIR-01'
JOIN users u ON u.company_id = c.id AND u.email = 'admin@acme.local'
WHERE c.slug = 'acme-logistics'
  AND NOT EXISTS (
    SELECT 1
    FROM stock_movements sm
    WHERE sm.company_id = c.id
      AND sm.product_id = p.id
      AND sm.note = 'Initial inbound stock'
  );
