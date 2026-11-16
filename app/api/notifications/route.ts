import {and,count,desc,eq} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '../../../db';
import {notifications} from '../../../db/schema';
import {getUser} from '../../auth';
import {json,readJson} from '../../../lib/http';
export const dynamic='force-dynamic';

// Latest notifications and the unread count. ?count=1 returns only the count (cheap polling).
export async function GET(request:Request){
  const user=await getUser();if(!user)return json({unread:0,notifications:[]});
  try{
    const db=getDb(),[{n}]=await db.select({n:count()}).from(notifications).where(and(eq(notifications.userId,user.userId),eq(notifications.read,false)));
    if(new URL(request.url).searchParams.get('count'))return json({unread:n});
    const rows=await db.select().from(notifications).where(eq(notifications.userId,user.userId)).orderBy(desc(notifications.createdAt)).limit(40);
    return json({unread:n,notifications:rows.map(r=>({id:r.id,kind:r.kind,text:r.text,link:r.link,read:r.read,createdAt:r.createdAt}))});
  }catch{return json({error:'Notifications could not be loaded.'},503)}
}

// Mark all as read.
export async function POST(request:Request){
  const user=await getUser();if(!user)return json({error:'Sign in first.'},401);
  const req=await readJson(request,100);if('error' in req)return req.error;
  if(!z.object({read:z.literal('all')}).strict().safeParse(req.body).success)return json({error:'Invalid request.'},400);
  try{await getDb().update(notifications).set({read:true}).where(and(eq(notifications.userId,user.userId),eq(notifications.read,false)));return json({unread:0})}
  catch{return json({error:'Not saved.'},503)}
}
