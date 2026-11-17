import assert from 'node:assert/strict';
import {hashPassword,verifyPassword,registerSchema,loginSchema} from './lib/password.mjs';
const h=await hashPassword('correct horse');
assert.match(h,/^pbkdf2\$100000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
assert(await verifyPassword('correct horse',h));
assert(!await verifyPassword('correct horsE',h));
assert.notEqual(await hashPassword('correct horse'),h,'Salt must differ per hash');
for(const bad of ['','plain','pbkdf2$1$$','md5$1$aa$bb'])assert(!await verifyPassword('x',bad));
assert.equal(registerSchema.parse({name:' Asha ',email:' Asha@Example.COM ',password:'12345678'}).email,'asha@example.com');
for(const bad of [{name:'',email:'a@b.co',password:'12345678'},{name:'A',email:'nope',password:'12345678'},{name:'A',email:'a@b.co',password:'short'},{name:'A',email:'a@b.co',password:'12345678',admin:true}])assert(!registerSchema.safeParse(bad).success,JSON.stringify(bad));
assert(loginSchema.safeParse({email:'a@b.co',password:'x'}).success);
// Reset links are bound to the current password hash; verify links to the email; neither works for the other purpose.
import('./lib/account-email.mjs').then(async ({makeResetToken,readResetToken,resetTokenUser,makeVerifyToken,readVerifyToken,TOKEN})=>{
  const secret='x'.repeat(32),h2=await hashPassword('another one');
  const t=await makeResetToken('u1',h,secret);assert.match(t,TOKEN);
  assert.equal(await resetTokenUser(t,secret),'u1');assert.equal(await readResetToken(t,secret,h),'u1');
  assert.equal(await readResetToken(t,secret,h2),null,'reset link dies once the password changes');
  assert.equal(await readResetToken(t,'y'.repeat(32),h),null,'other secret');
  assert.equal(await readResetToken(t.slice(0,-2)+'AA',secret,h),null,'tampered');
  const v=await makeVerifyToken('u1','a@b.co',secret);assert.deepEqual(await readVerifyToken(v,secret),{userId:'u1',email:'a@b.co'});
  assert.equal(await readVerifyToken(t,secret),null,'reset token is not a verify token');assert.equal(await resetTokenUser(v,secret),null,'verify token is not a reset token');
  const {profileSchema,emptyProfile}=await import('./lib/profile-schema.mjs');
  assert(profileSchema.safeParse({...emptyProfile(),emergency:{name:'Ma',phone:'+91 98765 43210',bloodGroup:'O+'}}).success);
  for(const e of [{name:'',phone:'call me',bloodGroup:''},{name:'',phone:'',bloodGroup:'Z+'},{name:'',phone:'',bloodGroup:'',extra:1}])assert(!profileSchema.safeParse({...emptyProfile(),emergency:e}).success,JSON.stringify(e));
  console.log('Password checks passed: salted PBKDF2, verify/reject, malformed hashes, signup and login validation, reset/verify links, emergency info.');
});
