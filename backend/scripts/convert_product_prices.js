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

async function convertProductPrices() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    console.log(`Converting all product prices using rate: 1 EUR = ${EUR_TO_MAD} MAD\n`);

    // Get current product prices before conversion
    const beforeResult = await client.query(
      'SELECT company_id, COUNT(*) as product_count, SUM(unit_price * quantity_in_stock) as total_value FROM products GROUP BY company_id'
    );
    
    console.log('Stock values BEFORE conversion:');
    beforeResult.rows.forEach(row => {
      const value = parseFloat(row.total_value) || 0;
      console.log(`  Company ${row.company_id}: ${row.product_count} products, Total stock value: ${value.toFixed(2)}`);
    });

    // Update product prices
    console.log(`\nConverting all product unit_prices...`);
    const updateResult = await client.query(
      `UPDATE products 
       SET unit_price = unit_price * $1
       WHERE unit_price > 0
       RETURNING company_id, sku, unit_price`
    , [EUR_TO_MAD]);
    
    console.log(`Updated ${updateResult.rowCount} products`);

    // Get stock values after conversion
    const afterResult = await client.query(
      'SELECT company_id, COUNT(*) as product_count, SUM(unit_price * quantity_in_stock) as total_value FROM products GROUP BY company_id'
    );
    
    console.log('\nStock values AFTER conversion:');
    afterResult.rows.forEach(row => {
      const value = parseFloat(row.total_value) || 0;
      console.log(`  Company ${row.company_id}: ${row.product_count} products, Total stock value: ${value.toFixed(2)} MAD`);
    });

    client.release();
    pool.end();
    console.log('\nConversion complete!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

convertProductPrices();
