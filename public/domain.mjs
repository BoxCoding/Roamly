// Single source for vehicle assumptions used by the planner, profile schema and estimates.
export const VEHICLES={Bike:{mileage:32,seats:1,maxSeats:2,perKm:.3},Car:{mileage:14,seats:4,maxSeats:8,perKm:1.6}};
export const fuelRate=fuel=>fuel==='Electric'?15:105;
export function estimate({distance,days,people,vehicle,stay,fuelPrice=fuelRate(),mileage=VEHICLES[vehicle]?.mileage,seats=VEHICLES[vehicle]?.seats,vehicleCount=Math.ceil(people/seats)}) {
  const values=[distance,days,people,fuelPrice,mileage,seats,vehicleCount];
  if(values.some(x=>!Number.isFinite(x)||x<=0)||distance>20000||days>60||people>30||!Number.isInteger(days)||!Number.isInteger(people)||mileage>200||!Object.hasOwn(VEHICLES,vehicle)||seats>VEHICLES[vehicle].maxSeats||!Number.isInteger(seats)||!Number.isInteger(vehicleCount)||vehicleCount<Math.ceil(people/seats)||vehicleCount>30||!['Budget','Comfort','Premium'].includes(stay)) throw new Error('Use a distance up to 20,000 km, 1–60 days, and 1–30 travelers.');
  const vehicles=vehicleCount;
  const fuel=Math.round(distance/mileage*fuelPrice*vehicles);
  const accommodation=Math.round((days-1)*({Budget:900,Comfort:1800,Premium:3500}[stay])*Math.ceil(people/2));
  const food=days*people*650;
  const extras=Math.round(distance*VEHICLES[vehicle].perKm*vehicles+days*people*200);
  const contingency=Math.round((fuel+accommodation+food+extras)*.15);
  const total=fuel+accommodation+food+extras+contingency;
  return {fuel,accommodation,food,extras,contingency,total,perPerson:Math.ceil(total/people),vehicles};
}
export const credibility=g=>Math.round(g.profile*.25+g.completion*.45+g.reviews*.30);
export const matches=(trip,{query='',vehicle='All',season='All'})=>(!query||`${trip.title} ${trip.location} ${trip.route}`.toLowerCase().includes(query.toLowerCase().trim()))&&(vehicle==='All'||trip.vehicle===vehicle)&&(season==='All'||trip.seasons.includes(season));
// Card price: 2 travelers, Comfort stays, default vehicle — same maths as the planner.
export const tripPrice=t=>estimate({distance:t.km,days:t.days,people:2,vehicle:t.vehicle,stay:'Comfort'}).perPerson;
// Group links: https only (http allowed for websites), and social links must be on the platform's own domain.
export const LINK_KINDS={instagram:{label:'Instagram',hosts:['instagram.com']},youtube:{label:'YouTube',hosts:['youtube.com','youtu.be']},facebook:{label:'Facebook',hosts:['facebook.com','fb.com']},x:{label:'X (Twitter)',hosts:['x.com','twitter.com']},strava:{label:'Strava',hosts:['strava.com','strava.app.link']},threads:{label:'Threads',hosts:['threads.net','threads.com']},website:{label:'Website',hosts:null},whatsapp:{label:'WhatsApp',hosts:['chat.whatsapp.com','whatsapp.com']},telegram:{label:'Telegram',hosts:['t.me','telegram.me']}};
// Rider profiles carry public social links only; chat invites (WhatsApp/Telegram) belong to groups.
export const PROFILE_LINKS=['instagram','youtube','facebook','x','strava','threads','website'];
// Rider profile choices (shared by the form and the server schema).
export const RIDING_STYLES=['Touring','Adventure','Off-road','Cruising','Long distance','City rides','Breakfast rides','Track days'];
export const RIDING_PACES=['Relaxed','Steady','Spirited'];
export const LOOKING_FOR=['Riding buddies','Weekend rides','Long trips','Learning from experienced riders','Leading rides'];
// Share of the optional rider details filled in, 0-100.
export function profileCompleteness(p){
  const checks=[p.homeCity,p.bio,p.ridingSince,p.styles?.length,p.pace,p.lookingFor?.length,p.regions,p.languages,Object.keys(p.links||{}).length,p.vehicles?.length];
  return Math.round(100*checks.filter(Boolean).length/checks.length);
}
export function cleanLink(kind,value){
  const raw=String(value??'').trim();if(!raw)return '';
  let url;try{url=new URL(/^[a-z][a-z\d+.-]*:/i.test(raw)?raw:'https://'+raw)}catch{return null}
  const hosts=LINK_KINDS[kind]?.hosts;if(hosts===undefined||url.username||url.password||raw.length>200)return null;
  if(hosts?url.protocol!=='https:'||!hosts.some(h=>url.hostname===h||url.hostname.endsWith('.'+h)):!['https:','http:'].includes(url.protocol)||!url.hostname.includes('.'))return null;
  return url.href;
}
// Returns {links} with only filled, valid entries, or {error} naming the first bad field.
export function cleanLinks(input={},kinds=Object.keys(LINK_KINDS)){
  const links={};
  for(const kind of kinds){const {label}=LINK_KINDS[kind];const href=cleanLink(kind,input[kind]);if(href===null)return {error:`Enter a valid ${label} link${kind==='website'?'':' on '+LINK_KINDS[kind].hosts[0]}.`};if(href)links[kind]=href}
  return {links};
}
