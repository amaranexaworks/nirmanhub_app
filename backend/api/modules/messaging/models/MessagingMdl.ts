/** MessagingMdl — 1:1 (or group) threads and their messages. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;
const q = (sql: string, p: any[], req?: any) => dbutil.execQuery(sqldb.AppPool, sql, p, cntxtDtls, req);

/** Threads the user participates in, with the other party + last message + unread count. */
exports.listThreadsMdl = (usr_id: number, req?: any) => q(`
  SELECT t.thrd_id,
         o.usr_id AS other_usr_id, o.dsply_nm AS other_nm, o.avtr_url_tx AS other_avatar,
         r.rle_nm AS other_rle,
         lm.body_tx AS last_body, lm.voice_secs AS last_voice, lm.i_ts AS last_ts,
         (SELECT count(*) FROM ${schema}.msg_lst_t m
            WHERE m.thrd_id = t.thrd_id AND m.sndr_usr_id <> $1 AND m.read_in = 0) AS unread
  FROM ${schema}.msg_thrd_lst_t t
  JOIN ${schema}.msg_thrd_prtcpnt_t me ON me.thrd_id = t.thrd_id AND me.usr_id = $1
  LEFT JOIN ${schema}.msg_thrd_prtcpnt_t op ON op.thrd_id = t.thrd_id AND op.usr_id <> $1
  LEFT JOIN ${schema}.usr_lst_t o ON o.usr_id = op.usr_id
  LEFT JOIN ${schema}.rle_lst_t r ON r.rle_id = o.actv_rle_id
  LEFT JOIN LATERAL (
     SELECT body_tx, voice_secs, i_ts FROM ${schema}.msg_lst_t m
     WHERE m.thrd_id = t.thrd_id ORDER BY m.i_ts DESC LIMIT 1
  ) lm ON true
  WHERE t.a_in = 1
  ORDER BY COALESCE(lm.i_ts, t.i_ts) DESC
  LIMIT 200`, [usr_id], req);

exports.isParticipantMdl = (thrd_id: number, usr_id: number, req?: any) => q(
  `SELECT 1 FROM ${schema}.msg_thrd_prtcpnt_t WHERE thrd_id = $1 AND usr_id = $2`, [thrd_id, usr_id], req);

// Return the most recent 300 messages (chronological). Without a cap a long chat
// returns thousands of rows into memory on every open — a latency/heap footgun. Older
// history should be fetched with keyset pagination on scroll if needed.
exports.messagesMdl = (thrd_id: number, req?: any) => q(`
  SELECT msg_id, sndr_usr_id, body_tx, voice_secs, read_in, i_ts FROM (
    SELECT msg_id, sndr_usr_id, body_tx, voice_secs, read_in, i_ts
    FROM ${schema}.msg_lst_t WHERE thrd_id = $1 ORDER BY i_ts DESC LIMIT 300
  ) recent ORDER BY i_ts ASC`, [thrd_id], req);

/** Find an existing 1:1 thread between two users, else create one. */
exports.getOrCreateThreadMdl = function (usr_id: number, other_id: number, req?: any) {
  return dbutil.withTransaction(sqldb.AppPool, async (client: any) => {
    const existing = await client.query(`
      SELECT p1.thrd_id FROM ${schema}.msg_thrd_prtcpnt_t p1
      JOIN ${schema}.msg_thrd_prtcpnt_t p2 ON p1.thrd_id = p2.thrd_id
      WHERE p1.usr_id = $1 AND p2.usr_id = $2 LIMIT 1`, [usr_id, other_id]);
    if (existing.rows.length) return [{ thrd_id: existing.rows[0].thrd_id, created: false }];

    const t = await client.query(`INSERT INTO ${schema}.msg_thrd_lst_t DEFAULT VALUES RETURNING thrd_id`);
    const thrdId = t.rows[0].thrd_id;
    await client.query(
      `INSERT INTO ${schema}.msg_thrd_prtcpnt_t (thrd_id, usr_id) VALUES ($1,$2),($1,$3)`,
      [thrdId, usr_id, other_id]);
    return [{ thrd_id: thrdId, created: true }];
  });
};

exports.sendMessageMdl = function (thrd_id: number, sndr: number, d: any, req?: any) {
  return dbutil.withTransaction(sqldb.AppPool, async (client: any) => {
    const m = await client.query(`
      INSERT INTO ${schema}.msg_lst_t (thrd_id, sndr_usr_id, body_tx, voice_secs)
      VALUES ($1,$2,$3,$4) RETURNING msg_id, body_tx, voice_secs, i_ts`,
      [thrd_id, sndr, d.body || null, d.voiceSecs || null]);
    await client.query(`UPDATE ${schema}.msg_thrd_lst_t SET u_ts = now() WHERE thrd_id = $1`, [thrd_id]);
    return [m.rows[0]];
  });
};

exports.markReadMdl = (thrd_id: number, reader: number, req?: any) => q(
  `UPDATE ${schema}.msg_lst_t SET read_in = 1 WHERE thrd_id = $1 AND sndr_usr_id <> $2 AND read_in = 0`,
  [thrd_id, reader], req);
