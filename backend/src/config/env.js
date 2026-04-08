import 'dotenv/config';

const REQUIRED_ENV_VARS = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];

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
}

validateEnvironment();

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
};
