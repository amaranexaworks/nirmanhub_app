/**
 * Rotate the platform-admin password (phone 9999900000). The seed ships a well-known
 * dev password ('nirmaan123'); the production boot guard refuses to start until it's
 * changed. Use this to set a real one.
 *
 *   npm run admin:password -- '<new-strong-password>'
 *
 * Reads PG_* connection settings from .env (same as the app). Uses bcrypt cost 12.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const ADMIN_PHONE = '9999900000';
const pwd = process.argv[2];

if (!pwd || pwd.length < 10) {
  console.error('Usage: npm run admin:password -- "<new password, min 10 chars>"');
  process.exit(1);
}

const schema = process.env.PG_SCHEMA || 'nirmaan';

(async () => {
  const client = new Client({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    database: process.env.PG_DATABASE || 'nirmaan',
    ssl: (process.env.PG_SSL || 'false') === 'true' ? { rejectUnauthorized: false } : false,
  });
  try {
    await client.connect();
    const hash = await bcrypt.hash(pwd, 12);
    const r = await client.query(
      `UPDATE ${schema}.usr_lst_t SET pwd_tx = $1, auth_prvdr_cd = 'password', u_ts = now() WHERE mbl_nm = $2 RETURNING usr_id`,
      [hash, ADMIN_PHONE]
    );
    if (!r.rows.length) { console.error(`✗ No admin user with phone ${ADMIN_PHONE} found.`); process.exit(1); }
    console.log(`✓ Admin password updated for ${ADMIN_PHONE} (usr_id ${r.rows[0].usr_id}).`);
  } catch (e) {
    console.error('✗ Failed to update admin password:', e.message);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
})();
