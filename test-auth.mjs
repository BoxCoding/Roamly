import assert from 'node:assert/strict';
// Exercise the Sites loopback development auth lifecycle, not production OAuth.
const origin=process.argv[2]||'http://localhost:5173';
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw new Error('Run only against the local development server.');
const session=async(headers={})=>{
 const response=await fetch(origin+'/api/session',{headers});
 assert.equal(response.status,200);
 assert.match(response.headers.get('cache-control'),/no-store/);
 return response.json();
};
const anonymous=await session();assert.equal(anonymous.user,null);
assert.equal(anonymous.signInUrl,'/signin-with-chatgpt?return_to=%2F');
assert.equal(anonymous.signOutUrl,'/signout-with-chatgpt?return_to=%2F');
const forged=await session({'oai-authenticated-user-id':'attacker','oai-authenticated-user-email':'attacker@example.test'});
assert.equal(forged.user,null,'Caller-supplied identity must not sign in');
const login=await fetch(origin+anonymous.signInUrl,{redirect:'manual'});
assert.equal(login.status,302);assert.equal(login.headers.get('location'),'/');
const cookie=login.headers.get('set-cookie').split(';')[0];
assert.match(login.headers.get('set-cookie'),/HttpOnly/);
const authenticated=await session({Cookie:cookie});
assert.deepEqual(authenticated.user,{id:'local_seedy',name:'Seedy',provider:'chatgpt'});
assert.equal('email' in authenticated.user,false);
const logout=await fetch(origin+authenticated.signOutUrl,{headers:{Cookie:cookie},redirect:'manual'});
assert.equal(logout.status,302);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
assert.equal((await session()).user,null);
const unsafeReturn=await fetch(origin+'/signin-with-chatgpt?return_to=https://example.com',{redirect:'manual'});
assert.equal(unsafeReturn.headers.get('location'),'/');
console.log('Auth lifecycle passed: anonymous, spoofed headers rejected, sign-in, verified identity, sign-out, safe redirects, private session caching.');
