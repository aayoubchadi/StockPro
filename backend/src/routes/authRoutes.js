import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { query } from '../lib/db.js';
import { signAccessToken } from '../lib/authJwt.js';
import { HttpError } from '../lib/httpError.js';
import { loginRateLimiter } from '../middleware/authRateLimit.js';

const router = Router();

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

router.post('/login', loginRateLimiter, async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email);
    const password = String(request.body.password || '');
    const accountScope = String(request.body.accountScope || '').trim();

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
      const { rows } = await query(
        `SELECT id, company_id, full_name, email::text AS email, password_hash, role, is_active
         FROM users
         WHERE email = $1
         ORDER BY created_at ASC
         LIMIT 2`,
        [email]
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
          expiresIn: 900,
          user: {
            id: user.id,
            companyId: user.company_id,
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
        expiresIn: 900,
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
