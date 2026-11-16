import {and,count,desc,eq,inArray,ne,or} from 'drizzle-orm';
import {getDb} from '../../../db';
import {crews,crewMembers,crewReports,profiles} from '../../../db/schema';
import {getUser} from '../../auth';
import {crewInput,membershipInput,crewIdInput,MAX_CREWS_PER_ORGANIZER} from '../../../lib/crew-schema.mjs';
import {PROFILE_LINKS,cleanLinks} from '../../../public/domain.mjs';
import {json,readJson} from '../../../lib/http';
export const dynamic='force-dynamic';

// Public list of active crews (plus the viewer's own crews under review). Organizer IDs stay on the server.
export async function GET(){
  try{
    const db=getDb(),user=await getUser();
    const visible=user?or(eq(crews.status,'active'),and(eq(crews.organizerId,user.userId),ne(crews.status,'removed'))):eq(crews.status,'active');
    const rows=await db.select().from(crews).where(visible).orderBy(desc(crews.createdAt)).limit(200);
    const ids=rows.map(r=>r.id),organizers=[...new Set(rows.map(r=>r.organizerId))];
    const [counts,mine,reported,owners]=ids.length?await Promise.all([
      db.select({crewId:crewMembers.crewId,members:count()}).from(crewMembers).where(inArray(crewMembers.crewId,ids)).groupBy(crewMembers.crewId),
      user?db.select({crewId:crewMembers.crewId}).from(crewMembers).where(and(eq(crewMembers.userId,user.userId),inArray(crewMembers.crewId,ids))):[],
      user?db.select({crewId:crewReports.crewId}).from(crewReports).where(and(eq(crewReports.reporterId,user.userId),inArray(crewReports.crewId,ids))):[],
      db.select().from(profiles).where(inArray(profiles.userId,organizers)),
    ]):[[],[],[],[]];
    const members=new Map(counts.map(c=>[c.crewId,c.members])),joined=new Set(mine.map(m=>m.crewId)),flagged=new Set(reported.map(r=>r.crewId));
    // Organizer social links are read live from their profile, so edits show up everywhere.
    const socials=new Map(owners.map(p=>{try{return [p.userId,cleanLinks(JSON.parse(p.details).links||{},PROFILE_LINKS).links||{}]}catch{return [p.userId,{}]}}));
    return json({groups:rows.map(r=>({id:r.id,name:r.name,city:r.city,vehicle:r.vehicle,description:r.description,meetup:r.meetup,cadence:r.cadence,links:JSON.parse(r.links),organizer:r.organizerName,organizerLinks:socials.get(r.organizerId)||{},members:members.get(r.id)||0,joined:joined.has(r.id),reported:flagged.has(r.id),mine:r.organizerId===user?.userId,underReview:r.status==='hidden',createdAt:r.createdAt}))});
  }catch{return json({error:'Groups could not be loaded. Please try again.'},503)}
}

export async function POST(request:Request){
  const user=await getUser();if(!user)return json({error:'Sign in to create a group.'},401);
  const req=await readJson(request,4000);if('error' in req)return req.error;
  const parsed=crewInput.safeParse(req.body);if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Check the group details.'},400);
  try{
    const db=getDb(),[{owned}]=await db.select({owned:count()}).from(crews).where(eq(crews.organizerId,user.userId));
    if(owned>=MAX_CREWS_PER_ORGANIZER)return json({error:`You can organize up to ${MAX_CREWS_PER_ORGANIZER} groups. Delete one to create another.`},429);
    const id=crypto.randomUUID(),now=new Date().toISOString(),{links,...fields}=parsed.data;
    await db.transaction(async tx=>{
      await tx.insert(crews).values({id,...fields,links:JSON.stringify(links),organizerId:user.userId,organizerName:user.displayName,createdAt:now});
      await tx.insert(crewMembers).values({crewId:id,userId:user.userId,joinedAt:now});
    });
    return json({id},201);
  }catch{return json({error:'Your group was not saved. Please try again.'},503)}
}

// Join or leave an active crew: {id, joined}.
export async function PATCH(request:Request){
  const user=await getUser();if(!user)return json({error:'Sign in to join a group.'},401);
  const req=await readJson(request,500);if('error' in req)return req.error;
  const parsed=membershipInput.safeParse(req.body);if(!parsed.success)return json({error:'Invalid group.'},400);
  try{
    const db=getDb(),{id,joined}=parsed.data;
    const [crew]=await db.select({id:crews.id}).from(crews).where(and(eq(crews.id,id),eq(crews.status,'active'))).limit(1);
    if(!crew&&joined)return json({error:'This group is not available.'},404);
    if(joined)await db.insert(crewMembers).values({crewId:id,userId:user.userId,joinedAt:new Date().toISOString()}).onConflictDoNothing();
    else await db.delete(crewMembers).where(and(eq(crewMembers.crewId,id),eq(crewMembers.userId,user.userId)));
    return json({id,joined});
  }catch{return json({error:'Membership was not updated. Please try again.'},503)}
}

// Only the organizer can delete; members and reports go with it (FK cascade).
export async function DELETE(request:Request){
  const user=await getUser();if(!user)return json({error:'Sign in to delete a group.'},401);
  const req=await readJson(request,500);if('error' in req)return req.error;
  const parsed=crewIdInput.safeParse(req.body);if(!parsed.success)return json({error:'Invalid group.'},400);
  try{
    const deleted=await getDb().delete(crews).where(and(eq(crews.id,parsed.data.id),eq(crews.organizerId,user.userId))).returning({id:crews.id});
    if(!deleted.length)return json({error:'Only the organizer can delete this group.'},403);
    return json({id:parsed.data.id,deleted:true});
  }catch{return json({error:'The group was not deleted. Please try again.'},503)}
}
