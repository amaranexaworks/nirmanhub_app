/**
 * SocialVerify — verifies Google / Apple `id_token`s server-side.
 *
 * Uses only Node built-ins (fetch + crypto) and jsonwebtoken:
 *   1. decode the token header → find the signing-key id (kid)
 *   2. fetch the provider's public JWKS (cached ~1h) and match the kid
 *   3. convert the JWK to a public key and verify the RS256 signature,
 *      the audience (our OAuth client id) and the issuer.
 *
 * Configure GOOGLE_CLIENT_ID / APPLE_CLIENT_ID in the environment to enable.
 */
export {};
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const GOOGLE_CERTS = 'https://www.googleapis.com/oauth2/v3/certs';
const APPLE_CERTS = 'https://appleid.apple.com/auth/keys';
const GOOGLE_ISS = ['https://accounts.google.com', 'accounts.google.com'];
const APPLE_ISS = 'https://appleid.apple.com';

// In-memory JWKS cache { url → { keys, exp } }.
const jwksCache: Record<string, { keys: any[]; exp: number }> = {};

async function fetchJwks(url: string): Promise<any[]> {
  const now = Date.now();
  const hit = jwksCache[url];
  if (hit && hit.exp > now) return hit.keys;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not fetch provider signing keys');
  const body: any = await res.json();
  jwksCache[url] = { keys: body.keys || [], exp: now + 60 * 60 * 1000 };
  return jwksCache[url].keys;
}

function jwkToPem(jwk: any): string {
  const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  return key.export({ type: 'spki', format: 'pem' }).toString();
}

async function verifyToken(idToken: string, certsUrl: string, audience: string, issuer: string | string[]): Promise<any> {
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || !decoded.header || !decoded.header.kid) throw new Error('Malformed id_token');
  const keys = await fetchJwks(certsUrl);
  const jwk = keys.find((k: any) => k.kid === decoded.header.kid);
  if (!jwk) throw new Error('Unknown signing key');
  return jwt.verify(idToken, jwkToPem(jwk), { algorithms: ['RS256'], audience, issuer });
}

const asBool = (v: any) => v === true || v === 'true';

/** True when the provider's OAuth client id is configured (verification possible). */
exports.isConfigured = function (provider: string): boolean {
  if (provider === 'google') return !!process.env.GOOGLE_CLIENT_ID;
  if (provider === 'apple') return !!process.env.APPLE_CLIENT_ID;
  return false;
};

/** Verify a Google id_token → { email, name, sub, emailVerified }. Throws if invalid. */
exports.verifyGoogleIdToken = async function (idToken: string) {
  const aud = process.env.GOOGLE_CLIENT_ID;
  if (!aud) throw new Error('GOOGLE_CLIENT_ID not configured');
  const p = await verifyToken(idToken, GOOGLE_CERTS, aud, GOOGLE_ISS);
  return { email: p.email, name: p.name || [p.given_name, p.family_name].filter(Boolean).join(' ') || null, sub: p.sub, emailVerified: asBool(p.email_verified) };
};

/** Verify an Apple id_token → { email, name, sub, emailVerified }. Throws if invalid.
 *  (Apple only returns the display name on the very first authorization, out-of-band.) */
exports.verifyAppleIdToken = async function (idToken: string) {
  const aud = process.env.APPLE_CLIENT_ID;
  if (!aud) throw new Error('APPLE_CLIENT_ID not configured');
  const p = await verifyToken(idToken, APPLE_CERTS, aud, APPLE_ISS);
  return { email: p.email, name: null, sub: p.sub, emailVerified: asBool(p.email_verified) };
};
