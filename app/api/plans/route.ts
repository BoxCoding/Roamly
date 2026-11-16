import {count,desc,eq} from 'drizzle-orm';
import {getDb} from '../../../db';
import {plans} from '../../../db/schema';
import {getUser} from '../../auth';
import {MAX_PLANS,planSchema} from '../../../lib/plan-schema.mjs';
import {json,readJson} from '../../../lib/http';
export const dynamic='force-dynamic';

// The signed-in rider's saved plans (summaries only).
export async function GET(){
  const user=await getUser();if(!user)return json({error:'Sign in to see your plans.'},401);
  try{
    const rows=await getDb().select().from(plans).where(eq(plans.userId,user.userId)).orderBy(desc(plans.updatedAt));
    return json({plans:rows.map(r=>{const p=JSON.parse(r.data);return {id:r.id,title:r.title,routeId:p.routeId,days:p.days.length,km:p.days.reduce((n:number,d:{km:number})=>n+d.km,0),vehicle:p.settings.vehicle,updatedAt:r.updatedAt}})});
  }catch{return json({error:'Your plans could not be loaded.'},503)}
}

export async function POST(request:Request){
  const user=await getUser();if(!user)return json({error:'Sign in to save a plan.'},401);
  const req=await readJson(request,30000);if('error' in req)return req.error;
  const parsed=planSchema.safeParse(req.body);if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Check the plan.'},400);
  try{
    const db=getDb(),[{n}]=await db.select({n:count()}).from(plans).where(eq(plans.userId,user.userId));
    if(n>=MAX_PLANS)return json({error:`You can keep up to ${MAX_PLANS} plans. Delete one to save another.`},429);
    const id=crypto.randomUUID(),now=new Date().toISOString();
    await db.insert(plans).values({id,userId:user.userId,title:parsed.data.title,data:JSON.stringify(parsed.data),createdAt:now,updatedAt:now});
    return json({id,updatedAt:now},201);
  }catch{return json({error:'Your plan was not saved. Please try again.'},503)}
}
