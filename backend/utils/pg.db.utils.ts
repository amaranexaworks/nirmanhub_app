/**
 * pg.db.utils — thin, safe wrapper over `pg.Pool.query`. Mirrors the role of the
 * WMS `utils/pg.db.utils`: every model calls `execQuery(pool, sql, params, ctx, req)`
 * and gets back `result.rows` (a plain array), with consistent error logging.
 *
 * ALWAYS pass values via `params` ($1, $2, ...) — never interpolate user input
 * into the SQL string. This is the project-wide rule for injection safety.
 */
export {};

/**
 * @param pool    a pg.Pool (e.g. sqldb.AppPool)
 * @param sql     parameterized SQL using $1..$n
 * @param params  array of bound values (optional)
 * @param ctx     module context from df.getModuleMetaData (for logs)
 * @param req     the request (optional, reserved for tracing)
 * @returns Promise<any[]>  the rows
 */
exports.execQuery = async function (
  pool: any,
  sql: string,
  params?: any[],
  ctx?: any,
  req?: any
): Promise<any[]> {
  // Support the WMS-style call where params is omitted: execQuery(pool, sql, ctx, req)
  if (params && !Array.isArray(params)) {
    req = ctx;
    ctx = params;
    params = [];
  }
  try {
    const result = await pool.query(sql, params || []);
    return result.rows;
  } catch (err: any) {
    const where = ctx ? `${ctx.module}/${ctx.file}` : 'db';
    console.error(`[${where}] query failed:`, err.message);
    console.error('  SQL:', sql.replace(/\s+/g, ' ').trim().slice(0, 400));
    // Bound params can contain PII (phone, OTP, names) — only log them outside prod.
    if (process.env.NODE_ENV !== 'production' && params && params.length) console.error('  params:', JSON.stringify(params));
    throw err;
  }
};

/** Run a set of statements inside a single transaction. */
exports.withTransaction = async function (pool: any, work: (client: any) => Promise<any>) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await work(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
