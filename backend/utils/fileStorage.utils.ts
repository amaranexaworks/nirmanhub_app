/**
 * fileStorage.utils — writes uploaded files to disk instead of the database.
 *
 * Layout:  <UPLOAD_DIR>/YYYY/MM/<uuid>.<ext>
 * Only the RELATIVE path (e.g. '2026/07/ab12-….jpg') is persisted in the DB;
 * the absolute location is resolved from UPLOAD_DIR at read time, so the store
 * can be moved (or swapped for object storage) without touching any rows.
 */
export {};
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const env = require((global as any).appRoot + '/config/loadEnv');

const UPLOAD_DIR: string = env.files.uploadDir;

// Minimal mime → extension map for the file types this app accepts.
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/gif': 'gif', 'image/heic': 'heic', 'image/svg+xml': 'svg',
  'application/pdf': 'pdf', 'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt', 'text/csv': 'csv',
};

function extFor(mime: string, fileName?: string): string {
  if (EXT[mime]) return EXT[mime];
  const fromName = fileName && path.extname(fileName).replace('.', '').toLowerCase();
  return fromName && /^[a-z0-9]{1,6}$/.test(fromName) ? fromName : 'bin';
}

/** Parse a data-URL (or raw base64) into { mime, buffer }. */
function decodeDataUrl(data: string, fallbackMime: string): { mime: string; buffer: Buffer } {
  const m = typeof data === 'string' && data.match(/^data:([^;]+);base64,(.*)$/s);
  if (m) return { mime: m[1], buffer: Buffer.from(m[2], 'base64') };
  // Not a data-URL — treat as raw base64 with the caller-supplied mime.
  return { mime: fallbackMime || 'application/octet-stream', buffer: Buffer.from(String(data), 'base64') };
}

/**
 * Persist a data-URL (or base64) to disk under YYYY/MM. Returns the relative
 * path, the resolved mime, and the byte size. Enforces the configured max size.
 */
exports.saveDataUrl = async function (data: string, mimeHint: string, fileName?: string) {
  const { mime, buffer } = decodeDataUrl(data, mimeHint);
  if (!buffer.length) throw new Error('Empty file');
  if (buffer.length > env.files.maxBytes) {
    throw new Error(`File exceeds the ${Math.round(env.files.maxBytes / 1048576)}MB limit`);
  }

  // Date-partitioned folder. Derived from the request time; padded to 2 digits.
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const relDir = path.join(yyyy, mm);
  const absDir = path.join(UPLOAD_DIR, relDir);
  await fsp.mkdir(absDir, { recursive: true });

  const name = `${crypto.randomUUID()}.${extFor(mime, fileName)}`;
  const relPath = path.join(relDir, name);
  await fsp.writeFile(path.join(UPLOAD_DIR, relPath), buffer);

  // Store with forward slashes so the value is portable across OSes.
  return { relPath: relPath.split(path.sep).join('/'), mime, size: buffer.length };
};

/** Absolute path for a stored relative path (guards against path traversal). */
exports.resolvePath = function (relPath: string): string {
  const abs = path.resolve(UPLOAD_DIR, relPath);
  const root = path.resolve(UPLOAD_DIR);
  if (abs !== root && !abs.startsWith(root + path.sep)) throw new Error('Invalid storage path');
  return abs;
};

/** Read a stored file's bytes from disk. */
exports.readFile = function (relPath: string): Promise<Buffer> {
  return fsp.readFile(exports.resolvePath(relPath));
};

/** A readable stream for a stored file — lets the server pipe bytes to the client
 *  without buffering the whole file into memory (heap-safe under concurrent downloads).
 *  Path-traversal guarded via resolvePath. */
exports.createReadStream = function (relPath: string) {
  return fs.createReadStream(exports.resolvePath(relPath));
};

/** Best-effort delete (used when a DB insert fails after the file was written). */
exports.deleteFile = async function (relPath: string) {
  try { await fsp.unlink(exports.resolvePath(relPath)); } catch { /* already gone */ }
};

/** Ensure the base upload directory exists (called at startup). */
exports.ensureBaseDir = function () {
  return fsp.mkdir(UPLOAD_DIR, { recursive: true });
};
