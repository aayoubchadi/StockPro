-- StockPro seed data (multi-tenant)
-- Run with:
--   PGPASSWORD="<postgres_password>" "C:\\Path_To_Your_PostGreSQL\\bin\\psql.exe" -U postgres -h localhost -p 9100 -d stockpro_db -f backend/db/seed.sql

-- Dev seeded login credentials (username + password, DO NOT use in production):
-- 1) stockpro_admin  -> StockPro@Admin2026 (platform/master admin, email: stockpro@admin.com)
-- 2) ayoub_chadi     -> StockPro@Admin2026 (platform/master admin, email: ayoubchadi@stockpro.com)
-- 3) acme_admin      -> Admin@123 (tenant admin, email: admin@acme.local)
-- 4) acme_employee   -> Employee@123 (tenant employee, email: employee1@acme.local)
-- 5) nova_admin      -> NovaAdmin@123 (tenant admin, email: admin@nova.local)
-- Password hashes are generated with pgcrypto crypt(..., gen_salt('bf')).

-- Reset auth sessions for seeded accounts so reseeding does not keep stale sessions.
-- Auth sessions are keyed by email in auth_sessions.
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

INSERT INTO platform_admins (email, username, password_hash, full_name, is_active)
VALUES
  ('stockpro@admin.com', 'stockpro_admin', crypt('StockPro@Admin2026', gen_salt('bf', 10)), 'StockPro Master Admin', TRUE),
  ('ayoubchadi@stockpro.com', 'ayoub_chadi', crypt('StockPro@Admin2026', gen_salt('bf', 10)), 'StockPro Co-Admin', TRUE)
ON CONFLICT (email) DO UPDATE
SET
  username = EXCLUDED.username,
  password_hash = EXCLUDED.password_hash,
  full_name = EXCLUDED.full_name,
  is_active = TRUE;

INSERT INTO subscription_plans (
  code,
  name,
  monthly_price_cents,
  currency_code,
  max_employees,
  max_admins,
  can_export_reports,
  can_use_advanced_analytics
)
VALUES
  ('demo_free', 'Demo Free', 0, 'MAD', 20, 2, FALSE, FALSE),
  ('starter_20', 'Starter 20', 79900, 'MAD', 20, 1, FALSE, FALSE),
  ('growth_50', 'Growth 50', 149900, 'MAD', 50, 2, TRUE, FALSE),
  ('enterprise_150', 'Enterprise 150', 299900, 'MAD', 150, 5, TRUE, TRUE)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  currency_code = EXCLUDED.currency_code,
  max_employees = EXCLUDED.max_employees,
  max_admins = EXCLUDED.max_admins,
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

INSERT INTO users (company_id, full_name, email, username, password_hash, role, permissions)
SELECT c.id, 'Acme Admin', 'admin@acme.local', 'acme_admin', crypt('Admin@123', gen_salt('bf', 10)), 'company_admin', '{}'::jsonb
FROM companies c
WHERE c.slug = 'acme-logistics'
ON CONFLICT (company_id, email) DO UPDATE
SET
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  is_active = TRUE;

INSERT INTO users (company_id, full_name, email, username, password_hash, role, permissions)
SELECT c.id, 'Acme Employee', 'employee1@acme.local', 'acme_employee', crypt('Employee@123', gen_salt('bf', 10)), 'employee',
  jsonb_build_object(
    'inventory.view', TRUE,
    'reports.view', TRUE,
    'stock.move', TRUE
  )
FROM companies c
WHERE c.slug = 'acme-logistics'
ON CONFLICT (company_id, email) DO UPDATE
SET
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  is_active = TRUE;

INSERT INTO users (company_id, full_name, email, username, password_hash, role, permissions)
SELECT c.id, 'Nova Admin', 'admin@nova.local', 'nova_admin', crypt('NovaAdmin@123', gen_salt('bf', 10)), 'company_admin', '{}'::jsonb
FROM companies c
WHERE c.slug = 'nova-retail'
ON CONFLICT (company_id, email) DO UPDATE
SET
  username = EXCLUDED.username,
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

-- Sample operational data for the Acme tenant so purchase, sales, and reports pages
-- render real records instead of empty states.
WITH acme_company AS (
  SELECT id
  FROM companies
  WHERE slug = 'acme-logistics'
),
acme_admin AS (
  SELECT u.id
  FROM users u
  JOIN acme_company c ON c.id = u.company_id
  WHERE u.email = 'admin@acme.local'
),
office_chair AS (
  SELECT p.id
  FROM products p
  JOIN acme_company c ON c.id = p.company_id
  WHERE p.sku = 'SKU-CHAIR-01'
),
standing_desk AS (
  SELECT p.id
  FROM products p
  JOIN acme_company c ON c.id = p.company_id
  WHERE p.sku = 'SKU-DESK-LOW'
),
acme_location AS (
  INSERT INTO locations (company_id, name, type, address)
  SELECT c.id, 'Acme Main Warehouse', 'warehouse', '12 Logistics Park, Suite 8'
  FROM acme_company c
  ON CONFLICT (company_id, name) DO UPDATE
  SET type = EXCLUDED.type,
      address = EXCLUDED.address
  RETURNING id, company_id
),
acme_supplier_a AS (
  INSERT INTO suppliers (company_id, name, email, phone, address)
  SELECT c.id, 'Northwind Supplies', 'orders@northwind.example', '+1 555 100 2100', '88 Industrial Way'
  FROM acme_company c
  ON CONFLICT (company_id, name) DO UPDATE
  SET email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      address = EXCLUDED.address
  RETURNING id, company_id
),
acme_supplier_b AS (
  INSERT INTO suppliers (company_id, name, email, phone, address)
  SELECT c.id, 'Metro Office Source', 'sales@metrooffice.example', '+1 555 100 2200', '14 Commerce Blvd'
  FROM acme_company c
  ON CONFLICT (company_id, name) DO UPDATE
  SET email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      address = EXCLUDED.address
  RETURNING id, company_id
),
acme_customer_a AS (
  INSERT INTO customers (company_id, name, email, phone, address)
  SELECT c.id, 'Bluebird Clinics', 'procurement@bluebird.example', '+1 555 200 3100', '410 Health Plaza'
  FROM acme_company c
  ON CONFLICT (company_id, name) DO UPDATE
  SET email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      address = EXCLUDED.address
  RETURNING id, company_id
),
acme_customer_b AS (
  INSERT INTO customers (company_id, name, email, phone, address)
  SELECT c.id, 'Summit Design Studio', 'orders@summitdesign.example', '+1 555 200 3200', '73 Creative Ave'
  FROM acme_company c
  ON CONFLICT (company_id, name) DO UPDATE
  SET email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      address = EXCLUDED.address
  RETURNING id, company_id
),
desk_product AS (
  INSERT INTO products (company_id, sku, name, description, unit_price, quantity_in_stock, low_stock_threshold)
  SELECT c.id, 'SKU-DESK-LOW', 'Standing Desk', 'Height adjustable desk', 320.00, 4, 10
  FROM acme_company c
  ON CONFLICT (company_id, sku) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      unit_price = EXCLUDED.unit_price,
      quantity_in_stock = EXCLUDED.quantity_in_stock,
      low_stock_threshold = EXCLUDED.low_stock_threshold
  RETURNING id, company_id
),
seed_inventory AS (
  INSERT INTO inventory_levels (company_id, location_id, product_id, quantity)
  SELECT c.id, l.id, p.id, v.quantity
  FROM acme_company c
  JOIN acme_location l ON l.company_id = c.id
  JOIN (
    VALUES
      ('SKU-CHAIR-01', 40),
      ('SKU-DESK-LOW', 4)
  ) AS v(sku, quantity) ON TRUE
  JOIN products p ON p.company_id = c.id AND p.sku = v.sku
  ON CONFLICT (location_id, product_id) DO UPDATE
  SET quantity = EXCLUDED.quantity,
      last_counted_at = NOW()
  RETURNING id
)
DELETE FROM purchase_order_items poi
USING purchase_orders po, companies c
WHERE poi.purchase_order_id = po.id
  AND po.company_id = c.id
  AND c.slug = 'acme-logistics'
  AND po.po_number IN ('PO-ACME-1001', 'PO-ACME-1002');

DELETE FROM purchase_orders po
USING companies c
WHERE po.company_id = c.id
  AND c.slug = 'acme-logistics'
  AND po.po_number IN ('PO-ACME-1001', 'PO-ACME-1002');

DELETE FROM sales_order_items soi
USING sales_orders so, companies c
WHERE soi.sales_order_id = so.id
  AND so.company_id = c.id
  AND c.slug = 'acme-logistics'
  AND so.order_number IN ('SO-ACME-2001', 'SO-ACME-2002');

DELETE FROM sales_orders so
USING companies c
WHERE so.company_id = c.id
  AND c.slug = 'acme-logistics'
  AND so.order_number IN ('SO-ACME-2001', 'SO-ACME-2002');

WITH acme_company AS (
  SELECT id
  FROM companies
  WHERE slug = 'acme-logistics'
),
supplier_a AS (
  SELECT id
  FROM suppliers
  WHERE company_id = (SELECT id FROM acme_company)
    AND name = 'Northwind Supplies'
),
supplier_b AS (
  SELECT id
  FROM suppliers
  WHERE company_id = (SELECT id FROM acme_company)
    AND name = 'Metro Office Source'
),
customer_a AS (
  SELECT id
  FROM customers
  WHERE company_id = (SELECT id FROM acme_company)
    AND name = 'Bluebird Clinics'
),
customer_b AS (
  SELECT id
  FROM customers
  WHERE company_id = (SELECT id FROM acme_company)
    AND name = 'Summit Design Studio'
),
chair_product AS (
  SELECT id
  FROM products
  WHERE company_id = (SELECT id FROM acme_company)
    AND sku = 'SKU-CHAIR-01'
),
desk_product AS (
  SELECT id
  FROM products
  WHERE company_id = (SELECT id FROM acme_company)
    AND sku = 'SKU-DESK-LOW'
),
po_1 AS (
  INSERT INTO purchase_orders (company_id, supplier_id, po_number, status, expected_delivery_date, notes)
  SELECT c.id, s.id, 'PO-ACME-1001', 'pending', NOW() + INTERVAL '5 days', 'Quarterly chair restock'
  FROM acme_company c
  CROSS JOIN supplier_a s
  ON CONFLICT (company_id, po_number) DO UPDATE
  SET supplier_id = EXCLUDED.supplier_id,
      status = EXCLUDED.status,
      expected_delivery_date = EXCLUDED.expected_delivery_date,
      notes = EXCLUDED.notes,
      updated_at = NOW()
  RETURNING id
),
po_2 AS (
  INSERT INTO purchase_orders (company_id, supplier_id, po_number, status, expected_delivery_date, notes)
  SELECT c.id, s.id, 'PO-ACME-1002', 'received', NOW() - INTERVAL '3 days', 'Desk replenishment already received'
  FROM acme_company c
  CROSS JOIN supplier_b s
  ON CONFLICT (company_id, po_number) DO UPDATE
  SET supplier_id = EXCLUDED.supplier_id,
      status = EXCLUDED.status,
      expected_delivery_date = EXCLUDED.expected_delivery_date,
      notes = EXCLUDED.notes,
      updated_at = NOW()
  RETURNING id
),
so_1 AS (
  INSERT INTO sales_orders (company_id, customer_id, order_number, status, notes)
  SELECT c.id, cu.id, 'SO-ACME-2001', 'pending', 'Bulk chair order for Bluebird Clinics'
  FROM acme_company c
  CROSS JOIN customer_a cu
  ON CONFLICT (company_id, order_number) DO UPDATE
  SET customer_id = EXCLUDED.customer_id,
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      updated_at = NOW()
  RETURNING id
),
so_2 AS (
  INSERT INTO sales_orders (company_id, customer_id, order_number, status, notes)
  SELECT c.id, cu.id, 'SO-ACME-2002', 'processing', 'Standing desk order in fulfillment'
  FROM acme_company c
  CROSS JOIN customer_b cu
  ON CONFLICT (company_id, order_number) DO UPDATE
  SET customer_id = EXCLUDED.customer_id,
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      updated_at = NOW()
  RETURNING id
)
INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_cost)
SELECT po_1.id, chair_product.id, 12, 95.00
FROM po_1, chair_product
UNION ALL
SELECT po_1.id, desk_product.id, 3, 250.00
FROM po_1, desk_product
UNION ALL
SELECT po_2.id, chair_product.id, 8, 92.50
FROM po_2, chair_product
UNION ALL
SELECT po_2.id, desk_product.id, 2, 245.00
FROM po_2, desk_product;

WITH acme_company AS (
  SELECT id
  FROM companies
  WHERE slug = 'acme-logistics'
),
chair_product AS (
  SELECT id, unit_price
  FROM products
  WHERE company_id = (SELECT id FROM acme_company)
    AND sku = 'SKU-CHAIR-01'
),
desk_product AS (
  SELECT id, unit_price
  FROM products
  WHERE company_id = (SELECT id FROM acme_company)
    AND sku = 'SKU-DESK-LOW'
),
so_1 AS (
  SELECT id
  FROM sales_orders
  WHERE company_id = (SELECT id FROM acme_company)
    AND order_number = 'SO-ACME-2001'
),
so_2 AS (
  SELECT id
  FROM sales_orders
  WHERE company_id = (SELECT id FROM acme_company)
    AND order_number = 'SO-ACME-2002'
)
INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price)
SELECT so_1.id, chair_product.id, 6, chair_product.unit_price
FROM so_1, chair_product
UNION ALL
SELECT so_1.id, desk_product.id, 1, desk_product.unit_price
FROM so_1, desk_product
UNION ALL
SELECT so_2.id, desk_product.id, 2, desk_product.unit_price
FROM so_2, desk_product;

DELETE FROM stock_movements sm
USING companies c
WHERE sm.company_id = c.id
  AND c.slug = 'acme-logistics'
  AND sm.note IN (
    'Seed chart movement inbound chairs',
    'Seed chart movement outbound chairs',
    'Seed chart movement inbound desks',
    'Seed chart movement outbound desks',
    'Seed chart movement adjustment chairs'
  );

WITH acme_company AS (
  SELECT id
  FROM companies
  WHERE slug = 'acme-logistics'
),
acme_admin AS (
  SELECT id
  FROM users
  WHERE company_id = (SELECT id FROM acme_company)
    AND email = 'admin@acme.local'
),
acme_location AS (
  SELECT id
  FROM locations
  WHERE company_id = (SELECT id FROM acme_company)
    AND name = 'Acme Main Warehouse'
),
chair_product AS (
  SELECT id
  FROM products
  WHERE company_id = (SELECT id FROM acme_company)
    AND sku = 'SKU-CHAIR-01'
),
desk_product AS (
  SELECT id
  FROM products
  WHERE company_id = (SELECT id FROM acme_company)
    AND sku = 'SKU-DESK-LOW'
)
INSERT INTO stock_movements (company_id, product_id, location_id, movement_type, quantity, note, moved_by, created_at)
SELECT (SELECT id FROM acme_company), (SELECT id FROM chair_product), (SELECT id FROM acme_location), 'in'::stock_movement_type, 12, 'Seed chart movement inbound chairs', (SELECT id FROM acme_admin), NOW() - INTERVAL '6 days'
UNION ALL
SELECT (SELECT id FROM acme_company), (SELECT id FROM chair_product), (SELECT id FROM acme_location), 'out'::stock_movement_type, 4, 'Seed chart movement outbound chairs', (SELECT id FROM acme_admin), NOW() - INTERVAL '5 days'
UNION ALL
SELECT (SELECT id FROM acme_company), (SELECT id FROM desk_product), (SELECT id FROM acme_location), 'in'::stock_movement_type, 6, 'Seed chart movement inbound desks', (SELECT id FROM acme_admin), NOW() - INTERVAL '4 days'
UNION ALL
SELECT (SELECT id FROM acme_company), (SELECT id FROM desk_product), (SELECT id FROM acme_location), 'out'::stock_movement_type, 2, 'Seed chart movement outbound desks', (SELECT id FROM acme_admin), NOW() - INTERVAL '3 days'
UNION ALL
SELECT (SELECT id FROM acme_company), (SELECT id FROM chair_product), (SELECT id FROM acme_location), 'adjustment'::stock_movement_type, 2, 'Seed chart movement adjustment chairs', (SELECT id FROM acme_admin), NOW() - INTERVAL '2 days';
