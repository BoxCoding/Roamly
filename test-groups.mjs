import assert from 'node:assert/strict';
import {liveOrigin,account} from './test-live.mjs';
// Shared crews, reports and moderation against the local dev server only.
const origin=liveOrigin();
const call=(method,body,cookie,{path='/api/groups',...extra}={})=>fetch(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});
const list=async cookie=>(await (await call('GET',null,cookie)).json()).groups;
const report=(id,cookie,reason='spam')=>call('POST',{id,reason,note:'test'},cookie,{path:'/api/groups/report'});

const [a,b,c,d]=await Promise.all(['Rider A','Rider B','Rider C','Rider D'].map(name=>account(origin,{name})));
const mod=await account(origin,{email:'moderator@roamly.test',name:'Moderator'});

const crew={name:'Test Ghat Riders',city:'Pune',vehicle:'Bike',meetup:'Chandni Chowk',cadence:'Sundays 6 am',description:'Easy rides',links:{whatsapp:'https://chat.whatsapp.com/AbC123',telegram:'https://t.me/testghat'}};
assert.equal((await call('POST',crew)).status,401,'sign-in required');
assert.equal((await call('POST',crew,a,{Origin:'https://evil.test'})).status,403,'cross-origin rejected');
assert.equal((await call('POST',{...crew,links:{whatsapp:'https://wa.me/919999999999'}},a)).status,400,'personal wa.me rejected');
assert.equal((await call('POST',{...crew,organizerId:'someone'},a)).status,400,'unknown fields rejected');
const created=await call('POST',crew,a);assert.equal(created.status,201,await created.clone().text());const {id}=await created.json();
try{
  // Shared visibility without leaking organizer IDs.
  const anon=(await list()).find(g=>g.id===id);assert(anon,'visible signed out');assert.equal(anon.members,1);assert.equal(anon.mine,false);assert(!('organizerId' in anon));
  assert.deepEqual(anon.links,crew.links);
  assert.equal((await call('PATCH',{id,joined:true},b)).status,200);
  assert.equal((await call('PATCH',{id,joined:true},b)).status,200,'joining twice is harmless');
  let seen=(await list(b)).find(g=>g.id===id);assert.equal(seen.joined,true);assert.equal(seen.members,2);
  assert.equal((await list(a)).find(g=>g.id===id).mine,true);
  assert.equal((await call('DELETE',{id},b)).status,403,'only the organizer can delete');
  assert.equal((await call('PATCH',{id:crypto.randomUUID(),joined:true},b)).status,404);

  // Reports: organizer cannot self-report; duplicates count once; 3 distinct reports hide the crew.
  assert.equal((await report(id)).status,401);
  assert.equal((await report(id,a)).status,400,'no self-report');
  assert.equal((await call('POST',{id,reason:'bogus'},b,{path:'/api/groups/report'})).status,400);
  assert.equal((await report(id,b)).status,200);assert.equal((await report(id,b)).status,200);
  assert.equal((await list(b)).find(g=>g.id===id).reported,true);
  assert.equal((await report(id,c,'scam')).status,200);
  assert((await list()).some(g=>g.id===id),'still visible after 2 reporters');
  assert.equal((await report(id,d,'unsafe')).status,200);
  assert(!(await list()).some(g=>g.id===id),'hidden after 3 reporters');
  assert.equal((await list(a)).find(g=>g.id===id)?.underReview,true,'organizer sees it under review');
  assert.equal((await call('PATCH',{id,joined:true},d)).status,404,'cannot join a hidden crew');

  // Moderation: admins only; restore clears reports, remove hides it for everyone.
  assert.equal((await call('GET',null,b,{path:'/api/moderation'})).status,403);
  assert.equal((await call('POST',{id,action:'restore'},b,{path:'/api/moderation'})).status,403);
  const queue=await (await call('GET',null,mod,{path:'/api/moderation'})).json();
  const item=queue.queue.find(q=>q.id===id);assert.equal(item.status,'hidden');assert.equal(item.reports.length,3);assert(!('reporterId' in item.reports[0]));
  assert.equal((await call('POST',{id,action:'restore'},mod,{path:'/api/moderation'})).status,200);
  assert.equal((await list()).find(g=>g.id===id)?.underReview,false,'restored');
  assert(!(await (await call('GET',null,mod,{path:'/api/moderation'})).json()).queue.some(q=>q.id===id),'reports cleared');
  assert.equal((await call('POST',{id,action:'remove'},mod,{path:'/api/moderation'})).status,200);
  assert(!(await list(a)).some(g=>g.id===id),'removed for everyone, organizer included');
  assert.equal((await report(id,b)).status,404,'cannot report a removed crew');
}finally{
  assert.equal((await call('DELETE',{id},a)).status,200);
}
assert(!(await list()).some(g=>g.id===id),'deleted for everyone');
console.log('Groups API passed: shared visibility, join/leave, organizer-only delete, reports, auto-hide after 3 reporters, admin-only moderation (restore/remove), link and origin checks.');
