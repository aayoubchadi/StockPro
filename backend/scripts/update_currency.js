import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'stockpro_db',
});

async function updateCurrency() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    console.log('Updating subscription_plans currency_code from EUR to MAD...');
    const result = await client.query(
      "UPDATE subscription_plans SET currency_code = 'MAD' WHERE currency_code = 'EUR'"
    );
    console.log(`Updated ${result.rowCount} rows from EUR to MAD`);

    console.log('Updating demo_free plan from USD to MAD...');
    const demoResult = await client.query(
      "UPDATE subscription_plans SET currency_code = 'MAD' WHERE code = 'demo_free'"
    );
    console.log(`Updated ${demoResult.rowCount} rows (demo_free)`);

    console.log('\nVerifying changes...');
    const checkResult = await client.query(
      'SELECT code, currency_code FROM subscription_plans'
    );
    console.log('All subscription plans:');
    checkResult.rows.forEach(row => {
      console.log(`  ${row.code}: ${row.currency_code}`);
    });

    client.release();
    pool.end();
    console.log('\nDatabase update complete!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updateCurrency();
