import assert from 'node:assert/strict';
import {liveOrigin,account} from './test-live.mjs';
// Phase 3 against the local dev server: saved plans, geocoding cache, attaching a plan to a ride.
const origin=liveOrigin();
const call=(method,path,body,cookie)=>fetch(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
const get=async(path,cookie)=>{const r=await call('GET',path,null,cookie);return {status:r.status,body:await r.json()}};

const [lead,other]=await Promise.all(['Plan Lead','Plan Other'].map(name=>account(origin,{name})));
const settings={people:2,vehicle:'Bike',fuel:'Petrol',mileage:32,fuelPrice:105,seats:1,month:10};
const day=(n,from,to,km,stayArea='')=>({day:n,from,to,km,stayArea,stayType:stayArea?'Homestay':'',stayBand:'Comfort',places:['Lonavala lake'],fuelStops:['Khopoli'],notes:''});
const plan={title:'Pune to Goa coast',routeId:'konkan',settings,days:[day(1,'Pune','Ratnagiri',330,'Ratnagiri'),day(2,'Ratnagiri','Panaji',250)]};

assert.equal((await call('POST','/api/plans',plan)).status,401);
assert.equal((await call('POST','/api/plans',{...plan,days:[]},lead)).status,400,'needs a day');
assert.equal((await call('POST','/api/plans',{...plan,settings:{...settings,seats:4}},lead)).status,400,'bike seats');
const created=await call('POST','/api/plans',plan,lead);assert.equal(created.status,201);const {id}=await created.json();
const list=(await get('/api/plans',lead)).body.plans;assert.equal(list.find(p=>p.id===id).km,580);
assert.deepEqual((await get('/api/plans/'+id,lead)).body.plan.days[0].places,['Lonavala lake']);
assert.equal((await get('/api/plans/'+id,other)).status,404,'plans are private');
assert.equal((await call('PUT','/api/plans/'+id,plan,other)).status,404);
assert.equal((await call('DELETE','/api/plans/'+id,{},other)).status,404);
const edited={...plan,days:[...plan.days.slice(0,1),{...plan.days[1],stayArea:'Panaji'},day(3,'Panaji','Pune',450)]};
assert.equal((await call('PUT','/api/plans/'+id,edited,lead)).status,200);
assert.equal((await get('/api/plans',lead)).body.plans.find(p=>p.id===id).days,3);

// Geocoding: sign-in required, results cached.
assert.equal((await call('POST','/api/geocode',{places:['Pune']})).status,401);
const g=await (await call('POST','/api/geocode',{places:['Pune','Qzxqzx Nowhere 123']},lead)).json();
if(!g.pending.includes('Pune')){assert(Math.abs(g.results.Pune.lat-18.52)<0.5&&Math.abs(g.results.Pune.lng-73.86)<0.5,'Pune located');}
const t=Date.now();const again=await (await call('POST','/api/geocode',{places:['Pune']},lead)).json();
if(g.results.Pune)assert.deepEqual(again.results.Pune,g.results.Pune);assert(Date.now()-t<1000,'second lookup comes from the cache');

// Attach to a ride: only the ride's managers, only their own plans; the ride keeps a copy.
const {id:crewId}=await (await call('POST','/api/groups',{name:'Plan Test Crew',city:'Pune',vehicle:'Bike',meetup:'X',cadence:'Sun',description:'d',links:{}},lead)).json();
try{
  const ride={title:'Goa run',routeId:'konkan',startDate:new Date(Date.now()+7*864e5).toISOString().slice(0,10),days:3,meetupPoint:'Pune',meetupTime:'06:00',capacity:8,minExperience:'Beginner',vehicle:'Bike',stay:'Comfort',distanceKm:1030,description:''};
  const {id:rideId}=await (await call('POST','/api/rides',{crewId,ride},lead)).json();
  await call('POST',`/api/rides/${rideId}/rsvp`,{status:'going'},other);
  const {id:otherPlan}=await (await call('POST','/api/plans',plan,other)).json();
  assert.equal((await call('POST',`/api/rides/${rideId}/plan`,{planId:id},other)).status,403,'members cannot attach');
  assert.equal((await call('POST',`/api/rides/${rideId}/plan`,{planId:otherPlan},lead)).status,404,"cannot attach someone else's plan");
  assert.equal((await call('POST',`/api/rides/${rideId}/plan`,{planId:id},lead)).status,200);
  assert.equal((await get('/api/rides/'+rideId,other)).body.ride.plan.days.length,3,'riders see the plan');
  assert.equal((await call('DELETE','/api/plans/'+id,{},lead)).status,200);
  assert.equal((await get('/api/rides/'+rideId)).body.ride.plan.days[2].to,'Pune','ride keeps its copy after the plan is deleted');
  assert.equal((await call('POST',`/api/rides/${rideId}/plan`,{planId:null},lead)).status,200);
  assert.equal((await get('/api/rides/'+rideId)).body.ride.plan,null);
  await call('DELETE','/api/plans/'+otherPlan,{},other);
}finally{await call('DELETE','/api/groups',{id:crewId},lead)}
console.log('Plans passed: save/validate/edit/delete, private to the owner, geocoding with cache, attach to ride (managers, own plans), ride keeps its copy, detach.');
