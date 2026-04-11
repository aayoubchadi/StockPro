import { query } from './db.js';

export async function isAccessTokenRevoked(jti) {
  const { rows } = await query(
    `SELECT 1
     FROM auth_access_token_blacklist
     WHERE jti = $1 AND expires_at > NOW()
     LIMIT 1`,
    [jti]
  );

  return rows.length > 0;
}

export async function blacklistAccessToken({ jti, subjectId, expiresAt, reason }) {
  await query(
    `INSERT INTO auth_access_token_blacklist (jti, subject_id, expires_at, reason)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (jti) DO NOTHING`,
    [jti, subjectId, expiresAt, reason]
  );
}

