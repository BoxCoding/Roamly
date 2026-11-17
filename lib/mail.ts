import {env} from './env';
import {escHtml} from './static-page';
import {sessionSecret} from '../app/auth';
import {makeVerifyToken} from './account-email.mjs';

// Account email through Resend. Returns false (and sends nothing) when RESEND_API_KEY is not set.
// shortcut: the default sender onboarding@resend.dev only delivers to the Resend account owner; set RESEND_FROM to an address on a verified domain before launch.
export async function sendMail(to: string, subject: string, lines: string[], action?: {label: string, url: string}) {
  if (!env.RESEND_API_KEY) return false;
  const text = [...lines, ...(action ? ['', `${action.label}: ${action.url}`] : []), '', '— Roamly'].join('\n');
  const html = `<div style="font:15px/1.6 -apple-system,Segoe UI,sans-serif;color:#202c27;max-width:520px">${lines.map(l => `<p>${escHtml(l)}</p>`).join('')}${action ? `<p><a href="${escHtml(action.url)}" style="display:inline-block;background:#244d3d;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">${escHtml(action.label)}</a></p><p style="font-size:12px;color:#7c857f">Or open this link: ${escHtml(action.url)}</p>` : ''}<p style="color:#7c857f">— Roamly</p></div>`;
  try {
    const r = await fetch('https://api.resend.com/emails', {method: 'POST', headers: {Authorization: `Bearer ${env.RESEND_API_KEY.trim()}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({from: env.RESEND_FROM?.trim() || 'Roamly <onboarding@resend.dev>', to: [to], subject, text, html}), signal: AbortSignal.timeout(8000)});
    if (!r.ok) console.error('mail: resend rejected', r.status, (await r.text()).slice(0, 200));
    return r.ok;
  } catch (e) { console.error('mail: send failed', e); return false; }
}

// Origin for links inside emails. Never from X-Forwarded-Host: anyone can send that header and point a reset link at their own site.
// Cloud Run only routes requests whose Host is the service's own domain, so Host is safe there; set APP_ORIGIN once a custom domain is live.
export function mailOrigin(request: Request) {
  if (env.APP_ORIGIN) return env.APP_ORIGIN.replace(/\/$/, '');
  const host = request.headers.get('host') || new URL(request.url).host;
  return `${/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? 'http' : 'https'}://${host}`;
}

/** Sends the verification email to a password account, unless it is already verified. */
export async function sendVerification(request: Request, id: string, name: string, email: string) {
  const token = await makeVerifyToken(id, email, await sessionSecret());
  return sendMail(email, "Confirm your email for Roamly", [`Hi ${name},`, "Welcome to Roamly. Confirm this is your email so you can recover your account if you forget your password.", "The link works for 24 hours."], { label: "Confirm my email", url: `${mailOrigin(request)}/?verify=${token}` });
}

