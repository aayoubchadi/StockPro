import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 9100),
  database: process.env.DB_NAME || 'stockpro_db',
  user: process.env.DB_USER || 'stockpro',
  password: process.env.DB_PASSWORD || '',
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 5000),
});

export const query = (text, params) => pool.query(text, params);

export async function checkDatabaseConnection() {
  const { rows } = await pool.query(
    'SELECT current_database(), current_user, NOW() AS database_time'
  );

  return rows[0];
}

export const closePool = () => pool.end();
