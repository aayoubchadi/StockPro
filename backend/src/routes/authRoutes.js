import bcrypt from 'bcryptjs';
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

router.post('/register', registerRateLimiter, async (request, response, next) => {
  try {
    const companyId = normalizeValue(request.body.companyId);
    const fullName = normalizeValue(request.body.fullName);
    const email = normalizeEmail(request.body.email);
    const password = normalizeValue(request.body.password);
    const role = normalizeRole(request.body.role);

    if (!companyId || !fullName || !email || !password) {
      throw new HttpError(
        400,
        'AUTH_VALIDATION_ERROR',
        'companyId, fullName, email, and password are required'
      );
    }

    if (!isUuid(companyId)) {
      throw new HttpError(
        400,
        'AUTH_VALIDATION_ERROR',
        'companyId must be a valid UUID'
      );
    }

    if (fullName.length < 2 || fullName.length > 120) {
      throw new HttpError(
        400,
        'AUTH_VALIDATION_ERROR',
        'fullName must be between 2 and 120 characters'
      );
    }

    if (role !== 'employee' && role !== 'company_admin') {
      throw new HttpError(
        400,
        'AUTH_VALIDATION_ERROR',
        'role must be either employee or company_admin'
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
      const { rows } = await runWithCompanyScope(companyId, (client) =>
        client.query(
          `INSERT INTO users (company_id, full_name, email, password_hash, role)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, company_id, full_name, email::text AS email, role, is_active, created_at`,
          [companyId, fullName, email, passwordHash, role]
        )
      );

      const user = rows[0];

      response.status(201).json({
        data: {
          user: {
            id: user.id,
            companyId: user.company_id,
            fullName: user.full_name,
            email: user.email,
            role: user.role,
            isActive: user.is_active,
            createdAt: user.created_at,
          },
        },
      });

      await logAuthEvent({
        eventType: 'register',
        principalId: user.id,
        scope: 'tenant',
        companyId: user.company_id,
        email: user.email,
        success: true,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || null,
        metadata: {
          role: user.role,
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

      throw dbError;
    }
  } catch (error) {
    await logAuthEvent({
      eventType: 'register',
      scope: 'tenant',
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

router.post('/login', loginRateLimiter, async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email);
    const password = normalizeValue(request.body.password);
    const accountScope = normalizeValue(request.body.accountScope);
    const companyId = normalizeValue(request.body.companyId);

    if (!email || !password || !accountScope) {
      throw new HttpError(
        400,
        'AUTH_VALIDATION_ERROR',
        'email, password, and accountScope are required'
      );
    }

    if (accountScope !== 'tenant' && accountScope !== 'platform') {
      throw new HttpError(
        400,
        'AUTH_VALIDATION_ERROR',
        'accountScope must be either tenant or platform'
      );
    }

    if (accountScope === 'tenant') {
      if (!companyId) {
        throw new HttpError(
          400,
          'AUTH_VALIDATION_ERROR',
          'tenant login requires companyId'
        );
      }

      if (companyId && !isUuid(companyId)) {
        throw new HttpError(
          400,
          'AUTH_VALIDATION_ERROR',
          'companyId must be a valid UUID'
        );
      }

      const { rows } = await runWithCompanyScope(companyId, (client) =>
        client.query(
          `SELECT
             u.id,
             u.company_id,
             c.slug AS company_slug,
             u.full_name,
             u.email::text AS email,
             u.password_hash,
             u.role,
             u.is_active
           FROM users u
           JOIN companies c ON c.id = u.company_id
           WHERE u.email = $1
             AND u.company_id = $2
           LIMIT 2`,
          [email, companyId]
        )
      );

      if (rows.length !== 1) {
        throw new HttpError(
          401,
          'AUTH_INVALID_CREDENTIALS',
          'Invalid email or password'
        );
      }

      const user = rows[0];

      if (!user.is_active) {
        throw new HttpError(403, 'AUTH_ACCOUNT_DISABLED', 'Account is disabled');
      }

      const matches = await bcrypt.compare(password, user.password_hash);

      if (!matches) {
        throw new HttpError(
          401,
          'AUTH_INVALID_CREDENTIALS',
          'Invalid email or password'
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
          user: {
            id: user.id,
            companyId: user.company_id,
            companySlug: user.company_slug,
            fullName: user.full_name,
            email: user.email,
            role: user.role,
            scope: 'tenant',
          },
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

    const { rows } = await query(
      `SELECT id, full_name, email::text AS email, password_hash, is_active
       FROM platform_admins
       WHERE email = $1
       LIMIT 1`,
      [email]
    );

    if (rows.length !== 1) {
      throw new HttpError(
        401,
        'AUTH_INVALID_CREDENTIALS',
        'Invalid email or password'
      );
    }

    const admin = rows[0];

    if (!admin.is_active) {
      throw new HttpError(403, 'AUTH_ACCOUNT_DISABLED', 'Account is disabled');
    }

    const matches = await bcrypt.compare(password, admin.password_hash);

    if (!matches) {
      throw new HttpError(
        401,
        'AUTH_INVALID_CREDENTIALS',
        'Invalid email or password'
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
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
