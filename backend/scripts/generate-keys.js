/**
 * Generates the RS256 key pair used to sign/verify JWTs.
 * Output: security/private_key.pem (encrypted with the passphrase) + public_key.pem.
 *
 *   npm run keys              → create keys if they don't exist yet
 *   npm run keys -- --force   → OVERWRITE existing keys (rotation). Invalidates every
 *                               token/session signed by the old key — everyone re-logs in.
 *
 * The private key is encrypted with JWT_PRIVATE_KEY_PASSPHRASE from .env. After you
 * rotate that passphrase you MUST regenerate the keypair (`--force`) so the file matches.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const force = process.argv.includes('--force');
const isProd = (process.env.NODE_ENV || 'development') === 'production';
const passphrase = process.env.JWT_PRIVATE_KEY_PASSPHRASE || 'nirmaan@secret';
const dir = path.join(__dirname, '..', 'security');
const privPath = path.join(dir, 'private_key.pem');
const pubPath = path.join(dir, 'public_key.pem');

// Never let a production keypair be protected by the well-known dev passphrase.
if (isProd && passphrase === 'nirmaan@secret') {
  console.error('✗ Refusing to generate a production key with the default JWT_PRIVATE_KEY_PASSPHRASE.');
  console.error('  Set a strong JWT_PRIVATE_KEY_PASSPHRASE in .env first (see `npm run gen:secrets`).');
  process.exit(1);
}

if (fs.existsSync(privPath) && fs.existsSync(pubPath) && !force) {
  console.log('Keys already exist at', dir, '— pass --force to regenerate (rotation).');
  process.exit(0);
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
    cipher: 'aes-256-cbc',
    passphrase,
  },
});

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(privPath, privateKey, { mode: 0o600 });
fs.writeFileSync(pubPath, publicKey, { mode: 0o644 });
console.log(`✓ RS256 key pair ${force ? 're' : ''}written to`, dir);
if (force) console.log('  Note: all existing tokens/sessions are now invalid — users must log in again.');
