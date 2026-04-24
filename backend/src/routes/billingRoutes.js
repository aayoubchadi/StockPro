import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { query, withDbClient } from '../lib/db.js';
import { HttpError } from '../lib/httpError.js';
import { validatePasswordPolicy } from '../lib/passwordPolicy.js';
import { capturePayPalOrder, createPayPalOrder } from '../lib/paypalClient.js';

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

    const providerOrderId = normalizeValue(capture?.id || capturedOrder.id);

    if (!providerOrderId) {
      throw new HttpError(
        502,
        'PAYPAL_CAPTURE_INVALID',
        'Captured order id is missing from PayPal response'
      );
    }

    const normalizedCompanySlug = normalizeCompanySlug(companyName, requestedCompanySlug);
    const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

    const created = await withDbClient(async (client) => {
      try {
        await client.query('BEGIN');

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
    }

    next(error);
  }
});

export default router;
