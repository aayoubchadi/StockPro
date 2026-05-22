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

async function convertAllMoneyValues() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    console.log(`Converting ALL monetary values using rate: 1 EUR = ${EUR_TO_MAD} MAD\n`);

    // 1. company_subscriptions amount_cents
    console.log('1. Converting company_subscriptions.amount_cents...');
    const subsResult = await client.query(
      `UPDATE company_subscriptions 
       SET amount_cents = CAST(ROUND(amount_cents * 10.7) AS INTEGER)
       WHERE amount_cents > 0
       RETURNING id, amount_cents`
    );
    console.log(`   Updated ${subsResult.rowCount} subscription records`);

    // 2. Verify updates
    console.log('\n2. Verifying FINAL values across all tables:\n');

    const plans = await client.query('SELECT code, monthly_price_cents as cents FROM subscription_plans');
    console.log('Subscription Plans (monthly_price_cents):');
    plans.rows.forEach(row => {
      console.log(`  ${row.code}: ${row.cents} cents = ${(row.cents/100).toFixed(2)} MAD`);
    });

    const subs = await client.query('SELECT id, amount_cents as cents FROM company_subscriptions LIMIT 5');
    console.log('\nCompany Subscriptions (amount_cents) - Sample:');
    subs.rows.forEach(row => {
      console.log(`  ${row.id}: ${row.cents} cents = ${(row.cents/100).toFixed(2)} MAD`);
    });

    const prods = await client.query('SELECT sku, unit_price FROM products LIMIT 5');
    console.log('\nProducts (unit_price) - Sample:');
    prods.rows.forEach(row => {
      console.log(`  ${row.sku}: ${row.unit_price} MAD`);
    });

    client.release();
    pool.end();
    console.log('\n✅ All monetary conversions complete!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

convertAllMoneyValues();
