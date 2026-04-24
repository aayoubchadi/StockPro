import { Router } from 'express';
import { query, withDbClient } from '../lib/db.js';
import { HttpError } from '../lib/httpError.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

function toNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
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

async function buildTenantOverview(companyId) {
  return runWithCompanyScope(companyId, async (client) => {
    const { rows: companyRows } = await client.query(
      `SELECT
         c.id,
         c.name,
         c.slug,
         c.is_active,
         c.created_at,
         sp.code AS plan_code,
         sp.name AS plan_name,
         sp.max_employees,
         sp.monthly_price_cents,
         sp.currency_code,
         sp.can_export_reports,
         sp.can_use_advanced_analytics,
         cs.status AS subscription_status,
         cs.provider_order_id,
         cs.starts_at,
         cs.ends_at,
         cs.amount_cents AS subscription_amount_cents
       FROM companies c
       JOIN subscription_plans sp ON sp.id = c.subscription_plan_id
       LEFT JOIN LATERAL (
         SELECT
           status,
           provider_order_id,
           starts_at,
           ends_at,
           amount_cents
         FROM company_subscriptions
         WHERE company_id = c.id
         ORDER BY created_at DESC
         LIMIT 1
       ) cs ON TRUE
       WHERE c.id = $1
       LIMIT 1`,
      [companyId]
    );

    if (companyRows.length !== 1) {
      throw new HttpError(404, 'DASHBOARD_COMPANY_NOT_FOUND', 'Company could not be resolved');
    }

    const company = companyRows[0];

    const { rows: userMetricRows } = await client.query(
      `SELECT
         COUNT(*) FILTER (WHERE role = 'employee' AND is_active = TRUE) AS active_employees,
         COUNT(*) FILTER (WHERE role = 'employee' AND is_active = FALSE) AS inactive_employees,
         COUNT(*) FILTER (WHERE role = 'company_admin' AND is_active = TRUE) AS active_company_admins
       FROM users
       WHERE company_id = $1`,
      [companyId]
    );

    const { rows: productMetricRows } = await client.query(
      `SELECT
         COUNT(*) FILTER (WHERE is_active = TRUE) AS active_products,
         COALESCE(SUM(quantity_in_stock) FILTER (WHERE is_active = TRUE), 0) AS stock_units,
         COALESCE(SUM(unit_price * quantity_in_stock) FILTER (WHERE is_active = TRUE), 0) AS stock_value,
         COUNT(*) FILTER (
           WHERE is_active = TRUE
             AND quantity_in_stock <= low_stock_threshold
         ) AS low_stock_products
       FROM products
       WHERE company_id = $1`,
      [companyId]
    );

    const { rows: movementMetricRows } = await client.query(
      `SELECT
         COALESCE(SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE 0 END), 0) AS movement_in_30d,
         COALESCE(SUM(CASE WHEN movement_type = 'out' THEN quantity ELSE 0 END), 0) AS movement_out_30d,
         COALESCE(SUM(CASE WHEN movement_type = 'adjustment' THEN quantity ELSE 0 END), 0) AS movement_adjustment_30d
       FROM stock_movements
       WHERE company_id = $1
         AND created_at >= NOW() - INTERVAL '30 days'`,
      [companyId]
    );

    const { rows: lowStockRows } = await client.query(
      `SELECT
         id,
         sku,
         name,
         quantity_in_stock,
         low_stock_threshold,
         unit_price
       FROM products
       WHERE company_id = $1
         AND is_active = TRUE
         AND quantity_in_stock <= low_stock_threshold
       ORDER BY (quantity_in_stock - low_stock_threshold) ASC, quantity_in_stock ASC
       LIMIT 6`,
      [companyId]
    );

    const { rows: recentMovementRows } = await client.query(
      `SELECT
         sm.id,
         sm.created_at,
         sm.movement_type,
         sm.quantity,
         sm.note,
         p.sku AS product_sku,
         p.name AS product_name,
         COALESCE(u.full_name, 'System') AS moved_by_name
       FROM stock_movements sm
       JOIN products p
         ON p.id = sm.product_id
        AND p.company_id = sm.company_id
       LEFT JOIN users u
         ON u.id = sm.moved_by
        AND u.company_id = sm.company_id
       WHERE sm.company_id = $1
       ORDER BY sm.created_at DESC
       LIMIT 8`,
      [companyId]
    );

    const { rows: topProductRows } = await client.query(
      `SELECT
         id,
         sku,
         name,
         quantity_in_stock,
         unit_price,
         (unit_price * quantity_in_stock) AS stock_value
       FROM products
       WHERE company_id = $1
         AND is_active = TRUE
       ORDER BY stock_value DESC, quantity_in_stock DESC
       LIMIT 5`,
      [companyId]
    );

    const userMetrics = userMetricRows[0] || {};
    const productMetrics = productMetricRows[0] || {};
    const movementMetrics = movementMetricRows[0] || {};

    const maxEmployees = toNumber(company.max_employees);
    const activeEmployees = toNumber(userMetrics.active_employees);

    return {
      scope: 'tenant',
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        isActive: company.is_active,
        createdAt: company.created_at,
      },
      plan: {
        code: company.plan_code,
        name: company.plan_name,
        maxEmployees,
        monthlyPriceCents: toNumber(company.monthly_price_cents),
        currencyCode: String(company.currency_code || 'EUR').toUpperCase(),
        canExportReports: Boolean(company.can_export_reports),
        canUseAdvancedAnalytics: Boolean(company.can_use_advanced_analytics),
      },
      subscription: {
        status: company.subscription_status || 'unknown',
        providerOrderId: company.provider_order_id || null,
        startsAt: company.starts_at || null,
        endsAt: company.ends_at || null,
        amountCents: company.subscription_amount_cents
          ? toNumber(company.subscription_amount_cents)
          : null,
      },
      metrics: {
        activeEmployees,
        inactiveEmployees: toNumber(userMetrics.inactive_employees),
        activeCompanyAdmins: toNumber(userMetrics.active_company_admins),
        employeeCapacityLeft: Math.max(0, maxEmployees - activeEmployees),
        employeeCapacityUsedPercent: maxEmployees > 0
          ? Math.round((activeEmployees / maxEmployees) * 100)
          : 0,
        activeProducts: toNumber(productMetrics.active_products),
        lowStockProducts: toNumber(productMetrics.low_stock_products),
        stockUnits: toNumber(productMetrics.stock_units),
        stockValue: toNumber(productMetrics.stock_value),
        movementIn30d: toNumber(movementMetrics.movement_in_30d),
        movementOut30d: toNumber(movementMetrics.movement_out_30d),
        movementAdjustment30d: toNumber(movementMetrics.movement_adjustment_30d),
      },
      lowStockProducts: lowStockRows.map((row) => ({
        id: row.id,
        sku: row.sku,
        name: row.name,
        quantityInStock: toNumber(row.quantity_in_stock),
        lowStockThreshold: toNumber(row.low_stock_threshold),
        unitPrice: toNumber(row.unit_price),
      })),
      recentMovements: recentMovementRows.map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        movementType: row.movement_type,
        quantity: toNumber(row.quantity),
        note: row.note || '',
        productSku: row.product_sku,
        productName: row.product_name,
        movedByName: row.moved_by_name,
      })),
      topProducts: topProductRows.map((row) => ({
        id: row.id,
        sku: row.sku,
        name: row.name,
        quantityInStock: toNumber(row.quantity_in_stock),
        unitPrice: toNumber(row.unit_price),
        stockValue: toNumber(row.stock_value),
      })),
    };
  });
}

async function buildPlatformOverview() {
  return withDbClient(async (client) => {
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_scope', 'platform', true)");

      const { rows: summaryRows } = await client.query(
        `SELECT
           (SELECT COUNT(*) FROM companies) AS total_companies,
           (SELECT COUNT(*) FROM companies WHERE is_active = TRUE) AS active_companies,
           (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS active_users,
           (SELECT COUNT(*) FROM users WHERE role = 'employee' AND is_active = TRUE) AS active_employees,
           (SELECT COUNT(*) FROM users WHERE role = 'company_admin' AND is_active = TRUE) AS active_company_admins,
           (SELECT COUNT(*) FROM platform_admins WHERE is_active = TRUE) AS active_platform_admins,
           (SELECT COALESCE(SUM(amount_cents), 0)
              FROM company_subscriptions
             WHERE status = 'active') AS mrr_cents`
      );

      const { rows: recentCompanyRows } = await client.query(
        `SELECT
           c.id,
           c.name,
           c.slug,
           c.is_active,
           c.created_at,
           sp.code AS plan_code,
           sp.name AS plan_name,
           sp.max_employees,
           COALESCE((
             SELECT COUNT(*)
             FROM users u
             WHERE u.company_id = c.id
               AND u.role = 'employee'
               AND u.is_active = TRUE
           ), 0) AS active_employees,
           cs.status AS subscription_status,
           cs.amount_cents AS subscription_amount_cents,
           cs.currency_code AS subscription_currency_code
         FROM companies c
         JOIN subscription_plans sp ON sp.id = c.subscription_plan_id
         LEFT JOIN LATERAL (
           SELECT status, amount_cents, currency_code
           FROM company_subscriptions
           WHERE company_id = c.id
           ORDER BY created_at DESC
           LIMIT 1
         ) cs ON TRUE
         ORDER BY c.created_at DESC
         LIMIT 8`
      );

      const { rows: planDistributionRows } = await client.query(
        `SELECT
           sp.code,
           sp.name,
           sp.max_employees,
           COUNT(c.id) AS companies_count,
           COALESCE(SUM(cs.amount_cents), 0) AS monthly_revenue_cents
         FROM subscription_plans sp
         LEFT JOIN companies c
           ON c.subscription_plan_id = sp.id
         LEFT JOIN company_subscriptions cs
           ON cs.company_id = c.id
          AND cs.status = 'active'
         GROUP BY sp.code, sp.name, sp.max_employees
         ORDER BY sp.max_employees ASC`
      );

      const { rows: lowStockAcrossCompaniesRows } = await client.query(
        `SELECT
           c.name AS company_name,
           c.slug AS company_slug,
           p.sku,
           p.name AS product_name,
           p.quantity_in_stock,
           p.low_stock_threshold
         FROM products p
         JOIN companies c ON c.id = p.company_id
         WHERE p.is_active = TRUE
           AND p.quantity_in_stock <= p.low_stock_threshold
         ORDER BY (p.quantity_in_stock - p.low_stock_threshold) ASC, p.quantity_in_stock ASC
         LIMIT 10`
      );

      await client.query('COMMIT');

      const summary = summaryRows[0] || {};

      return {
        scope: 'platform',
        metrics: {
          totalCompanies: toNumber(summary.total_companies),
          activeCompanies: toNumber(summary.active_companies),
          activeUsers: toNumber(summary.active_users),
          activeEmployees: toNumber(summary.active_employees),
          activeCompanyAdmins: toNumber(summary.active_company_admins),
          activePlatformAdmins: toNumber(summary.active_platform_admins),
          monthlyRecurringRevenueCents: toNumber(summary.mrr_cents),
        },
        recentCompanies: recentCompanyRows.map((row) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          isActive: row.is_active,
          createdAt: row.created_at,
          activeEmployees: toNumber(row.active_employees),
          plan: {
            code: row.plan_code,
            name: row.plan_name,
            maxEmployees: toNumber(row.max_employees),
          },
          subscription: {
            status: row.subscription_status || 'unknown',
            amountCents: row.subscription_amount_cents
              ? toNumber(row.subscription_amount_cents)
              : null,
            currencyCode: row.subscription_currency_code || null,
          },
        })),
        planDistribution: planDistributionRows.map((row) => ({
          code: row.code,
          name: row.name,
          maxEmployees: toNumber(row.max_employees),
          companiesCount: toNumber(row.companies_count),
          monthlyRevenueCents: toNumber(row.monthly_revenue_cents),
        })),
        lowStockAlerts: lowStockAcrossCompaniesRows.map((row) => ({
          companyName: row.company_name,
          companySlug: row.company_slug,
          sku: row.sku,
          productName: row.product_name,
          quantityInStock: toNumber(row.quantity_in_stock),
          lowStockThreshold: toNumber(row.low_stock_threshold),
        })),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

router.get('/overview', requireAuth, async (request, response, next) => {
  try {
    if (request.auth.scope === 'platform') {
      const platformOverview = await buildPlatformOverview();

      response.json({
        data: platformOverview,
      });

      return;
    }

    if (!request.auth.companyId) {
      throw new HttpError(400, 'DASHBOARD_COMPANY_REQUIRED', 'Company context is required');
    }

    const tenantOverview = await buildTenantOverview(request.auth.companyId);

    response.json({
      data: tenantOverview,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
