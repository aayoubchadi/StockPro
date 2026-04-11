import { query } from './db.js';

export async function createAuthSession({
  principalId,
  scope,
  role,
  companyId,
  email,
  expiresAt,
}) {
  const { rows } = await query(
    `INSERT INTO auth_sessions (principal_id, scope, role, company_id, email, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, principal_id, scope, role, company_id, email, expires_at, revoked_at`,
    [principalId, scope, role, companyId || null, email, expiresAt]
  );

  return rows[0];
}

export async function createRefreshTokenRecord({
  sessionId,
  tokenHash,
  expiresAt,
  parentTokenId = null,
  ipAddress = null,
  userAgent = null,
}) {
  const { rows } = await query(
    `INSERT INTO auth_refresh_tokens (session_id, token_hash, expires_at, parent_token_id, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, session_id, token_hash, parent_token_id, replaced_by_token_id, expires_at, revoked_at`,
    [sessionId, tokenHash, expiresAt, parentTokenId, ipAddress, userAgent]
  );

  return rows[0];
}

export async function findRefreshTokenWithSession(tokenHash) {
  const { rows } = await query(
    `SELECT
       rt.id,
       rt.session_id,
       rt.token_hash,
       rt.parent_token_id,
       rt.replaced_by_token_id,
       rt.expires_at,
       rt.revoked_at,
       s.principal_id,
       s.scope,
       s.role,
       s.company_id,
       s.email::text AS email,
       s.expires_at AS session_expires_at,
       s.revoked_at AS session_revoked_at
     FROM auth_refresh_tokens rt
     JOIN auth_sessions s ON s.id = rt.session_id
     WHERE rt.token_hash = $1
     LIMIT 1`,
    [tokenHash]
  );

  return rows[0] || null;
}

export async function markRefreshTokenRotated({ tokenId, replacedByTokenId }) {
  await query(
    `UPDATE auth_refresh_tokens
     SET revoked_at = NOW(), replaced_by_token_id = $2
     WHERE id = $1`,
    [tokenId, replacedByTokenId]
  );
}

export async function revokeSessionById(sessionId) {
  await query(
    `UPDATE auth_sessions
     SET revoked_at = COALESCE(revoked_at, NOW())
     WHERE id = $1`,
    [sessionId]
  );

  await query(
    `UPDATE auth_refresh_tokens
     SET revoked_at = COALESCE(revoked_at, NOW())
     WHERE session_id = $1`,
    [sessionId]
  );
}

export async function touchSessionLastUsedAt(sessionId) {
  await query(
    `UPDATE auth_sessions
     SET last_used_at = NOW()
     WHERE id = $1`,
    [sessionId]
  );
}
