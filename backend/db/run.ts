/**
 * Minimal migration + seed runner. No external migration framework — just runs
 * every .sql file in migrations/ (then seeds/) in filename order, tracking which
 * migrations have already applied in nirmaan._migrations_t.
 *
 *   npm run db:migrate   → apply pending migrations
 *   npm run db:seed      → run all seed files (idempotent; safe to re-run)
 *   npm run db:reset     → DROP the schema, then migrate + seed from scratch
 */
export {};
(global as any).appRoot = require('path').join(__dirname, '..');
const fs = require('fs');
const path = require('path');
require('../config/loadEnv');
const sqldb = require('../config/db.config');

const pool = sqldb.AppPool;
const schema = sqldb.schema;
const migDir = path.join(__dirname, 'migrations');
const seedDir = path.join(__dirname, 'seeds');

function sqlFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f: string) => f.endsWith('.sql')).sort();
}

async function ensureMigrationTable() {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${schema}._migrations_t (
      fname VARCHAR(200) PRIMARY KEY,
      i_ts  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
}

async function migrate() {
  await ensureMigrationTable();
  const applied = new Set(
    (await pool.query(`SELECT fname FROM ${schema}._migrations_t`)).rows.map((r: any) => r.fname)
  );
  const files = sqlFiles(migDir);
  let count = 0;
  for (const f of files) {
    if (applied.has(f)) continue;
    const sql = fs.readFileSync(path.join(migDir, f), 'utf8');
    process.stdout.write(`→ migrate ${f} ... `);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(`INSERT INTO ${schema}._migrations_t (fname) VALUES ($1)`, [f]);
      await client.query('COMMIT');
      console.log('done');
      count++;
    } catch (e: any) {
      await client.query('ROLLBACK');
      console.log('FAILED');
      throw e;
    } finally {
      client.release();
    }
  }
  console.log(count ? `✓ ${count} migration(s) applied.` : '✓ Nothing to migrate — up to date.');
}

async function seed() {
  const files = sqlFiles(seedDir);
  for (const f of files) {
    const sql = fs.readFileSync(path.join(seedDir, f), 'utf8');
    process.stdout.write(`→ seed ${f} ... `);
    await pool.query(sql);
    console.log('done');
  }
  console.log(`✓ ${files.length} seed file(s) run.`);
}

async function reset() {
  console.log(`⚠ Dropping schema "${schema}" (CASCADE) ...`);
  await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await migrate();
  await seed();
}

(async () => {
  const cmd = process.argv[2];
  try {
    if (cmd === 'migrate') await migrate();
    else if (cmd === 'seed') await seed();
    else if (cmd === 'reset') await reset();
    else {
      console.error('Usage: ts-node db/run.ts <migrate|seed|reset>');
      process.exit(1);
    }
    await pool.end();
    process.exit(0);
  } catch (e: any) {
    console.error('\n✗ DB task failed:', e.message);
    await pool.end().catch(() => {});
    process.exit(1);
  }
})();
