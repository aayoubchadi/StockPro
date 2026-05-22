import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { Router } from 'express';
import { query, withDbClient } from '../lib/db.js';
import { signAccessToken } from '../lib/authJwt.js';
import { HttpError } from '../lib/httpError.js';
import {
  loginRateLimiter,
  refreshRateLimiter,
  registerRateLimiter,
} from '../middleware/authRateLimit.js';
import { env } from '../config/env.js';
import { validatePasswordPolicy } from '../lib/passwordPolicy.js';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  createAuthSession,
  createRefreshTokenRecord,
  findRefreshTokenWithSession,
  markRefreshTokenRotated,
  revokeSessionById,
  touchSessionLastUsedAt,
} from '../lib/authSessionStore.js';
import { generateRefreshToken, hashRefreshToken } from '../lib/refreshToken.js';
import { blacklistAccessToken } from '../lib/accessTokenBlacklist.js';
import { logAuthEvent } from '../lib/authAudit.js';
import {
  extractEnabledPermissions,
  resolveEffectivePermissions,
} from '../lib/permissions.js';
import { loadTenantContext } from '../lib/tenantContext.js';
import { buildCompanyDemoSelect } from '../lib/companyCompatibility.js';
import { buildUserPermissionsSelect } from '../lib/userCompatibility.js';
import { sendPasswordResetCodeEmail } from '../lib/mailer.js';

const router = Router();

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeValue(value) {
  return String(value || '').trim();
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeRole(value) {
  return String(value || 'employee').trim();
}

function expirationDateFromNow(seconds) {
  return new Date(Date.now() + seconds * 1000);
}

function tokenExpToDate(exp) {
  const value = Number(exp);

  if (!Number.isInteger(value) || value <= 0) {
    return null;
  }

  return new Date(value * 1000);
}

function isDemoExpired(demoExpiresAt) {
  if (!demoExpiresAt) {
    return false;
  }

  return new Date(demoExpiresAt).getTime() <= Date.now();
}

async function findCompanyByName(companyName) {
  const normalizedName = normalizeValue(companyName).toLowerCase();

  if (!normalizedName) {
    return null;
  }

  const { rows } = await query(
    `SELECT id, name, slug
     FROM companies
     WHERE is_active = TRUE
       AND (LOWER(name) = $1 OR LOWER(slug) = $1)
     LIMIT 1`,
    [normalizedName]
  );

  return rows[0] || null;
}

async function findCompanyById(companyId) {
  const normalizedId = normalizeValue(companyId);

  if (!normalizedId) {
    return null;
  }

  const { rows } = await query(
    `SELECT id, name, slug
     FROM companies
     WHERE is_active = TRUE
       AND id = $1
     LIMIT 1`,
    [normalizedId]
  );

  return rows[0] || null;
}

async function findPendingJoinRequest({ companyId, userId, email }) {
  const { rows } = await query(
    `SELECT id
     FROM company_join_requests
     WHERE company_id = $1
       AND status = 'pending'
       AND (user_id = $2 OR email = $3)
     LIMIT 1`,
    [companyId, userId, email]
  );

  return rows[0] || null;
}

function buildTenantUserPayload(user) {
  const effectivePermissions = resolveEffectivePermissions(
    user.role,
    user.permissions || {}
  );

  return {
    id: user.id,
    companyId: user.company_id,
    companySlug: user.company_slug,
    fullName: user.full_name,
    email: user.email,
    isActive: Boolean(user.is_active),
    role: user.role,
    scope: 'tenant',
    permissions: user.permissions || {},
    effectivePermissions,
    effectivePermissionList: extractEnabledPermissions(effectivePermissions),
    company: {
      id: user.company_id,
      slug: user.company_slug,
      name: user.company_name,
      isDemo: Boolean(user.company_is_demo),
      demoExpiresAt: user.company_demo_expires_at,
    },
    plan: {
      code: user.plan_code,
      name: user.plan_name,
      maxEmployees: Number(user.plan_max_employees || 0),
      canExportReports: Boolean(user.plan_can_export_reports),
      canUseAdvancedAnalytics: Boolean(user.plan_can_use_advanced_analytics),
      currencyCode: String(user.plan_currency_code || 'MAD').toUpperCase(),
    },
  };
}

async function issueSessionTokens({
  principalId,
  scope,
  role,
  companyId,
  email,
  ipAddress,
  userAgent,
}) {
  const sessionExpiresAt = expirationDateFromNow(env.jwtSessionMaxLifetimeSeconds);
  const refreshExpiresAt = expirationDateFromNow(env.jwtRefreshTtlSeconds);

  const session = await createAuthSession({
    principalId,
    scope,
    role,
    companyId,
    email,
    expiresAt: sessionExpiresAt,
  });

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);

  await createRefreshTokenRecord({
    sessionId: session.id,
    tokenHash: refreshTokenHash,
    expiresAt: refreshExpiresAt,
    ipAddress,
    userAgent,
  });

  const accessToken = signAccessToken({
    sub: principalId,
    role,
    scope,
    companyId,
    email,
  });

  return {
    accessToken,
    refreshToken,
  };
}

async function runWithCompanyScope(companyId, operation) {
  return withDbClient(async (client) => {
    try {
      await client.query('BEGIN');
      await client.query(
        "SELECT set_config('app.current_company_id', $1, true)",
        [companyId]
      );

      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

async function findTenantUsersByUsername(username) {
  return withDbClient(async (client) => {
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.auth_mode', 'login', true)");
      await client.query("SELECT set_config('app.auth_username', $1, true)", [username]);

      const result = await client.query(
        `SELECT id, company_id, full_name, email::text AS email, username::text AS username, password_hash, role, is_active
         FROM users
         WHERE username = $1
         ORDER BY created_at ASC`,
        [username]
      );

      await client.query('COMMIT');
      return result.rows;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

async function resolveTenantCompanyIdForRegister(requestedCompanyId) {
  const normalizedCompanyId = normalizeValue(requestedCompanyId);

  if (normalizedCompanyId) {
    if (!isUuid(normalizedCompanyId)) {
      throw new HttpError(
        400,
        'AUTH_VALIDATION_ERROR',
        'companyId must be a valid UUID'
      );
    }

    return normalizedCompanyId;
  }

  if (env.defaultTenantCompanyId) {
    if (!isUuid(env.defaultTenantCompanyId)) {
      throw new HttpError(
        500,
        'INTERNAL_SERVER_ERROR',
        'DEFAULT_TENANT_COMPANY_ID must be a valid UUID'
      );
    }

    return env.defaultTenantCompanyId;
  }

  if (env.defaultTenantCompanySlug) {
    const { rows: slugRows } = await query(
      `SELECT id
       FROM companies
       WHERE slug = $1
         AND is_active = TRUE
       LIMIT 1`,
      [env.defaultTenantCompanySlug]
    );

    if (slugRows.length === 1) {
      return slugRows[0].id;
    }

    throw new HttpError(
      400,
      'AUTH_VALIDATION_ERROR',
      'Registration company could not be resolved from DEFAULT_TENANT_COMPANY_SLUG'
    );
  }

  const { rows } = await query(
    `SELECT id
     FROM companies
     WHERE is_active = TRUE
     ORDER BY created_at ASC
     LIMIT 2`
  );

  if (rows.length === 1) {
    return rows[0].id;
  }

  if (rows.length === 0) {
    throw new HttpError(
      400,
      'AUTH_VALIDATION_ERROR',
      'No active company available for registration'
    );
  }

  throw new HttpError(
    400,
    'AUTH_VALIDATION_ERROR',
    'Multiple companies exist. Configure DEFAULT_TENANT_COMPANY_ID or DEFAULT_TENANT_COMPANY_SLUG on the server.'
  );
}

async function resolveCompanyForRegister({ companyName, companyId }) {
  if (companyName) {
    const company = await findCompanyByName(companyName);

    if (!company) {
      throw new HttpError(
        404,
        'AUTH_COMPANY_NOT_FOUND',
        'Company not found'
      );
    }

    return company;
  }

  const resolvedCompanyId = await resolveTenantCompanyIdForRegister(companyId);
  const company = await findCompanyById(resolvedCompanyId);

  if (!company) {
    throw new HttpError(
      400,
      'AUTH_VALIDATION_ERROR',
      'Invalid companyId: company does not exist'
    );
  }

  return company;
}

async function verifyGoogleIdToken(idToken) {
  const token = normalizeValue(idToken);

  if (!token) {
    throw new HttpError(
      400,
      'AUTH_VALIDATION_ERROR',
      'idToken is required'
    );
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`
  );
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload) {
    throw new HttpError(
      401,
      'AUTH_GOOGLE_TOKEN_INVALID',
      'Invalid Google identity token'
    );
  }

  const issuer = normalizeValue(payload.iss);
  const audience = normalizeValue(payload.aud);
  const email = normalizeEmail(payload.email);

  if (
    issuer !== 'accounts.google.com' &&
    issuer !== 'https://accounts.google.com'
  ) {
    throw new HttpError(
      401,
      'AUTH_GOOGLE_TOKEN_INVALID',
      'Invalid Google token issuer'
    );
  }

  if (env.googleClientId && audience !== env.googleClientId) {
    throw new HttpError(
      401,
      'AUTH_GOOGLE_TOKEN_INVALID',
      'Google token audience mismatch'
    );
  }

  if (String(payload.email_verified) !== 'true' || !email) {
    throw new HttpError(
      401,
      'AUTH_GOOGLE_EMAIL_UNVERIFIED',
      'Google account email must be verified'
    );
  }

  return {
    email,
    subject: normalizeValue(payload.sub),
    name: normalizeValue(payload.name) || null,
  };
}

async function findTenantUserByEmailInCompany(companyId, email) {
  const { rows } = await runWithCompanyScope(companyId, (client) =>
    (async () => {
      const companyDemoSelect = await buildCompanyDemoSelect('c', 'company');
      const userPermissionsSelect = await buildUserPermissionsSelect('u', 'permissions');

      return client.query(
        `SELECT
         u.id,
         u.company_id,
         c.slug AS company_slug,
         c.name AS company_name,
         ${companyDemoSelect},
         u.full_name,
         u.email::text AS email,
         u.role,
         ${userPermissionsSelect},
         u.is_active
       FROM users u
       JOIN companies c ON c.id = u.company_id
       WHERE u.email = $1
         AND u.company_id = $2
       LIMIT 1`,
        [email, companyId]
      );
    })()
  );

  return rows[0] || null;
}

router.post('/register', registerRateLimiter, async (request, response, next) => {
  let resolvedCompanyId = null;
  let resolvedCompany = null;

  try {
    const companyName = normalizeValue(request.body.companyName);
    const companyId = normalizeValue(request.body.companyId);
    const fullName = normalizeValue(request.body.fullName);
    const email = normalizeEmail(request.body.email);
    const username = request.body.username ? String(request.body.username).trim() : '';
    const password = normalizeValue(request.body.password);
    const role = normalizeRole(request.body.role);

    if (!fullName || !email || !password || !username) {
      throw new HttpError(
        400,
        'AUTH_VALIDATION_ERROR',
        'fullName, email, username, and password are required'
      );
    }

    resolvedCompany = await resolveCompanyForRegister({
      companyName,
      companyId,
    });
    resolvedCompanyId = resolvedCompany.id;

    if (fullName.length < 2 || fullName.length > 120) {
      throw new HttpError(
        400,
        'AUTH_VALIDATION_ERROR',
        'fullName must be between 2 and 120 characters'
      );
    }

    if (role !== 'employee') {
      throw new HttpError(
        400,
        'AUTH_VALIDATION_ERROR',
        'role must be employee. Company admin accounts must be created from paid subscription checkout.'
      );
    }

    const passwordValidation = validatePasswordPolicy(password, email);

    if (!passwordValidation.isValid) {
      throw new HttpError(
        400,
        'AUTH_VALIDATION_ERROR',
        'Password does not meet security policy',
        passwordValidation.errors
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    try {
      const { user, requestId, autoApproved } = await withDbClient(async (client) => {
        try {
          await client.query('BEGIN');
          await client.query("SELECT set_config('app.current_company_id', $1, true)", [
            resolvedCompanyId,
          ]);

          const { rows: existingRows } = await client.query(
            `SELECT id, is_active
             FROM users
             WHERE company_id = $1 AND email = $2
             LIMIT 1`,
            [resolvedCompanyId, email]
          );

          if (existingRows.length === 1) {
            const existing = existingRows[0];

            if (existing.is_active) {
              throw new HttpError(
                409,
                'AUTH_VALIDATION_ERROR',
                'A user with this email already exists in the company'
              );
            }

            if (env.autoApproveSignup) {
              const { rows: updatedRows } = await client.query(
                `UPDATE users
                 SET full_name = $2,
                     password_hash = $3,
                     role = $4,
                     is_active = TRUE
                 WHERE id = $1
                 RETURNING id, company_id, full_name, email::text AS email, role`,
                [existing.id, fullName, passwordHash, role]
              );

              await client.query('COMMIT');
              return { user: updatedRows[0], requestId: null, autoApproved: true };
            }

            const { rows: pendingRows } = await client.query(
              `SELECT id
               FROM company_join_requests
               WHERE company_id = $1
                 AND status = 'pending'
                 AND user_id = $2
               LIMIT 1`,
              [resolvedCompanyId, existing.id]
            );

            if (pendingRows.length === 1) {
              await client.query('COMMIT');
              return { user: existing, requestId: pendingRows[0].id };
            }

            const { rows: insertedRequestRows } = await client.query(
              `INSERT INTO company_join_requests (company_id, user_id, full_name, email)
               VALUES ($1, $2, $3, $4)
               RETURNING id`,
              [resolvedCompanyId, existing.id, fullName, email]
            );

            await client.query('COMMIT');
            return { user: existing, requestId: insertedRequestRows[0].id };
          }

          if (env.autoApproveSignup) {
            const { rows: insertedUserRows } = await client.query(
              `INSERT INTO users (company_id, full_name, username, email, password_hash, role, is_active)
               VALUES ($1, $2, $3, $4, $5, $6, TRUE)
               RETURNING id, company_id, full_name, username::text AS username, email::text AS email, role`,
              [resolvedCompanyId, fullName, username, email, passwordHash, role]
            );

            await client.query('COMMIT');
            return { user: insertedUserRows[0], requestId: null, autoApproved: true };
          }

          const { rows: insertedUserRows } = await client.query(
            `INSERT INTO users (company_id, full_name, username, email, password_hash, role, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, FALSE)
             RETURNING id, company_id, full_name, username::text AS username, email::text AS email, role`,
            [resolvedCompanyId, fullName, username, email, passwordHash, role]
          );

          const insertedUser = insertedUserRows[0];

          const { rows: insertedRequestRows } = await client.query(
            `INSERT INTO company_join_requests (company_id, user_id, full_name, email)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [resolvedCompanyId, insertedUser.id, fullName, email]
          );

          await client.query('COMMIT');
          return { user: insertedUser, requestId: insertedRequestRows[0].id, autoApproved: false };
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      });

      response.status(autoApproved ? 200 : 202).json({
        data: {
          status: autoApproved ? 'active' : 'pending',
          requestId: autoApproved ? null : requestId,
          company: {
            id: resolvedCompany.id,
            name: resolvedCompany.name,
            slug: resolvedCompany.slug,
          },
          user: {
            id: user.id,
            companyId: resolvedCompany.id,
            fullName,
            email,
            role: 'employee',
          },
        },
      });

      await logAuthEvent({
        eventType: 'register_request',
        principalId: user.id,
        scope: 'tenant',
        companyId: resolvedCompanyId,
        email,
        success: true,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || null,
        metadata: {
          role: 'employee',
          requestId: autoApproved ? null : requestId,
          autoApproved,
        },
      });
    } catch (dbError) {
      if (dbError?.code === '23505') {
        if (dbError.constraint === 'uq_users_company_email') {
          throw new HttpError(
            409,
            'AUTH_VALIDATION_ERROR',
            'A user with this email already exists in the company'
          );
        }

        if (dbError.constraint === 'uq_users_one_active_admin_per_company') {
          throw new HttpError(
            409,
            'AUTH_VALIDATION_ERROR',
            'This company already has an active company admin'
          );
        }

        if (String(dbError.constraint || '').toLowerCase().includes('email')) {
          throw new HttpError(
            409,
            'AUTH_VALIDATION_ERROR',
            'A user with this email already exists'
          );
        }
      }

      if (dbError?.code === '23503') {
        throw new HttpError(
          400,
          'AUTH_VALIDATION_ERROR',
          'Invalid companyId: company does not exist'
        );
      }

      if (
        dbError?.code === 'P0001' &&
        String(dbError.message || '').includes('Employee limit exceeded')
      ) {
        throw new HttpError(
          409,
          'AUTH_VALIDATION_ERROR',
          'Employee limit exceeded for the company subscription plan'
        );
      }

      if (
        dbError?.code === 'P0001' &&
        String(dbError.message || '').includes('Admin limit exceeded')
      ) {
        throw new HttpError(
          409,
          'AUTH_VALIDATION_ERROR',
          'Admin limit exceeded for the company subscription plan'
        );
      }

      throw dbError;
    }
  } catch (error) {
    await logAuthEvent({
      eventType: 'register_request',
      scope: 'tenant',
      companyId: resolvedCompanyId,
      email: normalizeEmail(request.body.email) || null,
      success: false,
      failureCode: error?.code || 'INTERNAL_SERVER_ERROR',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
    });

    next(error);
  }
});

router.post('/login', loginRateLimiter, async (request, response, next) => {
  try {
    const username = request.body.username ? String(request.body.username).trim() : '';
    const password = normalizeValue(request.body.password);
    const accountScope = normalizeValue(request.body.accountScope);
    const companyId = normalizeValue(request.body.companyId);

    if (!username || !password) {
      throw new HttpError(
        400,
        'AUTH_VALIDATION_ERROR',
        'username and password are required'
      );
    }

    if (accountScope && accountScope !== 'tenant' && accountScope !== 'platform') {
      throw new HttpError(
        400,
        'AUTH_VALIDATION_ERROR',
        'accountScope must be either tenant or platform'
      );
    }

    if (!accountScope || accountScope === 'platform') {
      const { rows: platformRows } = await query(
        `SELECT id, full_name, email::text AS email, username::text as username, password_hash, is_active
         FROM platform_admins
         WHERE username = $1
         LIMIT 1`,
        [username]
      );

      if (platformRows.length === 1) {
        const admin = platformRows[0];

        if (!admin.is_active) {
          throw new HttpError(403, 'AUTH_ACCOUNT_DISABLED', 'Account is disabled');
        }

        const matches = await bcrypt.compare(password, admin.password_hash);

        if (!matches) {
          throw new HttpError(
            401,
            'AUTH_INVALID_CREDENTIALS',
            'Invalid username or password'
          );
        }

        const tokens = await issueSessionTokens({
          principalId: admin.id,
          scope: 'platform',
          role: 'platform_admin',
          companyId: null,
          email: admin.email,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] || null,
        });

        response.json({
          data: {
            accessToken: tokens.accessToken,
            tokenType: 'Bearer',
            expiresIn: env.jwtAccessTtlSeconds,
            refreshToken: tokens.refreshToken,
            refreshExpiresIn: env.jwtRefreshTtlSeconds,
            user: {
              id: admin.id,
              companyId: null,
              fullName: admin.full_name,
              email: admin.email,
              role: 'platform_admin',
              scope: 'platform',
            },
          },
        });

        await logAuthEvent({
          eventType: 'login',
          principalId: admin.id,
          scope: 'platform',
          email: admin.email,
          success: true,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] || null,
        });

        return;
      }

      if (accountScope === 'platform') {
        throw new HttpError(
          401,
          'AUTH_INVALID_CREDENTIALS',
          'Invalid username or password'
        );
      }
    }

    if (!accountScope || accountScope === 'tenant') {
      let resolvedCompanyId = companyId;

      if (!resolvedCompanyId) {
        const matchingUsers = await findTenantUsersByUsername(username);

        if (matchingUsers.length === 0) {
          throw new HttpError(
            401,
            'AUTH_INVALID_CREDENTIALS',
            'Invalid username or password'
          );
        }

        const passwordMatchedUsers = [];

        for (const candidateUser of matchingUsers) {
          const candidateMatches = await bcrypt.compare(
            password,
            candidateUser.password_hash
          );

          if (candidateMatches) {
            passwordMatchedUsers.push(candidateUser);
          }
        }

        if (passwordMatchedUsers.length === 0) {
          throw new HttpError(
            401,
            'AUTH_INVALID_CREDENTIALS',
            'Invalid username or password'
          );
        }

        const activePasswordMatchedUsers = passwordMatchedUsers.filter(
          (candidateUser) => candidateUser.is_active
        );

        if (activePasswordMatchedUsers.length === 0) {
          throw new HttpError(403, 'AUTH_ACCOUNT_DISABLED', 'Account is disabled');
        } else {
          resolvedCompanyId = activePasswordMatchedUsers[0].company_id;
        }
      }

      if (!isUuid(resolvedCompanyId)) {
        throw new HttpError(
          400,
          'AUTH_VALIDATION_ERROR',
          'companyId must be a valid UUID'
        );
      }

      const { rows } = await runWithCompanyScope(resolvedCompanyId, async (client) => {
        const companyDemoSelect = await buildCompanyDemoSelect('c', 'company');
        const userPermissionsSelect = await buildUserPermissionsSelect('u', 'permissions');

        return client.query(
          `SELECT
             u.id,
             u.company_id,
             c.slug AS company_slug,
             c.name AS company_name,
             ${companyDemoSelect},
             u.full_name,
             u.email::text AS email,
             u.password_hash,
             u.role,
             ${userPermissionsSelect},
             u.is_active
             ,sp.code AS plan_code
             ,sp.name AS plan_name
             ,sp.max_employees AS plan_max_employees
             ,sp.can_export_reports AS plan_can_export_reports
             ,sp.can_use_advanced_analytics AS plan_can_use_advanced_analytics
             ,sp.currency_code AS plan_currency_code
           FROM users u
           JOIN companies c ON c.id = u.company_id
           JOIN subscription_plans sp ON sp.id = c.subscription_plan_id
           WHERE u.username = $1
             AND u.company_id = $2
           LIMIT 2`,
          [username, resolvedCompanyId]
        );
      });

      if (rows.length !== 1) {
        throw new HttpError(
          401,
          'AUTH_INVALID_CREDENTIALS',
          'Invalid username or password'
        );
      }

      const user = rows[0];

      // Do not auto-activate users during login. Inactive users must follow
      // the normal approval flow and will receive a 403 'AUTH_ACCOUNT_DISABLED'.

      if (!user.is_active) {
        const pendingRequest = await findPendingJoinRequest({
          companyId: user.company_id,
          userId: user.id,
          email: user.email,
        });

        if (pendingRequest) {
          throw new HttpError(
            403,
            'AUTH_ACCOUNT_PENDING',
            'Your access request is pending approval'
          );
        }

        throw new HttpError(403, 'AUTH_ACCOUNT_DISABLED', 'Account is disabled');
      }

      if (Boolean(user.company_is_demo) && isDemoExpired(user.company_demo_expires_at)) {
        throw new HttpError(
          403,
          'DEMO_EXPIRED',
          'This demo workspace has expired. Please upgrade to a paid plan.'
        );
      }

      const matches = await bcrypt.compare(password, user.password_hash);

      if (!matches) {
        throw new HttpError(
          401,
          'AUTH_INVALID_CREDENTIALS',
          'Invalid username or password'
        );
      }

      const tokens = await issueSessionTokens({
        principalId: user.id,
        scope: 'tenant',
        role: user.role,
        companyId: user.company_id,
        email: user.email,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || null,
      });

      response.json({
        data: {
          accessToken: tokens.accessToken,
          tokenType: 'Bearer',
          expiresIn: env.jwtAccessTtlSeconds,
          refreshToken: tokens.refreshToken,
          refreshExpiresIn: env.jwtRefreshTtlSeconds,
          user: buildTenantUserPayload(user),
        },
      });

      await logAuthEvent({
        eventType: 'login',
        principalId: user.id,
        scope: 'tenant',
        companyId: user.company_id,
        email: user.email,
        success: true,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || null,
      });

      return;
    }

    throw new HttpError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid username or password');
  } catch (error) {
    await logAuthEvent({
      eventType: 'login',
      scope: normalizeValue(request.body.accountScope) || null,
      companyId: normalizeValue(request.body.companyId) || null,
      email: normalizeEmail(request.body.email) || null,
      success: false,
      failureCode: error?.code || 'INTERNAL_SERVER_ERROR',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
    });

    next(error);
  }
});

router.post('/login/google', loginRateLimiter, async (request, response, next) => {
  try {
    const accountScope = normalizeValue(request.body.accountScope);
    const companyId = normalizeValue(request.body.companyId);
    const googleIdentity = await verifyGoogleIdToken(request.body.idToken);
    const email = googleIdentity.email;

    if (accountScope && accountScope !== 'tenant' && accountScope !== 'platform') {
      throw new HttpError(
        400,
        'AUTH_VALIDATION_ERROR',
        'accountScope must be either tenant or platform'
      );
    }

    if (!accountScope || accountScope === 'platform') {
      const { rows: platformRows } = await query(
        `SELECT id, full_name, email::text AS email, is_active
         FROM platform_admins
         WHERE email = $1
         LIMIT 1`,
        [email]
      );

      if (platformRows.length === 1) {
        const admin = platformRows[0];

        if (!admin.is_active) {
          throw new HttpError(403, 'AUTH_ACCOUNT_DISABLED', 'Account is disabled');
        }

        const tokens = await issueSessionTokens({
          principalId: admin.id,
          scope: 'platform',
          role: 'platform_admin',
          companyId: null,
          email: admin.email,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] || null,
        });

        response.json({
          data: {
            accessToken: tokens.accessToken,
            tokenType: 'Bearer',
            expiresIn: env.jwtAccessTtlSeconds,
            refreshToken: tokens.refreshToken,
            refreshExpiresIn: env.jwtRefreshTtlSeconds,
            user: {
              id: admin.id,
              companyId: null,
              fullName: admin.full_name,
              email: admin.email,
              role: 'platform_admin',
              scope: 'platform',
            },
          },
        });

        await logAuthEvent({
          eventType: 'login_google',
          principalId: admin.id,
          scope: 'platform',
          email: admin.email,
          success: true,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] || null,
          metadata: {
            provider: 'google',
            googleSubject: googleIdentity.subject || null,
          },
        });

        return;
      }

      if (accountScope === 'platform') {
        throw new HttpError(
          401,
          'AUTH_INVALID_CREDENTIALS',
          'No platform account found for this Google user'
        );
      }
    }

    if (!accountScope || accountScope === 'tenant') {
      let resolvedCompanyId = companyId;

      if (!resolvedCompanyId) {
        const matchingUsers = await findTenantUsersByEmail(email);

        if (matchingUsers.length === 0) {
          throw new HttpError(
            401,
            'AUTH_INVALID_CREDENTIALS',
            'No tenant account found for this Google user'
          );
        }

        const activeMatchingUsers = matchingUsers.filter(
          (candidateUser) => candidateUser.is_active
        );

        if (activeMatchingUsers.length === 0) {
          throw new HttpError(403, 'AUTH_ACCOUNT_DISABLED', 'Account is disabled');
        } else {
          resolvedCompanyId = activeMatchingUsers[0].company_id;
        }
      }

      if (!isUuid(resolvedCompanyId)) {
        throw new HttpError(
          400,
          'AUTH_VALIDATION_ERROR',
          'companyId must be a valid UUID'
        );
      }

      const { rows } = await runWithCompanyScope(resolvedCompanyId, async (client) => {
        const companyDemoSelect = await buildCompanyDemoSelect('c', 'company');
        const userPermissionsSelect = await buildUserPermissionsSelect('u', 'permissions');

        return client.query(
          `SELECT
             u.id,
             u.company_id,
             c.slug AS company_slug,
             c.name AS company_name,
             ${companyDemoSelect},
             u.full_name,
             u.email::text AS email,
             u.role,
             ${userPermissionsSelect},
             u.is_active
             ,sp.code AS plan_code
             ,sp.name AS plan_name
             ,sp.max_employees AS plan_max_employees
             ,sp.can_export_reports AS plan_can_export_reports
             ,sp.can_use_advanced_analytics AS plan_can_use_advanced_analytics
             ,sp.currency_code AS plan_currency_code
           FROM users u
           JOIN companies c ON c.id = u.company_id
           JOIN subscription_plans sp ON sp.id = c.subscription_plan_id
           WHERE u.email = $1
             AND u.company_id = $2
           LIMIT 2`,
          [email, resolvedCompanyId]
        );
      });

      if (rows.length !== 1) {
        throw new HttpError(
          401,
          'AUTH_INVALID_CREDENTIALS',
          'No tenant account found for this Google user'
        );
      }

      const user = rows[0];

      // Do not auto-activate users during Google login. Inactive users must
      // follow the normal approval flow and will receive a 403 'AUTH_ACCOUNT_DISABLED'.

      if (!user.is_active) {
        const pendingRequest = await findPendingJoinRequest({
          companyId: user.company_id,
          userId: user.id,
          email: user.email,
        });

        if (pendingRequest) {
          throw new HttpError(
            403,
            'AUTH_ACCOUNT_PENDING',
            'Your access request is pending approval'
          );
        }

        throw new HttpError(403, 'AUTH_ACCOUNT_DISABLED', 'Account is disabled');
      }

      if (Boolean(user.company_is_demo) && isDemoExpired(user.company_demo_expires_at)) {
        throw new HttpError(
          403,
          'DEMO_EXPIRED',
          'This demo workspace has expired. Please upgrade to a paid plan.'
        );
      }

      const tokens = await issueSessionTokens({
        principalId: user.id,
        scope: 'tenant',
        role: user.role,
        companyId: user.company_id,
        email: user.email,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || null,
      });

      response.json({
        data: {
          accessToken: tokens.accessToken,
          tokenType: 'Bearer',
          expiresIn: env.jwtAccessTtlSeconds,
          refreshToken: tokens.refreshToken,
          refreshExpiresIn: env.jwtRefreshTtlSeconds,
          user: buildTenantUserPayload(user),
        },
      });

      await logAuthEvent({
        eventType: 'login_google',
        principalId: user.id,
        scope: 'tenant',
        companyId: user.company_id,
        email: user.email,
        success: true,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || null,
        metadata: {
          provider: 'google',
          googleSubject: googleIdentity.subject || null,
        },
      });

      return;
    }

    throw new HttpError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid account scope');
  } catch (error) {
    await logAuthEvent({
      eventType: 'login_google',
      scope: normalizeValue(request.body.accountScope) || null,
      companyId: normalizeValue(request.body.companyId) || null,
      email: null,
      success: false,
      failureCode: error?.code || 'INTERNAL_SERVER_ERROR',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      metadata: {
        provider: 'google',
      },
    });

    next(error);
  }
});

router.post('/register/google', registerRateLimiter, async (request, response, next) => {
  let resolvedCompanyId = null;
  let resolvedCompany = null;

  try {
    const googleIdentity = await verifyGoogleIdToken(request.body.idToken);
    const email = googleIdentity.email;
    const companyName = normalizeValue(request.body.companyName);
    const companyId = normalizeValue(request.body.companyId);

    resolvedCompany = await resolveCompanyForRegister({
      companyName,
      companyId,
    });
    resolvedCompanyId = resolvedCompany.id;

    const fullName = googleIdentity.name || email.split('@')[0] || 'Google User';

    const { user, requestId, autoApproved } = await withDbClient(async (client) => {
      try {
        await client.query('BEGIN');
        await client.query("SELECT set_config('app.current_company_id', $1, true)", [
          resolvedCompanyId,
        ]);

        const { rows: existingRows } = await client.query(
          `SELECT id, is_active
           FROM users
           WHERE company_id = $1 AND email = $2
           LIMIT 1`,
          [resolvedCompanyId, email]
        );

        if (existingRows.length === 1) {
          const existing = existingRows[0];

          if (existing.is_active) {
            throw new HttpError(
              409,
              'AUTH_VALIDATION_ERROR',
              'A user with this email already exists in the company'
            );
          }

          if (env.autoApproveSignup) {
            const { rows: updatedRows } = await client.query(
              `UPDATE users
               SET full_name = $2,
                   is_active = TRUE
               WHERE id = $1
               RETURNING id, company_id, full_name, email::text AS email, role`,
              [existing.id, fullName]
            );

            await client.query('COMMIT');
            return { user: updatedRows[0], requestId: null, autoApproved: true };
          }

          const { rows: pendingRows } = await client.query(
            `SELECT id
             FROM company_join_requests
             WHERE company_id = $1
               AND status = 'pending'
               AND user_id = $2
             LIMIT 1`,
            [resolvedCompanyId, existing.id]
          );

          if (pendingRows.length === 1) {
            await client.query('COMMIT');
            return { user: existing, requestId: pendingRows[0].id };
          }

          const { rows: insertedRequestRows } = await client.query(
            `INSERT INTO company_join_requests (company_id, user_id, full_name, email)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [resolvedCompanyId, existing.id, fullName, email]
          );

          await client.query('COMMIT');
          return { user: existing, requestId: insertedRequestRows[0].id };
        }

        const randomPasswordHash = await bcrypt.hash(generateRefreshToken(), 12);

        const pseudoUsername = email.split('@')[0] + Math.floor(Math.random() * 1000);

        const { rows: insertedUserRows } = await client.query(
          `INSERT INTO users (company_id, full_name, username, email, password_hash, role, is_active)
           VALUES ($1, $2, $3, $4, $5, 'employee', $6)
           RETURNING id, company_id, full_name, username::text AS username, email::text AS email, role`,
          [resolvedCompanyId, fullName, pseudoUsername, email, randomPasswordHash, env.autoApproveSignup]
        );

        const insertedUser = insertedUserRows[0];

        if (env.autoApproveSignup) {
          await client.query('COMMIT');
          return { user: insertedUser, requestId: null, autoApproved: true };
        }

        const { rows: insertedRequestRows } = await client.query(
          `INSERT INTO company_join_requests (company_id, user_id, full_name, email)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [resolvedCompanyId, insertedUser.id, fullName, email]
        );

        await client.query('COMMIT');
        return { user: insertedUser, requestId: insertedRequestRows[0].id, autoApproved: false };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });

    response.status(autoApproved ? 200 : 202).json({
      data: {
        status: autoApproved ? 'active' : 'pending',
        requestId: autoApproved ? null : requestId,
        company: {
          id: resolvedCompany.id,
          name: resolvedCompany.name,
          slug: resolvedCompany.slug,
        },
        user: {
          id: user.id,
          companyId: resolvedCompany.id,
          fullName,
          email,
          role: 'employee',
        },
      },
    });

    await logAuthEvent({
      eventType: 'register_request',
      principalId: user.id,
      scope: 'tenant',
      companyId: resolvedCompanyId,
      email,
      success: true,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      metadata: {
        provider: 'google',
        googleSubject: googleIdentity.subject || null,
        requestId: autoApproved ? null : requestId,
        autoApproved,
      },
    });
  } catch (error) {
    await logAuthEvent({
      eventType: 'register_request',
      scope: 'tenant',
      companyId: resolvedCompanyId,
      email: null,
      success: false,
      failureCode: error?.code || 'INTERNAL_SERVER_ERROR',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      metadata: {
        provider: 'google',
      },
    });

    next(error);
  }
});

router.post('/refresh', refreshRateLimiter, async (request, response, next) => {
  try {
    const refreshToken = normalizeValue(request.body.refreshToken);

    if (!refreshToken) {
      throw new HttpError(
        400,
        'AUTH_VALIDATION_ERROR',
        'refreshToken is required'
      );
    }

    const refreshTokenHash = hashRefreshToken(refreshToken);
    const existingToken = await findRefreshTokenWithSession(refreshTokenHash);

    if (!existingToken) {
      throw new HttpError(401, 'AUTH_TOKEN_INVALID', 'Invalid refresh token');
    }

    if (existingToken.session_revoked_at) {
      throw new HttpError(401, 'AUTH_TOKEN_INVALID', 'Invalid refresh token');
    }

    if (new Date(existingToken.session_expires_at) <= new Date()) {
      await revokeSessionById(existingToken.session_id);
      throw new HttpError(401, 'AUTH_TOKEN_EXPIRED', 'Refresh token expired');
    }

    if (new Date(existingToken.expires_at) <= new Date()) {
      await revokeSessionById(existingToken.session_id);
      throw new HttpError(401, 'AUTH_TOKEN_EXPIRED', 'Refresh token expired');
    }

    if (existingToken.replaced_by_token_id) {
      await revokeSessionById(existingToken.session_id);

      await logAuthEvent({
        eventType: 'refresh_reuse_detected',
        principalId: existingToken.principal_id,
        scope: existingToken.scope,
        companyId: existingToken.company_id,
        email: existingToken.email,
        success: false,
        failureCode: 'AUTH_REFRESH_REUSED',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || null,
      });

      throw new HttpError(401, 'AUTH_REFRESH_REUSED', 'Refresh token reuse detected');
    }

    if (existingToken.revoked_at) {
      throw new HttpError(401, 'AUTH_TOKEN_INVALID', 'Invalid refresh token');
    }

    const nextRefreshToken = generateRefreshToken();
    const nextRefreshTokenHash = hashRefreshToken(nextRefreshToken);
    const nextRefreshExpiresAt = expirationDateFromNow(env.jwtRefreshTtlSeconds);

    const nextRefreshRecord = await createRefreshTokenRecord({
      sessionId: existingToken.session_id,
      tokenHash: nextRefreshTokenHash,
      expiresAt: nextRefreshExpiresAt,
      parentTokenId: existingToken.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
    });

    await markRefreshTokenRotated({
      tokenId: existingToken.id,
      replacedByTokenId: nextRefreshRecord.id,
    });

    await touchSessionLastUsedAt(existingToken.session_id);

    const accessToken = signAccessToken({
      sub: existingToken.principal_id,
      role: existingToken.role,
      scope: existingToken.scope,
      companyId: existingToken.company_id,
      email: existingToken.email,
    });

    response.json({
      data: {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: env.jwtAccessTtlSeconds,
        refreshToken: nextRefreshToken,
        refreshExpiresIn: env.jwtRefreshTtlSeconds,
      },
    });

    await logAuthEvent({
      eventType: 'refresh',
      principalId: existingToken.principal_id,
      scope: existingToken.scope,
      companyId: existingToken.company_id,
      email: existingToken.email,
      success: true,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
    });
  } catch (error) {
    await logAuthEvent({
      eventType: 'refresh',
      success: false,
      failureCode: error?.code || 'INTERNAL_SERVER_ERROR',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
    });

    next(error);
  }
});

// Basic in-memory store for reset codes for simplicity (use Redis or DB in production).
const resetCodesStore = new Map();
const RESET_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const RESET_CODE_TTL_MS = 1000 * 60 * 15;

function generateResetCode() {
  let code = '';

  for (let index = 0; index < 6; index += 1) {
    code += RESET_CODE_ALPHABET[randomInt(RESET_CODE_ALPHABET.length)];
  }

  return code;
}

function buildResetCodeKey(email, code) {
  return `${normalizeEmail(email)}:${normalizeValue(code).toUpperCase()}`;
}

router.post('/forgot-password', async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email);

    if (!email) {
      throw new HttpError(400, 'AUTH_VALIDATION_ERROR', 'Email is required');
    }

    const { rows } = await withDbClient(async (client) => {
      await client.query("SELECT set_config('app.current_scope', 'platform', false)");
      return client.query(
        `SELECT id, email::text AS email FROM users WHERE email = $1 AND is_active = TRUE LIMIT 1`,
        [email]
      );
    });

    if (rows.length > 0) {
      const user = rows[0];
      const resetCode = generateResetCode();
      const resetCodeKey = buildResetCodeKey(user.email, resetCode);

      resetCodesStore.set(resetCodeKey, {
        userId: user.id,
        email: user.email,
        expires: Date.now() + RESET_CODE_TTL_MS,
      });

      try {
        await sendPasswordResetCodeEmail(user.email, resetCode, {
          expiresInMinutes: Math.round(RESET_CODE_TTL_MS / 60000),
        });
      } catch {
        resetCodesStore.delete(resetCodeKey);
        throw new HttpError(
          502,
          'PASSWORD_RESET_EMAIL_FAILED',
          'We could not send the reset code right now. Please try again later.'
        );
      }
    }

    // Always return 200 to prevent email enumeration
    response.json({
      data: {
        message: 'If an active account exists for that email, we have sent a reset code.',
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/reset-password/code/verify', async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email);
    const code = normalizeValue(request.body.code).toUpperCase();

    if (!email || !code) {
      throw new HttpError(400, 'AUTH_VALIDATION_ERROR', 'Email and reset code are required');
    }

    if (!/^[A-Z0-9]{6}$/.test(code)) {
      throw new HttpError(400, 'AUTH_VALIDATION_ERROR', 'Reset code must be 6 alphanumeric characters');
    }

    const resetCodeKey = buildResetCodeKey(email, code);
    const codeData = resetCodesStore.get(resetCodeKey);

    if (!codeData || codeData.expires < Date.now()) {
      resetCodesStore.delete(resetCodeKey);
      throw new HttpError(400, 'AUTH_VALIDATION_ERROR', 'Invalid or expired reset code');
    }

    response.json({
      data: {
        verified: true,
        expiresAt: new Date(codeData.expires).toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/reset-password', async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email);
    const code = normalizeValue(request.body.code).toUpperCase();
    const newPassword = normalizeValue(request.body.newPassword);

    if (!email || !code || !newPassword) {
      throw new HttpError(400, 'AUTH_VALIDATION_ERROR', 'Email, reset code, and new password are required');
    }

    if (!/^[A-Z0-9]{6}$/.test(code)) {
      throw new HttpError(400, 'AUTH_VALIDATION_ERROR', 'Reset code must be 6 alphanumeric characters');
    }

    const resetCodeKey = buildResetCodeKey(email, code);
    const codeData = resetCodesStore.get(resetCodeKey);

    if (!codeData || codeData.expires < Date.now()) {
      resetCodesStore.delete(resetCodeKey);
      throw new HttpError(400, 'AUTH_VALIDATION_ERROR', 'Invalid or expired reset code');
    }

    const passwordValidation = validatePasswordPolicy(newPassword, email);
    if (!passwordValidation.isValid) {
      throw new HttpError(
        400,
        'AUTH_VALIDATION_ERROR',
        'Password does not meet security policy',
        passwordValidation.errors
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    const updateResult = await withDbClient(async (client) => {
      await client.query("SELECT set_config('app.current_scope', 'platform', false)");
      return client.query(
        `UPDATE users SET password_hash = $1 WHERE id = $2 AND email = $3 AND is_active = TRUE`,
        [passwordHash, codeData.userId, email]
      );
    });

    if (updateResult.rowCount !== 1) {
      resetCodesStore.delete(resetCodeKey);
      throw new HttpError(400, 'AUTH_VALIDATION_ERROR', 'Invalid or expired reset code');
    }

    resetCodesStore.delete(resetCodeKey);

    response.json({ data: { message: 'Password reset successful' } });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', requireAuth, async (request, response, next) => {
  try {
    const refreshToken = normalizeValue(request.body.refreshToken);
    const tokenExpiresAt = tokenExpToDate(request.auth.rawClaims.exp);

    if (tokenExpiresAt) {
      await blacklistAccessToken({
        jti: request.auth.tokenId,
        subjectId: request.auth.userId,
        expiresAt: tokenExpiresAt,
        reason: 'logout',
      });
    }

    if (refreshToken) {
      const refreshTokenHash = hashRefreshToken(refreshToken);
      const existingToken = await findRefreshTokenWithSession(refreshTokenHash);

      if (
        existingToken &&
        existingToken.principal_id === request.auth.userId &&
        existingToken.scope === request.auth.scope
      ) {
        await revokeSessionById(existingToken.session_id);
      }
    }

    await logAuthEvent({
      eventType: 'logout',
      principalId: request.auth.userId,
      scope: request.auth.scope,
      companyId: request.auth.companyId,
      email: request.auth.email,
      success: true,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
    });

    response.status(204).send();
  } catch (error) {
    await logAuthEvent({
      eventType: 'logout',
      principalId: request.auth?.userId || null,
      scope: request.auth?.scope || null,
      companyId: request.auth?.companyId || null,
      email: request.auth?.email || null,
      success: false,
      failureCode: error?.code || 'INTERNAL_SERVER_ERROR',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
    });

    next(error);
  }
});

router.get('/me', requireAuth, async (request, response, next) => {
  try {
    let tenantContext = null;

    if (request.auth.scope === 'tenant' && request.auth.companyId) {
      tenantContext = await loadTenantContext({
        companyId: request.auth.companyId,
        userId: request.auth.userId,
      });
    }

    response.json({
      data: {
        auth: {
          userId: request.auth.userId,
          tokenId: request.auth.tokenId,
          scope: request.auth.scope,
          role: request.auth.role,
          companyId: request.auth.companyId,
          email: request.auth.email,
        },
        tenantContext,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
