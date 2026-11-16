import {and,eq} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '../../../../../db';
import {plans,rides} from '../../../../../db/schema';
import {getUser} from '../../../../auth';
import {rideAccess} from '../../../../../lib/rides';
import {json,readJson} from '../../../../../lib/http';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};

// The ride lead attaches one of their saved plans (copied, so later edits to the plan do not change the ride), or detaches it.
export async function POST(request:Request,{params}:Ctx){
  const {id}=await params;const user=await getUser();if(!user)return json({error:'Sign in first.'},401);
  const req=await readJson(request,200);if('error' in req)return req.error;
  const parsed=z.object({planId:z.string().uuid().nullable()}).strict().safeParse(req.body);if(!parsed.success)return json({error:'Choose a plan.'},400);
  try{
    const a=await rideAccess(id,user);if(!a?.canSee)return json({error:'Ride not found.'},404);
    if(!a.canManage)return json({error:'Only the ride lead, crew owner or a co-lead can attach a plan.'},403);
    const db=getDb();let data:string|null=null;
    if(parsed.data.planId){
      const [p]=await db.select({data:plans.data}).from(plans).where(and(eq(plans.id,parsed.data.planId),eq(plans.userId,user.userId))).limit(1);
      if(!p)return json({error:'Plan not found.'},404);
      data=p.data;
    }
    await db.update(rides).set({plan:data}).where(eq(rides.id,id));
    return json({id,attached:Boolean(data)});
  }catch{return json({error:'The plan was not attached. Please try again.'},503)}
}
