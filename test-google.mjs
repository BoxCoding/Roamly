import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {seal,unseal,pkceChallenge,authorizeUrl,checkIdToken,readCookie,cookie} from './lib/google-oauth.mjs';
const secret='test-secret-test-secret-test-secret';
const token=await seal({sub:'123',email:'a@example.test'},secret,60);
assert.equal((await unseal(token,secret)).sub,'123');
assert.equal(await unseal(token,'wrong-secret'),null,'Other secrets must not verify');
const [body,sig]=token.split('.');
const forged=Buffer.from(JSON.stringify({sub:'attacker',exp:9e9})).toString('base64url');
assert.equal(await unseal(`${forged}.${sig}`,secret),null,'Tampered payload must fail');
assert.equal(await unseal(await seal({sub:'1'},secret,-1),secret),null,'Expired cookie must fail');
for(const bad of [undefined,'','x','a.b.c',`${body}.`])assert.equal(await unseal(bad,secret),null);
// S256 = base64url(sha256(verifier)), checked against node:crypto as an independent implementation.
const verifier='dBjftJeZ4CVP-mJ92ZLwBNnl7k5ElU6qjN2HkUoUpzI';
assert.equal(await pkceChallenge(verifier),createHash('sha256').update(verifier).digest('base64url'));
const u=new URL(authorizeUrl({clientId:'cid',redirectUri:'http://localhost:5173/api/auth/google/callback',state:'s',nonce:'n',challenge:'c'}));
assert.equal(u.origin,'https://accounts.google.com');
for(const [k,v] of Object.entries({client_id:'cid',response_type:'code',state:'s',nonce:'n',code_challenge:'c',code_challenge_method:'S256',scope:'openid email profile'}))assert.equal(u.searchParams.get(k),v,k);
const jwt=claims=>`h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;
const good={iss:'https://accounts.google.com',aud:'cid',exp:Date.now()/1000+60,nonce:'n',sub:'42',email:'a@example.test',name:'Asha'};
assert.deepEqual(checkIdToken(jwt(good),{clientId:'cid',nonce:'n'}),{sub:'42',email:'a@example.test',emailVerified:false,name:'Asha'});
assert.equal(checkIdToken(jwt({...good,email_verified:true}),{clientId:'cid',nonce:'n'}).emailVerified,true);
for(const bad of [{iss:'https://evil.test'},{aud:'other'},{exp:Date.now()/1000-1},{nonce:'other'},{sub:''},{email:undefined}])assert.equal(checkIdToken(jwt({...good,...bad}),{clientId:'cid',nonce:'n'}),null,JSON.stringify(bad));
assert.equal(checkIdToken('garbage',{clientId:'cid',nonce:'n'}),null);
assert.equal(readCookie('a=1; __Host-roamly_g=xyz; b=2','__Host-roamly_g'),'xyz');
assert.match(cookie('n','v',10),/HttpOnly; Secure; SameSite=Lax; Max-Age=10/);
console.log('Google OAuth checks passed: signed cookies (tamper/expiry), PKCE, authorize URL, ID-token claims.');

// Facebook (Meta) login helpers.
import {metaAuthorizeUrl,metaProfile} from './lib/meta-oauth.mjs';
{
  const m=new URL(metaAuthorizeUrl({appId:'app',redirectUri:'https://x.test/api/auth/meta/callback',state:'st'}));
  assert.equal(m.origin,'https://www.facebook.com');assert.equal(m.searchParams.get('state'),'st');assert.equal(m.searchParams.get('scope'),'public_profile,email');
  const calls=[];const fake=async url=>{calls.push(String(url));return String(url).includes('access_token?')?{ok:true,json:async()=>({access_token:'tok'})}:{ok:true,json:async()=>({id:'99',name:'Asha',email:'a@x.test'})}};
  assert.deepEqual(await metaProfile({code:'c',appId:'app',appSecret:'sec',redirectUri:'r',fetchImpl:fake}),{id:'99',name:'Asha',email:'a@x.test'});
  assert(calls[1].includes('appsecret_proof='),'profile call carries appsecret_proof');
  assert.equal(await metaProfile({code:'c',appId:'app',appSecret:'sec',redirectUri:'r',fetchImpl:async()=>({ok:false})}),null);
  console.log('Meta login helpers passed.');
}

// Cookie jar: one __session cookie for Firebase Hosting.
{
  const {readJar,jarCookies,JAR}=await import('./lib/cookie-jar.mjs');
  const [set,legacyClear]=jarCookies({s:'sess.tok',g:'flow.tok',x:'ignored'});
  assert.match(set,new RegExp(`^${JAR}=`));assert.match(set,/Max-Age=2592000/);assert.match(legacyClear,/__Host-roamly_session=; .*Max-Age=0/);
  const header=set.split(';')[0];
  assert.deepEqual(readJar(header),{s:'sess.tok',g:'flow.tok'});
  assert.match(jarCookies({g:'flow'})[0],/Max-Age=600/,'flow-only jar is short-lived');
  assert.match(jarCookies({})[0],/^__session=; .*Max-Age=0/,'empty jar deletes the cookie');
  assert.deepEqual(readJar('__Host-roamly_session=old.tok'),{s:'old.tok'},'legacy session still read');
  assert.deepEqual(readJar('__session=@@@'),{},'garbage ignored');
  console.log('Cookie jar passed.');
}

// Mobile app sign-in codes: PKCE-bound and short-lived.
{
  const {makeAppCode,redeemAppCode,APP_CHALLENGE}=await import('./lib/app-code.mjs');
  const {pkcePair}=await import('./lib/google-oauth.mjs');
  const {verifier,challenge}=await pkcePair();assert(APP_CHALLENGE.test(challenge));
  const user={userId:'google:1',displayName:'Asha',provider:'google',email:'a@x.test'};
  const code=await makeAppCode(user,challenge,'secret');
  assert.deepEqual(await redeemAppCode(code,verifier,'secret'),user);
  assert.equal(await redeemAppCode(code,(await pkcePair()).verifier,'secret'),null,'stolen code without the verifier is useless');
  assert.equal(await redeemAppCode(code,verifier,'other-secret'),null,'forged code rejected');
  assert.equal(await redeemAppCode(await makeAppCode(user,challenge,'secret',-1),verifier,'secret'),null,'expired code rejected');
  console.log('App sign-in codes passed.');
}
