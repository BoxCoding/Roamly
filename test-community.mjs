import assert from 'node:assert/strict';
import {liveOrigin,account} from './test-live.mjs';
// Phase 1 against the local dev server: group roles, private crews, rider cards, admin dashboard, suspension.
const origin=liveOrigin();
const call=(method,path,body,cookie)=>fetch(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
const get=async(path,cookie)=>{const r=await call('GET',path,null,cookie);return {status:r.status,body:await r.json()}};
const me=async cookie=>(await get('/api/session',cookie)).body.user;

const [owner,co,rider,outsider]=await Promise.all(['Owner','Co Lead','Rider','Outsider'].map(name=>account(origin,{name})));
const admin=await account(origin,{email:'moderator@roamly.test',name:'Moderator'});
const [O,C,R,X]=await Promise.all([owner,co,rider,outsider].map(me));
assert.match(O.publicId,/^[a-f0-9]{12}$/);

// Rider profile: new fields round-trip and the card is for signed-in riders only.
const p=await get('/api/profile',rider);
const profile={...p.body.profile,homeCity:'Noida',ridingSince:2016,styles:['Touring','Off-road'],pace:'Steady',lookingFor:['Weekend rides'],regions:'Spiti, Ladakh',languages:'Hindi, English',links:{instagram:'https://instagram.com/rider',strava:'https://www.strava.com/athletes/1'}};
assert.equal((await call('PUT','/api/profile',{profile:{...profile,styles:['Flying']},updatedAt:p.body.updatedAt},rider)).status,400,'unknown style rejected');
assert.equal((await call('PUT','/api/profile',{profile:{...profile,ridingSince:3000},updatedAt:p.body.updatedAt},rider)).status,400,'future year rejected');
assert.equal((await call('PUT','/api/profile',{profile,updatedAt:p.body.updatedAt},rider)).status,200);
assert.equal((await get('/api/riders/'+R.publicId)).status,401,'rider card needs sign-in');
const card=(await get('/api/riders/'+R.publicId,outsider)).body.rider;
assert.equal(card.homeCity,'Noida');assert.deepEqual(card.styles,['Touring','Off-road']);assert.equal(card.links.strava,'https://www.strava.com/athletes/1');
assert(!('email' in card)&&!('userId' in card),'no private identifiers');assert.equal(card.isYou,false);
assert.equal((await get('/api/riders/000000000000',outsider)).status,404);

// Private crew: requests, approval, co-lead powers, owner-only edit.
const crew={name:'Private Ghat Crew',city:'Pune',vehicle:'Bike',meetup:'Chandni Chowk',cadence:'Sundays',description:'Invite only',links:{whatsapp:'https://chat.whatsapp.com/Secret1'},visibility:'private'};
const created=await call('POST','/api/groups',crew,owner);assert.equal(created.status,201);const {id}=await created.json();
const view=async cookie=>(await get('/api/groups',cookie)).body.groups.find(g=>g.id===id);
try{
  let g=await view(outsider);assert.equal(g.visibility,'private');assert.deepEqual(g.links,{});assert.equal(g.linksHidden,true);assert.equal(g.organizerPublicId,O.publicId);
  assert.equal((await view(owner)).myRole,'owner');assert.equal((await view(owner)).links.whatsapp,'https://chat.whatsapp.com/Secret1');
  assert.equal((await call('PATCH','/api/groups',{id,joined:false},owner)).status,400,'owner cannot leave');
  for(const c of [co,rider]){const r=await (await call('PATCH','/api/groups',{id,joined:true},c)).json();assert.equal(r.pending,true)}
  g=await view(rider);assert.equal(g.pending,true);assert.equal(g.joined,false);assert.equal(g.linksHidden,true);
  assert.equal((await view(owner)).pendingRequests,2);assert.equal((await view(owner)).members,1);
  assert.equal((await get('/api/groups/members?id='+id,rider)).status,403,'pending riders cannot see members');
  const act=(cookie,target,action)=>call('POST','/api/groups/members',{id,rider:target,action},cookie);
  assert.equal((await act(rider,C.publicId,'approve')).status,403,'non-member cannot approve');
  assert.equal((await act(owner,C.publicId,'approve')).status,200);
  assert.equal((await act(owner,C.publicId,'promote')).status,200);
  assert.equal((await act(co,R.publicId,'approve')).status,200,'co-lead approves');
  assert.equal((await act(co,O.publicId,'remove')).status,403,'owner untouchable');
  assert.equal((await act(co,R.publicId,'promote')).status,403,'only owner picks co-leads');
  g=await view(rider);assert.equal(g.joined,true);assert.equal(g.links.whatsapp,'https://chat.whatsapp.com/Secret1','members see links');
  const list=(await get('/api/groups/members?id='+id,rider)).body;
  assert.deepEqual(list.members.map(m=>m.role),['owner','colead','member']);assert.equal(list.canManage,false);
  assert.equal((await act(co,R.publicId,'remove')).status,200,'co-lead removes a member');
  assert.equal((await view(rider)).joined,false);
  assert.equal((await call('PUT','/api/groups',{...crew,id,name:'Hijacked'},co)).status,403,'co-lead cannot edit');
  assert.equal((await call('PUT','/api/groups',{...crew,id,visibility:'public',name:'Open Ghat Crew'},owner)).status,200);
  g=await view(outsider);assert.equal(g.name,'Open Ghat Crew');assert.equal(g.linksHidden,false);
  assert.equal((await (await call('PATCH','/api/groups',{id,joined:true},outsider)).json()).joined,true,'open crew joins instantly');

  // Admin dashboard and suspension.
  assert.equal((await get('/api/admin?view=overview',rider)).status,403);
  const o=(await get('/api/admin?view=overview',admin)).body.overview;assert(o.riders>=5&&o.activeGroups>=1);
  const riders=(await get('/api/admin?view=riders&q=Outsider',admin)).body.riders;assert(riders.some(r=>r.publicId===X.publicId&&r.email.endsWith('@example.test')));
  assert((await get('/api/admin?view=groups&q=Open%20Ghat',admin)).body.groups.some(x=>x.id===id));
  const adminSelf=(await me(admin)).publicId;
  assert.equal((await call('POST','/api/admin',{rider:adminSelf,action:'suspend'},admin)).status,400,'no self-suspend');
  assert.equal((await call('POST','/api/admin',{rider:X.publicId,action:'suspend',reason:'spam'},admin)).status,200);
  const s=(await get('/api/session',outsider)).body;assert.equal(s.user,null);assert.equal(s.suspended,true);
  assert.equal((await call('POST','/api/groups',crew,outsider)).status,401,'suspended riders cannot write');
  assert.equal((await get('/api/riders/'+X.publicId,rider)).status,404,'suspended card hidden');
  assert.equal((await call('POST','/api/admin',{rider:X.publicId,action:'unsuspend'},admin)).status,200);
  assert.equal((await me(outsider)).publicId,X.publicId);
  assert.equal((await call('POST','/api/admin',{rider:R.publicId,action:'make-admin'},admin)).status,200);
  assert.equal((await me(rider)).admin,true,'promoted admin');
  assert.equal((await get('/api/groups/members?id='+id,rider)).status,200,'admins can view any crew members');
  assert.equal((await call('POST','/api/admin',{rider:R.publicId,action:'remove-admin'},admin)).status,200);
  assert.equal((await me(rider)).admin,false);
}finally{
  assert.equal((await call('DELETE','/api/groups',{id},owner)).status,200);
}
console.log('Community passed: rider profile fields and cards, private crews, join requests, co-lead and owner powers, owner-only edit, admin dashboard, suspension, admin roles.');
