export function outline(trip,days){
  if(!Number.isInteger(days)||days<1||days>60)throw new Error('Choose 1–60 days.');
  const placeDay=j=>Math.min(days-1,Math.floor(j*days/trip.places.length));
  return Array.from({length:days},(_,i)=>{
    const places=trip.places.filter((_,j)=>placeDay(j)===i);
    const base=trip.places.filter((_,j)=>placeDay(j)<=i).at(-1)||trip.places[0];
    return {day:i+1,focus:base.area,places,stay:trip.stays.find(s=>s.area===base.stayArea),stop:{name:base.stayArea+' — search locally for a suitable stop'}};
  });
}
export function tripAlerts({title,departure,days},now=Date.now()){
  const start=new Date(departure);
  if(!Number.isFinite(start.getTime())||start.getTime()<=now||!Number.isInteger(days)||days<1||days>60)throw new Error('Choose a future departure and 1–60 days.');
  const offsets=[[0,'Departure / daily start'],[120,'Rest, water & vehicle check'],[240,'Lunch / recharge break'],[480,'End-of-day check-in']];
  return Array.from({length:days},(_,day)=>offsets.map(([minutes,label])=>{const time=new Date(start);time.setDate(time.getDate()+day);time.setMinutes(time.getMinutes()+minutes);return {id:crypto.randomUUID(),label:`${title} · Day ${day+1} · ${label}`,at:time.toISOString(),fired:false}})).flat();
}
const icsText=s=>String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const stamp=value=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
function fold(line){
  const encoder=new TextEncoder();let chunk='',parts=[];
  for(const char of line){if(encoder.encode(chunk+char).length>73){parts.push(chunk);chunk=' '+char}else chunk+=char}
  return [...parts,chunk].join('\r\n');
}
export function calendar(alerts){
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Roamly//Trip reminders//EN','CALSCALE:GREGORIAN',...alerts.flatMap(a=>['BEGIN:VEVENT',`UID:${icsText(a.id)}@roamly`,`DTSTAMP:${stamp(Date.now())}`,`DTSTART:${stamp(a.at)}`,`DTEND:${stamp(new Date(a.at).getTime()+15*60000)}`,`SUMMARY:${icsText(a.label)}`,'DESCRIPTION:Planning reminder. Check current road and weather conditions.','BEGIN:VALARM','TRIGGER:PT0M','ACTION:DISPLAY',`DESCRIPTION:${icsText(a.label)}`,'END:VALARM','END:VEVENT']),'END:VCALENDAR'].map(fold).join('\r\n')+'\r\n';
}
