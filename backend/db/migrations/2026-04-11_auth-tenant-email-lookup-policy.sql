-- Auth tenant email lookup policy migration (idempotent)
-- Date: 2026-04-11

BEGIN;

DROP POLICY IF EXISTS users_auth_email_lookup_policy ON users;

CREATE POLICY users_auth_email_lookup_policy ON users
FOR SELECT
USING (
  NULLIF(current_setting('app.auth_mode', true), '') = 'login'
  AND email = NULLIF(current_setting('app.auth_email', true), '')::CITEXT
);

COMMIT;
