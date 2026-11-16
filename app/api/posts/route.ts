import {and,count,eq,gte} from 'drizzle-orm';
import {getDb} from '../../../db';
import {crewMembers,follows,posts} from '../../../db/schema';
import {getUser} from '../../auth';
import {POSTS_PER_DAY,postInput} from '../../../lib/feed-schema.mjs';
import {notify} from '../../../lib/notify';
import {trips} from '../../../public/catalog.mjs';
import {json,readJson} from '../../../lib/http';
export const dynamic='force-dynamic';

// Share a post or a road report. Crew posts need active membership and follow the crew's visibility.
export async function POST(request:Request){
  const user=await getUser();if(!user)return json({error:'Sign in to post.'},401);
  const req=await readJson(request,3000);if('error' in req)return req.error;
  const parsed=postInput.safeParse(req.body);if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Check your post.'},400);
  const p=parsed.data;
  if(p.routeId&&!trips.some(t=>t.id===p.routeId))return json({error:'Route not found.'},404);
  try{
    const db=getDb();
    const [{n}]=await db.select({n:count()}).from(posts).where(and(eq(posts.authorId,user.userId),gte(posts.createdAt,new Date(Date.now()-86400000).toISOString())));
    if(n>=POSTS_PER_DAY)return json({error:`You can share up to ${POSTS_PER_DAY} posts a day.`},429);
    if(p.crewId){const [m]=await db.select().from(crewMembers).where(and(eq(crewMembers.crewId,p.crewId),eq(crewMembers.userId,user.userId),eq(crewMembers.status,'active'))).limit(1);if(!m)return json({error:'Join this crew to post in it.'},403)}
    const id=crypto.randomUUID();
    await db.insert(posts).values({id,authorId:user.userId,...p,createdAt:new Date().toISOString()});
    // Followers hear about open posts; crew-only posts stay inside the crew.
    if(!p.crewId){
      const fans=await db.select({id:follows.followerId}).from(follows).where(and(eq(follows.targetType,'rider'),eq(follows.targetId,user.userId)));
      await notify(fans.map(f=>f.id),{kind:'post',text:`${user.displayName} ${p.kind==='report'?`shared a road report from ${p.place}`:'shared a post'}`,link:`#post=${id}`},user.userId);
    }
    return json({id},201);
  }catch{return json({error:'Your post was not shared. Please try again.'},503)}
}
