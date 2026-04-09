# User Schema Contract (Final)

Date: 2026-04-09
Status: Locked
Scope: Backend PostgreSQL user model for tenant and platform access

## 1. Entities and tenant boundary

1. `companies`
- Tenant root entity.
- Every tenant-scoped user belongs to exactly one company.

2. `users` (tenant-scoped)
- Represents company accounts.
- Must always include `company_id`.
- Primary key: `id`.
- Tenant boundary: all reads/writes are scoped by `company_id` and RLS (`app.current_company_id`).

3. `platform_admins` (global, non-tenant)
- Represents platform-level operators.
- Stored outside tenant tables by design.
- No `company_id` column.

## 2. Role model and rules

Tenant roles are constrained by enum `account_role`:
- `company_admin`
- `employee`

Role rules:
- At most one active `company_admin` per company.
- Any number of `employee` users per company, limited by subscription plan trigger (`enforce_employee_limit`).

## 3. Status flags

1. `users.is_active` (BOOLEAN, default TRUE)
- `TRUE`: account can authenticate/use tenant features.
- `FALSE`: account is logically disabled.

2. `platform_admins.is_active` (BOOLEAN, default TRUE)
- `TRUE`: platform admin account is enabled.
- `FALSE`: platform admin account is disabled.

Decision: status remains a simple boolean for this phase (no status enum, no soft-delete timestamp).

## 4. Uniqueness and identity constraints

1. Tenant user email uniqueness
- Unique per company using `CITEXT` for case-insensitive uniqueness.
- Constraint/index shape: `(company_id, email)` unique.

2. Platform admin email uniqueness
- Globally unique via unique `email` on `platform_admins`.

3. Company admin uniqueness rule
- Partial unique index on `users(company_id)` where `role = 'company_admin' AND is_active = TRUE`.
- Allows historical inactive admin records while preventing two active admins.

## 5. Data quality and safety constraints

For `users` and `platform_admins`:
- `email` must be non-empty (after trim).
- `full_name` must be non-empty (after trim).

## 6. Migration compatibility contract

Migration scripts must be idempotent and safe to run multiple times.
Required migration behavior:
- Create missing enum values without dropping type.
- Preserve existing rows while adding constraints/indexes.
- Replace legacy admin uniqueness index with the active-admin uniqueness index.
- Add missing checks only if absent.

## 7. Explicitly out of scope (this phase)

- Multi-role users.
- Soft delete fields.
- Platform admins mixed into tenant `users` table.
- Historical role assignment audit tables.
