// Facebook Login (Meta) OAuth 2.0 code flow. State is kept in a short-lived sealed cookie.
export const META_CALLBACK = '/api/auth/meta/callback';
const GRAPH = 'https://graph.facebook.com/v21.0';

export function metaAuthorizeUrl({appId, redirectUri, state}) {
  const url = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  url.search = new URLSearchParams({client_id: appId, redirect_uri: redirectUri, state, response_type: 'code', scope: 'public_profile,email'});
  return url.href;
}

// Exchange the code, then read the profile. Returns {id, name, email} or null.
export async function metaProfile({code, appId, appSecret, redirectUri, fetchImpl = fetch}) {
  const token = await fetchImpl(`${GRAPH}/oauth/access_token?` + new URLSearchParams({client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code}), {signal: AbortSignal.timeout(10000)});
  if (!token.ok) return null;
  const {access_token} = await token.json();
  if (typeof access_token !== 'string') return null;
  // appsecret_proof ties the token to our app secret (Meta's recommended server-side check).
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(appSecret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const proof = Buffer.from(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(access_token))).toString('hex');
  const me = await fetchImpl(`${GRAPH}/me?` + new URLSearchParams({fields: 'id,name,email', access_token, appsecret_proof: proof}), {signal: AbortSignal.timeout(10000)});
  if (!me.ok) return null;
  const p = await me.json();
  if (typeof p.id !== 'string' || !p.id) return null;
  return {id: p.id, name: typeof p.name === 'string' ? p.name.slice(0, 100) : '', email: typeof p.email === 'string' ? p.email : ''};
}
