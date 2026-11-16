import {desc,eq} from 'drizzle-orm';
import {getDb} from '../../../../db';
import {accounts,profiles,rides,rideRsvps,rideUpdates} from '../../../../db/schema';
import {getUser} from '../../../auth';
import {CHECKLIST,rideUpdateInput,ridePhase,startsInPast} from '../../../../lib/ride-schema.mjs';
import {promoteWaitlist,rideAccess,routeLabel} from '../../../../lib/rides';
import {trips} from '../../../../public/catalog.mjs';
import {estimate} from '../../../../public/domain.mjs';
import {json,readJson} from '../../../../lib/http';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};
const validId=(id:string)=>/^[0-9a-f-]{36}$/.test(id);

// Ride detail. Roster names and the updates board are for crew members; the brief and budget are for anyone who can see the ride.
export async function GET(_request:Request,{params}:Ctx){
  const {id}=await params;if(!validId(id))return json({error:'Ride not found.'},404);
  try{
    const user=await getUser(),a=await rideAccess(id,user);
    if(!a?.canSee)return json({error:'Ride not found.'},404);
    const db=getDb(),r=a.ride,insider=a.member||a.admin;
    const [rsvps,updates,[lead],[profile]]=await Promise.all([
      db.select({status:rideRsvps.status,userId:rideRsvps.userId,checklist:rideRsvps.checklist,createdAt:rideRsvps.createdAt,name:accounts.name,publicId:accounts.publicId})
        .from(rideRsvps).leftJoin(accounts,eq(accounts.userId,rideRsvps.userId)).where(eq(rideRsvps.rideId,id)).orderBy(rideRsvps.createdAt),
      insider?db.select().from(rideUpdates).where(eq(rideUpdates.rideId,id)).orderBy(desc(rideUpdates.pinned),desc(rideUpdates.createdAt)).limit(50):[],
      db.select({name:accounts.name,publicId:accounts.publicId}).from(accounts).where(eq(accounts.userId,r.leadId)).limit(1),
      user?db.select({details:profiles.details}).from(profiles).where(eq(profiles.userId,user.userId)).limit(1):[],
    ]);
    const going=rsvps.filter(x=>x.status==='going').length,mine=rsvps.find(x=>x.userId===user?.userId);
    let perRider=null;try{perRider=estimate({distance:r.distanceKm,days:r.days,people:Math.min(30,Math.max(2,going)),vehicle:r.vehicle,stay:r.stay}).perPerson}catch{}
    let experience='Beginner';try{experience=JSON.parse(profile?.details||'{}').experience||'Beginner'}catch{}
    return json({ride:{id:r.id,crewId:a.crew.id,crewName:a.crew.name,crewVisibility:a.crew.visibility,title:r.title,routeId:r.routeId,route:JSON.parse(r.route),routeLabel:routeLabel(r.routeId,r.route),
      startDate:r.startDate,days:r.days,meetupPoint:r.meetupPoint,meetupTime:r.meetupTime,capacity:r.capacity,minExperience:r.minExperience,vehicle:r.vehicle,stay:r.stay,distanceKm:r.distanceKm,description:r.description,
      status:r.status,phase:ridePhase(r),lead:lead||null,leadIsYou:r.leadId===user?.userId,
      going,maybe:rsvps.filter(x=>x.status==='maybe').length,waitlist:rsvps.filter(x=>x.status==='waitlist').length,
      roster:insider?rsvps.map(x=>({name:x.name||'Rider',publicId:x.publicId,status:x.status,ready:JSON.parse(x.checklist).length===CHECKLIST.length})):null,
      myRsvp:mine?.status||null,myChecklist:mine?JSON.parse(mine.checklist):[],myExperience:experience,
      updates:insider?updates.map(u=>({id:u.id,author:u.authorName,body:u.body,pinned:u.pinned,createdAt:u.createdAt})):null,
      brief:r.brief?JSON.parse(r.brief):null,briefAt:r.briefAt,briefCount:r.briefCount,
      perRider,member:a.member,canManage:a.canManage,signedIn:Boolean(user)},checklist:CHECKLIST});
  }catch{return json({error:'This ride could not be loaded.'},503)}
}

// Edit or cancel (status: cancelled). Changing route, dates or vehicle clears the brief so it is regenerated for the new plan.
export async function PUT(request:Request,{params}:Ctx){
  const {id}=await params;if(!validId(id))return json({error:'Ride not found.'},404);
  const user=await getUser();if(!user)return json({error:'Sign in to edit this ride.'},401);
  const req=await readJson(request,4000);if('error' in req)return req.error;
  const parsed=rideUpdateInput.safeParse(req.body);if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Check the ride details.'},400);
  try{
    const a=await rideAccess(id,user);if(!a?.canSee)return json({error:'Ride not found.'},404);
    if(!a.canManage)return json({error:'Only the ride lead, crew owner or a co-lead can edit this ride.'},403);
    const {custom,...r}=parsed.data,old=a.ride;
    if(r.startDate!==old.startDate&&startsInPast(r.startDate))return json({error:'Choose a start date from today onwards.'},400);
    const trip=r.routeId==='custom'?null:trips.find(t=>t.id===r.routeId);if(r.routeId!=='custom'&&!trip)return json({error:'Route not found.'},404);
    const route=JSON.stringify(trip?{title:trip.title,route:trip.route}:custom);
    const replan=route!==old.route||r.days!==old.days||r.startDate!==old.startDate||r.vehicle!==old.vehicle||r.distanceKm!==old.distanceKm;
    await getDb().transaction(async tx=>{
      await tx.update(rides).set({...r,route,...(replan?{brief:null,briefAt:null}:{})}).where(eq(rides.id,id));
      if(r.capacity>old.capacity)await promoteWaitlist(tx,id,r.capacity);
    });
    return json({id,briefCleared:replan&&Boolean(old.brief)});
  }catch{return json({error:'Your changes were not saved. Please try again.'},503)}
}

export async function DELETE(request:Request,{params}:Ctx){
  const {id}=await params;if(!validId(id))return json({error:'Ride not found.'},404);
  const user=await getUser();if(!user)return json({error:'Sign in to delete this ride.'},401);
  const req=await readJson(request,50);if('error' in req)return req.error;
  try{
    const a=await rideAccess(id,user);if(!a?.canSee)return json({error:'Ride not found.'},404);
    if(!a.canManage)return json({error:'Only the ride lead, crew owner or a co-lead can delete this ride.'},403);
    await getDb().delete(rides).where(eq(rides.id,id));
    return json({id,deleted:true});
  }catch{return json({error:'The ride was not deleted. Please try again.'},503)}
}
