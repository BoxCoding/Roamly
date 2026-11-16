import {and,eq} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '../../../../../db';
import {rideUpdates} from '../../../../../db/schema';
import {getUser} from '../../../../auth';
import {postInput} from '../../../../../lib/ride-schema.mjs';
import {rideAccess} from '../../../../../lib/rides';
import {json,readJson} from '../../../../../lib/http';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};
const MAX_UPDATES=100;

// Ride leads post updates ("regroup at Lonavala", "start moved to 6:15"); members read them in the ride.
export async function POST(request:Request,{params}:Ctx){
  const {id}=await params;
  const user=await getUser();if(!user)return json({error:'Sign in first.'},401);
  const req=await readJson(request,1500);if('error' in req)return req.error;
  const parsed=postInput.safeParse(req.body);if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Write an update.'},400);
  try{
    const a=await rideAccess(id,user);if(!a?.canSee)return json({error:'Ride not found.'},404);
    if(!a.canManage)return json({error:'Only the ride lead, crew owner or a co-lead can post updates.'},403);
    const db=getDb(),existing=await db.select({id:rideUpdates.id}).from(rideUpdates).where(eq(rideUpdates.rideId,id));
    if(existing.length>=MAX_UPDATES)return json({error:'This ride has reached its update limit. Delete old updates first.'},429);
    const uid=crypto.randomUUID();
    await db.insert(rideUpdates).values({id:uid,rideId:id,authorId:user.userId,authorName:user.displayName,body:parsed.data.body,pinned:parsed.data.pinned,createdAt:new Date().toISOString()});
    return json({id:uid},201);
  }catch{return json({error:'Your update was not posted. Please try again.'},503)}
}

export async function DELETE(request:Request,{params}:Ctx){
  const {id}=await params;
  const user=await getUser();if(!user)return json({error:'Sign in first.'},401);
  const req=await readJson(request,300);if('error' in req)return req.error;
  const parsed=z.object({updateId:z.string().uuid()}).strict().safeParse(req.body);if(!parsed.success)return json({error:'Invalid update.'},400);
  try{
    const a=await rideAccess(id,user);if(!a?.canManage)return json({error:'Only ride leads can delete updates.'},403);
    await getDb().delete(rideUpdates).where(and(eq(rideUpdates.id,parsed.data.updateId),eq(rideUpdates.rideId,id)));
    return json({deleted:true});
  }catch{return json({error:'The update was not deleted.'},503)}
}
