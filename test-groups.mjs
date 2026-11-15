import assert from 'node:assert/strict';
// Shared crews against the local dev server only: one rider creates, another sees and joins.
const origin=process.argv[2]||'http://127.0.0.1:5173';
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw new Error('Run only against the local development server.');
const call=(method,body,cookie,extra={})=>fetch(origin+'/api/groups',{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});
const list=async cookie=>(await (await call('GET',null,cookie)).json()).groups;

// Rider A: dev ChatGPT user. Rider B: a fresh email account.
const login=await fetch(origin+'/signin-with-chatgpt?return_to=%2F',{redirect:'manual'}),a=login.headers.get('set-cookie').split(';')[0];
const reg=await fetch(origin+'/api/auth/register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({name:'Rider B',email:`crew-${crypto.randomUUID()}@example.test`,password:'road-trip-123'})});
assert.equal(reg.status,201);const b=reg.headers.get('set-cookie').split(';')[0];

const crew={name:'Test Ghat Riders',city:'Pune',vehicle:'Bike',meetup:'Chandni Chowk',cadence:'Sundays 6 am',description:'Easy rides',links:{whatsapp:'https://chat.whatsapp.com/AbC123',telegram:'https://t.me/testghat'}};
assert.equal((await call('POST',crew)).status,401,'sign-in required');
assert.equal((await call('POST',crew,a,{Origin:'https://evil.test'})).status,403,'cross-origin rejected');
assert.equal((await call('POST',{...crew,links:{whatsapp:'https://wa.me/919999999999'}},a)).status,400,'personal wa.me rejected');
assert.equal((await call('POST',{...crew,organizerId:'someone'},a)).status,400,'unknown fields rejected');
const created=await call('POST',crew,a);assert.equal(created.status,201,await created.clone().text());const {id}=await created.json();
try{
  // Visible to a signed-out visitor and to rider B, without leaking organizer IDs.
  const anon=(await list()).find(g=>g.id===id);assert(anon,'visible signed out');assert.equal(anon.members,1);assert.equal(anon.mine,false);assert(!('organizerId' in anon));
  assert.deepEqual(anon.links,crew.links);
  let seen=(await list(b)).find(g=>g.id===id);assert.equal(seen.joined,false);assert.equal(seen.mine,false);
  assert.equal((await call('PATCH',{id,joined:true},b)).status,200);
  assert.equal((await call('PATCH',{id,joined:true},b)).status,200,'joining twice is harmless');
  seen=(await list(b)).find(g=>g.id===id);assert.equal(seen.joined,true);assert.equal(seen.members,2);
  assert.equal((await list(a)).find(g=>g.id===id).mine,true);
  assert.equal((await call('DELETE',{id},b)).status,403,'only the organizer can delete');
  assert.equal((await call('PATCH',{id,joined:false},b)).status,200);assert.equal((await list(b)).find(g=>g.id===id).members,1);
  assert.equal((await call('PATCH',{id:crypto.randomUUID(),joined:true},b)).status,404);
}finally{
  assert.equal((await call('DELETE',{id},a)).status,200);
}
assert(!(await list()).some(g=>g.id===id),'deleted for everyone');
console.log('Groups API passed: shared visibility, join/leave, member counts, organizer-only delete, link and origin checks.');
