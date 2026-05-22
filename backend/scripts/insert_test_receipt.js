import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

async function main() {
  const { default: db } = await import('../src/lib/db.js');

  // Use existing company and product from the DB (found via inspect_db)
  const companyId = '5953eb16-1305-462b-a2f6-93826c112810';
  const productId = 'eaa57b2c-12f2-4f54-8405-c5002ca93645';

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const receiptRes = await client.query(
      `INSERT INTO purchase_receipts (company_id, buyer_name, buyer_email, receipt_date, subtotal, total, notes)
       VALUES ($1, $2, $3, NOW(), $4, $4, $5)
       RETURNING id`,
      [companyId, 'Test Buyer', 'buyer@example.com', 2000.0, 'Automated test']
    );

    const receiptId = receiptRes.rows[0].id;

    await client.query(
      `INSERT INTO purchase_receipt_items (receipt_id, product_id, quantity, unit_price, line_total)
       VALUES ($1, $2, $3, $4, $5)`,
      [receiptId, productId, 10, 200.0, 2000.0]
    );

    await client.query('COMMIT');
    console.log('Inserted receipt', receiptId);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('insert error', err);
    process.exitCode = 2;
  } finally {
    client.release();
    process.exit();
  }
}

main();
