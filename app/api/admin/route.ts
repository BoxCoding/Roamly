import {and,count,desc,eq,ilike,inArray,ne,or,sql} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '../../../db';
import {accounts,aiQuota,crews,crewMembers,crewReports} from '../../../db/schema';
import {getUser,isAdmin} from '../../auth';
import {json,readJson} from '../../../lib/http';
export const dynamic='force-dynamic';

const adminAction=z.object({rider:z.string().regex(/^[a-f0-9]{12}$/),action:z.enum(['suspend','unsuspend','make-admin','remove-admin']),reason:z.string().trim().max(200).default('')}).strict();
const like=(q:string)=>`%${q.replace(/[\\%_]/g,c=>'\\'+c)}%`;

// Admin dashboard data: ?view=overview | riders | groups, with optional ?q= search.
export async function GET(request:Request){
  const user=await getUser();if(!isAdmin(user))return json({error:'Admins only.'},403);
  const url=new URL(request.url),view=url.searchParams.get('view')||'overview',q=(url.searchParams.get('q')||'').trim().slice(0,80);
  try{
    const db=getDb();
    if(view==='overview'){
      const day=new Date().toISOString().slice(0,10);
      const [[r],[s],[a],[c],[h],[rep],[ai],[newRiders]]=await Promise.all([
        db.select({n:count()}).from(accounts),
        db.select({n:count()}).from(accounts).where(eq(accounts.status,'suspended')),
        db.select({n:count()}).from(accounts).where(eq(accounts.role,'admin')),
        db.select({n:count()}).from(crews).where(eq(crews.status,'active')),
        db.select({n:count()}).from(crews).where(eq(crews.status,'hidden')),
        db.select({n:count()}).from(crewReports),
        db.select({n:sql<number>`coalesce(sum(${aiQuota.calls}),0)::int`}).from(aiQuota).where(eq(aiQuota.day,day)),
        db.select({n:count()}).from(accounts).where(sql`${accounts.createdAt} >= ${new Date(Date.now()-7*86400000).toISOString()}`),
      ]);
      return json({overview:{riders:r.n,newRidersThisWeek:newRiders.n,suspended:s.n,admins:a.n,activeGroups:c.n,hiddenGroups:h.n,openReports:rep.n,aiPlansToday:ai.n}});
    }
    if(view==='riders'){
      const rows=await db.select().from(accounts).where(q?or(ilike(accounts.name,like(q)),ilike(accounts.email,like(q))):undefined).orderBy(desc(accounts.lastSeenAt)).limit(50);
      const owned=rows.length?await db.select({userId:crews.organizerId,n:count()}).from(crews).where(and(inArray(crews.organizerId,rows.map(r=>r.userId)),ne(crews.status,'removed'))).groupBy(crews.organizerId):[];
      return json({riders:rows.map(r=>({publicId:r.publicId,name:r.name,email:r.email,provider:r.provider,role:r.role,status:r.status,suspendReason:r.suspendReason,createdAt:r.createdAt,lastSeenAt:r.lastSeenAt,groupsOwned:owned.find(o=>o.userId===r.userId)?.n||0,isYou:r.userId===user!.userId}))});
    }
    if(view==='groups'){
      const rows=await db.select().from(crews).where(q?or(ilike(crews.name,like(q)),ilike(crews.city,like(q))):undefined).orderBy(desc(crews.createdAt)).limit(100);
      const ids=rows.map(r=>r.id);
      const [members,reports]=ids.length?await Promise.all([
        db.select({crewId:crewMembers.crewId,n:count()}).from(crewMembers).where(and(inArray(crewMembers.crewId,ids),eq(crewMembers.status,'active'))).groupBy(crewMembers.crewId),
        db.select({crewId:crewReports.crewId,n:count()}).from(crewReports).where(inArray(crewReports.crewId,ids)).groupBy(crewReports.crewId),
      ]):[[],[]];
      return json({groups:rows.map(r=>({id:r.id,name:r.name,city:r.city,vehicle:r.vehicle,organizer:r.organizerName,status:r.status,visibility:r.visibility,createdAt:r.createdAt,members:members.find(m=>m.crewId===r.id)?.n||0,reports:reports.find(m=>m.crewId===r.id)?.n||0}))});
    }
    return json({error:'Unknown view.'},400);
  }catch{return json({error:'Admin data could not be loaded.'},503)}
}

// Suspend or restore a rider, or change admin role. Admins cannot change their own account.
export async function POST(request:Request){
  const user=await getUser();if(!isAdmin(user))return json({error:'Admins only.'},403);
  const req=await readJson(request,600);if('error' in req)return req.error;
  const parsed=adminAction.safeParse(req.body);if(!parsed.success)return json({error:'Invalid request.'},400);
  const {rider,action,reason}=parsed.data;
  try{
    const db=getDb(),[target]=await db.select().from(accounts).where(eq(accounts.publicId,rider)).limit(1);
    if(!target)return json({error:'Rider not found.'},404);
    if(target.userId===user!.userId)return json({error:'You cannot change your own account.'},400);
    const set=action==='suspend'?{status:'suspended',suspendReason:reason}:action==='unsuspend'?{status:'active',suspendReason:''}:{role:action==='make-admin'?'admin':'rider'};
    await db.update(accounts).set(set).where(eq(accounts.publicId,rider));
    return json({rider,action});
  }catch{return json({error:'That change was not saved. Please try again.'},503)}
}
