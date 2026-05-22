import pg from 'pg';

const { Pool } = pg;
const EUR_TO_MAD = 10.70;

const pool = new Pool({
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'stockpro_db',
});

async function convertCurrencyValues() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    console.log(`Converting prices using rate: 1 EUR = ${EUR_TO_MAD} MAD\n`);

    // Update subscription_plans prices
    console.log('Updating subscription_plans monthly_price_cents...');
    const plansResult = await client.query(
      `UPDATE subscription_plans 
       SET monthly_price_cents = CAST(ROUND(monthly_price_cents * 10.7) AS INTEGER)
       WHERE currency_code = 'MAD'
       RETURNING code, monthly_price_cents`,
    );
    console.log('Updated plans:');
    plansResult.rows.forEach(row => {
      console.log(`  ${row.code}: ${row.monthly_price_cents} cents (${(row.monthly_price_cents/100).toFixed(2)} MAD)`);
    });

    console.log('\nDone! All prices converted to MAD with 1 EUR = 10.70 MAD rate.');
    client.release();
    pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

convertCurrencyValues();
