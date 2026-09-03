/**
 * Prints strong random values for the secrets that MUST be rotated per environment.
 * Copy the output into that environment's .env (never commit it).
 *
 *   npm run gen:secrets
 *
 * The production boot guard (initialize/index.ts) refuses to start while these are
 * left at their dev defaults, so set real values before deploying.
 */
const crypto = require('crypto');

// URL-safe base64, no padding — safe to paste into .env without quoting.
const rand = (bytes) => crypto.randomBytes(bytes).toString('base64').replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' }[c]));

console.log('# ── Rotate these per environment (paste into .env) ─────────────────────────');
console.log(`SESSION_SECRET=${rand(48)}`);            // 64 chars, well over the 32-char minimum
console.log(`JWT_PRIVATE_KEY_PASSPHRASE=${rand(32)}`);
console.log('#');
console.log('# After setting JWT_PRIVATE_KEY_PASSPHRASE, regenerate the keypair to match:');
console.log('#   npm run keys -- --force');
console.log('# And set a real admin password:');
console.log('#   npm run admin:password -- <new-strong-password>');
