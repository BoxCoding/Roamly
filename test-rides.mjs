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

  // Visibility: open crew rides are public; private crew rides are members-only.
  const anonList=(await get('/api/rides')).body.rides;assert(anonList.some(r=>r.id===id));assert(!anonList.some(r=>r.id===privateRide),'private rides hidden');
  assert.equal((await get('/api/rides/'+privateRide,outsider)).status,404);
  let d=(await get('/api/rides/'+id)).body.ride;assert.equal(d.going,1);assert.equal(d.roster,null);assert.equal(d.updates,null);assert(d.perRider>0);
  assert.equal((await call('POST',`/api/rides/${privateRide}/rsvp`,{status:'going'},outsider)).status,404);

  // RSVP, auto-join, capacity and waitlist promotion.
  const rsvp=async(c,status)=>(await (await call('POST',`/api/rides/${id}/rsvp`,{status},c)).json()).status;
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

  // Leaving the crew frees the seat for the waitlist.
  assert.equal((await call('PATCH','/api/groups',{id:crewId,joined:false},late)).status,200);
  assert.equal((await get('/api/rides/'+id,rider)).body.ride.myRsvp,'going','seat freed by a rider leaving the crew');

  // Edits: experience gate, capacity growth, cancel closes RSVPs.
  assert.equal((await call('PUT','/api/rides/'+id,{...ride,minExperience:'Experienced'},rider)).status,403,'members cannot edit');
  assert.equal((await call('PUT','/api/rides/'+id,{...ride,minExperience:'Experienced',capacity:5},owner)).status,200);
  assert.equal((await call('POST',`/api/rides/${id}/rsvp`,{status:'going'},outsider)).status,403,'beginner blocked by experience gate');
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
  assert.equal((await call('POST',`/api/rides/${id}/rsvp`,{status:'going'},rider)).status,400,'cancelled ride closes RSVPs');
  assert.equal((await get('/api/rides/'+id)).body.ride.phase,'cancelled');
  assert.equal((await call('DELETE','/api/rides/'+id,{},rider)).status,403);
  assert.equal((await call('DELETE','/api/rides/'+id,{},owner)).status,200);
  assert.equal((await get('/api/rides/'+id)).status,404);
}finally{
  for(const c of [crewId,privateId])await call('DELETE','/api/groups',{id:c},owner);
}
console.log(`Group rides passed: planning permissions, public/private visibility, RSVP with auto-join, waitlist and promotion, checklist, lead-only updates, seat release on leaving, experience gate, cancel and delete${withBrief?', shared AI brief and replanning':''}.`);
