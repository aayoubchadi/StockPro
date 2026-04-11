import { query } from './db.js';

export async function logAuthEvent({
  eventType,
  principalId = null,
  scope = null,
  companyId = null,
  email = null,
  success,
  failureCode = null,
  ipAddress = null,
  userAgent = null,
  metadata = {},
}) {
  try {
    await query(
      `INSERT INTO auth_audit_events (
         event_type,
         principal_id,
         scope,
         company_id,
         email,
         success,
         failure_code,
         ip_address,
         user_agent,
         metadata
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        eventType,
        principalId,
        scope,
        companyId,
        email,
        Boolean(success),
        failureCode,
        ipAddress,
        userAgent,
        metadata,
      ]
    );
  } catch (error) {
    console.error('auth-audit-log-failed', {
      eventType,
      error: error?.message || 'unknown error',
    });
  }
}
