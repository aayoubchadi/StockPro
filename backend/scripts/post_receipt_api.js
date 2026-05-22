import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

const { default: db } = await import('../src/lib/db.js');
const { signAccessToken } = await import('../src/lib/authJwt.js');

async function main() {
  try {
    // find a tenant user
    const companyId = '5953eb16-1305-462b-a2f6-93826c112810';
    const userRes = await db.query('SELECT id, full_name, email, role FROM users WHERE company_id = $1 LIMIT 1', [companyId]);
    if (!userRes.rows.length) {
      console.error('No user found for company', companyId);
      process.exit(2);
    }
    const user = userRes.rows[0];

    const token = signAccessToken({ sub: user.id, role: user.role || 'employee', scope: 'tenant', companyId, email: user.email });

    const productId = 'eaa57b2c-12f2-4f54-8405-c5002ca93645';

    const body = {
      buyerName: 'UI Test Buyer',
      buyerCompany: 'UI Test Co',
      buyerEmail: 'ui-test@example.com',
      buyerPhone: '000000000',
      receiptDate: new Date().toISOString(),
      items: [
        { productId, quantity: 2, unitPrice: 150 }
      ]
    };

    const resp = await fetch('http://127.0.0.1:5000/api/v1/purchase-receipts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const text = await resp.text();
    console.log('status', resp.status);
    console.log('body', text);
  } catch (err) {
    console.error('error', err);
    process.exitCode = 2;
  } finally {
    process.exit();
  }
}

main();
