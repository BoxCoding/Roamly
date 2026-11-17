import {and,count,eq,ne} from 'drizzle-orm';
import {getDb} from '../../../../../db';
import {crewMembers,profiles,rides,rideRsvps} from '../../../../../db/schema';
import {getUser} from '../../../../auth';
import {checklistInput,meetsExperience,ridePhase,rsvpInput,seatFor} from '../../../../../lib/ride-schema.mjs';
import {promoteWaitlist,rideAccess} from '../../../../../lib/rides';
import {json,readJson} from '../../../../../lib/http';
import {track} from '../../../../../lib/track';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};

// RSVP: going (a seat, or the waitlist when full), maybe, or none. RSVPing to an open crew's ride joins the crew.
export async function POST(request:Request,{params}:Ctx){
  const {id}=await params;
  const user=await getUser();if(!user)return json({error:'Sign in to RSVP.'},401);
  const req=await readJson(request,200);if('error' in req)return req.error;
  const parsed=rsvpInput.safeParse(req.body);if(!parsed.success)return json({error:'Choose going, maybe or not going.'},400);
  const want=parsed.data.status;
  try{
    const a=await rideAccess(id,user);if(!a?.canSee)return json({error:'Ride not found.'},404);
    if(want!=='none'){
      if(ridePhase(a.ride)!=='upcoming')return json({error:'RSVPs are closed for this ride.'},400);
      if(!a.member&&a.crew.visibility!=='public')return json({error:'Join this crew to RSVP.'},403);
      if(want==='going'){
        const [p]=await getDb().select({details:profiles.details}).from(profiles).where(eq(profiles.userId,user.userId)).limit(1);
        let exp='Beginner';try{exp=JSON.parse(p?.details||'{}').experience||'Beginner'}catch{}
        if(!meetsExperience(exp,a.ride.minExperience))return json({error:`This ride needs ${a.ride.minExperience.toLowerCase()} riders or above. Update your profile if that is you, or RSVP maybe and ask the lead.`},403);
      }
    }
    const status=await getDb().transaction(async tx=>{
      // Lock the ride row so two riders cannot take the last seat at the same time.
      await tx.select({id:rides.id}).from(rides).where(eq(rides.id,id)).for('update');
      const [prev]=await tx.select({status:rideRsvps.status}).from(rideRsvps).where(and(eq(rideRsvps.rideId,id),eq(rideRsvps.userId,user.userId))).limit(1);
      if(want==='going'&&(prev?.status==='going'||prev?.status==='waitlist'))return prev.status;
      if(want==='going'&&!parsed.data.waiver)return 'waiver-needed';
      if(!a.member&&want!=='none')await tx.insert(crewMembers).values({crewId:a.crew.id,userId:user.userId,joinedAt:new Date().toISOString()}).onConflictDoNothing();
      let next:string|null=want==='none'?null:want;
      if(want==='going'){
        const [{going}]=await tx.select({going:count()}).from(rideRsvps).where(and(eq(rideRsvps.rideId,id),eq(rideRsvps.status,'going'),ne(rideRsvps.userId,user.userId)));
        next=seatFor(going,a.ride.capacity);
      }
      const where=and(eq(rideRsvps.rideId,id),eq(rideRsvps.userId,user.userId)),waiver=want==='going'?{waiverAt:new Date().toISOString()}:{};
      if(!next)await tx.delete(rideRsvps).where(where);
      // Waitlist order is by request time, so a fresh "going" from maybe/none gets a fresh timestamp.
      else if(prev)await tx.update(rideRsvps).set({status:next,...waiver,...(next==='waitlist'?{createdAt:new Date().toISOString()}:{})}).where(where);
      else await tx.insert(rideRsvps).values({rideId:id,userId:user.userId,status:next,createdAt:new Date().toISOString(),...waiver});
      if(prev?.status==='going'&&next!=='going')await promoteWaitlist(tx,id,a.ride.capacity);
      return next;
    });
    if(status==='waiver-needed')return json({error:'Accept the ride safety terms to join this ride.',waiver:true},400);
    if(status==='going'||status==='waitlist')await track('rsvp_going',user.userId,{waitlist:status==='waitlist'});
    return json({id,status});
  }catch{return json({error:'Your RSVP was not saved. Please try again.'},503)}
}

// Tick off your own pre-ride checklist.
export async function PATCH(request:Request,{params}:Ctx){
  const {id}=await params;
  const user=await getUser();if(!user)return json({error:'Sign in first.'},401);
  const req=await readJson(request,500);if('error' in req)return req.error;
  const parsed=checklistInput.safeParse(req.body);if(!parsed.success)return json({error:'Invalid checklist.'},400);
  try{
    const done=await getDb().update(rideRsvps).set({checklist:JSON.stringify([...new Set(parsed.data.items)])}).where(and(eq(rideRsvps.rideId,id),eq(rideRsvps.userId,user.userId))).returning({id:rideRsvps.rideId});
    if(!done.length)return json({error:'RSVP to this ride first.'},400);
    return json({id,items:parsed.data.items});
  }catch{return json({error:'Your checklist was not saved.'},503)}
}
