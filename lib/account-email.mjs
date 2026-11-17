// Signed, stateless links for password reset and email verification (nothing is stored).
// A reset link is bound to the current password hash, so it stops working once the password changes.
import {seal, unseal} from './google-oauth.mjs';

const fingerprint = async hash => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hash)))].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
export const RESET_SECONDS = 3600, VERIFY_SECONDS = 86400;
export const TOKEN = /^[A-Za-z0-9._-]{20,2000}$/;

export const makeResetToken = async (userId, passwordHash, secret) => seal({purpose: 'reset', u: userId, h: await fingerprint(passwordHash)}, secret, RESET_SECONDS);
export async function readResetToken(token, secret, currentHash) {
  const d = await unseal(token, secret).catch(() => null);
  return d && d.purpose === 'reset' && typeof d.u === 'string' && d.h === await fingerprint(currentHash) ? d.u : null;
}
// Peek at the user ID so the caller can load the current hash; trust nothing until readResetToken passes.
export async function resetTokenUser(token, secret) {
  const d = await unseal(token, secret).catch(() => null);
  return d && d.purpose === 'reset' && typeof d.u === 'string' ? d.u : null;
}

export const makeVerifyToken = (userId, email, secret) => seal({purpose: 'verify-email', u: userId, e: email}, secret, VERIFY_SECONDS);
export async function readVerifyToken(token, secret) {
  const d = await unseal(token, secret).catch(() => null);
  return d && d.purpose === 'verify-email' && typeof d.u === 'string' && typeof d.e === 'string' ? {userId: d.u, email: d.e} : null;
}
