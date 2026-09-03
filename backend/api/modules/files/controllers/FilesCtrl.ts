/**
 * FilesCtrl — central upload/list/fetch for the two file stores.
 *   POST /files/upload          body { purpose, data(dataURL), fileName?, mime?, ref? }
 *   GET  /files/images?purpose= | /files/documents?purpose=
 *   GET  /files/image/:id | /files/document/:id   → { mime, data }
 * The table is chosen by mime: image/* → image_lst_t, else document_lst_t.
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const Mdl = require('../models/FilesMdl');
const storage = require((global as any).appRoot + '/utils/fileStorage.utils');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');
const RevokedTokenMdl = require((global as any).appRoot + '/api/modules/auth/models/RevokedTokenMdl');
const crypto = require('crypto');
const env = require((global as any).appRoot + '/config/loadEnv');

// File-scoped capability signature. A stored/rendered file link carries THIS (an
// unguessable HMAC over "<kind>:<id>") instead of the user's JWT — so the token never
// leaks into DB rows, server logs or Referer headers, and the link doesn't break when
// the token expires. Possession of the signed URL grants read access to that one file.
function fileSig(kind: string, id: number): string {
  const secret = process.env.FILE_URL_SECRET || env.session.secret;
  return crypto.createHmac('sha256', secret).update(`${kind}:${id}`).digest('hex');
}
function fsigValid(kind: string, id: number, sig: any): boolean {
  if (!sig) return false;
  const expected = Buffer.from(fileSig(kind, id));
  const got = Buffer.from(String(sig));
  return expected.length === got.length && crypto.timingSafeEqual(expected, got);
}

// GET /files/:kind/:id/sign — issue the capability signature for a file the caller
// OWNS, so the client can build a stable raw URL that carries no JWT.
const signBy = (isImage: boolean) => async function (req: any, res: any) {
  const fnm = 'signCtrl';
  try {
    const id = Number(req.params.id);
    const rows = await Mdl.getMdl(isImage, req.user.id, id, req); // owner-scoped
    if (!rows.length) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 404, err_message: 'Not found' });
    return df.formatSucessRes(req, res, { fsig: fileSig(isImage ? 'image' : 'document', id) }, cntxtDtls, fnm, {});
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};
exports.signImageCtrl = signBy(true);
exports.signDocumentCtrl = signBy(false);

/** Infer mime from an explicit field or a data-URL prefix. */
const mimeOf = (d: any): string => {
  if (d.mime) return String(d.mime);
  const m = typeof d.data === 'string' && d.data.match(/^data:([^;]+);/);
  return m ? m[1] : 'application/octet-stream';
};
const isImageMime = (mime: string) => mime.startsWith('image/');

exports.uploadCtrl = async function (req: any, res: any) {
  const fnm = 'uploadCtrl';
  const d = req.body.data || req.body;
  if (!d.purpose) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'purpose is required' });
  if (!d.data) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'data (base64 data-URL) is required' });
  try {
    const mime = mimeOf(d);
    const isImage = isImageMime(mime);
    // Write bytes to disk (<uploadDir>/YYYY/MM/uuid.ext); persist only the path.
    const saved = await storage.saveDataUrl(d.data, mime, d.fileName);
    try {
      const rows = await Mdl.insertMdl(isImage, req.user.id, { ...d, mime: saved.mime, storPath: saved.relPath, size: saved.size }, req);
      return df.formatSucessRes(req, res, { kind: isImage ? 'image' : 'document', ...rows[0] }, cntxtDtls, fnm, { success_status: 201, success_msg: 'File uploaded' });
    } catch (dbErr: any) {
      // DB insert failed — don't leave an orphaned file on disk.
      await storage.deleteFile(saved.relPath);
      throw dbErr;
    }
  } catch (e: any) {
    const tooBig = /limit|Empty file/.test(e.message || '');
    return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: tooBig ? 400 : 500, err_message: e.message });
  }
};

const listBy = (isImage: boolean) => async function (req: any, res: any) {
  const fnm = 'listCtrl';
  try {
    const rows = await Mdl.listMdl(isImage, req.user.id, req.query.purpose || null, req);
    return df.formatSucessRes(req, res, rows, cntxtDtls, fnm, {});
  } catch (e: any) {
    return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message });
  }
};
exports.listImagesCtrl = listBy(true);
exports.listDocumentsCtrl = listBy(false);

const getBy = (isImage: boolean) => async function (req: any, res: any) {
  const fnm = 'getCtrl';
  try {
    const rows = await Mdl.getMdl(isImage, req.user.id, Number(req.params.id), req);
    if (!rows.length) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 404, err_message: 'Not found' });
    return df.formatSucessRes(req, res, rows[0], cntxtDtls, fnm, {});
  } catch (e: any) {
    return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message });
  }
};
exports.getImageCtrl = getBy(true);
exports.getDocumentCtrl = getBy(false);

/**
 * Raw serving — streams the actual bytes so a file is directly viewable/downloadable
 * (e.g. <img src> or a document link). Access is granted by EITHER:
 *   • a valid capability signature `?fsig=` (stable, JWT-free — the preferred way to
 *     store/render a link), or
 *   • a JWT (header, Bearer, or `?token=`) — owner-scoped and denylist-checked.
 * Bytes are streamed from disk, never buffered whole into memory.
 */
const rawServe = (isImage: boolean) => async function (req: any, res: any) {
  const kind = isImage ? 'image' : 'document';
  const id = Number(req.params.id);
  let row: any;
  try {
    if (fsigValid(kind, id, req.query.fsig)) {
      // Capability URL — the unguessable signature is itself the grant.
      const rows = await Mdl.getByIdMdl(isImage, id, req);
      row = rows[0];
    } else {
      // JWT path. An <img> tag can't send a header, so the token may come via ?token=.
      const token = req.headers['x-access-token']
        || (req.headers.authorization ? String(req.headers.authorization).replace(/^Bearer\s+/i, '') : null)
        || req.query.token;
      if (!token) return res.status(401).send('Unauthorized');
      let decoded: any;
      try { decoded = AuthService.verifyJWTToken(token); } catch { return res.status(401).send('Unauthorized'); }
      // Honour the revocation denylist here too (this route does its own token check,
      // not the authenticate middleware). Fail closed on error.
      if (decoded.jti && await RevokedTokenMdl.isRevokedMdl(decoded.jti)) return res.status(401).send('Unauthorized');
      const rows = await Mdl.getMdl(isImage, decoded.id, id, req);
      row = rows[0];
    }
  } catch { return res.status(401).send('Unauthorized'); }

  if (!row) return res.status(404).send('Not found');
  res.set('Cache-Control', 'private, max-age=3600');
  res.set('Content-Type', row.mime_tx || 'application/octet-stream');

  // Preferred path: STREAM bytes from disk — no whole-file buffering (heap-safe under
  // concurrent downloads of large files).
  if (row.stor_path_tx) {
    let stream: any;
    try { stream = storage.createReadStream(row.stor_path_tx); }
    catch { return res.status(404).send('Not found'); }
    stream.on('error', () => { if (!res.headersSent) res.status(404).send('Not found'); else res.destroy(); });
    return stream.pipe(res);
  }
  // Legacy path: bytes still inline as a base64 data-URL (pre-disk-storage rows).
  const m = String(row.data_tx || '').match(/^data:([^;]+);base64,(.*)$/);
  if (!m) return res.status(415).send('Unsupported file encoding');
  res.set('Content-Type', row.mime_tx || m[1] || 'application/octet-stream');
  return res.send(Buffer.from(m[2], 'base64'));
};
exports.rawImageCtrl = rawServe(true);
exports.rawDocumentCtrl = rawServe(false);
