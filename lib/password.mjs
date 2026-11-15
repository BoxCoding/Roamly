import {z} from 'zod';

// PBKDF2-SHA256; 100k is the Cloudflare Workers WebCrypto iteration ceiling.
const ITERATIONS = 100000;
const enc = new TextEncoder();
const hex = bytes => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
const unhex = s => Uint8Array.from(s.match(/../g) || [], h => parseInt(h, 16));

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({name: 'PBKDF2', hash: 'SHA-256', salt, iterations}, key, 256));
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${hex(salt)}$${hex(await derive(password, salt, ITERATIONS))}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, iter, salt, hash] = String(stored).split('$');
  if (scheme !== 'pbkdf2' || !salt || !hash) return false;
  const actual = await derive(password, unhex(salt), Number(iter)), expected = unhex(hash);
  let diff = actual.length ^ expected.length;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ (expected[i] ?? 0);
  return diff === 0;
}

const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(254);
const password = z.string().min(8, 'Password must be at least 8 characters.').max(128, 'Password is too long.');
export const registerSchema = z.object({name: z.string().trim().min(1, 'Enter your name.').max(60), email, password}).strict();
export const loginSchema = z.object({email, password: z.string().min(1).max(128)}).strict();

// Lock an account for 15 minutes after 5 wrong passwords in a row.
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;
