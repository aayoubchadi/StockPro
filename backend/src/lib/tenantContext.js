import { HttpError } from './httpError.js';
import { withDbClient } from './db.js';
import {
  extractEnabledPermissions,
  PERMISSION_KEYS,
  resolveEffectivePermissions,
} from './permissions.js';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isDemoExpired(company) {
  if (!company?.is_demo || !company?.demo_expires_at) {
    return false;
  }

  return new Date(company.demo_expires_at).getTime() <= Date.now();
}

export async function runWithCompanyScope(companyId, operation) {
  return withDbClient(async (client) => {
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_company_id', $1, true)", [
        companyId,
      ]);

      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

export async function loadTenantContext({ companyId, userId }) {
  if (!companyId) {
    throw new HttpError(400, 'TENANT_COMPANY_REQUIRED', 'Company context is required');
  }

  if (!userId) {
    throw new HttpError(401, 'AUTH_TOKEN_INVALID', 'Invalid tenant principal');
  }

  return runWithCompanyScope(companyId, async (client) => {
    const { rows: userRows } = await client.query(
      `SELECT
         u.id,
         u.company_id,
         u.full_name,
         u.email::text AS email,
         u.role,
         u.permissions,
         u.is_active,
         c.name AS company_name,
         c.slug AS company_slug,
         c.is_active AS company_is_active,
         c.is_demo,
         c.demo_expires_at,
         sp.code AS plan_code,
         sp.name AS plan_name,
         sp.max_employees,
         sp.monthly_price_cents,
         sp.currency_code,
         sp.can_export_reports,
         sp.can_use_advanced_analytics
       FROM users u
       JOIN companies c ON c.id = u.company_id
       JOIN subscription_plans sp ON sp.id = c.subscription_plan_id
       WHERE u.id = $1
         AND u.company_id = $2
       LIMIT 1`,
      [userId, companyId]
    );

    const row = userRows[0];

    if (!row) {
      throw new HttpError(401, 'AUTH_TOKEN_INVALID', 'Tenant account could not be resolved');
    }

    if (!row.is_active) {
      throw new HttpError(403, 'AUTH_ACCOUNT_DISABLED', 'Account is disabled');
    }

    if (!row.company_is_active) {
      throw new HttpError(403, 'COMPANY_DISABLED', 'Company workspace is inactive');
    }

    if (isDemoExpired(row)) {
      throw new HttpError(
        403,
        'DEMO_EXPIRED',
        'This demo workspace has expired. Please upgrade to a paid plan.'
      );
    }

    const { rows: metricRows } = await client.query(
      `SELECT
         COUNT(*) FILTER (WHERE role = 'employee' AND is_active = TRUE) AS active_employees,
         COUNT(*) FILTER (WHERE role = 'employee') AS total_employees
       FROM users
       WHERE company_id = $1`,
      [companyId]
    );

    const metrics = metricRows[0] || {};
    const maxEmployees = toNumber(row.max_employees, 0);
    const activeEmployees = toNumber(metrics.active_employees, 0);
    const effectivePermissions = resolveEffectivePermissions(
      row.role,
      row.permissions || {}
    );

    return {
      user: {
        id: row.id,
        companyId: row.company_id,
        fullName: row.full_name,
        email: row.email,
        role: row.role,
        permissions: row.permissions || {},
        effectivePermissions,
        effectivePermissionList: extractEnabledPermissions(effectivePermissions),
      },
      company: {
        id: row.company_id,
        name: row.company_name,
        slug: row.company_slug,
        isActive: Boolean(row.company_is_active),
        isDemo: Boolean(row.is_demo),
        demoExpiresAt: row.demo_expires_at,
      },
      plan: {
        code: row.plan_code,
        name: row.plan_name,
        maxEmployees,
        monthlyPriceCents: toNumber(row.monthly_price_cents, 0),
        currencyCode: String(row.currency_code || 'EUR').toUpperCase(),
        canExportReports: Boolean(row.can_export_reports),
        canUseAdvancedAnalytics: Boolean(row.can_use_advanced_analytics),
      },
      capacity: {
        activeEmployees,
        totalEmployees: toNumber(metrics.total_employees, 0),
        maxEmployees,
        employeeCapacityLeft: Math.max(0, maxEmployees - activeEmployees),
      },
    };
  });
}

export function assertPermission(tenantContext, permissionKey) {
  if (!PERMISSION_KEYS.includes(permissionKey)) {
    throw new HttpError(500, 'PERMISSION_UNKNOWN', `Unknown permission key: ${permissionKey}`);
  }

  if (!tenantContext?.user?.effectivePermissions?.[permissionKey]) {
    throw new HttpError(
      403,
      'PERMISSION_DENIED',
      `Missing required permission: ${permissionKey}`
    );
  }
}
