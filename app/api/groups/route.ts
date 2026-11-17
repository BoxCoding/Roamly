import {and,count,desc,eq,inArray,ne,or} from 'drizzle-orm';
import {getDb} from '../../../db';
import {accounts,crews,crewMembers,crewReports,follows,profiles} from '../../../db/schema';
import {getUser,isAdmin} from '../../auth';
import {crewInput,crewUpdateInput,membershipInput,crewIdInput,MAX_CREWS_PER_ORGANIZER} from '../../../lib/crew-schema.mjs';
import {PROFILE_LINKS,cleanLinks} from '../../../public/domain.mjs';
import {json,readJson} from '../../../lib/http';
import {dropFromCrewRides} from '../../../lib/rides';
import {notify} from '../../../lib/notify';
import {track} from '../../../lib/track';
export const dynamic='force-dynamic';

// Public list of active crews (plus the viewer's own crews under review). Organizer user IDs stay on the server;
// private crews show their chat links only to members.
export async function GET(){
  try{
    const db=getDb(),user=await getUser(),admin=isAdmin(user);
    const visible=user?or(eq(crews.status,'active'),and(eq(crews.organizerId,user.userId),ne(crews.status,'removed'))):eq(crews.status,'active');
    const rows=await db.select().from(crews).where(visible).orderBy(desc(crews.createdAt)).limit(200);
    const ids=rows.map(r=>r.id),organizers=[...new Set(rows.map(r=>r.organizerId))];
    const [counts,mine,reported,owners,ownerAccounts,followed]=ids.length?await Promise.all([
      db.select({crewId:crewMembers.crewId,status:crewMembers.status,n:count()}).from(crewMembers).where(inArray(crewMembers.crewId,ids)).groupBy(crewMembers.crewId,crewMembers.status),
      user?db.select({crewId:crewMembers.crewId,role:crewMembers.role,status:crewMembers.status}).from(crewMembers).where(and(eq(crewMembers.userId,user.userId),inArray(crewMembers.crewId,ids))):[],
      user?db.select({crewId:crewReports.crewId}).from(crewReports).where(and(eq(crewReports.reporterId,user.userId),inArray(crewReports.crewId,ids))):[],
      db.select().from(profiles).where(inArray(profiles.userId,organizers)),
      db.select({userId:accounts.userId,publicId:accounts.publicId}).from(accounts).where(inArray(accounts.userId,organizers)),
      user?db.select({id:follows.targetId}).from(follows).where(and(eq(follows.followerId,user.userId),eq(follows.targetType,'crew'),inArray(follows.targetId,ids))):[],
    ]):[[],[],[],[],[],[]];
    const tally=(id:string,status:string)=>counts.find(c=>c.crewId===id&&c.status===status)?.n||0;
    const membership=new Map(mine.map(m=>[m.crewId,m])),flagged=new Set(reported.map(r=>r.crewId)),ownerIds=new Map(ownerAccounts.map(a=>[a.userId,a.publicId]));
    // Organizer social links are read live from their profile, so edits show up everywhere.
    const socials=new Map(owners.map(p=>{try{return [p.userId,cleanLinks(JSON.parse(p.details).links||{},PROFILE_LINKS).links||{}]}catch{return [p.userId,{}]}}));
    return json({groups:rows.map(r=>{
      const m=membership.get(r.id),active=m?.status==='active',lead=active&&(m.role==='owner'||m.role==='colead');
      const linksHidden=r.visibility==='private'&&!active&&!admin;
      return {id:r.id,name:r.name,city:r.city,vehicle:r.vehicle,description:r.description,meetup:r.meetup,cadence:r.cadence,visibility:r.visibility,
        links:linksHidden?{}:JSON.parse(r.links),linksHidden,organizer:r.organizerName,organizerPublicId:ownerIds.get(r.organizerId)||null,organizerLinks:socials.get(r.organizerId)||{},
        members:tally(r.id,'active'),pendingRequests:lead?tally(r.id,'pending'):0,joined:active,pending:m?.status==='pending',myRole:active?m.role:null,
        reported:flagged.has(r.id),following:followed.some(f=>f.id===r.id),mine:r.organizerId===user?.userId,underReview:r.status==='hidden',createdAt:r.createdAt};
    })});
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
      await tx.insert(crewMembers).values({crewId:id,userId:user.userId,joinedAt:now,role:'owner'});
    });
    await track('crew_created',user.userId,{visibility:fields.visibility||'public'});
    return json({id},201);
  }catch{return json({error:'Your group was not saved. Please try again.'},503)}
}

// Owner edits the group's details, links or visibility.
export async function PUT(request:Request){
  const user=await getUser();if(!user)return json({error:'Sign in to edit a group.'},401);
  const req=await readJson(request,4000);if('error' in req)return req.error;
  const parsed=crewUpdateInput.safeParse(req.body);if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Check the group details.'},400);
  try{
    const {id,links,...fields}=parsed.data;
    const done=await getDb().update(crews).set({...fields,links:JSON.stringify(links)}).where(and(eq(crews.id,id),eq(crews.organizerId,user.userId),ne(crews.status,'removed'))).returning({id:crews.id});
    if(!done.length)return json({error:'Only the group owner can edit this group.'},403);
    return json({id});
  }catch{return json({error:'Your changes were not saved. Please try again.'},503)}
}

// Join or leave an active crew: {id, joined}. Private crews turn a join into a request for the owner or a co-lead.
export async function PATCH(request:Request){
  const user=await getUser();if(!user)return json({error:'Sign in to join a group.'},401);
  const req=await readJson(request,500);if('error' in req)return req.error;
  const parsed=membershipInput.safeParse(req.body);if(!parsed.success)return json({error:'Invalid group.'},400);
  try{
    const db=getDb(),{id,joined}=parsed.data;
    if(joined){
      const [crew]=await db.select({visibility:crews.visibility,name:crews.name}).from(crews).where(and(eq(crews.id,id),eq(crews.status,'active'))).limit(1);
      if(!crew)return json({error:'This group is not available.'},404);
      const status=crew.visibility==='private'?'pending':'active';
      const fresh=await db.insert(crewMembers).values({crewId:id,userId:user.userId,joinedAt:new Date().toISOString(),status}).onConflictDoNothing().returning({id:crewMembers.crewId});
      const [m]=await db.select({status:crewMembers.status}).from(crewMembers).where(and(eq(crewMembers.crewId,id),eq(crewMembers.userId,user.userId))).limit(1);
      if(fresh.length&&status==='pending'){
        const leads=await db.select({id:crewMembers.userId}).from(crewMembers).where(and(eq(crewMembers.crewId,id),eq(crewMembers.status,'active'),inArray(crewMembers.role,['owner','colead'])));
        await notify(leads.map(l=>l.id),{kind:'join-request',text:`${user.displayName} asked to join ${crew.name}`,link:`#crew=${id}`},user.userId);
      }
      if(fresh.length)await track('crew_joined',user.userId,{pending:status==='pending'});
      return json({id,joined:m?.status==='active',pending:m?.status==='pending'});
    }
    const left=await db.transaction(async tx=>{
      const gone=await tx.delete(crewMembers).where(and(eq(crewMembers.crewId,id),eq(crewMembers.userId,user.userId),ne(crewMembers.role,'owner'))).returning({role:crewMembers.role});
      if(gone.length)await dropFromCrewRides(tx,id,user.userId);
      return gone;
    });
    if(!left.length){
      const [owner]=await db.select({id:crews.id}).from(crews).where(and(eq(crews.id,id),eq(crews.organizerId,user.userId))).limit(1);
      if(owner)return json({error:'You own this group. Delete it instead of leaving.'},400);
    }
    return json({id,joined:false,pending:false});
  }catch{return json({error:'Membership was not updated. Please try again.'},503)}
}

// Only the owner can delete; members and reports go with it (FK cascade).
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
