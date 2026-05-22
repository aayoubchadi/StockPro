import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });
// db import must be dynamic so dotenv runs first
async function main() {
  const { default: db } = await import('../src/lib/db.js');
  try {
    const companyRes = await db.query('SELECT id, name FROM companies LIMIT 1');
    console.log('company:', companyRes.rows);

    const productRes = await db.query('SELECT id, name, sku FROM products LIMIT 5');
    console.log('products:', productRes.rows);
  } catch (err) {
    console.error('db error', err);
    process.exitCode = 2;
  } finally {
    process.exit();
  }
}

main();
