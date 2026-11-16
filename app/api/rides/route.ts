import {and,count,eq,gte,inArray,or} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '../../../db';
import {accounts,crews,crewMembers,rides,rideRsvps} from '../../../db/schema';
import {getUser,isAdmin} from '../../auth';
import {rideInput,ridePhase,startsInPast} from '../../../lib/ride-schema.mjs';
import {trips} from '../../../public/catalog.mjs';
import {routeLabel} from '../../../lib/rides';
import {json,readJson} from '../../../lib/http';
export const dynamic='force-dynamic';

const createInput=z.object({crewId:z.string().uuid(),ride:z.unknown()}).strict();

// Rides the viewer can see: public crews' rides plus rides of crews they belong to. ?crew=<id> narrows to one crew,
// ?mine=1 to rides they have RSVP'd, ?past=1 includes finished rides.
export async function GET(request:Request){
  const url=new URL(request.url),crewId=url.searchParams.get('crew'),mine=url.searchParams.get('mine')==='1',past=url.searchParams.get('past')==='1';
  try{
    const db=getDb(),user=await getUser(),admin=isAdmin(user);
    const memberOf=user?(await db.select({crewId:crewMembers.crewId,role:crewMembers.role}).from(crewMembers).where(and(eq(crewMembers.userId,user.userId),eq(crewMembers.status,'active')))):[];
    const roles=new Map(memberOf.map(m=>[m.crewId,m.role])),since=new Date(Date.now()-(past?365:31)*86400000).toISOString().slice(0,10);
    const visible=admin?undefined:or(eq(crews.visibility,'public'),memberOf.length?inArray(crews.id,[...roles.keys()]):undefined);
    const rows=await db.select({ride:rides,crew:{id:crews.id,name:crews.name,visibility:crews.visibility}}).from(rides).innerJoin(crews,eq(crews.id,rides.crewId))
      .where(and(eq(crews.status,'active'),gte(rides.startDate,since),visible,crewId?eq(crews.id,crewId):undefined)).orderBy(rides.startDate).limit(200);
    const ids=rows.map(r=>r.ride.id),leadIds=[...new Set(rows.map(r=>r.ride.leadId))];
    const [tallies,mineRows,leads]=ids.length?await Promise.all([
      db.select({rideId:rideRsvps.rideId,status:rideRsvps.status,n:count()}).from(rideRsvps).where(inArray(rideRsvps.rideId,ids)).groupBy(rideRsvps.rideId,rideRsvps.status),
      user?db.select({rideId:rideRsvps.rideId,status:rideRsvps.status}).from(rideRsvps).where(and(eq(rideRsvps.userId,user.userId),inArray(rideRsvps.rideId,ids))):[],
      db.select({userId:accounts.userId,name:accounts.name,publicId:accounts.publicId}).from(accounts).where(inArray(accounts.userId,leadIds)),
    ]):[[],[],[]];
    const n=(id:string,s:string)=>tallies.find(t=>t.rideId===id&&t.status===s)?.n||0,my=new Map(mineRows.map(m=>[m.rideId,m.status]));
    const list=rows.map(({ride:r,crew})=>{
      const lead=leads.find(l=>l.userId===r.leadId),role=roles.get(crew.id);
      return {id:r.id,crewId:crew.id,crewName:crew.name,crewVisibility:crew.visibility,title:r.title,routeId:r.routeId,routeLabel:routeLabel(r.routeId,r.route),
        startDate:r.startDate,days:r.days,meetupPoint:r.meetupPoint,meetupTime:r.meetupTime,capacity:r.capacity,minExperience:r.minExperience,vehicle:r.vehicle,distanceKm:r.distanceKm,
        going:n(r.id,'going'),maybe:n(r.id,'maybe'),waitlist:n(r.id,'waitlist'),myRsvp:my.get(r.id)||null,phase:ridePhase(r),
        lead:lead?{name:lead.name,publicId:lead.publicId}:null,canManage:Boolean(user)&&(admin||role==='owner'||role==='colead'||r.leadId===user!.userId)};
    }).filter(r=>(past||r.phase!=='past')&&(!mine||r.myRsvp));
    return json({rides:list});
  }catch{return json({error:'Rides could not be loaded. Please try again.'},503)}
}

// Crew owners and co-leads plan a ride; they lead it and take the first seat.
export async function POST(request:Request){
  const user=await getUser();if(!user)return json({error:'Sign in to plan a ride.'},401);
  const req=await readJson(request,4000);if('error' in req)return req.error;
  const wrap=createInput.safeParse(req.body);if(!wrap.success)return json({error:'Invalid ride.'},400);
  const parsed=rideInput.safeParse(wrap.data.ride);if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Check the ride details.'},400);
  const r=parsed.data,crewId=wrap.data.crewId;
  if(startsInPast(r.startDate))return json({error:'Choose a start date from today onwards.'},400);
  const trip=r.routeId==='custom'?null:trips.find(t=>t.id===r.routeId);
  if(r.routeId!=='custom'&&!trip)return json({error:'Route not found.'},404);
  try{
    const db=getDb();
    const [m]=await db.select({role:crewMembers.role}).from(crewMembers).innerJoin(crews,eq(crews.id,crewMembers.crewId))
      .where(and(eq(crewMembers.crewId,crewId),eq(crewMembers.userId,user.userId),eq(crewMembers.status,'active'),eq(crews.status,'active'))).limit(1);
    if(m?.role!=='owner'&&m?.role!=='colead')return json({error:'Only the crew owner or a co-lead can plan rides.'},403);
    const id=crypto.randomUUID(),now=new Date().toISOString(),{custom,...fields}=r;
    const route=JSON.stringify(trip?{title:trip.title,route:trip.route}:custom);
    await db.transaction(async tx=>{
      await tx.insert(rides).values({id,crewId,...fields,route,leadId:user.userId,createdAt:now});
      await tx.insert(rideRsvps).values({rideId:id,userId:user.userId,status:'going',createdAt:now});
    });
    return json({id},201);
  }catch{return json({error:'The ride was not saved. Please try again.'},503)}
}
