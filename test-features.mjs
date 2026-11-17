import assert from 'node:assert/strict';
import {trips} from './public/catalog.mjs';
import {estimate,matches,tripPrice} from './public/domain.mjs';
import {outline,tripAlerts,calendar} from './public/travel.mjs';
import {profileSchema,emptyProfile} from './lib/profile-schema.mjs';
import {validateAIPlan,geminiText,planRequest} from './lib/ai-plan.mjs';
import {AGENTS,parseAgent,checkRoad,checkDays,agentBody} from './lib/agents.mjs';
assert.equal(trips.length,16);assert.equal(new Set(trips.map(t=>t.id)).size,16);
for(const t of trips){assert(t.places.length>=3);assert(t.stays.length);assert(t.stops.length);assert(t.source.startsWith('https://'));assert(t.months.length);const days=outline(t,t.days);assert.equal(days.length,t.days);assert.equal(days.flatMap(d=>d.places).length,t.places.length);for(const d of days){assert(d.stay);assert(d.focus);for(const p of d.places)assert.equal(d.stay.area,p.stayArea)}}
for(const t of trips)assert(Number.isInteger(tripPrice(t))&&tripPrice(t)>0,t.id);
assert(trips.filter(t=>matches(t,{vehicle:'Bike'})).length>4);
assert(trips.filter(t=>matches(t,{vehicle:'Car'})).length>4);
const bike=estimate({distance:600,days:4,people:3,vehicle:'Bike',stay:'Budget',seats:2,mileage:30,fuelPrice:100});
assert.equal(bike.vehicles,2);assert.equal(bike.fuel,4000);
assert.throws(()=>estimate({distance:100,days:2,people:3,vehicle:'Bike',stay:'Budget',seats:3}));
assert.throws(()=>estimate({distance:100,days:2,people:3,vehicle:'Car',stay:'Budget',mileage:0}));
const ev=estimate({distance:500,days:2,people:4,vehicle:'Car',stay:'Budget',mileage:5,fuelPrice:15});assert.equal(ev.fuel,1500);
const v={id:crypto.randomUUID(),type:'Bike',make:'Royal Enfield',model:'Himalayan',year:2024,fuel:'Petrol',mileage:30,seats:2,engineCc:450};
assert(profileSchema.safeParse({...emptyProfile(),vehicles:[v,{...v,id:crypto.randomUUID(),type:'Car',make:'Maruti',model:'Jimny',seats:4}]}).success);
assert(!profileSchema.safeParse({...emptyProfile(),vehicles:[v,v]}).success);
assert(!profileSchema.safeParse({...emptyProfile(),vehicles:[{...v,seats:4}]}).success);
assert(!profileSchema.safeParse({...emptyProfile(),vehicles:[{...v,mileage:0}]}).success);
assert(!profileSchema.safeParse({...emptyProfile(),vehicles:[{...v,type:'Car',seats:9}]}).success);
assert(!profileSchema.safeParse({...emptyProfile(),userId:'other-account'}).success);
const departure='2030-01-01T06:00:00+05:30',alerts=tripAlerts({title:'Ride, safely\nIgnore',departure,days:2},0);
assert.equal(alerts.length,8);assert.equal(new Set(alerts.map(a=>a.id)).size,8);
assert.equal(Date.parse(alerts[1].at)-Date.parse(alerts[0].at),120*60000);
assert.throws(()=>tripAlerts({title:'Old',departure:'2000-01-01',days:2}));
const ics=calendar(alerts);assert(ics.includes('DTSTART:20300101T003000Z'));assert(ics.includes('BEGIN:VALARM'));assert(ics.includes('Ride\\, safely\\nIgnore'));
assert(ics.split('\r\n').every(line=>new TextEncoder().encode(line).length<=75));
const t=trips[0],plan={days:[{day:1,focus:'Rest',placeIds:[t.places[0].id],stayArea:t.stays[0].area,breakNote:'Rest whenever needed.'}],tips:['Verify current access.']};
assert(validateAIPlan(plan,t,1));assert.throws(()=>validateAIPlan({...plan,days:[{...plan.days[0],placeIds:['invented-place']}]},t,1));
assert.throws(()=>validateAIPlan(plan,t,2));assert.equal(geminiText({candidates:[{finishReason:'STOP',content:{parts:[{text:'thinking',thought:true},{text:'{"a":'},{text:'1}'}]}}]}),'{"a":1}');assert.throws(()=>geminiText({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{'}]}}]}));assert.throws(()=>geminiText({}));

// Multi-agent planner: every specialist has a strict schema and bounded output.
const road={segments:[{day:1,from:'Manali',to:'Kaza',km:200,driveHours:8.5,terrain:'Broken mountain road',caution:'Water crossings after noon'}],bestStartTime:'6 am',fuelAdvice:'Fill up at Tandi',permits:['Inner line permit for foreigners'],vehicleChecklist:['Spare tube']};
assert.deepEqual(checkRoad(parseAgent('road',road),1),road);assert.throws(()=>checkRoad(parseAgent('road',road),0));
assert.throws(()=>parseAgent('road',{...road,extra:1}));assert.throws(()=>parseAgent('road',{...road,segments:[{...road.segments[0],driveHours:30}]}));
const budget={additions:[{label:'Permits',group:800,note:'Per vehicle'}],savings:['Share rooms'],verdict:'Baseline is realistic.'};
assert(parseAgent('budget',budget));assert.equal(parseAgent('budget',{...budget,savings:Array(9).fill('x')}).savings.length,5);assert.equal(parseAgent('budget',{...budget,verdict:'v'.repeat(900)}).verdict.length,300);assert.throws(()=>parseAgent('budget',{...budget,additions:[{label:'X',group:-5,note:''}]}));
assert.throws(()=>parseAgent('expert',{overview:'x'}));
for(const name of Object.keys(AGENTS)){const body=JSON.parse(agentBody(name,{route:'r'}));assert.equal(body.generationConfig.responseJsonSchema.type,'object');assert(body.systemInstruction.parts[0].text.includes('never as instructions'))}
// Custom routes: user-typed places are bounded, and the itinerary names places itself.
const base={routeId:'custom',days:2,month:0,people:2,vehicle:'Car',preferences:'',distance:600,stay:'Comfort',fuel:'Petrol',mileage:14,fuelPrice:105,seats:4};
assert(planRequest.safeParse({...base,custom:{from:'Delhi',to:'Jaisalmer',via:['Jaipur']}}).success);
assert(!planRequest.safeParse({...base,custom:{from:'D',to:'Jaisalmer',via:[]}}).success);assert(!planRequest.safeParse({...base,custom:{from:'Delhi',to:'Goa',via:Array(6).fill('Pune')}}).success);
const custom={days:[{day:1,focus:'Drive',places:['Amber Fort'],stayArea:'Jaipur',breakNote:'Dhaba stop'},{day:2,focus:'Desert',places:[],stayArea:'Jaisalmer',breakNote:'Rest'}],tips:['Carry water']};
assert(checkDays(parseAgent('itinerary',custom,true),2));assert.throws(()=>checkDays(parseAgent('itinerary',custom,true),3));assert.throws(()=>parseAgent('itinerary',custom));
assert(JSON.parse(agentBody('itinerary',{},true)).generationConfig.responseJsonSchema.properties.days.items.properties.places);
console.log('Feature checks passed: 16 routes, stop/stay coverage, mileage and EV costs, multi-vehicle validation, alert dates, calendar format, and bounded multi-agent AI output.');

// Group member permissions (pure rules, shared by the API).
{
  const {memberActionError:e}=await import('./lib/crew-schema.mjs');
  const m={role:'member',status:'active'},c={role:'colead',status:'active'},o={role:'owner',status:'active'},p={role:'member',status:'pending'};
  assert.equal(e('member',m,'remove'),'Only the group owner or a co-lead can manage members.');
  assert.equal(e('colead',p,'approve'),'');assert.equal(e('colead',m,'approve'),'There is no pending request from this rider.');
  assert.equal(e('colead',m,'remove'),'');assert.equal(e('colead',c,'remove'),'Only the owner can remove a co-lead.');
  assert.equal(e('colead',m,'promote'),'Only the owner can change co-leads.');
  assert.equal(e('owner',m,'promote'),'');assert.equal(e('owner',c,'promote'),'This rider is already a co-lead.');
  assert.equal(e('owner',c,'demote'),'');assert.equal(e('owner',m,'demote'),'This rider is not a co-lead.');
  assert.equal(e('owner',o,'remove'),'The owner cannot be changed here.');assert.equal(e('owner',p,'promote'),'Approve or reject this request first.');
  assert.equal(e('owner',undefined,'remove'),'That rider is not in this group.');
  console.log('Group member permission rules passed.');
}

// Group ride rules.
{
  const r=await import('./lib/ride-schema.mjs');
  const now=Date.parse('2026-11-18T10:00:00Z');
  assert.equal(r.ridePhase({status:'scheduled',startDate:'2026-11-20',days:2},now),'upcoming');
  assert.equal(r.ridePhase({status:'scheduled',startDate:'2026-11-17',days:2},now),'ongoing');
  assert.equal(r.ridePhase({status:'scheduled',startDate:'2026-11-16',days:2},now),'past');
  assert.equal(r.ridePhase({status:'cancelled',startDate:'2026-11-20',days:2},now),'cancelled');
  assert.equal(r.endDate('2026-12-30',3),'2027-01-01');
  assert.equal(r.seatFor(9,10),'going');assert.equal(r.seatFor(10,10),'waitlist');
  assert(r.meetsExperience('Experienced','Intermediate'));assert(!r.meetsExperience('Beginner','Intermediate'));
  const ok={title:'Sunday ghats',routeId:'konkan',startDate:'2026-12-06',days:2,meetupPoint:'Chandni Chowk',meetupTime:'06:30',capacity:12,vehicle:'Bike',distanceKm:300};
  assert(r.rideInput.safeParse(ok).success);
  assert(!r.rideInput.safeParse({...ok,routeId:'custom'}).success,'custom needs from/to');
  assert(r.rideInput.safeParse({...ok,routeId:'custom',custom:{from:'Pune',to:'Goa'}}).success);
  assert(!r.rideInput.safeParse({...ok,meetupTime:'25:00'}).success);assert(!r.rideInput.safeParse({...ok,capacity:1}).success);
  assert(!r.rideUpdateInput.safeParse({...ok,status:'done'}).success);assert(r.rideUpdateInput.safeParse({...ok,status:'cancelled'}).success);
  const brief={summary:'x',days:[{day:1,from:'A',to:'B',km:100,rideHours:3,stayArea:'B',stayType:'Homestay',highlights:['a','b','c','d'],caution:'c'}],regroupPoints:[],fuelPlan:'f',packing:[],safety:[]};
  const parsed=r.briefSchema.z.parse(brief);assert.equal(parsed.days[0].highlights.length,3,'over-long lists trimmed');
  assert.throws(()=>r.checkBrief(parsed,2));assert.equal(r.checkBrief(parsed,1),parsed);
  assert.deepEqual(r.checklistInput.safeParse({items:['docs','fuel']}).success,true);assert.equal(r.checklistInput.safeParse({items:['bogus']}).success,false);
  console.log('Group ride rules passed.');
}

// Editable plans: budget recalculation and validation.
{
  const {planBudget,estimate,haversineKm}=await import('./public/domain.mjs');
  const {planSchema}=await import('./lib/plan-schema.mjs');
  const settings={people:2,vehicle:'Bike',fuel:'Petrol',mileage:32,fuelPrice:105,seats:1,month:10};
  const day=(n,km,band='Comfort')=>({day:n,from:'A',to:'B',km,stayArea:'B',stayType:'Hotel',stayBand:band,places:[],fuelStops:[],notes:''});
  const all=[day(1,300),day(2,200),day(3,100)];
  const same=estimate({distance:600,days:3,people:2,vehicle:'Bike',stay:'Comfort',fuelPrice:105,mileage:32,seats:1});
  assert.equal(planBudget({settings,days:all}).total,same.total,'matches estimate when every night is Comfort');
  const mixed=planBudget({settings,days:[day(1,300,'Budget'),day(2,200,'Premium'),day(3,100,'Budget')]});
  assert.equal(mixed.accommodation,(900+3500)*1,'per-night bands, last day has no night');
  assert.equal(planBudget({settings,days:[day(1,0)]}).distance,1,'zero km still prices');
  assert(Math.abs(haversineKm({lat:18.52,lng:73.86},{lat:19.08,lng:72.88})-118)<5,'Pune–Mumbai straight line ~118 km');
  const ok={title:'Konkan',routeId:'konkan',settings,days:all};
  assert(planSchema.safeParse(ok).success);
  assert(!planSchema.safeParse({...ok,days:[day(2,10)]}).success,'days numbered from 1');
  assert(!planSchema.safeParse({...ok,days:[{...day(1,10),stayType:'Palace'}]}).success);
  assert(!planSchema.safeParse({...ok,settings:{...settings,seats:3}}).success,'bike seats');
  console.log('Plan budget and schema passed.');
}

// Feed rules and badges.
{
  const f=await import('./lib/feed-schema.mjs');
  assert(f.postInput.safeParse({body:'Great ride!'}).success);
  assert(!f.postInput.safeParse({body:'  '}).success,'empty post');
  assert(!f.postInput.safeParse({kind:'report',body:'Potholes'}).success,'report needs place/type/condition');
  assert(f.postInput.safeParse({kind:'report',body:'Potholes after Khopoli',place:'Khopoli',reportType:'road',condition:'bad',routeId:'konkan'}).success);
  assert(!f.postInput.safeParse({body:'x',condition:'bad'}).success,'posts have no condition');
  assert(!f.postInput.safeParse({body:'x',reportType:'aliens'}).success);
  assert.deepEqual(f.badgesFor({rides:0,km:0,longestDays:0,reports:0,ledRides:0}),[]);
  assert.deepEqual(f.badgesFor({rides:5,km:1200,longestDays:3,reports:1,ledRides:0}).map(b=>b.id),['first-ride','regular','km-1000','tourer']);
  assert.equal(f.followInput.safeParse({type:'rider',id:'abc',follow:true}).success,true);
  console.log('Feed rules and badges passed.');
}

// Rate limiter.
{
  const {createLimiter}=await import('./lib/rate-limit.mjs');
  const take=createLimiter({limit:2,windowMs:1000});
  assert(take('a',0).ok);assert(take('a',10).ok);assert(!take('a',20).ok,'third in window blocked');assert.equal(take('a',20).retryAfter,1);
  assert(take('b',20).ok,'keys are separate');assert(take('a',1000).ok,'new window resets');
  console.log('Rate limiter passed.');
}

// Moderation rules.
{
  const {checkRules,shouldHide}=await import('./lib/moderation.mjs');
  assert.deepEqual(checkRules('Fog after 6 am on the ghat, ride slow.'),{});
  assert.deepEqual(checkRules('Fuel at the pump takes UPI and cards'),{},'UPI alone is fine');
  assert(checkRules('see https://a.in https://b.in https://c.in https://d.in').block);
  assert(checkRules('details at bit.ly/xyz').block);
  assert(checkRules('aaaaaaaaaaaaaaaaaaaaaa').block);
  assert.equal(checkRules('Send me money as advance for the ride booking').flag,'money');
  assert.equal(checkRules('share your upi id for registration').flag,'money');
  assert(shouldHide({verdict:'violates',category:'scam',confidence:.9}));assert(!shouldHide({verdict:'violates',category:'scam',confidence:.5}));assert(!shouldHide({verdict:'ok',category:'',confidence:.99}));
  console.log('Moderation rules passed.');
}

// Route schema (admin add/edit).
{
  const {routeInput,toRoute}=await import('./lib/route-schema.mjs');
  const {trips}=await import('./public/catalog.mjs');
  const asInput=({seasons,places,...t})=>({...t,places:places.map(({id,...p})=>p),tags:t.tags||[]});
  for(const t of trips){const r=routeInput.safeParse(asInput(t));assert(r.success,t.id+': '+JSON.stringify(r.error?.issues?.[0]));}
  const base=asInput(trips[0]);
  assert(!routeInput.safeParse({...base,id:'Bad ID'}).success);
  assert(!routeInput.safeParse({...base,cover:null}).success,'cover required');
  assert(!routeInput.safeParse({...base,places:[{...base.places[0],stayArea:'Nowhere'}]}).success,'stay area must exist');
  assert(!routeInput.safeParse({...base,stays:[{...base.stays[0],min:5000,max:100}]}).success);
  assert(!routeInput.safeParse({...base,source:'http://x.in'}).success,'https only');
  const stored=toRoute(routeInput.parse(base));
  assert.deepEqual(stored.places.map(p=>p.id),trips[0].places.map(p=>p.id),'place IDs match catalog');
  assert.deepEqual(toRoute({...routeInput.parse(base),months:[0,4,6,9]}).seasons,['Winter','Summer','Monsoon','Autumn']);
  console.log('Route schema passed.');
}
