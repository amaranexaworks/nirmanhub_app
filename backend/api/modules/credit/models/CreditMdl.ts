/** CreditMdl — materials-on-credit orders. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;

exports.listMdl = function (buyer_usr_id: number, status: string | null, req?: any) {
  const QRY = `
    SELECT o.ordr_id, o.vndr_tx, o.ttl_am, o.tenure_days, o.due_ts, o.sts_cd, o.ordrd_ts, o.paid_ts,
           (SELECT count(*) FROM ${schema}.crdt_ordr_item_t it WHERE it.ordr_id = o.ordr_id) AS item_count
    FROM ${schema}.crdt_ordr_lst_t o
    WHERE o.a_in = 1 AND o.buyer_usr_id = $1
      AND ($2::text IS NULL OR o.sts_cd = $2)
    ORDER BY o.ordrd_ts DESC`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [buyer_usr_id, status], cntxtDtls, req);
};

exports.createMdl = function (buyer_usr_id: number, d: any, req?: any) {
  const items: any[] = d.items || [];
  const tenure = [7, 15, 30].includes(Number(d.tenureDays)) ? Number(d.tenureDays) : 30;
  return dbutil.withTransaction(sqldb.AppPool, async (client: any) => {
    const total = items.reduce((s, it) => s + Number(it.price || 0) * Number(it.qty || 1), 0);
    const ord = await client.query(
      `INSERT INTO ${schema}.crdt_ordr_lst_t (buyer_usr_id, vndr_tx, ttl_am, tenure_days, due_ts)
       VALUES ($1,$2,$3,$4, now() + make_interval(days => $4)) RETURNING ordr_id, due_ts, sts_cd, ordrd_ts`,
      [buyer_usr_id, d.vendor || null, total, tenure]
    );
    const ordrId = ord.rows[0].ordr_id;
    for (const it of items) {
      await client.query(
        `INSERT INTO ${schema}.crdt_ordr_item_t (ordr_id, nm_tx, emoji_tx, unit_tx, qty, price_am)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [ordrId, it.name, it.emoji || null, it.unit || null, it.qty || 1, it.price || 0]
      );
    }
    return [{ ...ord.rows[0], ttl_am: total, tenure_days: tenure }];
  });
};

exports.markPaidMdl = function (ordr_id: number, buyer_usr_id: number, req?: any) {
  const QRY = `
    UPDATE ${schema}.crdt_ordr_lst_t SET sts_cd = 'paid', paid_ts = now()
    WHERE ordr_id = $1 AND buyer_usr_id = $2 AND a_in = 1
    RETURNING ordr_id, sts_cd, paid_ts`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [ordr_id, buyer_usr_id], cntxtDtls, req);
};
