import assert from 'node:assert/strict';
import {liveOrigin,account} from './test-live.mjs';
// Session lifecycle: only our signed cookie creates an identity.
const origin=liveOrigin();
const session=async(headers={})=>{
 const response=await fetch(origin+'/api/session',{headers});
 assert.equal(response.status,200);
 assert.match(response.headers.get('cache-control'),/no-store/);
 return response.json();
};
const anonymous=await session();assert.equal(anonymous.user,null);assert.equal(anonymous.signOutUrl,'/api/auth/logout');
assert.equal((await session({'oai-authenticated-user-id':'attacker','oai-authenticated-user-email':'attacker@example.test'})).user,null,'proxy identity headers are ignored');
assert.equal((await session({Cookie:'__session=eyJzIjoiZXlKMWFXUWlPaUoxYzJWeU9uZ2lmUS5mb3JnZWQifQ'})).user,null,'forged cookie rejected');
const cookie=await account(origin,{name:'Auth Tester'});
const me=await session({Cookie:cookie});
assert.equal(me.user.name,'Auth Tester');assert.equal(me.user.provider,'password');assert.equal(me.user.admin,false);assert.equal('email' in me.user,false);
const logout=await fetch(origin+'/api/auth/logout',{headers:{Cookie:cookie},redirect:'manual'});
assert.equal(logout.status,302);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
const admin=await account(origin,{email:'moderator@roamly.test',name:'Moderator'});
assert.equal((await session({Cookie:admin})).user.admin,true,'ADMIN_EMAILS grants moderation');
console.log('Auth lifecycle passed: anonymous, proxy headers and forged cookies rejected, sign-in, sign-out, admin flag, private session caching.');
