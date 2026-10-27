import {z} from 'zod';
export const planRequest=z.object({routeId:z.string().max(40),days:z.number().int().min(1).max(30),month:z.number().int().min(0).max(11),people:z.number().int().min(1).max(30),vehicle:z.enum(['Bike','Car']),preferences:z.string().trim().max(500)}).strict();
export const planResult=z.object({days:z.array(z.object({day:z.number().int().min(1).max(30),focus:z.string().max(180),placeIds:z.array(z.string().max(80)).max(3),stayArea:z.string().max(180),breakNote:z.string().max(300)}).strict()).max(30),tips:z.array(z.string().max(300)).max(5)}).strict();
export const outputSchema={type:'object',properties:{days:{type:'array',items:{type:'object',properties:{day:{type:'integer'},focus:{type:'string'},placeIds:{type:'array',items:{type:'string'}},stayArea:{type:'string'},breakNote:{type:'string'}},required:['day','focus','placeIds','stayArea','breakNote'],additionalProperties:false}},tips:{type:'array',items:{type:'string'}}},required:['days','tips'],additionalProperties:false};
export function validateAIPlan(data,trip,days){
  const plan=planResult.parse(data),ids=new Set(trip.places.map(p=>p.id)),areas=new Set(trip.stays.map(p=>p.area));
  if(plan.days.length!==days||plan.days.some((d,i)=>d.day!==i+1||!areas.has(d.stayArea)||d.placeIds.some(id=>!ids.has(id))))throw new Error('AI plan did not match the route.');
  return plan;
}
export function responseText(result){
  return (result.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('');
}
