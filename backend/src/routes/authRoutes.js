import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { query } from '../lib/db.js';
import { signAccessToken } from '../lib/authJwt.js';
import { HttpError } from '../lib/httpError.js';
import { loginRateLimiter } from '../middleware/authRateLimit.js';
import { env } from '../config/env.js';

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

router.post('/login', loginRateLimiter, async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email);
    const password = normalizeValue(request.body.password);
    const accountScope = normalizeValue(request.body.accountScope);
    const companyId = normalizeValue(request.body.companyId);
    const companySlug = normalizeValue(request.body.companySlug).toLowerCase();

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
      if (!companyId && !companySlug) {
        throw new HttpError(
          400,
          'AUTH_VALIDATION_ERROR',
          'tenant login requires companyId or companySlug'
        );
      }

      if (companyId && !isUuid(companyId)) {
        throw new HttpError(
          400,
          'AUTH_VALIDATION_ERROR',
          'companyId must be a valid UUID'
        );
      }

      const params = [email];
      let paramIndex = 2;

      let tenantLoginQuery = `
        SELECT
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
      `;

      if (companyId) {
        tenantLoginQuery += ` AND u.company_id = $${paramIndex}`;
        params.push(companyId);
        paramIndex += 1;
      }

      if (companySlug) {
        tenantLoginQuery += ` AND c.slug = $${paramIndex}`;
        params.push(companySlug);
      }

      tenantLoginQuery += ' LIMIT 2';

      const { rows } = await query(tenantLoginQuery, params);

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

      const accessToken = signAccessToken({
        sub: user.id,
        role: user.role,
        scope: 'tenant',
        companyId: user.company_id,
        email: user.email,
      });

      response.json({
        data: {
          accessToken,
          tokenType: 'Bearer',
          expiresIn: env.jwtAccessTtlSeconds,
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

    const accessToken = signAccessToken({
      sub: admin.id,
      role: 'platform_admin',
      scope: 'platform',
      email: admin.email,
    });

    response.json({
      data: {
        accessToken,
        tokenType: 'Bearer',
          expiresIn: env.jwtAccessTtlSeconds,
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
  } catch (error) {
    next(error);
  }
});

export default router;
