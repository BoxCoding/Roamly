import assert from 'node:assert/strict';
import {emptyProfile} from './lib/profile-schema.mjs';
const origin=process.argv[2]||'http://127.0.0.1:5173';
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw new Error('Use only the local test server.');
assert.equal((await fetch(origin+'/api/profile')).status,401);
const login=await fetch(origin+'/signin-with-chatgpt?return_to=%2F',{redirect:'manual'}),cookie=login.headers.get('set-cookie').split(';')[0];
const request=(method,body,extra={})=>fetch(origin+'/api/profile',{method,headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json',...extra},...(body?{body:JSON.stringify(body)}:{})});
let response=await request('GET'),original=await response.json();assert.equal(response.status,200,JSON.stringify(original));
const bike={id:crypto.randomUUID(),type:'Bike',make:'Royal Enfield',model:'Meteor 350',year:2026,fuel:'Petrol',mileage:32,seats:2,engineCc:350};
const profile={...emptyProfile(),homeCity:'Bengaluru',experience:'Intermediate',vehicles:[bike,{...bike,id:crypto.randomUUID(),type:'Car',make:'Maruti',model:'Jimny',mileage:14,seats:4,engineCc:1462}]};
try{
 assert.equal((await request('PUT',{profile,updatedAt:original.updatedAt},{Origin:'https://example.com'})).status,403);
 assert.equal((await request('PUT',{profile:{...profile,userId:'someone-else'},updatedAt:original.updatedAt})).status,400);
 assert.equal((await request('PUT',{profile:{...profile,vehicles:[{...bike,seats:5}]},updatedAt:original.updatedAt})).status,400);
 response=await request('PUT',{profile,updatedAt:original.updatedAt});const saved=await response.json();assert.equal(response.status,200,JSON.stringify(saved));assert.equal(saved.profile.vehicles.length,2);
 const reread=await (await request('GET')).json();assert.deepEqual(reread.profile,profile);assert.match((await request('GET')).headers.get('cache-control'),/no-store/);
 assert.equal((await request('PUT',{profile,updatedAt:original.updatedAt})).status,409);
 const forged=await fetch(origin+'/api/profile',{headers:{'oai-authenticated-user-id':'local_seedy','oai-authenticated-user-email':'seedy@sites.test'}});assert.equal(forged.status,401);
 // With GEMINI_API_KEY set, '{}' fails validation (400); without it the route is unavailable (503).
 const aiOn=(await (await fetch(origin+'/api/ai-plan')).json()).available;
 const badPlan=await fetch(origin+'/api/ai-plan',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:'{}'});assert.equal(badPlan.status,aiOn?400:503);
 console.log('Profile API passed: sign-in required, owner identity enforced, cross-origin rejection, multi-vehicle persistence, invalid data rejected, stale writes rejected, AI route guarded.');
}finally{
 const current=await (await request('GET')).json();
 const restore=await request('PUT',{profile:original.profile,updatedAt:current.updatedAt});assert.equal(restore.status,200,'Restore local test profile');
}
