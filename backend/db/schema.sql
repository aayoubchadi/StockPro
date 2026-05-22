-- StockPro database schema (multi-tenant)
-- Run with:
--   PGPASSWORD="<postgres_password>" psql -U postgres -h localhost -p 9100 -d stockpro_db -f backend/db/schema.sql

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
    RAISE NOTICE 'Existing users table is missing company_id. Refusing to drop account data automatically; apply an explicit migration instead.';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_role') THEN
    -- Current roles:
    -- - company_admin: manages only data inside their company/tenant
    -- - employee: standard company account under subscription limits
    -- - special_employee: elevated employee with receipt creation access
    -- Platform-wide admin role is intentionally not included in this phase.
    CREATE TYPE account_role AS ENUM ('company_admin', 'employee', 'special_employee');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_movement_type') THEN
    CREATE TYPE stock_movement_type AS ENUM ('in', 'out', 'adjustment');
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_role')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'account_role' AND e.enumlabel = 'company_admin'
     ) THEN
    ALTER TYPE account_role ADD VALUE 'company_admin';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_role')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'account_role' AND e.enumlabel = 'employee'
     ) THEN
    ALTER TYPE account_role ADD VALUE 'employee';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_role')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'account_role' AND e.enumlabel = 'special_employee'
     ) THEN
    ALTER TYPE account_role ADD VALUE 'special_employee';
  END IF;
END
$$;

-- Master/platform admins are global accounts stored outside tenant-scoped users.
-- They can be used by the platform team to manage all companies from a separate admin flow.
CREATE TABLE IF NOT EXISTS platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  username CITEXT NOT NULL UNIQUE,
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
  monthly_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (monthly_price_cents >= 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'MAD',
  paypal_plan_reference VARCHAR(120),
  max_employees INTEGER NOT NULL CHECK (max_employees BETWEEN 20 AND 150),
  max_admins INTEGER NOT NULL DEFAULT 2 CHECK (max_admins BETWEEN 1 AND 10),
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
  owner_id UUID REFERENCES users(id),
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  demo_expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One paid subscription record per company can be active at a time.
-- Provider payload is stored for auditability and dispute handling.
CREATE TABLE IF NOT EXISTS company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subscription_plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  provider VARCHAR(20) NOT NULL DEFAULT 'paypal',
  provider_order_id VARCHAR(120) NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'EUR',
  payer_email CITEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_company_subscriptions_provider CHECK (provider IN ('paypal')),
  CONSTRAINT ck_company_subscriptions_status CHECK (
    status IN ('pending', 'active', 'canceled', 'expired')
  )
);

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS monthly_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS currency_code CHAR(3),
  ADD COLUMN IF NOT EXISTS paypal_plan_reference VARCHAR(120);

UPDATE subscription_plans
SET
  monthly_price_cents = COALESCE(monthly_price_cents, 0),
  currency_code = COALESCE(NULLIF(UPPER(currency_code), ''), 'EUR');

ALTER TABLE subscription_plans
  ALTER COLUMN monthly_price_cents SET DEFAULT 0,
  ALTER COLUMN monthly_price_cents SET NOT NULL,
  ALTER COLUMN currency_code SET DEFAULT 'EUR',
  ALTER COLUMN currency_code SET NOT NULL;

ALTER TABLE company_subscriptions
  ADD COLUMN IF NOT EXISTS raw_payload JSONB;

UPDATE company_subscriptions
SET
  raw_payload = COALESCE(raw_payload, '{}'::jsonb),
  currency_code = COALESCE(NULLIF(UPPER(currency_code), ''), 'EUR');

ALTER TABLE company_subscriptions
  ALTER COLUMN raw_payload SET DEFAULT '{}'::jsonb,
  ALTER COLUMN raw_payload SET NOT NULL,
  ALTER COLUMN currency_code SET DEFAULT 'EUR',
  ALTER COLUMN currency_code SET NOT NULL;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name VARCHAR(120) NOT NULL,
  email CITEXT NOT NULL,
  username CITEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role account_role NOT NULL DEFAULT 'employee',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_users_company_email UNIQUE (company_id, email),
  CONSTRAINT uq_users_company_username UNIQUE (company_id, username),
  CONSTRAINT uq_users_company_id_id UNIQUE (company_id, id),
  CONSTRAINT ck_users_email_not_blank CHECK (length(btrim(email::text)) > 0),
  CONSTRAINT ck_users_username_not_blank CHECK (length(btrim(username::text)) > 0),
  CONSTRAINT ck_users_full_name_not_blank CHECK (length(btrim(full_name)) > 0),
  CONSTRAINT ck_users_permissions_is_object CHECK (jsonb_typeof(permissions) = 'object')
);

CREATE TABLE IF NOT EXISTS company_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(120) NOT NULL,
  email CITEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT ck_company_join_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_company_join_pending_email
  ON company_join_requests(company_id, email)
  WHERE status = 'pending';

DROP INDEX IF EXISTS uq_users_one_active_admin_per_company;

-- Auth session and token storage.
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_id UUID NOT NULL,
  scope VARCHAR(20) NOT NULL,
  role VARCHAR(40) NOT NULL,
  company_id UUID,
  email CITEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  CONSTRAINT ck_auth_sessions_scope
    CHECK (scope IN ('tenant', 'platform')),
  CONSTRAINT ck_auth_sessions_company_scope
    CHECK (
      (scope = 'tenant' AND company_id IS NOT NULL)
      OR (scope = 'platform' AND company_id IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES auth_sessions(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  parent_token_id UUID REFERENCES auth_refresh_tokens(id) ON DELETE SET NULL,
  replaced_by_token_id UUID REFERENCES auth_refresh_tokens(id) ON DELETE SET NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS auth_access_token_blacklist (
  jti UUID PRIMARY KEY,
  subject_id UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT NOT NULL DEFAULT 'manual'
);

CREATE TABLE IF NOT EXISTS auth_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(60) NOT NULL,
  principal_id UUID,
  scope VARCHAR(20),
  company_id UUID,
  email CITEXT,
  success BOOLEAN NOT NULL,
  failure_code VARCHAR(80),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS demo_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(120) NOT NULL UNIQUE,
  authorization_id VARCHAR(120),
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  admin_email CITEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_demo_verifications_status CHECK (
    status IN ('pending', 'authorized', 'voided', 'verified', 'failed')
  )
);

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN,
  ADD COLUMN IF NOT EXISTS demo_expires_at TIMESTAMPTZ;

UPDATE companies
SET is_demo = COALESCE(is_demo, FALSE);

ALTER TABLE companies
  ALTER COLUMN is_demo SET DEFAULT FALSE,
  ALTER COLUMN is_demo SET NOT NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS permissions JSONB;

UPDATE users
SET permissions = '{}'::jsonb
WHERE permissions IS NULL;

ALTER TABLE users
  ALTER COLUMN permissions SET DEFAULT '{}'::jsonb,
  ALTER COLUMN permissions SET NOT NULL;

-- Existing database compatibility: ensure constraints and legacy index replacements.
DO $$
DECLARE
  legacy_constraint_name TEXT;
  legacy_index_name TEXT;
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    -- Normalize legacy schemas that used TEXT emails and global email uniqueness.
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'email'
        AND udt_name <> 'citext'
    ) THEN
      ALTER TABLE public.users
      ALTER COLUMN email TYPE CITEXT
      USING email::citext;
    END IF;

    -- Normalize legacy role labels from previous auth models.
    UPDATE public.users
    SET role = 'company_admin'
    WHERE role::text = 'admin';

    UPDATE public.users
    SET role = 'employee'
    WHERE role::text IN ('client', 'user');

    FOR legacy_constraint_name IN
      SELECT con.conname
      FROM pg_constraint con
      WHERE con.conrelid = 'public.users'::regclass
        AND con.contype = 'u'
        AND pg_get_constraintdef(con.oid) ILIKE '%(email)%'
        AND pg_get_constraintdef(con.oid) NOT ILIKE '%(company_id, email)%'
    LOOP
      EXECUTE format(
        'ALTER TABLE public.users DROP CONSTRAINT IF EXISTS %I',
        legacy_constraint_name
      );
    END LOOP;

    FOR legacy_index_name IN
      SELECT idx.indexname
      FROM pg_indexes idx
      WHERE idx.schemaname = 'public'
        AND idx.tablename = 'users'
        AND idx.indexdef ILIKE 'CREATE UNIQUE INDEX%'
        AND (
          idx.indexdef ILIKE '%(email)%'
          OR idx.indexdef ILIKE '%(lower((email)::text))%'
        )
        AND idx.indexdef NOT ILIKE '%(company_id, email)%'
    LOOP
      EXECUTE format('DROP INDEX IF EXISTS public.%I', legacy_index_name);
    END LOOP;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'uq_users_company_email'
        AND conrelid = 'public.users'::regclass
    ) THEN
      ALTER TABLE public.users
      ADD CONSTRAINT uq_users_company_email UNIQUE (company_id, email);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'ck_users_email_not_blank'
        AND conrelid = 'public.users'::regclass
    ) THEN
      ALTER TABLE public.users
      ADD CONSTRAINT ck_users_email_not_blank
      CHECK (length(btrim(email::text)) > 0) NOT VALID;
      ALTER TABLE public.users VALIDATE CONSTRAINT ck_users_email_not_blank;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'ck_users_full_name_not_blank'
        AND conrelid = 'public.users'::regclass
    ) THEN
      ALTER TABLE public.users
      ADD CONSTRAINT ck_users_full_name_not_blank
      CHECK (length(btrim(full_name)) > 0) NOT VALID;
      ALTER TABLE public.users VALIDATE CONSTRAINT ck_users_full_name_not_blank;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'ck_users_permissions_is_object'
        AND conrelid = 'public.users'::regclass
    ) THEN
      ALTER TABLE public.users
      ADD CONSTRAINT ck_users_permissions_is_object
      CHECK (jsonb_typeof(permissions) = 'object') NOT VALID;
      ALTER TABLE public.users VALIDATE CONSTRAINT ck_users_permissions_is_object;
    END IF;

    DROP INDEX IF EXISTS uq_users_one_admin_per_company;
    DROP INDEX IF EXISTS uq_users_one_active_admin_per_company;
  END IF;

  IF to_regclass('public.platform_admins') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'platform_admins'
        AND column_name = 'email'
        AND udt_name <> 'citext'
    ) THEN
      ALTER TABLE public.platform_admins
      ALTER COLUMN email TYPE CITEXT
      USING email::citext;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'ck_platform_admins_email_not_blank'
        AND conrelid = 'public.platform_admins'::regclass
    ) THEN
      ALTER TABLE public.platform_admins
      ADD CONSTRAINT ck_platform_admins_email_not_blank
      CHECK (length(btrim(email::text)) > 0) NOT VALID;
      ALTER TABLE public.platform_admins VALIDATE CONSTRAINT ck_platform_admins_email_not_blank;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'ck_platform_admins_full_name_not_blank'
        AND conrelid = 'public.platform_admins'::regclass
    ) THEN
      ALTER TABLE public.platform_admins
      ADD CONSTRAINT ck_platform_admins_full_name_not_blank
      CHECK (length(btrim(full_name)) > 0) NOT VALID;
      ALTER TABLE public.platform_admins VALIDATE CONSTRAINT ck_platform_admins_full_name_not_blank;
    END IF;
  END IF;

  IF to_regclass('public.auth_sessions') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'auth_sessions'
        AND column_name = 'email'
        AND udt_name <> 'citext'
    ) THEN
      ALTER TABLE public.auth_sessions
      ALTER COLUMN email TYPE CITEXT
      USING email::citext;
    END IF;
  END IF;

  IF to_regclass('public.auth_audit_events') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'auth_audit_events'
        AND column_name = 'email'
        AND udt_name <> 'citext'
    ) THEN
      ALTER TABLE public.auth_audit_events
      ALTER COLUMN email TYPE CITEXT
      USING email::citext;
    END IF;
  END IF;

  IF to_regclass('public.company_subscriptions') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'company_subscriptions'
        AND column_name = 'payer_email'
        AND udt_name <> 'citext'
    ) THEN
      ALTER TABLE public.company_subscriptions
      ALTER COLUMN payer_email TYPE CITEXT
      USING payer_email::citext;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'company_subscriptions'
        AND column_name = 'currency_code'
    ) THEN
      UPDATE public.company_subscriptions
      SET currency_code = COALESCE(NULLIF(UPPER(currency_code), ''), 'EUR');
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'subscription_plans'
        AND column_name = 'currency_code'
    ) THEN
      UPDATE public.subscription_plans
      SET currency_code = COALESCE(NULLIF(UPPER(currency_code), ''), 'EUR');
    END IF;
  END IF;
END
$$;

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

DROP TRIGGER IF EXISTS trg_company_subscriptions_updated_at ON company_subscriptions;
CREATE TRIGGER trg_company_subscriptions_updated_at
BEFORE UPDATE ON company_subscriptions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_platform_admins_updated_at ON platform_admins;
CREATE TRIGGER trg_platform_admins_updated_at
BEFORE UPDATE ON platform_admins
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_demo_verifications_updated_at ON demo_verifications;
CREATE TRIGGER trg_demo_verifications_updated_at
BEFORE UPDATE ON demo_verifications
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
  IF NEW.role IN ('employee', 'special_employee') AND NEW.is_active = TRUE THEN
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
      AND u.role IN ('employee', 'special_employee')
       AND u.is_active = TRUE
       AND (TG_OP = 'INSERT' OR u.id <> NEW.id);

    IF current_count + 1 > plan_limit THEN
      RAISE EXCEPTION 'Employee limit exceeded for company %. Plan allows % employees.', NEW.company_id, plan_limit;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_admin_limit()
RETURNS TRIGGER AS $$
DECLARE
  plan_limit INTEGER;
  current_count INTEGER;
BEGIN
  IF NEW.role = 'company_admin' AND NEW.is_active = TRUE THEN
    SELECT sp.max_admins
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
      AND u.role = 'company_admin'
       AND u.is_active = TRUE
       AND (TG_OP = 'INSERT' OR u.id <> NEW.id);

    IF current_count + 1 > plan_limit THEN
      RAISE EXCEPTION 'Admin limit exceeded for company %. Plan allows % admins.', NEW.company_id, plan_limit;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_enforce_employee_limit ON users;
CREATE TRIGGER trg_users_enforce_employee_limit
BEFORE INSERT OR UPDATE OF role, company_id, is_active ON users
FOR EACH ROW EXECUTE FUNCTION enforce_employee_limit();

DROP TRIGGER IF EXISTS trg_users_enforce_admin_limit ON users;
CREATE TRIGGER trg_users_enforce_admin_limit
BEFORE INSERT OR UPDATE OF role, company_id, is_active ON users
FOR EACH ROW EXECUTE FUNCTION enforce_admin_limit();

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role);
CREATE INDEX IF NOT EXISTS idx_users_company_active ON users(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_companies_subscription_plan_id ON companies(subscription_plan_id);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_company_status ON company_subscriptions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_plan_status ON company_subscriptions(subscription_plan_id, status);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_created_at ON company_subscriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_products_company_name ON products(company_id, name);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_product ON stock_movements(company_id, product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_platform_admins_email ON platform_admins(email);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_principal ON auth_sessions(principal_id, scope);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_session ON auth_refresh_tokens(session_id);
CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_expires_at ON auth_refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_blacklist_expires_at ON auth_access_token_blacklist(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_audit_events_created_at ON auth_audit_events(created_at);
CREATE INDEX IF NOT EXISTS idx_auth_audit_events_type_created ON auth_audit_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_auth_audit_events_principal ON auth_audit_events(principal_id, created_at);
CREATE INDEX IF NOT EXISTS idx_demo_verifications_status ON demo_verifications(status, created_at);
CREATE INDEX IF NOT EXISTS idx_demo_verifications_company ON demo_verifications(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_company_subscriptions_one_active_per_company
  ON company_subscriptions(company_id)
  WHERE status = 'active';

-- Row level security ensures each session can only access its company data.
-- The backend must execute: SET app.current_company_id = '<company_uuid>' per request/session.
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS companies_isolation_policy ON companies;
CREATE POLICY companies_isolation_policy ON companies
USING (
  id = NULLIF(current_setting('app.current_company_id', TRUE), '')::UUID
  OR NULLIF(current_setting('app.current_scope', TRUE), '') = 'platform'
)
WITH CHECK (
  id = NULLIF(current_setting('app.current_company_id', TRUE), '')::UUID
  OR NULLIF(current_setting('app.current_scope', TRUE), '') = 'platform'
);

DROP POLICY IF EXISTS users_isolation_policy ON users;
CREATE POLICY users_isolation_policy ON users
USING (
  company_id = NULLIF(current_setting('app.current_company_id', TRUE), '')::UUID
  OR NULLIF(current_setting('app.current_scope', TRUE), '') = 'platform'
)
WITH CHECK (
  company_id = NULLIF(current_setting('app.current_company_id', TRUE), '')::UUID
  OR NULLIF(current_setting('app.current_scope', TRUE), '') = 'platform'
);

DROP POLICY IF EXISTS users_auth_email_lookup_policy ON users;
CREATE POLICY users_auth_email_lookup_policy ON users
FOR SELECT
USING (
  NULLIF(current_setting('app.auth_mode', true), '') = 'login'
  AND username = NULLIF(current_setting('app.auth_username', true), '')::CITEXT
);

DROP POLICY IF EXISTS company_subscriptions_isolation_policy ON company_subscriptions;
CREATE POLICY company_subscriptions_isolation_policy ON company_subscriptions
USING (
  company_id = NULLIF(current_setting('app.current_company_id', TRUE), '')::UUID
  OR NULLIF(current_setting('app.current_scope', TRUE), '') = 'platform'
)
WITH CHECK (
  company_id = NULLIF(current_setting('app.current_company_id', TRUE), '')::UUID
  OR NULLIF(current_setting('app.current_scope', TRUE), '') = 'platform'
);

DROP POLICY IF EXISTS products_isolation_policy ON products;
CREATE POLICY products_isolation_policy ON products
USING (
  company_id = NULLIF(current_setting('app.current_company_id', TRUE), '')::UUID
  OR NULLIF(current_setting('app.current_scope', TRUE), '') = 'platform'
)
WITH CHECK (
  company_id = NULLIF(current_setting('app.current_company_id', TRUE), '')::UUID
  OR NULLIF(current_setting('app.current_scope', TRUE), '') = 'platform'
);

DROP POLICY IF EXISTS stock_movements_isolation_policy ON stock_movements;
CREATE POLICY stock_movements_isolation_policy ON stock_movements
USING (
  company_id = NULLIF(current_setting('app.current_company_id', TRUE), '')::UUID
  OR NULLIF(current_setting('app.current_scope', TRUE), '') = 'platform'
)
WITH CHECK (
  company_id = NULLIF(current_setting('app.current_company_id', TRUE), '')::UUID
  OR NULLIF(current_setting('app.current_scope', TRUE), '') = 'platform'
);

-- Inventory Extensions
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_categories_company_name UNIQUE (company_id, name)
);

ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);

ALTER TABLE products DROP CONSTRAINT IF EXISTS uq_products_company_barcode;
ALTER TABLE products ADD CONSTRAINT uq_products_company_barcode UNIQUE (company_id, barcode);

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'warehouse',
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_locations_company_name UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS inventory_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  last_counted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_inventory_levels_location_product UNIQUE (location_id, product_id)
);

DROP TRIGGER IF EXISTS trg_categories_updated_at ON product_categories;
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON product_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_locations_updated_at ON locations;
CREATE TRIGGER trg_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_inventory_levels_updated_at ON inventory_levels;
CREATE TRIGGER trg_inventory_levels_updated_at BEFORE UPDATE ON inventory_levels FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS stock_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  scheduled_date TIMESTAMPTZ,
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_stock_audits_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'canceled'))
);

DROP TRIGGER IF EXISTS trg_stock_audits_updated_at ON stock_audits;
CREATE TRIGGER trg_stock_audits_updated_at BEFORE UPDATE ON stock_audits FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- SUPPLY CHAIN & PURCHASING EXTENSIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(180) NOT NULL,
  email CITEXT,
  phone VARCHAR(50),
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_suppliers_company_name UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  po_number VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft', 
  order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_delivery_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_po_company_number UNIQUE (company_id, po_number),
  CONSTRAINT ck_po_status CHECK (status IN ('draft', 'pending', 'shipped', 'received', 'canceled'))
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  received_quantity INTEGER NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON suppliers;
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_purchase_orders_updated_at ON purchase_orders;
CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_purchase_order_items_updated_at ON purchase_order_items;
CREATE TRIGGER trg_purchase_order_items_updated_at BEFORE UPDATE ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ==========================================
-- SALES & ORDER FULFILLMENT EXTENSIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(180) NOT NULL,
  email CITEXT,
  phone VARCHAR(50),
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_customers_company_name UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  order_number VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_so_company_number UNIQUE (company_id, order_number),
  CONSTRAINT ck_so_status CHECK (status IN ('draft', 'pending', 'processing', 'shipped', 'delivered', 'canceled'))
);

CREATE TABLE IF NOT EXISTS sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  shipped_quantity INTEGER NOT NULL DEFAULT 0 CHECK (shipped_quantity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_sales_orders_updated_at ON sales_orders;
CREATE TRIGGER trg_sales_orders_updated_at BEFORE UPDATE ON sales_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_sales_order_items_updated_at ON sales_order_items;
CREATE TRIGGER trg_sales_order_items_updated_at BEFORE UPDATE ON sales_order_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS purchase_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    buyer_name VARCHAR(180) NOT NULL,
    buyer_company VARCHAR(180),
    buyer_email CITEXT,
    buyer_phone VARCHAR(50),
    reference_number VARCHAR(100),
    receipt_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES purchase_receipts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    line_total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (line_total >= 0)
);
