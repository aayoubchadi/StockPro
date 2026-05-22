import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

const { default: db } = await import('../src/lib/db.js');
const { signAccessToken } = await import('../src/lib/authJwt.js');

async function main() {
  try {
    const companyId = '5953eb16-1305-462b-a2f6-93826c112810';
    const userRes = await db.query('SELECT id, full_name, email, role FROM users WHERE company_id = $1 LIMIT 1', [companyId]);
    if (!userRes.rows.length) {
      console.error('No user found for company', companyId);
      process.exit(2);
    }
    const user = userRes.rows[0];
    const token = signAccessToken({ sub: user.id, role: user.role || 'employee', scope: 'tenant', companyId, email: user.email });
    console.log('TOKEN:', token);
    console.log('USER_ID:', user.id);
    console.log('EMAIL:', user.email);
  } catch (err) {
    console.error(err);
    process.exitCode = 2;
  } finally {
    process.exit();
  }
}

main();
