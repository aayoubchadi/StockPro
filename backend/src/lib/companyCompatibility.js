import { query } from './db.js';

let companyDemoColumnCapabilitiesPromise = null;
let companyOwnerColumnCapabilitiesPromise = null;

async function loadCompanyDemoColumnCapabilities() {
  if (!companyDemoColumnCapabilitiesPromise) {
    companyDemoColumnCapabilitiesPromise = (async () => {
      const { rows } = await query(`SELECT
        EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'companies'
            AND column_name = 'is_demo'
        ) AS has_is_demo,
        EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'companies'
            AND column_name = 'demo_expires_at'
        ) AS has_demo_expires_at`);

      return {
        hasIsDemo: Boolean(rows[0]?.has_is_demo),
        hasDemoExpiresAt: Boolean(rows[0]?.has_demo_expires_at),
      };
    })().catch((error) => {
      companyDemoColumnCapabilitiesPromise = null;
      throw error;
    });
  }

  return companyDemoColumnCapabilitiesPromise;
}

export async function buildCompanyDemoSelect(alias = 'c', prefix = 'company') {
  const capabilities = await loadCompanyDemoColumnCapabilities();

  if (capabilities.hasIsDemo && capabilities.hasDemoExpiresAt) {
    return `${alias}.is_demo AS ${prefix}_is_demo,
         ${alias}.demo_expires_at AS ${prefix}_demo_expires_at`;
  }

  return `FALSE AS ${prefix}_is_demo,
         NULL::timestamptz AS ${prefix}_demo_expires_at`;
}

export async function buildCompanyCreateFragments() {
  const capabilities = await loadCompanyDemoColumnCapabilities();

  if (capabilities.hasIsDemo && capabilities.hasDemoExpiresAt) {
    return {
      insertColumns: 'name, slug, subscription_plan_id, is_demo, demo_expires_at',
      insertValues: "$1, $2, $3, TRUE, NOW() + INTERVAL '14 days'",
      returningColumns:
        'id, name, slug, is_active, is_demo, demo_expires_at, created_at',
    };
  }

  return {
    insertColumns: 'name, slug, subscription_plan_id',
    insertValues: '$1, $2, $3',
    returningColumns:
      'id, name, slug, is_active, FALSE AS is_demo, NULL::timestamptz AS demo_expires_at, created_at',
  };
}

async function loadCompanyOwnerColumnCapabilities() {
  if (!companyOwnerColumnCapabilitiesPromise) {
    companyOwnerColumnCapabilitiesPromise = (async () => {
      const { rows } = await query(`SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'companies'
          AND column_name = 'owner_id'
      ) AS has_owner_id`);

      return {
        hasOwnerId: Boolean(rows[0]?.has_owner_id),
      };
    })().catch((error) => {
      companyOwnerColumnCapabilitiesPromise = null;
      throw error;
    });
  }

  return companyOwnerColumnCapabilitiesPromise;
}

export async function setCompanyOwnerIfSupported(client, { companyId, ownerId }) {
  const capabilities = await loadCompanyOwnerColumnCapabilities();

  if (!capabilities.hasOwnerId) {
    return false;
  }

  await client.query(
    `UPDATE companies SET owner_id = $1 WHERE id = $2`,
    [ownerId, companyId]
  );

  return true;
}
