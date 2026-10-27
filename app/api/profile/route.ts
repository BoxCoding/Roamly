import {and,eq} from 'drizzle-orm';
import {getDb} from '../../../db';
import {profiles} from '../../../db/schema';
import {getChatGPTUser} from '../../chatgpt-auth';
import {emptyProfile,profileUpdateSchema} from '../../../lib/profile-schema.mjs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store, private','Vary':'Cookie'};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers});
export async function GET(){
  const user=await getChatGPTUser(); if(!user)return json({error:'Sign in to view your profile.'},401);
  try{
    const row=await getDb().select().from(profiles).where(eq(profiles.userId,user.userId)).get();
    return json({profile:row?JSON.parse(row.details):emptyProfile(),updatedAt:row?.updatedAt??null});
  }catch{return json({error:'Your profile could not be loaded. Please try again.'},503)}
}
export async function PUT(request:Request){
  const user=await getChatGPTUser(); if(!user)return json({error:'Sign in to update your profile.'},401);
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Invalid request origin.'},403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Send a JSON profile.'},415);
  if(Number(request.headers.get('content-length'))>20000)return json({error:'Profile is too large.'},413);
  let body;try{const raw=await request.text();if(raw.length>20000)return json({error:'Profile is too large.'},413);body=JSON.parse(raw)}catch{return json({error:'Invalid JSON profile.'},400)}
  const parsed=profileUpdateSchema.safeParse(body);if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Invalid profile.'},400);
  try{
    const {profile,updatedAt}=parsed.data;
    const stamp=new Date(Math.max(Date.now(),updatedAt?Date.parse(updatedAt)+1:0)).toISOString();const values={details:JSON.stringify(profile),updatedAt:stamp};
    const db=getDb();
    const rows=updatedAt?await db.update(profiles).set(values).where(and(eq(profiles.userId,user.userId),eq(profiles.updatedAt,updatedAt))).returning():await db.insert(profiles).values({userId:user.userId,...values}).onConflictDoNothing().returning();
    if(!rows.length)return json({error:'Your profile changed in another tab. Reopen your profile before editing again.'},409);
    return json({profile,updatedAt:stamp});
  }catch{return json({error:'Your profile was not saved. Please try again.'},503)}
}
