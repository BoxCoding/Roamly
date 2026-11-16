import {makeAppCode} from './app-code.mjs';
import {jarCookies} from './cookie-jar.mjs';
import {escHtml} from './static-page';
import type {AppUser} from '../app/auth';

// Google blocks sign-in inside app WebViews, so the mobile app signs in through the system browser
// and gets back a short-lived code on roamly://auth. The code is bound to a PKCE challenge the app made,
// so a code intercepted by another app is useless without the verifier that only Roamly holds.
export {APP_CHALLENGE,redeemAppCode} from './app-code.mjs';

/** Page shown in the system browser after sign-in: hands the code to the app via roamly://auth. */
export async function appHandoff(user:AppUser|null,challenge:string,secret:string,jarWithoutFlow:Record<string,string|undefined>){
  const target=user?`roamly://auth?code=${encodeURIComponent(await makeAppCode(user,challenge,secret))}`:'roamly://auth?error=1';
  const headers=new Headers({'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  for(const c of jarCookies(jarWithoutFlow))headers.append('Set-Cookie',c);
  return new Response(`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Back to Roamly</title>
<style>body{font:16px system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#244d3d;color:#fff;text-align:center;padding:24px;box-sizing:border-box}a{display:inline-block;margin-top:16px;background:#fff;color:#244d3d;border-radius:10px;padding:14px 24px;font-weight:700;text-decoration:none}</style></head>
<body><main><h1>${user?'Signed in':'Sign-in did not finish'}</h1><p>${user?'Taking you back to the Roamly app…':'Go back to the app and try again.'}</p><a href="${escHtml(target)}">Open Roamly</a></main><script>location.href=${JSON.stringify(target)}</script></body></html>`,{headers});
}
