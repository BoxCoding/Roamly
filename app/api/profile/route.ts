import {and,eq} from 'drizzle-orm';
import {getDb} from '../../../db';
import {profiles} from '../../../db/schema';
import {getUser} from '../../auth';
import {emptyProfile,profileUpdateSchema} from '../../../lib/profile-schema.mjs';
import {json,readJson} from '../../../lib/http';
export const dynamic='force-dynamic';
export async function GET(){
  const user=await getUser(); if(!user)return json({error:'Sign in to view your profile.'},401);
  try{
    const [row]=await getDb().select().from(profiles).where(eq(profiles.userId,user.userId)).limit(1);
    return json({profile:row?JSON.parse(row.details):emptyProfile(),updatedAt:row?.updatedAt??null});
  }catch{return json({error:'Your profile could not be loaded. Please try again.'},503)}
}
export async function PUT(request:Request){
  const user=await getUser(); if(!user)return json({error:'Sign in to update your profile.'},401);
  const req=await readJson(request,20000);if('error' in req)return req.error;
  const parsed=profileUpdateSchema.safeParse(req.body);if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Invalid profile.'},400);
  try{
    const {profile,updatedAt}=parsed.data;
    const stamp=new Date(Math.max(Date.now(),updatedAt?Date.parse(updatedAt)+1:0)).toISOString();const values={details:JSON.stringify(profile),updatedAt:stamp};
    const db=getDb();
    const rows=updatedAt?await db.update(profiles).set(values).where(and(eq(profiles.userId,user.userId),eq(profiles.updatedAt,updatedAt))).returning():await db.insert(profiles).values({userId:user.userId,...values}).onConflictDoNothing().returning();
    if(!rows.length)return json({error:'Your profile changed in another tab. Reopen your profile before editing again.'},409);
    return json({profile,updatedAt:stamp});
  }catch{return json({error:'Your profile was not saved. Please try again.'},503)}
}
