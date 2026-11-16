// Short-lived sign-in codes for the mobile app, bound to the app's PKCE challenge (see lib/app-login.ts).
import {pkceChallenge, seal, unseal} from './google-oauth.mjs';

export const APP_CHALLENGE = /^[A-Za-z0-9_-]{43}$/;
export const makeAppCode = (user, challenge, secret, seconds = 120) => seal({purpose: 'app-login', c: challenge, u: user}, secret, seconds);
export async function redeemAppCode(code, verifier, secret) {
  const data = await unseal(code, secret).catch(() => null);
  if (!data || data.purpose !== 'app-login' || typeof verifier !== 'string' || verifier.length < 43 || verifier.length > 128) return null;
  return (await pkceChallenge(verifier)) === data.c ? data.u : null;
}
