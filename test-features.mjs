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
