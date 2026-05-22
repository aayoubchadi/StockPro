import pg from 'pg';

const pool = new pg.Pool({
  host: 'localhost',
  port: 9100,
  database: 'stockpro_db',
  user: 'stockpro',
  password: 'stockpro123',
});

try {
  const plans = [
    { code: 'demo_free', name: 'Demo Free', price: 0, currency: 'USD', employees: 20, export: false, analytics: false },
    { code: 'starter_20', name: 'Starter 20', price: 7900, currency: 'MAD', employees: 20, export: false, analytics: false },
    { code: 'growth_50', name: 'Growth 50', price: 14900, currency: 'MAD', employees: 50, export: true, analytics: false },
    { code: 'enterprise_150', name: 'Enterprise 150', price: 29900, currency: 'MAD', employees: 150, export: true, analytics: true },
  ];

  for (const plan of plans) {
    await pool.query(
      `INSERT INTO subscription_plans (code, name, monthly_price_cents, currency_code, max_employees, can_export_reports, can_use_advanced_analytics)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (code) DO UPDATE
       SET name = EXCLUDED.name, monthly_price_cents = EXCLUDED.monthly_price_cents`,
      [plan.code, plan.name, plan.price, plan.currency, plan.employees, plan.export, plan.analytics]
    );
    console.log(`✓ Seeded plan: ${plan.code}`);
  }

  const { rows } = await pool.query('SELECT code, name, monthly_price_cents FROM subscription_plans ORDER BY code');
  console.log('\nAll subscription plans:');
  rows.forEach(r => console.log(`  - ${r.code}: ${r.name} (${r.monthly_price_cents} cents)`));
  
  await pool.end();
  console.log('\nSeeding complete!');
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
