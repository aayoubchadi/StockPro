import 'dotenv/config';

const REQUIRED_ENV_VARS = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_ACCESS_SECRET',
];

function parseInteger(name, fallback, min = 1) {
  const raw = process.env[name];
  const value = raw === undefined || raw === '' ? fallback : Number(raw);

  if (!Number.isInteger(value) || value < min) {
    throw new Error(
      `Invalid ${name}: expected an integer >= ${min}, got "${raw ?? fallback}"`
    );
  }

  return value;
}

function readRequired(name) {
  const value = process.env[name];

  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parsePayPalEnvironment(rawValue) {
  const normalized = String(rawValue || 'sandbox').trim().toLowerCase();

  if (normalized !== 'sandbox' && normalized !== 'live') {
    throw new Error(
      `Invalid PAYPAL_ENVIRONMENT: expected "sandbox" or "live", got "${rawValue}"`
    );
  }

  return normalized;
}

function resolvePayPalApiBase(environment, overrideBase) {
  const normalizedOverride = String(overrideBase || '').trim();

  if (normalizedOverride) {
    return normalizedOverride.replace(/\/+$/, '');
  }

  return environment === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

export function validateEnvironment() {
  const missing = REQUIRED_ENV_VARS.filter((name) => {
    const value = process.env[name];
    return !value || value.trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  parseInteger('PORT', 5000, 1);
  parseInteger('DB_PORT', 9100, 1);
  parseInteger('DB_POOL_MAX', 10, 1);
  parseInteger('DB_IDLE_TIMEOUT_MS', 30000, 1);
  parseInteger('DB_CONNECTION_TIMEOUT_MS', 5000, 1);
  parseInteger('JWT_ACCESS_TTL_SECONDS', 900, 60);
  parseInteger('JWT_REFRESH_TTL_SECONDS', 604800, 60);
  parseInteger('JWT_SESSION_MAX_LIFETIME_SECONDS', 2592000, 60);
  parseInteger('AUTH_RATE_LIMIT_LOGIN_WINDOW_MS', 60000, 1000);
  parseInteger('AUTH_RATE_LIMIT_LOGIN_MAX', 10, 1);
  parseInteger('AUTH_RATE_LIMIT_REGISTER_WINDOW_MS', 60000, 1000);
  parseInteger('AUTH_RATE_LIMIT_REGISTER_MAX', 5, 1);
  parseInteger('AUTH_RATE_LIMIT_REFRESH_WINDOW_MS', 60000, 1000);
  parseInteger('AUTH_RATE_LIMIT_REFRESH_MAX', 20, 1);

  const paypalClientId = String(process.env.PAYPAL_CLIENT_ID || '').trim();
  const paypalClientSecret = String(process.env.PAYPAL_CLIENT_SECRET || '').trim();

  if ((paypalClientId && !paypalClientSecret) || (!paypalClientId && paypalClientSecret)) {
    throw new Error(
      'PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must both be set together'
    );
  }

  parsePayPalEnvironment(process.env.PAYPAL_ENVIRONMENT || 'sandbox');
}

validateEnvironment();

const paypalEnvironment = parsePayPalEnvironment(
  process.env.PAYPAL_ENVIRONMENT || 'sandbox'
);
const paypalClientId = String(process.env.PAYPAL_CLIENT_ID || '').trim();
const paypalClientSecret = String(process.env.PAYPAL_CLIENT_SECRET || '').trim();

export const env = {
  port: parseInteger('PORT', 5000, 1),
  dbHost: readRequired('DB_HOST'),
  dbPort: parseInteger('DB_PORT', 9100, 1),
  dbName: readRequired('DB_NAME'),
  dbUser: readRequired('DB_USER'),
  dbPassword: readRequired('DB_PASSWORD'),
  dbPoolMax: parseInteger('DB_POOL_MAX', 10, 1),
  dbIdleTimeoutMs: parseInteger('DB_IDLE_TIMEOUT_MS', 30000, 1),
  dbConnectionTimeoutMs: parseInteger('DB_CONNECTION_TIMEOUT_MS', 5000, 1),
  jwtIssuer: process.env.JWT_ISSUER || 'stockpro-api',
  jwtAudience: process.env.JWT_AUDIENCE || 'stockpro-client',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  defaultTenantCompanyId: process.env.DEFAULT_TENANT_COMPANY_ID || '',
  defaultTenantCompanySlug: process.env.DEFAULT_TENANT_COMPANY_SLUG || '',
  jwtAccessSecret: readRequired('JWT_ACCESS_SECRET'),
  jwtAccessTtlSeconds: parseInteger('JWT_ACCESS_TTL_SECONDS', 900, 60),
  jwtRefreshTtlSeconds: parseInteger('JWT_REFRESH_TTL_SECONDS', 604800, 60),
  jwtSessionMaxLifetimeSeconds: parseInteger(
    'JWT_SESSION_MAX_LIFETIME_SECONDS',
    2592000,
    60
  ),
  authRateLimitLoginWindowMs: parseInteger(
    'AUTH_RATE_LIMIT_LOGIN_WINDOW_MS',
    60000,
    1000
  ),
  authRateLimitLoginMax: parseInteger('AUTH_RATE_LIMIT_LOGIN_MAX', 10, 1),
  authRateLimitRegisterWindowMs: parseInteger(
    'AUTH_RATE_LIMIT_REGISTER_WINDOW_MS',
    60000,
    1000
  ),
  authRateLimitRegisterMax: parseInteger('AUTH_RATE_LIMIT_REGISTER_MAX', 5, 1),
  authRateLimitRefreshWindowMs: parseInteger(
    'AUTH_RATE_LIMIT_REFRESH_WINDOW_MS',
    60000,
    1000
  ),
  authRateLimitRefreshMax: parseInteger('AUTH_RATE_LIMIT_REFRESH_MAX', 20, 1),
  paypalEnvironment,
  paypalClientId,
  paypalClientSecret,
  paypalApiBase: resolvePayPalApiBase(
    paypalEnvironment,
    process.env.PAYPAL_API_BASE_URL
  ),
  isPayPalConfigured: Boolean(paypalClientId && paypalClientSecret),
};
