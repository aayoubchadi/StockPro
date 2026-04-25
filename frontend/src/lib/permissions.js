export const PERMISSION_KEYS = [
  'employees.view',
  'employees.manage',
  'inventory.view',
  'inventory.manage',
  'stock.move',
  'data.import',
  'data.export',
  'reports.view',
];

export const PERMISSION_PRESETS = [
  {
    key: 'warehouse_operator',
    label: 'Warehouse Operator',
    permissions: ['inventory.view', 'stock.move'],
  },
  {
    key: 'inventory_manager',
    label: 'Inventory Manager',
    permissions: [
      'inventory.view',
      'inventory.manage',
      'stock.move',
      'data.import',
      'reports.view',
    ],
  },
  {
    key: 'reporting_viewer',
    label: 'Reporting Viewer',
    permissions: ['reports.view', 'inventory.view'],
  },
];

export function normalizePermissionMap(input) {
  const source = input && typeof input === 'object' ? input : {};
  const normalized = {};

  for (const key of PERMISSION_KEYS) {
    normalized[key] = Boolean(source[key]);
  }

  return normalized;
}

export function buildPermissionMapFromList(list) {
  const safeList = Array.isArray(list) ? list : [];
  const normalized = {};

  for (const key of PERMISSION_KEYS) {
    normalized[key] = safeList.includes(key);
  }

  return normalized;
}

export function getAdminPermissionMap() {
  return buildPermissionMapFromList(PERMISSION_KEYS);
}

export function resolveEffectivePermissions(role, permissions) {
  if (role === 'company_admin') {
    return getAdminPermissionMap();
  }

  return normalizePermissionMap(permissions);
}

export function extractPermissionList(map) {
  const normalized = normalizePermissionMap(map);
  return PERMISSION_KEYS.filter((key) => normalized[key]);
}
