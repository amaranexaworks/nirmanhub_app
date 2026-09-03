/** HiringMdl — search workers/experts and read market rates. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;

/** Search hireable users (workers/experts). Optional trade code + city + text filters. */
exports.searchMdl = function (f: any, limit: number, offset: number, req?: any) {
  const QRY = `
    SELECT u.usr_id, u.dsply_nm, u.avtr_url_tx, u.cty_nm, u.pncd_tx,
           u.rtng_nm, u.rtng_cnt, u.day_rate_am, u.srvc_rds_km, u.kyc_tier_cd,
           r.rle_id, r.rle_cd, r.rle_nm, r.emoji_tx, a.archtyp_cd
    FROM ${schema}.usr_lst_t u
    JOIN ${schema}.rle_lst_t r     ON r.rle_id = u.actv_rle_id
    JOIN ${schema}.archtyp_lst_t a ON a.archtyp_id = r.archtyp_id
    WHERE u.a_in = 1
      AND a.archtyp_cd IN ('worker','expert')
      AND ($1::text IS NULL OR r.rle_cd = $1)
      AND ($2::text IS NULL OR u.cty_nm ILIKE '%' || $2 || '%')
      AND ($3::text IS NULL OR u.dsply_nm ILIKE '%' || $3 || '%')
    ORDER BY u.rtng_nm DESC NULLS LAST, u.rtng_cnt DESC
    LIMIT $4 OFFSET $5`;
  return dbutil.execQuery(sqldb.AppPool, QRY,
    [f.trade || null, f.city || null, f.q || null, limit, offset], cntxtDtls, req);
};

/**
 * Public directory of professionals for the website, by archetype
 * (worker / expert / contractor). Same public-safe columns as searchMdl (name,
 * avatar, city, rating — no phone/PII), but the archetype set is a parameter so
 * the site can browse contractors and experts too, not just workers.
 */
exports.publicProfessionalsMdl = function (archetypes: string[], f: any, limit: number, offset: number, req?: any) {
  const QRY = `
    SELECT u.usr_id, u.dsply_nm, u.avtr_url_tx, u.cty_nm, u.pncd_tx,
           u.rtng_nm, u.rtng_cnt, u.day_rate_am, u.srvc_rds_km, u.kyc_tier_cd,
           r.rle_id, r.rle_cd, r.rle_nm, r.emoji_tx, a.archtyp_cd
    FROM ${schema}.usr_lst_t u
    JOIN ${schema}.rle_lst_t r     ON r.rle_id = u.actv_rle_id
    JOIN ${schema}.archtyp_lst_t a ON a.archtyp_id = r.archtyp_id
    WHERE u.a_in = 1
      AND a.archtyp_cd = ANY($1::text[])
      AND ($2::text IS NULL OR r.rle_cd = $2)
      AND ($3::text IS NULL OR u.cty_nm ILIKE '%' || $3 || '%')
      AND ($4::text IS NULL OR u.dsply_nm ILIKE '%' || $4 || '%')
    ORDER BY u.rtng_nm DESC NULLS LAST, u.rtng_cnt DESC
    LIMIT $5 OFFSET $6`;
  return dbutil.execQuery(sqldb.AppPool, QRY,
    [archetypes, f.trade || null, f.city || null, f.q || null, limit, offset], cntxtDtls, req);
};

exports.marketRatesMdl = function (req?: any) {
  const QRY = `
    SELECT r.rle_cd, r.rle_nm, r.emoji_tx, m.avg_am, m.min_am, m.max_am, m.smpls_cnt
    FROM ${schema}.mkt_rate_lst_t m
    JOIN ${schema}.rle_lst_t r ON r.rle_id = m.rle_id AND r.a_in = 1
    WHERE m.a_in = 1
    ORDER BY r.sqnce_id`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [], cntxtDtls, req);
};
