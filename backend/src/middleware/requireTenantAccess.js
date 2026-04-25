import { HttpError } from '../lib/httpError.js';
import { assertPermission, loadTenantContext } from '../lib/tenantContext.js';

export async function requireTenantAccess(request, _response, next) {
  try {
    if (!request.auth) {
      throw new HttpError(401, 'AUTH_TOKEN_INVALID', 'Authentication is required');
    }

    if (request.auth.scope !== 'tenant') {
      throw new HttpError(
        403,
        'TENANT_SCOPE_REQUIRED',
        'This endpoint is available to tenant users only'
      );
    }

    const tenantContext = await loadTenantContext({
      companyId: request.auth.companyId,
      userId: request.auth.userId,
    });

    request.tenantContext = tenantContext;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireTenantPermission(permissionKey, options = {}) {
  const { planGate = null } = options;

  return (request, _response, next) => {
    try {
      if (!request.tenantContext) {
        throw new HttpError(500, 'TENANT_CONTEXT_MISSING', 'Tenant context is missing');
      }

      assertPermission(request.tenantContext, permissionKey);

      if (planGate && !request.tenantContext.plan?.[planGate]) {
        throw new HttpError(
          403,
          'PLAN_FEATURE_UNAVAILABLE',
          `Current subscription plan does not include ${planGate}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
