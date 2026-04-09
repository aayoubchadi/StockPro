-- StockPro database schema (multi-tenant)
-- Run with:
--   PGPASSWORD="<postgres_password>" "C:\\dev\\PostGreSQL\\bin\\psql.exe" -U postgres -h localhost -p 9100 -d stockpro_db -f backend/db/schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'company_id'
  ) THEN
    DROP TABLE IF EXISTS stock_movements CASCADE;
    DROP TABLE IF EXISTS products CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_role') THEN
    -- Current roles:
    -- - company_admin: manages only data inside their company/tenant
    -- - employee: standard company account under subscription limits
    -- Platform-wide admin role is intentionally not included in this phase.
    CREATE TYPE account_role AS ENUM ('company_admin', 'employee');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_movement_type') THEN
    CREATE TYPE stock_movement_type AS ENUM ('in', 'out', 'adjustment');
  END IF;
END
$$;

-- Master/platform admins are global accounts stored outside tenant-scoped users.
-- They can be used by the platform team to manage all companies from a separate admin flow.
CREATE TABLE IF NOT EXISTS platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_platform_admins_email_not_blank CHECK (length(btrim(email::text)) > 0),
  CONSTRAINT ck_platform_admins_full_name_not_blank CHECK (length(btrim(full_name)) > 0)
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  max_employees INTEGER NOT NULL CHECK (max_employees BETWEEN 20 AND 150),
  can_export_reports BOOLEAN NOT NULL DEFAULT FALSE,
  can_use_advanced_analytics BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(180) NOT NULL UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  subscription_plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name VARCHAR(120) NOT NULL,
  email CITEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role account_role NOT NULL DEFAULT 'employee',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_users_company_email UNIQUE (company_id, email),
  CONSTRAINT uq_users_company_id_id UNIQUE (company_id, id),
  CONSTRAINT ck_users_email_not_blank CHECK (length(btrim(email::text)) > 0),
  CONSTRAINT ck_users_full_name_not_blank CHECK (length(btrim(full_name)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_one_active_admin_per_company
  ON users(company_id)
  WHERE role = 'company_admin' AND is_active = TRUE;

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sku VARCHAR(60) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  quantity_in_stock INTEGER NOT NULL DEFAULT 0 CHECK (quantity_in_stock >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_products_company_sku UNIQUE (company_id, sku),
  CONSTRAINT uq_products_company_id_id UNIQUE (company_id, id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  movement_type stock_movement_type NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  note TEXT,
  moved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_stock_movement_product_scope
    FOREIGN KEY (company_id, product_id)
    REFERENCES products(company_id, id)
    ON DELETE CASCADE,
  CONSTRAINT fk_stock_movement_user_scope
    FOREIGN KEY (company_id, moved_by)
    REFERENCES users(company_id, id)
    ON DELETE SET NULL
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER trg_subscription_plans_updated_at
BEFORE UPDATE ON subscription_plans
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_companies_updated_at ON companies;
CREATE TRIGGER trg_companies_updated_at
BEFORE UPDATE ON companies
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_platform_admins_updated_at ON platform_admins;
CREATE TRIGGER trg_platform_admins_updated_at
BEFORE UPDATE ON platform_admins
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION enforce_employee_limit()
RETURNS TRIGGER AS $$
DECLARE
  plan_limit INTEGER;
  current_count INTEGER;
BEGIN
  IF NEW.role = 'employee' THEN
    SELECT sp.max_employees
      INTO plan_limit
      FROM companies c
      JOIN subscription_plans sp ON sp.id = c.subscription_plan_id
     WHERE c.id = NEW.company_id;

    IF plan_limit IS NULL THEN
      RAISE EXCEPTION 'Company % does not have a valid subscription plan.', NEW.company_id;
    END IF;

    SELECT COUNT(*)
      INTO current_count
      FROM users u
     WHERE u.company_id = NEW.company_id
       AND u.role = 'employee'
       AND (TG_OP = 'INSERT' OR u.id <> NEW.id);

    IF current_count + 1 > plan_limit THEN
      RAISE EXCEPTION 'Employee limit exceeded for company %. Plan allows % employees.', NEW.company_id, plan_limit;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_enforce_employee_limit ON users;
CREATE TRIGGER trg_users_enforce_employee_limit
BEFORE INSERT OR UPDATE OF role, company_id ON users
FOR EACH ROW EXECUTE FUNCTION enforce_employee_limit();

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role);
CREATE INDEX IF NOT EXISTS idx_users_company_active ON users(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_company_name ON products(company_id, name);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_product ON stock_movements(company_id, product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_platform_admins_email ON platform_admins(email);

-- Row level security ensures each session can only access its company data.
-- The backend must execute: SET app.current_company_id = '<company_uuid>' per request/session.
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS companies_isolation_policy ON companies;
CREATE POLICY companies_isolation_policy ON companies
USING (id = NULLIF(current_setting('app.current_company_id', TRUE), '')::UUID)
WITH CHECK (id = NULLIF(current_setting('app.current_company_id', TRUE), '')::UUID);

DROP POLICY IF EXISTS users_isolation_policy ON users;
CREATE POLICY users_isolation_policy ON users
USING (company_id = NULLIF(current_setting('app.current_company_id', TRUE), '')::UUID)
WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', TRUE), '')::UUID);

DROP POLICY IF EXISTS products_isolation_policy ON products;
CREATE POLICY products_isolation_policy ON products
USING (company_id = NULLIF(current_setting('app.current_company_id', TRUE), '')::UUID)
WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', TRUE), '')::UUID);

DROP POLICY IF EXISTS stock_movements_isolation_policy ON stock_movements;
CREATE POLICY stock_movements_isolation_policy ON stock_movements
USING (company_id = NULLIF(current_setting('app.current_company_id', TRUE), '')::UUID)
WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', TRUE), '')::UUID);
