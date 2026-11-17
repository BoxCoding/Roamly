import assert from 'node:assert/strict';
import {liveOrigin,account} from './test-live.mjs';
// Phase 2 group rides against the local dev server. Pass --brief to also generate one real AI brief.
const origin=liveOrigin(),withBrief=process.argv.includes('--brief');
const call=(method,path,body,cookie)=>fetch(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
const get=async(path,cookie)=>{const r=await call('GET',path,null,cookie);return {status:r.status,body:await r.json()}};
const me=async c=>(await get('/api/session',c)).body.user;
const day=n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);

const [owner,rider,late,outsider]=await Promise.all(['Ride Owner','Ride Rider','Late Rider','Ride Outsider'].map(name=>account(origin,{name})));
const crewBody={name:'Ride Test Crew',city:'Pune',vehicle:'Bike',meetup:'Chandni Chowk',cadence:'Sundays',description:'Rides',links:{}};
const {id:crewId}=await (await call('POST','/api/groups',crewBody,owner)).json();
const {id:privateId}=await (await call('POST','/api/groups',{...crewBody,name:'Private Ride Crew',visibility:'private'},owner)).json();
const ride={title:'Sunrise to Lavasa',routeId:'konkan',startDate:day(5),days:2,meetupPoint:'Chandni Chowk',meetupTime:'06:30',capacity:2,minExperience:'Beginner',vehicle:'Bike',stay:'Comfort',distanceKm:300,description:'Easy pace'};
try{
  assert.equal((await call('POST','/api/rides',{crewId,ride},rider)).status,403,'non-member cannot plan');
  assert.equal((await call('POST','/api/rides',{crewId,ride:{...ride,startDate:day(-2)}},owner)).status,400,'no past rides');
  assert.equal((await call('POST','/api/rides',{crewId,ride:{...ride,routeId:'nowhere'}},owner)).status,404);
  const created=await call('POST','/api/rides',{crewId,ride},owner);assert.equal(created.status,201);const {id}=await created.json();
  const {id:privateRide}=await (await call('POST','/api/rides',{crewId:privateId,ride},owner)).json();

  // Cover photo and tags: only our uploads (own), catalog photos or Wikimedia Commons; others rejected.
  const commons={url:'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Khandala_Ghat-_Lonavala_-_panoramio.jpg/1280px-Khandala_Ghat-_Lonavala_-_panoramio.jpg',credit:'Photo: X · CC BY 3.0 · Wikimedia Commons',page:'https://commons.wikimedia.org/wiki/File:Khandala_Ghat-_Lonavala_-_panoramio.jpg'};
  assert.equal((await call('POST','/api/rides',{crewId,ride:{...ride,cover:{url:'https://evil.test/x.jpg',credit:'',page:''}}},owner)).status,400,'foreign image host rejected');
  assert.equal((await call('POST','/api/rides',{crewId,ride:{...ride,cover:{url:'/api/photos/'+'b'.repeat(32)+'.webp',credit:'',page:''}}},owner)).status,400,'someone else\'s upload rejected');
  assert.equal((await call('POST','/api/rides',{crewId,ride:{...ride,tags:['a','b','c','d','e','f']}},owner)).status,400,'max 5 tags');
  const {id:coverRide}=await (await call('POST','/api/rides',{crewId,ride:{...ride,cover:commons,tags:['Ghats','Monsoon']}},owner)).json();
  let cr=(await get('/api/rides/'+coverRide)).body.ride;assert.deepEqual(cr.cover,commons);assert.deepEqual(cr.tags,['Ghats','Monsoon']);
  assert.equal((await get('/api/rides')).body.rides.find(x=>x.id===coverRide).cover,commons.url);
  assert.equal((await call('PUT','/api/rides/'+coverRide,{...ride,cover:{url:'assets/photo-1464822759023-fed622ff2c3b.jpg',credit:'',page:''},tags:[]},owner)).status,200);
  cr=(await get('/api/rides/'+coverRide)).body.ride;assert.equal(cr.cover.url,'assets/photo-1464822759023-fed622ff2c3b.jpg');assert.deepEqual(cr.tags,[]);
  assert.equal((await call('DELETE','/api/rides/'+coverRide,{},owner)).status,200);
  // Profile photo must be your own upload.
  const {emptyProfile:ep}=await import('./lib/profile-schema.mjs');
  assert.equal((await call('PUT','/api/profile',{profile:{...ep(),photo:'c'.repeat(32)+'.webp'},updatedAt:null},outsider)).status,400,'cannot use someone else\'s photo');

  // Visibility: open crew rides are public; private crew rides are members-only.
  const anonList=(await get('/api/rides')).body.rides;assert(anonList.some(r=>r.id===id));assert(!anonList.some(r=>r.id===privateRide),'private rides hidden');
  assert.equal((await get('/api/rides/'+privateRide,outsider)).status,404);
  let d=(await get('/api/rides/'+id)).body.ride;assert.equal(d.going,1);assert.equal(d.roster,null);assert.equal(d.updates,null);assert(d.perRider>0);
  assert.equal((await call('POST',`/api/rides/${privateRide}/rsvp`,{status:'going'},outsider)).status,404);

  // RSVP, auto-join, capacity and waitlist promotion.
  const rsvp=async(c,status)=>(await (await call('POST',`/api/rides/${id}/rsvp`,{status,...(status==='going'?{waiver:true}:{})},c)).json()).status;
  // A new "going" needs the safety terms accepted.
  const noWaiver=await call('POST',`/api/rides/${id}/rsvp`,{status:'going'},rider);assert.equal(noWaiver.status,400);assert.equal((await noWaiver.json()).waiver,true);
  assert.equal(await rsvp(rider,'going'),'going','rider gets the last seat and joins the crew');
  assert.equal((await get('/api/groups',rider)).body.groups.find(g=>g.id===crewId).joined,true);
  assert.equal(await rsvp(late,'going'),'waitlist','full ride waitlists');
  assert.equal(await rsvp(late,'going'),'waitlist','repeat is harmless');
  assert.equal(await rsvp(rider,'maybe'),'maybe');
  assert.equal((await get('/api/rides/'+id,late)).body.ride.myRsvp,'going','waitlist promoted when a seat frees');
  assert.equal(await rsvp(rider,'going'),'waitlist','back in line');

  // Checklist and updates.
  assert.equal((await call('PATCH',`/api/rides/${id}/rsvp`,{items:['docs','fuel']},late)).status,200);
  assert.equal((await call('PATCH',`/api/rides/${id}/rsvp`,{items:['docs']},outsider)).status,400,'RSVP first');
  assert.equal((await call('PATCH',`/api/rides/${id}/rsvp`,{items:['bogus']},late)).status,400);
  assert.equal((await call('POST',`/api/rides/${id}/updates`,{body:'Regroup at Lonavala'},late)).status,403,'members cannot post updates');
  assert.equal((await call('POST',`/api/rides/${id}/updates`,{body:'Regroup at Lonavala',pinned:true},owner)).status,201);
  d=(await get('/api/rides/'+id,late)).body.ride;assert.equal(d.updates[0].body,'Regroup at Lonavala');assert.deepEqual(d.myChecklist,['docs','fuel']);
  assert.deepEqual(d.roster.map(x=>x.status).sort(),['going','going','waitlist']);
  // Emergency info: the lead sees it for riders going; other members never do.
  const {emptyProfile}=await import('./lib/profile-schema.mjs');
  assert.equal((await call('PUT','/api/profile',{profile:{...emptyProfile(),experience:'Experienced',emergency:{name:'Sis',phone:'+91 90000 00000',bloodGroup:'B+'}},updatedAt:(await get('/api/profile',late)).body.updatedAt},late)).status,200);
  const lateId=(await me(late)).publicId;
  const leadView=(await get('/api/rides/'+id,owner)).body.ride.roster.find(x=>x.publicId===lateId);
  assert.deepEqual(leadView.emergency,{name:'Sis',phone:'+91 90000 00000',bloodGroup:'B+'},'lead sees SOS info of a going rider');
  assert(!(await get('/api/rides/'+id,late)).body.ride.roster.some(x=>'emergency' in x),'members never see SOS info');
  assert(!JSON.stringify((await get('/api/riders/'+lateId,owner)).body).includes('90000'),'SOS info not on the rider card');

  // Leaving the crew frees the seat for the waitlist.
  assert.equal((await call('PATCH','/api/groups',{id:crewId,joined:false},late)).status,200);
  assert.equal((await get('/api/rides/'+id,rider)).body.ride.myRsvp,'going','seat freed by a rider leaving the crew');

  // Edits: experience gate, capacity growth, cancel closes RSVPs.
  assert.equal((await call('PUT','/api/rides/'+id,{...ride,minExperience:'Experienced'},rider)).status,403,'members cannot edit');
  assert.equal((await call('PUT','/api/rides/'+id,{...ride,minExperience:'Experienced',capacity:5},owner)).status,200);
  assert.equal((await call('POST',`/api/rides/${id}/rsvp`,{status:'going',waiver:true},outsider)).status,403,'beginner blocked by experience gate');
  assert.equal(await rsvp(outsider,'maybe'),'maybe','maybe is allowed');

  if(withBrief){
    assert.equal((await call('POST',`/api/rides/${id}/brief`,{},rider)).status,403,'members cannot spend AI');
    const b=await call('POST',`/api/rides/${id}/brief`,{},owner);const body=await b.json();assert.equal(b.status,200,JSON.stringify(body));
    assert.equal(body.brief.days.length,2);assert.equal(body.remaining,2);
    assert.equal((await get('/api/rides/'+id)).body.ride.brief.days.length,2,'brief is shared with everyone');
    assert.equal((await call('PUT','/api/rides/'+id,{...ride,days:3},owner)).status,200);
    assert.equal((await get('/api/rides/'+id)).body.ride.brief,null,'replanning clears the brief');
  }

  assert.equal((await call('PUT','/api/rides/'+id,{...ride,status:'cancelled'},owner)).status,200);
  assert.equal((await call('POST',`/api/rides/${id}/rsvp`,{status:'going',waiver:true},rider)).status,400,'cancelled ride closes RSVPs');
  assert.equal((await get('/api/rides/'+id)).body.ride.phase,'cancelled');
  assert.equal((await call('DELETE','/api/rides/'+id,{},rider)).status,403);
  assert.equal((await call('DELETE','/api/rides/'+id,{},owner)).status,200);
  assert.equal((await get('/api/rides/'+id)).status,404);
}finally{
  for(const c of [crewId,privateId])await call('DELETE','/api/groups',{id:c},owner);
}
console.log(`Group rides passed: planning permissions, public/private visibility, RSVP with auto-join, waitlist and promotion, checklist, lead-only updates, seat release on leaving, experience gate, cancel and delete${withBrief?', shared AI brief and replanning':''}.`);
