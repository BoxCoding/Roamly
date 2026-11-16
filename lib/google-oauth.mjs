// Pure Google OIDC helpers (no runtime imports) so node tests can load them.
export const GOOGLE_CALLBACK = '/api/auth/google/callback';

const enc = new TextEncoder();
const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const hmacKey = secret => crypto.subtle.importKey('raw', enc.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign', 'verify']);

export const randomToken = () => b64url(crypto.getRandomValues(new Uint8Array(32)));

// Signed (not encrypted) cookie value: payload is readable but tamper-proof and expiring.
export async function seal(payload, secret, maxAgeSeconds) {
  const body = b64url(enc.encode(JSON.stringify({...payload, exp: Math.floor(Date.now() / 1000) + maxAgeSeconds})));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

export async function unseal(token, secret) {
  const [body, sig, extra] = String(token || '').split('.');
  if (!body || !sig || extra !== undefined) return null;
  try {
    if (!await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(sig), enc.encode(body))) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    return data.exp > Date.now() / 1000 ? data : null;
  } catch { return null; }
}

export async function pkcePair() {
  const verifier = randomToken();
  return {verifier, challenge: await pkceChallenge(verifier)};
}
export const pkceChallenge = async verifier => b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(verifier))));

export function authorizeUrl({clientId, redirectUri, state, nonce, challenge}) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: 'openid email profile', state, nonce, code_challenge: challenge, code_challenge_method: 'S256', prompt: 'select_account'});
  return url.href;
}

// The ID token comes straight from Google's token endpoint over TLS, so per OIDC Core 3.1.3.7
// the signature check may be skipped; issuer, audience, expiry and nonce are still enforced.
export function checkIdToken(idToken, {clientId, nonce, now = Date.now()}) {
  try {
    const c = JSON.parse(new TextDecoder().decode(fromB64url(String(idToken).split('.')[1])));
    if (!['https://accounts.google.com', 'accounts.google.com'].includes(c.iss)) return null;
    if (c.aud !== clientId || !(c.exp * 1000 > now) || c.nonce !== nonce) return null;
    if (typeof c.sub !== 'string' || !c.sub || typeof c.email !== 'string') return null;
    return {sub: c.sub, email: c.email, emailVerified: c.email_verified === true, name: typeof c.name === 'string' ? c.name.slice(0, 100) : null};
  } catch { return null; }
}

export const cookie = (name, value, maxAge) => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
export const readCookie = (header, name) => (header || '').split(';').map(s => s.trim()).find(s => s.startsWith(name + '='))?.slice(name.length + 1);
