// One cookie, "__session", holds every signed value the server needs, because Firebase Hosting forwards only
// that cookie to Cloud Run. Each part is sealed (signed, expiring) on its own; the jar is just base64url JSON.
//   s: the 30-day sign-in session   g: Google sign-in flow   m: Facebook sign-in flow
import {cookie, readCookie} from './google-oauth.mjs';

export const JAR = '__session';
const LEGACY = '__Host-roamly_session';
const PARTS = ['s', 'g', 'm'];
const clean = jar => Object.fromEntries(PARTS.filter(k => typeof jar?.[k] === 'string' && jar[k] && jar[k].length < 4096).map(k => [k, jar[k]]));

export function readJar(header) {
  let jar = {};
  try { jar = JSON.parse(Buffer.from(readCookie(header, JAR) || '', 'base64url').toString('utf8')); } catch {}
  const out = clean(jar && typeof jar === 'object' && !Array.isArray(jar) ? jar : {});
  // Sessions from before the jar keep working until they sign out.
  if (!out.s) { const legacy = readCookie(header, LEGACY); if (legacy) out.s = legacy; }
  return out;
}
// Set-Cookie values for the new jar; an empty jar deletes the cookie. Always retires the legacy cookie.
export function jarCookies(jar) {
  const c = clean(jar), keys = Object.keys(c);
  return [keys.length ? cookie(JAR, Buffer.from(JSON.stringify(c)).toString('base64url'), c.s ? 30 * 86400 : 600) : cookie(JAR, '', 0), cookie(LEGACY, '', 0)];
}
