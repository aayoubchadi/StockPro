import { query } from './db.js';

let userPermissionsColumnCapabilitiesPromise = null;

async function loadUserPermissionsColumnCapabilities() {
  if (!userPermissionsColumnCapabilitiesPromise) {
    userPermissionsColumnCapabilitiesPromise = (async () => {
      const { rows } = await query(`SELECT
        EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'permissions'
        ) AS has_permissions`);

      return {
        hasPermissions: Boolean(rows[0]?.has_permissions),
      };
    })().catch((error) => {
      userPermissionsColumnCapabilitiesPromise = null;
      throw error;
    });
  }

  return userPermissionsColumnCapabilitiesPromise;
}

export async function buildUserPermissionsSelect(alias = 'u', prefix = 'permissions') {
  const capabilities = await loadUserPermissionsColumnCapabilities();

  if (capabilities.hasPermissions) {
    return `${alias}.permissions AS ${prefix}`;
  }

  return `'{}'::jsonb AS ${prefix}`;
}

export async function hasUserPermissionsColumn() {
  const capabilities = await loadUserPermissionsColumnCapabilities();
  return capabilities.hasPermissions;
}

export async function buildUserPermissionsInsertFragments() {
  const capabilities = await loadUserPermissionsColumnCapabilities();

  if (capabilities.hasPermissions) {
    return {
      insertColumns: 'company_id, full_name, email, password_hash, role, permissions',
      insertValues: '$1, $2, $3, $4, $5, $6::jsonb',
      returningColumns:
        'id, company_id, full_name, email::text AS email, role, permissions, is_active, created_at',
    };
  }

  return {
    insertColumns: 'company_id, full_name, email, password_hash, role',
    insertValues: '$1, $2, $3, $4, $5',
    returningColumns:
      "id, company_id, full_name, email::text AS email, role, '{}'::jsonb AS permissions, is_active, created_at",
  };
}
