import { Navigate } from 'react-router-dom';
import {
  getFirstAllowedWorkspacePath,
  getRoleFromSession,
  getSession,
  hasPermissionInSession,
} from '../lib/authStore';

export default function RequireWorkspaceAccess({
  children,
  requireAdmin = false,
  requiredPermissions = [],
  requiredAnyPermissions = [],
}) {
  const session = getSession();

  if (!session?.accessToken || !session?.user?.email) {
    return <Navigate to="/login" replace />;
  }

  const role = getRoleFromSession(session);

  if (requireAdmin && role !== 'company_admin') {
    return <Navigate to={getFirstAllowedWorkspacePath(session)} replace />;
  }

  if (Array.isArray(requiredPermissions) && requiredPermissions.length > 0) {
    const isAllowed = requiredPermissions.every((permission) =>
      hasPermissionInSession(session, permission)
    );

    if (!isAllowed) {
      return <Navigate to={getFirstAllowedWorkspacePath(session)} replace />;
    }
  }

  if (Array.isArray(requiredAnyPermissions) && requiredAnyPermissions.length > 0) {
    const hasAnyPermission = requiredAnyPermissions.some((permission) =>
      hasPermissionInSession(session, permission)
    );

    if (!hasAnyPermission) {
      return <Navigate to={getFirstAllowedWorkspacePath(session)} replace />;
    }
  }

  return children;
}
