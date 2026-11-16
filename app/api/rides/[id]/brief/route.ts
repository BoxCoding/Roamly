import {and,count,eq,lt,sql} from 'drizzle-orm';
import {env} from '../../../../../lib/env';
import {getDb} from '../../../../../db';
import {rides,rideRsvps} from '../../../../../db/schema';
import {getUser} from '../../../../auth';
import {BRIEF_INSTRUCTION,BRIEF_LIMIT,briefJsonSchema,briefSchema,checkBrief} from '../../../../../lib/ride-schema.mjs';
import {rideAccess} from '../../../../../lib/rides';
import {generateJson} from '../../../../../lib/gemini';
import {trips} from '../../../../../public/catalog.mjs';
import {json,readJson} from '../../../../../lib/http';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};

// Generates the shared AI brief once for the whole crew (token cost: one call per ride, not per rider).
// Each ride gets BRIEF_LIMIT generations; an attempt counts even if the AI fails, so it cannot be hammered.
export async function POST(request:Request,{params}:Ctx){
  const {id}=await params;
  const user=await getUser();if(!user)return json({error:'Sign in first.'},401);
  if(!env.GEMINI_API_KEY)return json({error:'AI is not configured.'},503);
  const req=await readJson(request,50);if('error' in req)return req.error;
  try{
    const a=await rideAccess(id,user);if(!a?.canSee)return json({error:'Ride not found.'},404);
    if(!a.canManage)return json({error:'Only the ride lead, crew owner or a co-lead can generate the ride brief.'},403);
    const db=getDb(),r=a.ride;
    const [slot]=await db.update(rides).set({briefCount:sql`${rides.briefCount} + 1`}).where(and(eq(rides.id,id),lt(rides.briefCount,BRIEF_LIMIT))).returning({n:rides.briefCount});
    if(!slot)return json({error:`This ride already used its ${BRIEF_LIMIT} AI briefs.`},429);
    const [{going}]=await db.select({going:count()}).from(rideRsvps).where(and(eq(rideRsvps.rideId,id),eq(rideRsvps.status,'going')));
    const trip=trips.find(t=>t.id===r.routeId),route=JSON.parse(r.route);
    // Compact facts: only what the brief needs, so the prompt stays small.
    const facts={ride:r.title,vehicle:r.vehicle,month:new Date(r.startDate+'T00:00:00Z').toLocaleString('en',{month:'long',timeZone:'UTC'}),days:r.days,distanceKm:r.distanceKm,
      meetup:`${r.meetupPoint} at ${r.meetupTime}`,riders:Math.max(going,1),minExperience:r.minExperience,stayBudget:r.stay,notes:r.description.slice(0,300),
      route:trip?{line:trip.route,region:trip.location,places:trip.places.map(p=>p.name),stays:trip.stays.map(s=>s.area),risk:trip.risk}:{from:route.from,via:route.via||[],to:route.to},
      // The lead's attached plan, if any, so the brief follows their chosen stretches and stays.
      leadPlan:r.plan?JSON.parse(r.plan).days.map((d:{from:string,to:string,km:number,stayArea:string})=>({from:d.from,to:d.to,km:d.km,stay:d.stayArea})):undefined};
    let brief;
    try{brief=checkBrief(briefSchema.z.parse(await generateJson(BRIEF_INSTRUCTION,facts,briefJsonSchema,3500)),r.days)}
    catch{return json({error:'The AI brief could not be generated right now. Please try again later.',remaining:BRIEF_LIMIT-slot.n},502)}
    const at=new Date().toISOString();
    await db.update(rides).set({brief:JSON.stringify(brief),briefAt:at}).where(eq(rides.id,id));
    return json({brief,briefAt:at,remaining:BRIEF_LIMIT-slot.n});
  }catch{return json({error:'The AI brief could not be generated right now.'},503)}
}
