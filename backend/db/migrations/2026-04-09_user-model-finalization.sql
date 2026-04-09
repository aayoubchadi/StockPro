-- User model finalization migration (idempotent)
-- Date: 2026-04-09
-- Purpose:
--   1) Lock tenant user/platform admin role decisions
--   2) Enforce email/name quality checks
--   3) Enforce one ACTIVE company_admin per company

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_role') THEN
    CREATE TYPE account_role AS ENUM ('company_admin', 'employee');
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
END
$$;

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
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

    DROP INDEX IF EXISTS uq_users_one_admin_per_company;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_users_one_active_admin_per_company
      ON public.users(company_id)
      WHERE role = 'company_admin' AND is_active = TRUE;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.platform_admins') IS NOT NULL THEN
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
END
$$;

COMMIT;
