import {and,eq} from 'drizzle-orm';
import {getDb} from '../../../../db';
import {plans} from '../../../../db/schema';
import {getUser} from '../../../auth';
import {planSchema} from '../../../../lib/plan-schema.mjs';
import {json,readJson} from '../../../../lib/http';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};
const mine=(id:string,userId:string)=>and(eq(plans.id,id),eq(plans.userId,userId));

export async function GET(_request:Request,{params}:Ctx){
  const {id}=await params;const user=await getUser();if(!user)return json({error:'Sign in first.'},401);
  try{
    const [row]=await getDb().select().from(plans).where(mine(id,user.userId)).limit(1);
    return row?json({id:row.id,plan:JSON.parse(row.data),updatedAt:row.updatedAt}):json({error:'Plan not found.'},404);
  }catch{return json({error:'This plan could not be loaded.'},503)}
}

export async function PUT(request:Request,{params}:Ctx){
  const {id}=await params;const user=await getUser();if(!user)return json({error:'Sign in first.'},401);
  const req=await readJson(request,30000);if('error' in req)return req.error;
  const parsed=planSchema.safeParse(req.body);if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Check the plan.'},400);
  try{
    const now=new Date().toISOString();
    const done=await getDb().update(plans).set({title:parsed.data.title,data:JSON.stringify(parsed.data),updatedAt:now}).where(mine(id,user.userId)).returning({id:plans.id});
    return done.length?json({id,updatedAt:now}):json({error:'Plan not found.'},404);
  }catch{return json({error:'Your plan was not saved. Please try again.'},503)}
}

export async function DELETE(request:Request,{params}:Ctx){
  const {id}=await params;const user=await getUser();if(!user)return json({error:'Sign in first.'},401);
  const req=await readJson(request,50);if('error' in req)return req.error;
  try{
    const done=await getDb().delete(plans).where(mine(id,user.userId)).returning({id:plans.id});
    return done.length?json({deleted:true}):json({error:'Plan not found.'},404);
  }catch{return json({error:'The plan was not deleted.'},503)}
}
