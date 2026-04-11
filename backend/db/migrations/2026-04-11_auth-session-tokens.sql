-- Auth session and token storage migration (idempotent)
-- Date: 2026-04-11

BEGIN;

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

CREATE INDEX IF NOT EXISTS idx_auth_sessions_principal
  ON auth_sessions(principal_id, scope);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
  ON auth_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_session
  ON auth_refresh_tokens(session_id);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_expires_at
  ON auth_refresh_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_auth_blacklist_expires_at
  ON auth_access_token_blacklist(expires_at);

COMMIT;
