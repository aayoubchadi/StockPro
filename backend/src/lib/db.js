import { Pool } from 'pg';
import { env } from '../config/env.js';

const pool = new Pool({
  host: env.dbHost,
  port: env.dbPort,
  database: env.dbName,
  user: env.dbUser,
  password: env.dbPassword,
  max: env.dbPoolMax,
  idleTimeoutMillis: env.dbIdleTimeoutMs,
  connectionTimeoutMillis: env.dbConnectionTimeoutMs,
});

export const query = (text, params) => pool.query(text, params);

export async function checkDatabaseConnection() {
  const { rows } = await pool.query(
    'SELECT current_database(), current_user, NOW() AS database_time'
  );

  return rows[0];
}

export const closePool = () => pool.end();
