import {and,count,desc,eq,inArray} from 'drizzle-orm';
import {getDb} from '../../../db';
import {crews,crewMembers,profiles} from '../../../db/schema';
import {getUser} from '../../auth';
import {crewInput,membershipInput,crewIdInput,MAX_CREWS_PER_ORGANIZER} from '../../../lib/crew-schema.mjs';
import {PROFILE_LINKS,cleanLinks} from '../../../public/domain.mjs';
import {json,readJson} from '../../../lib/http';
export const dynamic='force-dynamic';

// Public list. Organizer IDs stay on the server; viewers only get `mine` and `joined`.
export async function GET(){
  try{
    const db=getDb(),user=await getUser();
    const rows=await db.select().from(crews).orderBy(desc(crews.createdAt)).limit(200).all();
    const ids=rows.map(r=>r.id),organizers=[...new Set(rows.map(r=>r.organizerId))];
    const [counts,mine,owners]=ids.length?await Promise.all([
      db.select({crewId:crewMembers.crewId,members:count()}).from(crewMembers).where(inArray(crewMembers.crewId,ids)).groupBy(crewMembers.crewId).all(),
      user?db.select({crewId:crewMembers.crewId}).from(crewMembers).where(and(eq(crewMembers.userId,user.userId),inArray(crewMembers.crewId,ids))).all():[],
      db.select().from(profiles).where(inArray(profiles.userId,organizers)).all(),
    ]):[[],[],[]];
    const members=new Map(counts.map(c=>[c.crewId,c.members])),joined=new Set(mine.map(m=>m.crewId));
    // Organizer social links are read live from their profile, so edits show up everywhere.
    const socials=new Map(owners.map(p=>{try{return [p.userId,cleanLinks(JSON.parse(p.details).links||{},PROFILE_LINKS).links||{}]}catch{return [p.userId,{}]}}));
    return json({groups:rows.map(r=>({id:r.id,name:r.name,city:r.city,vehicle:r.vehicle,description:r.description,meetup:r.meetup,cadence:r.cadence,links:JSON.parse(r.links),organizer:r.organizerName,organizerLinks:socials.get(r.organizerId)||{},members:members.get(r.id)||0,joined:joined.has(r.id),mine:r.organizerId===user?.userId,createdAt:r.createdAt}))});
  }catch{return json({error:'Groups could not be loaded. Please try again.'},503)}
}

export async function POST(request:Request){
  const user=await getUser();if(!user)return json({error:'Sign in to create a group.'},401);
  const req=await readJson(request,4000);if('error' in req)return req.error;
  const parsed=crewInput.safeParse(req.body);if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Check the group details.'},400);
  try{
    const db=getDb(),[{owned}]=await db.select({owned:count()}).from(crews).where(eq(crews.organizerId,user.userId)).all();
    if(owned>=MAX_CREWS_PER_ORGANIZER)return json({error:`You can organize up to ${MAX_CREWS_PER_ORGANIZER} groups. Delete one to create another.`},429);
    const id=crypto.randomUUID(),now=new Date().toISOString(),{links,...fields}=parsed.data;
    await db.batch([
      db.insert(crews).values({id,...fields,links:JSON.stringify(links),organizerId:user.userId,organizerName:user.displayName,createdAt:now}),
      db.insert(crewMembers).values({crewId:id,userId:user.userId,joinedAt:now}),
    ]);
    return json({id},201);
  }catch{return json({error:'Your group was not saved. Please try again.'},503)}
}

// Join or leave: {id, joined}.
export async function PATCH(request:Request){
  const user=await getUser();if(!user)return json({error:'Sign in to join a group.'},401);
  const req=await readJson(request,500);if('error' in req)return req.error;
  const parsed=membershipInput.safeParse(req.body);if(!parsed.success)return json({error:'Invalid group.'},400);
  try{
    const db=getDb(),{id,joined}=parsed.data;
    if(!await db.select({id:crews.id}).from(crews).where(eq(crews.id,id)).get())return json({error:'This group no longer exists.'},404);
    if(joined)await db.insert(crewMembers).values({crewId:id,userId:user.userId,joinedAt:new Date().toISOString()}).onConflictDoNothing();
    else await db.delete(crewMembers).where(and(eq(crewMembers.crewId,id),eq(crewMembers.userId,user.userId)));
    return json({id,joined});
  }catch{return json({error:'Membership was not updated. Please try again.'},503)}
}

// Only the organizer can delete; members go with it.
export async function DELETE(request:Request){
  const user=await getUser();if(!user)return json({error:'Sign in to delete a group.'},401);
  const req=await readJson(request,500);if('error' in req)return req.error;
  const parsed=crewIdInput.safeParse(req.body);if(!parsed.success)return json({error:'Invalid group.'},400);
  try{
    const db=getDb(),{id}=parsed.data,owner=and(eq(crews.id,id),eq(crews.organizerId,user.userId));
    if(!await db.select({id:crews.id}).from(crews).where(owner).get())return json({error:'Only the organizer can delete this group.'},403);
    await db.batch([db.delete(crewMembers).where(eq(crewMembers.crewId,id)),db.delete(crews).where(owner)]);
    return json({id,deleted:true});
  }catch{return json({error:'The group was not deleted. Please try again.'},503)}
}
