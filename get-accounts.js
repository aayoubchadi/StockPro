import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'stockpro_db',
  user: 'stockpro',
  password: 'stockpro123',
});

async function getAccounts() {
  try {
    console.log('=== PLATFORM ADMINS ===');
    const adminRes = await pool.query('SELECT email, full_name FROM platform_admins WHERE is_active = TRUE');
    adminRes.rows.forEach(row => {
      console.log(`  Email: ${row.email}`);
      console.log(`  Name: ${row.full_name}\n`);
    });

    console.log('=== TENANT USERS ===');
    const usersRes = await pool.query('SELECT company_id, email, full_name, role FROM users WHERE is_active = TRUE ORDER BY company_id');
    usersRes.rows.forEach(row => {
      console.log(`  Email: ${row.email}`);
      console.log(`  Name: ${row.full_name}`);
      console.log(`  Role: ${row.role}`);
      console.log(`  Company ID: ${row.company_id}\n`);
    });

    await pool.end();
  } catch (err) {
    console.error('Database error:', err);
    process.exit(1);
  }
}

getAccounts();
