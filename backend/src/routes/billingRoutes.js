import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { query, withDbClient } from '../lib/db.js';
import { HttpError } from '../lib/httpError.js';
import { validatePasswordPolicy } from '../lib/passwordPolicy.js';
import {
  authorizePayPalOrder,
  capturePayPalOrder,
  createPayPalOrder,
  voidPayPalAuthorization,
} from '../lib/paypalClient.js';
import { env } from '../config/env.js';
import { signAccessToken } from '../lib/authJwt.js';
import {
  createAuthSession,
  createRefreshTokenRecord,
} from '../lib/authSessionStore.js';
import { generateRefreshToken, hashRefreshToken } from '../lib/refreshToken.js';
import {
  extractEnabledPermissions,
  resolveEffectivePermissions,
} from '../lib/permissions.js';
import { runWithCompanyScope } from '../lib/tenantContext.js';

const router = Router();

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function slugifyCompanyName(value) {
  return normalizeValue(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function parseAmountToCents(amountValue) {
  const normalized = String(amountValue || '').trim();

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [wholePart, decimalPart = ''] = normalized.split('.');
  const cents = Number(wholePart) * 100 + Number(decimalPart.padEnd(2, '0'));

  return Number.isInteger(cents) ? cents : null;
}

function expirationDateFromNow(seconds) {
  return new Date(Date.now() + seconds * 1000);
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

function normalizeCompanySlug(companyName, requestedSlug) {
  const normalizedRequestedSlug = normalizeValue(requestedSlug)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  if (normalizedRequestedSlug) {
    return normalizedRequestedSlug;
  }

  return slugifyCompanyName(companyName);
}

async function getPublicPlanByCode(planCode) {
  const normalizedCode = normalizeValue(planCode);

  if (!normalizedCode) {
    throw new HttpError(400, 'BILLING_VALIDATION_ERROR', 'planCode is required');
  }

  const { rows } = await query(
    `SELECT
       id,
       code,
       name,
       monthly_price_cents,
       currency_code,
       max_employees,
       can_export_reports,
       can_use_advanced_analytics
     FROM subscription_plans
     WHERE code = $1
       AND monthly_price_cents > 0
     LIMIT 1`,
    [normalizedCode]
  );

  if (rows.length !== 1) {
    throw new HttpError(404, 'BILLING_PLAN_NOT_FOUND', 'Selected subscription plan was not found');
  }

  return rows[0];
}

async function getDemoPlan() {
  const { rows } = await query(
    `SELECT
       id,
       code,
       name,
       monthly_price_cents,
       currency_code,
       max_employees,
       can_export_reports,
       can_use_advanced_analytics
     FROM subscription_plans
     WHERE code = 'demo_free'
     LIMIT 1`
  );

  if (rows.length !== 1) {
    throw new HttpError(
      500,
      'BILLING_DEMO_PLAN_MISSING',
      'Demo plan demo_free is missing. Re-run database seed.'
    );
  }

  return rows[0];
}

async function buildTenantLoginPayload({ companyId, userId }) {
  const tenantContext = await runWithCompanyScope(companyId, async (client) => {
    const { rows } = await client.query(
      `SELECT
         u.id,
         u.company_id,
         u.full_name,
         u.email::text AS email,
         u.role,
         u.permissions,
         c.slug AS company_slug,
         c.name AS company_name,
         c.is_demo,
         c.demo_expires_at,
         sp.code AS plan_code,
         sp.name AS plan_name,
         sp.max_employees,
         sp.can_export_reports,
         sp.can_use_advanced_analytics,
         sp.currency_code
       FROM users u
       JOIN companies c ON c.id = u.company_id
       JOIN subscription_plans sp ON sp.id = c.subscription_plan_id
       WHERE u.id = $1
         AND u.company_id = $2
       LIMIT 1`,
      [userId, companyId]
    );

    return rows[0] || null;
  });

  if (!tenantContext) {
    throw new HttpError(
      500,
      'BILLING_TENANT_CONTEXT_MISSING',
      'Could not resolve tenant context after provisioning'
    );
  }

  const effectivePermissions = resolveEffectivePermissions(
    tenantContext.role,
    tenantContext.permissions || {}
  );

  return {
    id: tenantContext.id,
    companyId: tenantContext.company_id,
    companySlug: tenantContext.company_slug,
    fullName: tenantContext.full_name,
    email: tenantContext.email,
    role: tenantContext.role,
    scope: 'tenant',
    permissions: tenantContext.permissions || {},
    effectivePermissions,
    effectivePermissionList: extractEnabledPermissions(effectivePermissions),
    company: {
      id: tenantContext.company_id,
      name: tenantContext.company_name,
      slug: tenantContext.company_slug,
      isDemo: Boolean(tenantContext.is_demo),
      demoExpiresAt: tenantContext.demo_expires_at,
    },
    plan: {
      code: tenantContext.plan_code,
      name: tenantContext.plan_name,
      maxEmployees: Number(tenantContext.max_employees || 0),
      canExportReports: Boolean(tenantContext.can_export_reports),
      canUseAdvancedAnalytics: Boolean(tenantContext.can_use_advanced_analytics),
      currencyCode: String(tenantContext.currency_code || 'EUR').toUpperCase(),
    },
  };
}

async function ensureUniqueCompanySlug(client, baseSlug) {
  const normalizedBaseSlug = normalizeValue(baseSlug)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  if (!normalizedBaseSlug || normalizedBaseSlug.length < 3) {
    throw new HttpError(
      400,
      'BILLING_VALIDATION_ERROR',
      'companySlug must resolve to at least 3 characters'
    );
  }

  const { rows: exactRows } = await client.query(
    `SELECT id
     FROM companies
     WHERE slug = $1
     LIMIT 1`,
    [normalizedBaseSlug]
  );

  if (exactRows.length === 0) {
    return normalizedBaseSlug;
  }

  for (let suffix = 2; suffix <= 999; suffix += 1) {
    const candidateSlug = `${normalizedBaseSlug}-${suffix}`.slice(0, 60);

    const { rows } = await client.query(
      `SELECT id
       FROM companies
       WHERE slug = $1
       LIMIT 1`,
      [candidateSlug]
    );

    if (rows.length === 0) {
      return candidateSlug;
    }
  }

  throw new HttpError(
    409,
    'BILLING_COMPANY_SLUG_CONFLICT',
    'Could not allocate a unique company slug for this company name'
  );
}

function mapPlanRow(plan) {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    monthlyPriceCents: Number(plan.monthly_price_cents),
    currencyCode: String(plan.currency_code || 'EUR').toUpperCase(),
    maxEmployees: Number(plan.max_employees),
    features: {
      canExportReports: Boolean(plan.can_export_reports),
      canUseAdvancedAnalytics: Boolean(plan.can_use_advanced_analytics),
    },
  };
}

router.get('/plans', async (_request, response, next) => {
  try {
    const { rows } = await query(
      `SELECT
         id,
         code,
         name,
         monthly_price_cents,
         currency_code,
         max_employees,
         can_export_reports,
         can_use_advanced_analytics
       FROM subscription_plans
       WHERE monthly_price_cents > 0
       ORDER BY max_employees ASC`
    );

    response.json({
      data: {
        plans: rows.map(mapPlanRow),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/demo/paypal/orders', async (_request, response, next) => {
  try {
    await getDemoPlan();

    const order = await createPayPalOrder({
      amountCents: 100,
      currencyCode: 'USD',
      description: 'StockPro demo verification hold',
      customId: 'demo_verification',
      intent: 'AUTHORIZE',
    });

    if (!order.id) {
      throw new HttpError(502, 'PAYPAL_ORDER_CREATE_FAILED', 'PayPal order id is missing');
    }

    await query(
      `INSERT INTO demo_verifications (order_id, status, raw_payload)
       VALUES ($1, 'pending', $2::jsonb)
       ON CONFLICT (order_id) DO UPDATE
       SET status = 'pending',
           raw_payload = EXCLUDED.raw_payload,
           updated_at = NOW()`,
      [order.id, JSON.stringify(order.raw || {})]
    );

    response.status(201).json({
      data: {
        orderId: order.id,
        status: order.status,
        approveLink: order.approveLink,
        holdAmountCents: 100,
        holdCurrencyCode: 'USD',
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/demo/paypal/orders/:orderId/verify', async (request, response, next) => {
  try {
    const orderId = normalizeValue(request.params.orderId);
    const companyName = normalizeValue(request.body.companyName);
    const requestedCompanySlug = normalizeValue(request.body.companySlug);
    const adminFullName = normalizeValue(request.body.adminFullName);
    const adminEmail = normalizeEmail(request.body.adminEmail);
    const adminPassword = normalizeValue(request.body.adminPassword);

    if (!orderId) {
      throw new HttpError(400, 'PAYPAL_ORDER_ID_REQUIRED', 'orderId is required');
    }

    if (!companyName || !adminFullName || !adminEmail || !adminPassword) {
      throw new HttpError(
        400,
        'BILLING_VALIDATION_ERROR',
        'companyName, adminFullName, adminEmail, and adminPassword are required'
      );
    }

    if (companyName.length < 2 || companyName.length > 180) {
      throw new HttpError(
        400,
        'BILLING_VALIDATION_ERROR',
        'companyName must be between 2 and 180 characters'
      );
    }

    if (adminFullName.length < 2 || adminFullName.length > 120) {
      throw new HttpError(
        400,
        'BILLING_VALIDATION_ERROR',
        'adminFullName must be between 2 and 120 characters'
      );
    }

    const passwordValidation = validatePasswordPolicy(adminPassword, adminEmail);
    if (!passwordValidation.isValid) {
      throw new HttpError(
        400,
        'AUTH_VALIDATION_ERROR',
        'Password does not meet security policy',
        passwordValidation.errors
      );
    }

    const demoPlan = await getDemoPlan();
    const authorizedOrder = await authorizePayPalOrder(orderId);
    const authorizationId = normalizeValue(
      authorizedOrder.raw?.purchase_units?.[0]?.payments?.authorizations?.[0]?.id
    );
    const authorizedAmount = normalizeValue(
      authorizedOrder.raw?.purchase_units?.[0]?.payments?.authorizations?.[0]?.amount?.value
    );
    const authorizedCurrency = normalizeValue(
      authorizedOrder.raw?.purchase_units?.[0]?.payments?.authorizations?.[0]?.amount?.currency_code
    ).toUpperCase();

    if (!authorizationId) {
      throw new HttpError(
        409,
        'PAYPAL_DEMO_AUTHORIZATION_MISSING',
        'PayPal authorization id is missing for demo verification'
      );
    }

    if (parseAmountToCents(authorizedAmount) !== 100 || authorizedCurrency !== 'USD') {
      throw new HttpError(
        409,
        'PAYPAL_DEMO_AMOUNT_MISMATCH',
        'Demo verification amount must be exactly $1.00 USD'
      );
    }

    const voidedAuthorization = await voidPayPalAuthorization(authorizationId);
    const normalizedCompanySlug = normalizeCompanySlug(companyName, requestedCompanySlug);
    const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

    const created = await withDbClient(async (client) => {
      try {
        await client.query('BEGIN');
        await client.query("SELECT set_config('app.current_scope', 'platform', true)");

        const { rows: verificationRows } = await client.query(
          `SELECT id, status, company_id
           FROM demo_verifications
           WHERE order_id = $1
           LIMIT 1`,
          [orderId]
        );

        if (
          verificationRows.length === 1 &&
          verificationRows[0].status === 'verified' &&
          verificationRows[0].company_id
        ) {
          throw new HttpError(
            409,
            'BILLING_ORDER_ALREADY_CONSUMED',
            'This demo verification order has already been used'
          );
        }

        const uniqueCompanySlug = await ensureUniqueCompanySlug(client, normalizedCompanySlug);

        const { rows: companyRows } = await client.query(
          `INSERT INTO companies (
             name,
             slug,
             subscription_plan_id,
             is_demo,
             demo_expires_at
           )
           VALUES ($1, $2, $3, TRUE, NOW() + INTERVAL '14 days')
           RETURNING id, name, slug, is_active, is_demo, demo_expires_at, created_at`,
          [companyName, uniqueCompanySlug, demoPlan.id]
        );

        const company = companyRows[0];

        const { rows: userRows } = await client.query(
          `INSERT INTO users (company_id, full_name, email, password_hash, role, permissions)
           VALUES ($1, $2, $3, $4, 'company_admin', '{}'::jsonb)
           RETURNING id, company_id, full_name, email::text AS email, role, permissions, is_active, created_at`,
          [company.id, adminFullName, adminEmail, adminPasswordHash]
        );

        const user = userRows[0];

        await client.query(
          `INSERT INTO demo_verifications (
             order_id,
             authorization_id,
             status,
             company_id,
             admin_email,
             raw_payload,
             verified_at
           )
           VALUES ($1, $2, 'verified', $3, $4, $5::jsonb, NOW())
           ON CONFLICT (order_id) DO UPDATE
           SET authorization_id = EXCLUDED.authorization_id,
               status = 'verified',
               company_id = EXCLUDED.company_id,
               admin_email = EXCLUDED.admin_email,
               raw_payload = EXCLUDED.raw_payload,
               verified_at = NOW(),
               updated_at = NOW()`,
          [
            orderId,
            authorizationId,
            company.id,
            adminEmail,
            JSON.stringify({
              order: authorizedOrder.raw || {},
              voidResult: voidedAuthorization.raw || { status: voidedAuthorization.status },
            }),
          ]
        );

        await client.query('COMMIT');

        return {
          company,
          user,
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });

    const authUser = await buildTenantLoginPayload({
      companyId: created.company.id,
      userId: created.user.id,
    });

    const tokens = await issueSessionTokens({
      principalId: created.user.id,
      scope: 'tenant',
      role: 'company_admin',
      companyId: created.company.id,
      email: created.user.email,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
    });

    response.status(201).json({
      data: {
        accessToken: tokens.accessToken,
        tokenType: 'Bearer',
        expiresIn: env.jwtAccessTtlSeconds,
        refreshToken: tokens.refreshToken,
        refreshExpiresIn: env.jwtRefreshTtlSeconds,
        user: authUser,
        company: {
          id: created.company.id,
          name: created.company.name,
          slug: created.company.slug,
          isActive: created.company.is_active,
          isDemo: created.company.is_demo,
          demoExpiresAt: created.company.demo_expires_at,
          createdAt: created.company.created_at,
        },
        verification: {
          orderId,
          authorizationId,
          status: 'verified',
          voidStatus: voidedAuthorization.status,
        },
      },
    });
  } catch (error) {
    if (error?.code === '23505') {
      if (error.constraint === 'companies_name_key') {
        next(
          new HttpError(
            409,
            'BILLING_COMPANY_NAME_EXISTS',
            'A company with this name already exists'
          )
        );
        return;
      }

      if (error.constraint === 'companies_slug_key') {
        next(
          new HttpError(
            409,
            'BILLING_COMPANY_SLUG_EXISTS',
            'A company with this slug already exists'
          )
        );
        return;
      }

      if (error.constraint === 'uq_users_company_email' || error.constraint === 'users_email_key') {
        next(
          new HttpError(
            409,
            'BILLING_ADMIN_EMAIL_EXISTS',
            'This admin email is already in use. Please use a different email.'
          )
        );
        return;
      }
    }

    next(error);
  }
});

router.post('/paypal/orders', async (request, response, next) => {
  try {
    const plan = await getPublicPlanByCode(request.body.planCode);

    const order = await createPayPalOrder({
      amountCents: Number(plan.monthly_price_cents),
      currencyCode: plan.currency_code,
      description: `StockPro ${plan.name} monthly subscription`,
      customId: plan.code,
    });

    if (!order.id) {
      throw new HttpError(502, 'PAYPAL_ORDER_CREATE_FAILED', 'PayPal order id is missing');
    }

    response.status(201).json({
      data: {
        orderId: order.id,
        status: order.status,
        approveLink: order.approveLink,
        plan: mapPlanRow(plan),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/paypal/orders/:orderId/capture', async (request, response, next) => {
  try {
    const orderId = normalizeValue(request.params.orderId);

    if (!orderId) {
      throw new HttpError(400, 'PAYPAL_ORDER_ID_REQUIRED', 'orderId is required');
    }

    const plan = await getPublicPlanByCode(request.body.planCode);

    const companyName = normalizeValue(request.body.companyName);
    const requestedCompanySlug = normalizeValue(request.body.companySlug);
    const adminFullName = normalizeValue(request.body.adminFullName);
    const adminEmail = normalizeEmail(request.body.adminEmail);
    const adminPassword = normalizeValue(request.body.adminPassword);

    if (!companyName || !adminFullName || !adminEmail || !adminPassword) {
      throw new HttpError(
        400,
        'BILLING_VALIDATION_ERROR',
        'companyName, adminFullName, adminEmail, and adminPassword are required'
      );
    }

    if (companyName.length < 2 || companyName.length > 180) {
      throw new HttpError(
        400,
        'BILLING_VALIDATION_ERROR',
        'companyName must be between 2 and 180 characters'
      );
    }

    if (adminFullName.length < 2 || adminFullName.length > 120) {
      throw new HttpError(
        400,
        'BILLING_VALIDATION_ERROR',
        'adminFullName must be between 2 and 120 characters'
      );
    }

    const passwordValidation = validatePasswordPolicy(adminPassword, adminEmail);

    if (!passwordValidation.isValid) {
      throw new HttpError(
        400,
        'AUTH_VALIDATION_ERROR',
        'Password does not meet security policy',
        passwordValidation.errors
      );
    }

    const capturedOrder = await capturePayPalOrder(orderId);

    if (capturedOrder.status !== 'COMPLETED') {
      throw new HttpError(
        409,
        'PAYPAL_CAPTURE_INCOMPLETE',
        'PayPal order is not completed yet'
      );
    }

    const purchaseUnit = capturedOrder.raw?.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0] || null;
    const capturedCurrencyCode = String(
      capture?.amount?.currency_code || purchaseUnit?.amount?.currency_code || ''
    ).toUpperCase();
    const capturedAmountCents = parseAmountToCents(
      capture?.amount?.value || purchaseUnit?.amount?.value
    );
    const capturedCustomId = normalizeValue(purchaseUnit?.custom_id);

    if (!capturedAmountCents || capturedCurrencyCode !== String(plan.currency_code || 'EUR').toUpperCase()) {
      throw new HttpError(
        409,
        'PAYPAL_CAPTURE_AMOUNT_MISMATCH',
        'Captured currency did not match selected plan'
      );
    }

    if (capturedAmountCents !== Number(plan.monthly_price_cents)) {
      throw new HttpError(
        409,
        'PAYPAL_CAPTURE_AMOUNT_MISMATCH',
        'Captured amount did not match selected plan'
      );
    }

    if (capturedCustomId && capturedCustomId !== plan.code) {
      throw new HttpError(
        409,
        'PAYPAL_CAPTURE_PLAN_MISMATCH',
        'Captured PayPal order does not match selected plan'
      );
    }

    const providerOrderId = orderId;

    const normalizedCompanySlug = normalizeCompanySlug(companyName, requestedCompanySlug);
    const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

    const created = await withDbClient(async (client) => {
      try {
        await client.query('BEGIN');
        await client.query("SELECT set_config('app.current_scope', 'platform', true)");

        const { rows: existingSubscriptionRows } = await client.query(
          `SELECT id
           FROM company_subscriptions
           WHERE provider_order_id = $1
           LIMIT 1`,
          [providerOrderId]
        );

        if (existingSubscriptionRows.length > 0) {
          throw new HttpError(
            409,
            'BILLING_ORDER_ALREADY_CONSUMED',
            'This PayPal payment was already used to create a subscription'
          );
        }

        const uniqueCompanySlug = await ensureUniqueCompanySlug(client, normalizedCompanySlug);

        const { rows: companyRows } = await client.query(
          `INSERT INTO companies (name, slug, subscription_plan_id)
           VALUES ($1, $2, $3)
           RETURNING id, name, slug, is_active, created_at`,
          [companyName, uniqueCompanySlug, plan.id]
        );

        const company = companyRows[0];

        const { rows: userRows } = await client.query(
          `INSERT INTO users (company_id, full_name, email, password_hash, role)
           VALUES ($1, $2, $3, $4, 'company_admin')
           RETURNING id, company_id, full_name, email::text AS email, role, is_active, created_at`,
          [company.id, adminFullName, adminEmail, adminPasswordHash]
        );

        const user = userRows[0];

        const { rows: subscriptionRows } = await client.query(
          `INSERT INTO company_subscriptions (
             company_id,
             subscription_plan_id,
             provider,
             provider_order_id,
             status,
             amount_cents,
             currency_code,
             payer_email,
             raw_payload,
             starts_at
           )
           VALUES ($1, $2, 'paypal', $3, 'active', $4, $5, $6, $7::jsonb, NOW())
           RETURNING id, company_id, subscription_plan_id, provider_order_id, status, amount_cents, currency_code, payer_email, starts_at, created_at`,
          [
            company.id,
            plan.id,
            providerOrderId,
            Number(plan.monthly_price_cents),
            String(plan.currency_code || 'EUR').toUpperCase(),
            normalizeEmail(capturedOrder.raw?.payer?.email_address),
            JSON.stringify(capturedOrder.raw || {}),
          ]
        );

        await client.query('COMMIT');

        return {
          company,
          user,
          subscription: subscriptionRows[0],
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });

    response.status(201).json({
      data: {
        company: {
          id: created.company.id,
          name: created.company.name,
          slug: created.company.slug,
          isActive: created.company.is_active,
          createdAt: created.company.created_at,
        },
        user: {
          id: created.user.id,
          companyId: created.user.company_id,
          fullName: created.user.full_name,
          email: created.user.email,
          role: created.user.role,
          isActive: created.user.is_active,
          createdAt: created.user.created_at,
        },
        subscription: {
          id: created.subscription.id,
          providerOrderId: created.subscription.provider_order_id,
          status: created.subscription.status,
          amountCents: Number(created.subscription.amount_cents),
          currencyCode: created.subscription.currency_code,
          payerEmail: created.subscription.payer_email,
          startsAt: created.subscription.starts_at,
          createdAt: created.subscription.created_at,
        },
      },
    });
  } catch (error) {
    if (error?.code === '23505') {
      if (error.constraint === 'companies_name_key') {
        next(
          new HttpError(
            409,
            'BILLING_COMPANY_NAME_EXISTS',
            'A company with this name already exists'
          )
        );
        return;
      }

      if (error.constraint === 'companies_slug_key') {
        next(
          new HttpError(
            409,
            'BILLING_COMPANY_SLUG_EXISTS',
            'A company with this slug already exists'
          )
        );
        return;
      }

      if (error.constraint === 'company_subscriptions_provider_order_id_key') {
        next(
          new HttpError(
            409,
            'BILLING_ORDER_ALREADY_CONSUMED',
            'This PayPal payment was already used to create a subscription'
          )
        );
        return;
      }

      if (error.constraint === 'uq_company_subscriptions_one_active_per_company') {
        next(
          new HttpError(
            409,
            'BILLING_ACTIVE_SUBSCRIPTION_EXISTS',
            'This company already has an active subscription'
          )
        );
        return;
      }

      if (error.constraint === 'uq_users_company_email' || error.constraint === 'users_email_key') {
        next(
          new HttpError(
            409,
            'BILLING_ADMIN_EMAIL_EXISTS',
            'This admin email is already in use. Please use a different email.'
          )
        );
        return;
      }

      if (error.constraint === 'uq_users_one_active_admin_per_company') {
        next(
          new HttpError(
            409,
            'BILLING_COMPANY_ADMIN_EXISTS',
            'This company already has an active admin account'
          )
        );
        return;
      }
    }

    if (error?.code === '42501') {
      next(
        new HttpError(
          500,
          'BILLING_DB_POLICY_ERROR',
          'Billing write was blocked by database policy configuration'
        )
      );
      return;
    }

    if (error?.code === '42703' || error?.code === '42P01') {
      next(
        new HttpError(
          500,
          'BILLING_SCHEMA_OUTDATED',
          'Billing database schema is outdated. Apply backend/db/schema.sql and retry.'
        )
      );
      return;
    }

    next(error);
  }
});

export default router;
