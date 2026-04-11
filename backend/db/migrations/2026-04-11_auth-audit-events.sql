-- Auth audit events migration (idempotent)
-- Date: 2026-04-11

BEGIN;

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

CREATE INDEX IF NOT EXISTS idx_auth_audit_events_created_at
  ON auth_audit_events(created_at);

CREATE INDEX IF NOT EXISTS idx_auth_audit_events_type_created
  ON auth_audit_events(event_type, created_at);

CREATE INDEX IF NOT EXISTS idx_auth_audit_events_principal
  ON auth_audit_events(principal_id, created_at);

COMMIT;
