import {and,asc,eq} from 'drizzle-orm';
import {getDb} from '../../../../db';
import {accounts,crews,crewMembers} from '../../../../db/schema';
import {getUser,isAdmin} from '../../../auth';
import {memberActionInput,memberActionError} from '../../../../lib/crew-schema.mjs';
import {json,readJson} from '../../../../lib/http';
export const dynamic='force-dynamic';

const ORDER:Record<string,number>={owner:0,colead:1,member:2};
const membershipOf=async(crewId:string,userId:string)=>(await getDb().select().from(crewMembers).where(and(eq(crewMembers.crewId,crewId),eq(crewMembers.userId,userId))).limit(1))[0];

// Members of a crew, for its active members (and admins). Pending requests are shown only to the owner and co-leads.
export async function GET(request:Request){
  const user=await getUser();if(!user)return json({error:'Sign in to see members.'},401);
  const id=new URL(request.url).searchParams.get('id')||'';
  if(!/^[0-9a-f-]{36}$/.test(id))return json({error:'Invalid group.'},400);
  try{
    const me=await membershipOf(id,user.userId),admin=isAdmin(user);
    if(me?.status!=='active'&&!admin)return json({error:'Only members can see who is in this group.'},403);
    const lead=admin||me?.role==='owner'||me?.role==='colead';
    const rows=await getDb().select({role:crewMembers.role,status:crewMembers.status,joinedAt:crewMembers.joinedAt,publicId:accounts.publicId,name:accounts.name})
      .from(crewMembers).leftJoin(accounts,eq(accounts.userId,crewMembers.userId)).where(eq(crewMembers.crewId,id)).orderBy(asc(crewMembers.joinedAt));
    const members=rows.filter(r=>lead||r.status==='active').map(r=>({publicId:r.publicId,name:r.name||'Rider',role:r.role,status:r.status,joinedAt:r.joinedAt}))
      .sort((a,b)=>(a.status===b.status?0:a.status==='pending'?-1:1)||(ORDER[a.role]-ORDER[b.role]));
    return json({members,myRole:me?.status==='active'?me.role:null,canManage:me?.status==='active'&&(me.role==='owner'||me.role==='colead')});
  }catch{return json({error:'Members could not be loaded.'},503)}
}

// approve / reject a request, remove a member, promote to or demote from co-lead.
export async function POST(request:Request){
  const user=await getUser();if(!user)return json({error:'Sign in to manage members.'},401);
  const req=await readJson(request,500);if('error' in req)return req.error;
  const parsed=memberActionInput.safeParse(req.body);if(!parsed.success)return json({error:'Invalid request.'},400);
  try{
    const db=getDb(),{id,rider,action}=parsed.data;
    const [crew]=await db.select({id:crews.id}).from(crews).where(eq(crews.id,id)).limit(1);
    if(!crew)return json({error:'This group is not available.'},404);
    const me=await membershipOf(id,user.userId);
    const [account]=await db.select({userId:accounts.userId}).from(accounts).where(eq(accounts.publicId,rider)).limit(1);
    const target=account&&account.userId!==user.userId?await membershipOf(id,account.userId):undefined;
    const error=memberActionError(me?.status==='active'?me.role:null,target,action);
    if(error)return json({error},403);
    const where=and(eq(crewMembers.crewId,id),eq(crewMembers.userId,account!.userId));
    if(action==='approve')await db.update(crewMembers).set({status:'active',joinedAt:new Date().toISOString()}).where(where);
    else if(action==='reject'||action==='remove')await db.delete(crewMembers).where(where);
    else await db.update(crewMembers).set({role:action==='promote'?'colead':'member'}).where(where);
    return json({id,rider,action});
  }catch{return json({error:'That change was not saved. Please try again.'},503)}
}
