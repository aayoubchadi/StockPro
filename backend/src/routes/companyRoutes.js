import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  requireTenantAccess,
  requireTenantPermission,
} from '../middleware/requireTenantAccess.js';
import { HttpError } from '../lib/httpError.js';
import { validatePasswordPolicy } from '../lib/passwordPolicy.js';
import {
  applyPermissionPreset,
  extractEnabledPermissions,
  normalizePermissions,
  PERMISSION_PRESETS,
} from '../lib/permissions.js';
import { runWithCompanyScope } from '../lib/tenantContext.js';

const router = Router();

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '')
  );
}

function normalizePermissionsInput(payload) {
  if (Array.isArray(payload)) {
    const map = {};
    for (const key of payload) {
      map[String(key)] = true;
    }
    return normalizePermissions(map);
  }

  return normalizePermissions(payload || {});
}

function resolveEmployeePermissions({ presetKey, permissions }) {
  const normalizedPermissions = normalizePermissionsInput(permissions);
  const normalizedPresetKey = normalizeValue(presetKey).toLowerCase();

  if (!normalizedPresetKey) {
    return normalizedPermissions;
  }

  if (!PERMISSION_PRESETS[normalizedPresetKey]) {
    throw new HttpError(400, 'COMPANY_VALIDATION_ERROR', 'Unknown permission preset');
  }

  return applyPermissionPreset(normalizedPresetKey, normalizedPermissions);
}

function serializeEmployeeRow(row) {
  const normalizedPermissions = normalizePermissions(row.permissions || {});
  return {
    id: row.id,
    companyId: row.company_id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    permissions: normalizedPermissions,
    permissionList: extractEnabledPermissions(normalizedPermissions),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function serializeProductRow(row) {
  return {
    id: row.id,
    companyId: row.company_id,
    sku: row.sku,
    name: row.name,
    description: row.description || '',
    unitPrice: toNumber(row.unit_price, 0),
    quantityInStock: toNumber(row.quantity_in_stock, 0),
    lowStockThreshold: toNumber(row.low_stock_threshold, 0),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function escapeCsvValue(value) {
  const input = String(value ?? '');
  if (/[,"\n\r]/.test(input)) {
    return `"${input.replace(/"/g, '""')}"`;
  }

  return input;
}

function toProductsCsv(products) {
  const headers = [
    'sku',
    'name',
    'description',
    'unitPrice',
    'quantityInStock',
    'lowStockThreshold',
    'isActive',
  ];

  const lines = [
    headers.join(','),
    ...products.map((product) =>
      [
        product.sku,
        product.name,
        product.description || '',
        Number(product.unit_price).toFixed(2),
        toNumber(product.quantity_in_stock, 0),
        toNumber(product.low_stock_threshold, 0),
        Boolean(product.is_active),
      ]
        .map(escapeCsvValue)
        .join(',')
    ),
  ];

  return `${lines.join('\n')}\n`;
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let index = 0;
  let inQuotes = false;

  while (index < line.length) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 2;
        continue;
      }

      inQuotes = !inQuotes;
      index += 1;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      index += 1;
      continue;
    }

    current += char;
    index += 1;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseCsvText(csvText) {
  const rawLines = String(csvText || '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (rawLines.length < 2) {
    throw new HttpError(
      400,
      'COMPANY_IMPORT_INVALID',
      'CSV must include a header row and at least one data row'
    );
  }

  const headerColumns = parseCsvLine(rawLines[0]);
  const headerIndex = {};

  headerColumns.forEach((header, index) => {
    headerIndex[header] = index;
  });

  const requiredHeaders = [
    'sku',
    'name',
    'unitPrice',
    'quantityInStock',
    'lowStockThreshold',
  ];

  const missingHeaders = requiredHeaders.filter((header) => !(header in headerIndex));

  if (missingHeaders.length > 0) {
    throw new HttpError(
      400,
      'COMPANY_IMPORT_INVALID',
      `CSV missing required headers: ${missingHeaders.join(', ')}`
    );
  }

  const rows = rawLines.slice(1).map((line, index) => {
    const columns = parseCsvLine(line);
    const get = (headerName) => columns[headerIndex[headerName]] || '';

    return {
      lineNumber: index + 2,
      sku: get('sku'),
      name: get('name'),
      description: get('description'),
      unitPrice: get('unitPrice'),
      quantityInStock: get('quantityInStock'),
      lowStockThreshold: get('lowStockThreshold'),
      isActive: get('isActive'),
    };
  });

  return rows;
}

router.use(requireAuth, requireTenantAccess);

router.get('/context', async (request, response, next) => {
  try {
    response.json({
      data: {
        role: request.tenantContext.user.role,
        user: {
          id: request.tenantContext.user.id,
          fullName: request.tenantContext.user.fullName,
          email: request.tenantContext.user.email,
          permissions: request.tenantContext.user.permissions,
          effectivePermissions: request.tenantContext.user.effectivePermissions,
          effectivePermissionList: request.tenantContext.user.effectivePermissionList,
        },
        company: request.tenantContext.company,
        plan: request.tenantContext.plan,
        capacity: request.tenantContext.capacity,
        permissionPresets: Object.values(PERMISSION_PRESETS),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  '/employees',
  requireTenantPermission('employees.view'),
  async (request, response, next) => {
    try {
      const { rows } = await runWithCompanyScope(
        request.tenantContext.company.id,
        (client) =>
          client.query(
            `SELECT
               id,
               company_id,
               full_name,
               email::text AS email,
               role,
               permissions,
               is_active,
               created_at,
               updated_at
             FROM users
             WHERE company_id = $1
               AND role = 'employee'
             ORDER BY created_at DESC`,
            [request.tenantContext.company.id]
          )
      );

      response.json({
        data: {
          employees: rows.map(serializeEmployeeRow),
          capacity: request.tenantContext.capacity,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/employees',
  requireTenantPermission('employees.manage'),
  async (request, response, next) => {
    try {
      const fullName = normalizeValue(request.body.fullName);
      const email = normalizeEmail(request.body.email);
      const password = normalizeValue(request.body.password);

      if (!fullName || !email || !password) {
        throw new HttpError(
          400,
          'COMPANY_VALIDATION_ERROR',
          'fullName, email, and password are required'
        );
      }

      if (fullName.length < 2 || fullName.length > 120) {
        throw new HttpError(
          400,
          'COMPANY_VALIDATION_ERROR',
          'fullName must be between 2 and 120 characters'
        );
      }

      const passwordValidation = validatePasswordPolicy(password, email);
      if (!passwordValidation.isValid) {
        throw new HttpError(
          400,
          'AUTH_VALIDATION_ERROR',
          'Password does not meet security policy',
          passwordValidation.errors
        );
      }

      const permissions = resolveEmployeePermissions({
        presetKey: request.body.presetKey,
        permissions: request.body.permissions,
      });

      const passwordHash = await bcrypt.hash(password, 12);

      const { rows } = await runWithCompanyScope(
        request.tenantContext.company.id,
        (client) =>
          client.query(
            `INSERT INTO users (company_id, full_name, email, password_hash, role, permissions)
             VALUES ($1, $2, $3, $4, 'employee', $5::jsonb)
             RETURNING id, company_id, full_name, email::text AS email, role, permissions, is_active, created_at, updated_at`,
            [
              request.tenantContext.company.id,
              fullName,
              email,
              passwordHash,
              JSON.stringify(permissions),
            ]
          )
      );

      response.status(201).json({
        data: {
          employee: serializeEmployeeRow(rows[0]),
        },
      });
    } catch (error) {
      if (error?.code === '23505' && error.constraint === 'uq_users_company_email') {
        next(
          new HttpError(
            409,
            'COMPANY_EMPLOYEE_EMAIL_EXISTS',
            'A user with this email already exists in your company'
          )
        );
        return;
      }

      if (
        error?.code === 'P0001' &&
        String(error.message || '').includes('Employee limit exceeded')
      ) {
        next(
          new HttpError(
            409,
            'COMPANY_EMPLOYEE_LIMIT_REACHED',
            'Employee limit exceeded for the current subscription plan'
          )
        );
        return;
      }

      next(error);
    }
  }
);

router.patch(
  '/employees/:employeeId',
  requireTenantPermission('employees.manage'),
  async (request, response, next) => {
    try {
      const employeeId = normalizeValue(request.params.employeeId);

      if (!isUuid(employeeId)) {
        throw new HttpError(
          400,
          'COMPANY_VALIDATION_ERROR',
          'employeeId must be a valid UUID'
        );
      }

      const nextFullName = normalizeValue(request.body.fullName);
      const hasNameUpdate = Object.prototype.hasOwnProperty.call(
        request.body,
        'fullName'
      );
      const hasPermissionUpdate =
        Object.prototype.hasOwnProperty.call(request.body, 'permissions') ||
        Object.prototype.hasOwnProperty.call(request.body, 'presetKey');

      if (!hasNameUpdate && !hasPermissionUpdate) {
        throw new HttpError(
          400,
          'COMPANY_VALIDATION_ERROR',
          'Provide at least one field to update'
        );
      }

      if (hasNameUpdate && (nextFullName.length < 2 || nextFullName.length > 120)) {
        throw new HttpError(
          400,
          'COMPANY_VALIDATION_ERROR',
          'fullName must be between 2 and 120 characters'
        );
      }

      const { rows } = await runWithCompanyScope(
        request.tenantContext.company.id,
        async (client) => {
          const { rows: employeeRows } = await client.query(
            `SELECT id, full_name, permissions
             FROM users
             WHERE id = $1
               AND company_id = $2
               AND role = 'employee'
             LIMIT 1`,
            [employeeId, request.tenantContext.company.id]
          );

          if (employeeRows.length !== 1) {
            throw new HttpError(404, 'COMPANY_EMPLOYEE_NOT_FOUND', 'Employee was not found');
          }

          const existing = employeeRows[0];
          const mergedPermissions = hasPermissionUpdate
            ? resolveEmployeePermissions({
                presetKey: request.body.presetKey,
                permissions: request.body.permissions,
              })
            : normalizePermissions(existing.permissions || {});

          return client.query(
            `UPDATE users
             SET
               full_name = $3,
               permissions = $4::jsonb
             WHERE id = $1
               AND company_id = $2
               AND role = 'employee'
             RETURNING id, company_id, full_name, email::text AS email, role, permissions, is_active, created_at, updated_at`,
            [
              employeeId,
              request.tenantContext.company.id,
              hasNameUpdate ? nextFullName : existing.full_name,
              JSON.stringify(mergedPermissions),
            ]
          );
        }
      );

      response.json({
        data: {
          employee: serializeEmployeeRow(rows[0]),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/employees/:employeeId/status',
  requireTenantPermission('employees.manage'),
  async (request, response, next) => {
    try {
      const employeeId = normalizeValue(request.params.employeeId);
      const isActive = request.body.isActive;

      if (!isUuid(employeeId)) {
        throw new HttpError(
          400,
          'COMPANY_VALIDATION_ERROR',
          'employeeId must be a valid UUID'
        );
      }

      if (typeof isActive !== 'boolean') {
        throw new HttpError(
          400,
          'COMPANY_VALIDATION_ERROR',
          'isActive must be a boolean'
        );
      }

      const { rows } = await runWithCompanyScope(
        request.tenantContext.company.id,
        (client) =>
          client.query(
            `UPDATE users
             SET is_active = $3
             WHERE id = $1
               AND company_id = $2
               AND role = 'employee'
             RETURNING id, company_id, full_name, email::text AS email, role, permissions, is_active, created_at, updated_at`,
            [employeeId, request.tenantContext.company.id, isActive]
          )
      );

      if (rows.length !== 1) {
        throw new HttpError(404, 'COMPANY_EMPLOYEE_NOT_FOUND', 'Employee was not found');
      }

      response.json({
        data: {
          employee: serializeEmployeeRow(rows[0]),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/products',
  requireTenantPermission('inventory.view'),
  async (request, response, next) => {
    try {
      const { rows } = await runWithCompanyScope(
        request.tenantContext.company.id,
        (client) =>
          client.query(
            `SELECT
               id,
               company_id,
               sku,
               name,
               description,
               unit_price,
               quantity_in_stock,
               low_stock_threshold,
               is_active,
               created_at,
               updated_at
             FROM products
             WHERE company_id = $1
             ORDER BY created_at DESC`,
            [request.tenantContext.company.id]
          )
      );

      response.json({
        data: {
          products: rows.map(serializeProductRow),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/products',
  requireTenantPermission('inventory.manage'),
  async (request, response, next) => {
    try {
      const sku = normalizeValue(request.body.sku);
      const name = normalizeValue(request.body.name);
      const description = normalizeValue(request.body.description);
      const unitPrice = toNumber(request.body.unitPrice, NaN);
      const quantityInStock = toNumber(request.body.quantityInStock, NaN);
      const lowStockThreshold = toNumber(request.body.lowStockThreshold, NaN);
      const isActive = request.body.isActive !== false;

      if (!sku || !name) {
        throw new HttpError(
          400,
          'COMPANY_VALIDATION_ERROR',
          'sku and name are required'
        );
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new HttpError(
          400,
          'COMPANY_VALIDATION_ERROR',
          'unitPrice must be a number >= 0'
        );
      }

      if (!Number.isInteger(quantityInStock) || quantityInStock < 0) {
        throw new HttpError(
          400,
          'COMPANY_VALIDATION_ERROR',
          'quantityInStock must be an integer >= 0'
        );
      }

      if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
        throw new HttpError(
          400,
          'COMPANY_VALIDATION_ERROR',
          'lowStockThreshold must be an integer >= 0'
        );
      }

      const { rows } = await runWithCompanyScope(
        request.tenantContext.company.id,
        (client) =>
          client.query(
            `INSERT INTO products (
               company_id,
               sku,
               name,
               description,
               unit_price,
               quantity_in_stock,
               low_stock_threshold,
               is_active
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, company_id, sku, name, description, unit_price, quantity_in_stock, low_stock_threshold, is_active, created_at, updated_at`,
            [
              request.tenantContext.company.id,
              sku,
              name,
              description || null,
              unitPrice,
              quantityInStock,
              lowStockThreshold,
              isActive,
            ]
          )
      );

      response.status(201).json({
        data: {
          product: serializeProductRow(rows[0]),
        },
      });
    } catch (error) {
      if (error?.code === '23505' && error.constraint === 'uq_products_company_sku') {
        next(
          new HttpError(
            409,
            'COMPANY_PRODUCT_SKU_EXISTS',
            'A product with this SKU already exists'
          )
        );
        return;
      }

      next(error);
    }
  }
);

router.patch(
  '/products/:productId',
  requireTenantPermission('inventory.manage'),
  async (request, response, next) => {
    try {
      const productId = normalizeValue(request.params.productId);

      if (!isUuid(productId)) {
        throw new HttpError(400, 'COMPANY_VALIDATION_ERROR', 'productId must be a valid UUID');
      }

      const updates = {};

      if (Object.prototype.hasOwnProperty.call(request.body, 'sku')) {
        const sku = normalizeValue(request.body.sku);
        if (!sku) {
          throw new HttpError(400, 'COMPANY_VALIDATION_ERROR', 'sku cannot be empty');
        }
        updates.sku = sku;
      }

      if (Object.prototype.hasOwnProperty.call(request.body, 'name')) {
        const name = normalizeValue(request.body.name);
        if (!name) {
          throw new HttpError(400, 'COMPANY_VALIDATION_ERROR', 'name cannot be empty');
        }
        updates.name = name;
      }

      if (Object.prototype.hasOwnProperty.call(request.body, 'description')) {
        updates.description = normalizeValue(request.body.description) || null;
      }

      if (Object.prototype.hasOwnProperty.call(request.body, 'unitPrice')) {
        const unitPrice = toNumber(request.body.unitPrice, NaN);
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new HttpError(
            400,
            'COMPANY_VALIDATION_ERROR',
            'unitPrice must be a number >= 0'
          );
        }
        updates.unit_price = unitPrice;
      }

      if (Object.prototype.hasOwnProperty.call(request.body, 'lowStockThreshold')) {
        const lowStockThreshold = toNumber(request.body.lowStockThreshold, NaN);
        if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
          throw new HttpError(
            400,
            'COMPANY_VALIDATION_ERROR',
            'lowStockThreshold must be an integer >= 0'
          );
        }
        updates.low_stock_threshold = lowStockThreshold;
      }

      if (Object.prototype.hasOwnProperty.call(request.body, 'isActive')) {
        if (typeof request.body.isActive !== 'boolean') {
          throw new HttpError(
            400,
            'COMPANY_VALIDATION_ERROR',
            'isActive must be a boolean'
          );
        }
        updates.is_active = request.body.isActive;
      }

      const keys = Object.keys(updates);
      if (keys.length === 0) {
        throw new HttpError(
          400,
          'COMPANY_VALIDATION_ERROR',
          'Provide at least one field to update'
        );
      }

      const assignments = keys.map((key, index) => `${key} = $${index + 3}`);
      const values = keys.map((key) => updates[key]);

      const { rows } = await runWithCompanyScope(
        request.tenantContext.company.id,
        (client) =>
          client.query(
            `UPDATE products
             SET ${assignments.join(', ')}
             WHERE id = $1
               AND company_id = $2
             RETURNING id, company_id, sku, name, description, unit_price, quantity_in_stock, low_stock_threshold, is_active, created_at, updated_at`,
            [productId, request.tenantContext.company.id, ...values]
          )
      );

      if (rows.length !== 1) {
        throw new HttpError(404, 'COMPANY_PRODUCT_NOT_FOUND', 'Product was not found');
      }

      response.json({
        data: {
          product: serializeProductRow(rows[0]),
        },
      });
    } catch (error) {
      if (error?.code === '23505' && error.constraint === 'uq_products_company_sku') {
        next(
          new HttpError(
            409,
            'COMPANY_PRODUCT_SKU_EXISTS',
            'A product with this SKU already exists'
          )
        );
        return;
      }

      next(error);
    }
  }
);

router.post(
  '/products/:productId/movements',
  requireTenantPermission('stock.move'),
  async (request, response, next) => {
    try {
      const productId = normalizeValue(request.params.productId);
      const movementType = normalizeValue(request.body.movementType).toLowerCase();
      const quantity = toNumber(request.body.quantity, NaN);
      const note = normalizeValue(request.body.note);
      const adjustmentMode = normalizeValue(request.body.adjustmentMode).toLowerCase();

      if (!isUuid(productId)) {
        throw new HttpError(400, 'COMPANY_VALIDATION_ERROR', 'productId must be a valid UUID');
      }

      if (!['in', 'out', 'adjustment'].includes(movementType)) {
        throw new HttpError(
          400,
          'COMPANY_VALIDATION_ERROR',
          'movementType must be in, out, or adjustment'
        );
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new HttpError(
          400,
          'COMPANY_VALIDATION_ERROR',
          'quantity must be an integer > 0'
        );
      }

      const result = await runWithCompanyScope(
        request.tenantContext.company.id,
        async (client) => {
          const { rows: productRows } = await client.query(
            `SELECT id, company_id, name, sku, quantity_in_stock
             FROM products
             WHERE id = $1
               AND company_id = $2
             LIMIT 1`,
            [productId, request.tenantContext.company.id]
          );

          if (productRows.length !== 1) {
            throw new HttpError(404, 'COMPANY_PRODUCT_NOT_FOUND', 'Product was not found');
          }

          const product = productRows[0];
          let nextQuantity = toNumber(product.quantity_in_stock, 0);

          if (movementType === 'in') {
            nextQuantity += quantity;
          } else if (movementType === 'out') {
            if (nextQuantity - quantity < 0) {
              throw new HttpError(
                409,
                'COMPANY_STOCK_NEGATIVE_FORBIDDEN',
                'Stock would become negative with this movement'
              );
            }
            nextQuantity -= quantity;
          } else {
            const mode = adjustmentMode === 'decrease' ? 'decrease' : 'increase';
            if (mode === 'decrease') {
              if (nextQuantity - quantity < 0) {
                throw new HttpError(
                  409,
                  'COMPANY_STOCK_NEGATIVE_FORBIDDEN',
                  'Stock would become negative with this adjustment'
                );
              }
              nextQuantity -= quantity;
            } else {
              nextQuantity += quantity;
            }
          }

          await client.query(
            `UPDATE products
             SET quantity_in_stock = $3
             WHERE id = $1
               AND company_id = $2`,
            [product.id, request.tenantContext.company.id, nextQuantity]
          );

          const { rows: movementRows } = await client.query(
            `INSERT INTO stock_movements (
               company_id,
               product_id,
               movement_type,
               quantity,
               note,
               moved_by
             )
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, company_id, product_id, movement_type, quantity, note, moved_by, created_at`,
            [
              request.tenantContext.company.id,
              product.id,
              movementType,
              quantity,
              note || null,
              request.tenantContext.user.id,
            ]
          );

          return {
            movement: movementRows[0],
            quantityInStock: nextQuantity,
          };
        }
      );

      response.status(201).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/products/export.csv',
  requireTenantPermission('data.export', { planGate: 'canExportReports' }),
  async (request, response, next) => {
    try {
      const { rows } = await runWithCompanyScope(
        request.tenantContext.company.id,
        (client) =>
          client.query(
            `SELECT
               sku,
               name,
               description,
               unit_price,
               quantity_in_stock,
               low_stock_threshold,
               is_active
             FROM products
             WHERE company_id = $1
             ORDER BY created_at ASC`,
            [request.tenantContext.company.id]
          )
      );

      const csv = toProductsCsv(rows);
      const filename = `stockpro-products-${request.tenantContext.company.slug}.csv`;
      response.setHeader('Content-Type', 'text/csv; charset=utf-8');
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename.replace(/"/g, '')}"`
      );
      response.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/products/import.csv',
  requireTenantPermission('data.import'),
  async (request, response, next) => {
    try {
      const csvText = normalizeValue(request.body.csvText);

      if (!csvText) {
        throw new HttpError(400, 'COMPANY_IMPORT_INVALID', 'csvText is required');
      }

      const rows = parseCsvText(csvText);
      const errors = [];
      let createdCount = 0;
      let updatedCount = 0;

      await runWithCompanyScope(request.tenantContext.company.id, async (client) => {
        for (const row of rows) {
          const sku = normalizeValue(row.sku);
          const name = normalizeValue(row.name);
          const description = normalizeValue(row.description);
          const unitPrice = Number(row.unitPrice);
          const quantityInStock = Number(row.quantityInStock);
          const lowStockThreshold = Number(row.lowStockThreshold);
          const isActiveText = normalizeValue(row.isActive).toLowerCase();
          const isActive =
            isActiveText === '' ? true : !['false', '0', 'no', 'off'].includes(isActiveText);

          if (!sku || !name) {
            errors.push({
              lineNumber: row.lineNumber,
              message: 'sku and name are required',
            });
            continue;
          }

          if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            errors.push({
              lineNumber: row.lineNumber,
              message: 'unitPrice must be a number >= 0',
            });
            continue;
          }

          if (!Number.isInteger(quantityInStock) || quantityInStock < 0) {
            errors.push({
              lineNumber: row.lineNumber,
              message: 'quantityInStock must be an integer >= 0',
            });
            continue;
          }

          if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
            errors.push({
              lineNumber: row.lineNumber,
              message: 'lowStockThreshold must be an integer >= 0',
            });
            continue;
          }

          const { rows: existingRows } = await client.query(
            `SELECT id
             FROM products
             WHERE company_id = $1
               AND sku = $2
             LIMIT 1`,
            [request.tenantContext.company.id, sku]
          );

          if (existingRows.length === 1) {
            await client.query(
              `UPDATE products
               SET
                 name = $3,
                 description = $4,
                 unit_price = $5,
                 quantity_in_stock = $6,
                 low_stock_threshold = $7,
                 is_active = $8
               WHERE company_id = $1
                 AND sku = $2`,
              [
                request.tenantContext.company.id,
                sku,
                name,
                description || null,
                unitPrice,
                quantityInStock,
                lowStockThreshold,
                isActive,
              ]
            );
            updatedCount += 1;
          } else {
            await client.query(
              `INSERT INTO products (
                 company_id,
                 sku,
                 name,
                 description,
                 unit_price,
                 quantity_in_stock,
                 low_stock_threshold,
                 is_active
               )
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                request.tenantContext.company.id,
                sku,
                name,
                description || null,
                unitPrice,
                quantityInStock,
                lowStockThreshold,
                isActive,
              ]
            );
            createdCount += 1;
          }
        }
      });

      response.json({
        data: {
          summary: {
            totalRows: rows.length,
            successfulRows: rows.length - errors.length,
            failedRows: errors.length,
            createdCount,
            updatedCount,
          },
          errors,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
