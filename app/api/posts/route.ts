import {and,count,eq,gte,inArray,isNull} from 'drizzle-orm';
import {getDb} from '../../../db';
import {crewMembers,follows,posts,uploads} from '../../../db/schema';
import {getUser} from '../../auth';
import {POSTS_PER_DAY,postInput} from '../../../lib/feed-schema.mjs';
import {notify} from '../../../lib/notify';
import {checkRules,shouldHide} from '../../../lib/moderation.mjs';
import {aiReview} from '../../../lib/ai-moderation';
import {getRoute} from '../../../lib/routes';
import {json,readJson} from '../../../lib/http';
import {track} from '../../../lib/track';
export const dynamic='force-dynamic';

// Share a post or a road report. Crew posts need active membership and follow the crew's visibility.
export async function POST(request:Request){
  const user=await getUser();if(!user)return json({error:'Sign in to post.'},401);
  const req=await readJson(request,3000);if('error' in req)return req.error;
  const parsed=postInput.safeParse(req.body);if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Check your post.'},400);
  const p=parsed.data,rule=checkRules(p.body);
  if(rule.block)return json({error:rule.block},400);
  if(p.routeId&&!await getRoute(p.routeId).catch(()=>null))return json({error:'Route not found.'},404);
  try{
    const db=getDb();
    const [{n}]=await db.select({n:count()}).from(posts).where(and(eq(posts.authorId,user.userId),gte(posts.createdAt,new Date(Date.now()-86400000).toISOString())));
    if(n>=POSTS_PER_DAY)return json({error:`You can share up to ${POSTS_PER_DAY} posts a day.`},429);
    const [dupe]=await db.select({id:posts.id}).from(posts).where(and(eq(posts.authorId,user.userId),eq(posts.body,p.body),gte(posts.createdAt,new Date(Date.now()-86400000).toISOString()))).limit(1);
    if(dupe)return json({error:'You already shared this today.'},409);
    if(p.crewId){const [m]=await db.select().from(crewMembers).where(and(eq(crewMembers.crewId,p.crewId),eq(crewMembers.userId,user.userId),eq(crewMembers.status,'active'))).limit(1);if(!m)return json({error:'Join this crew to post in it.'},403)}
    const id=crypto.randomUUID(),photos=[...new Set(p.photos)];
    // Photos must be the author's own, not yet used by another post.
    if(photos.length){
      const own=await db.select({key:uploads.key}).from(uploads).where(and(inArray(uploads.key,photos),eq(uploads.userId,user.userId),isNull(uploads.postId)));
      if(own.length!==photos.length)return json({error:'Upload the photos again and retry.'},400);
    }
    await db.transaction(async tx=>{
      await tx.insert(posts).values({id,authorId:user.userId,...p,photos:JSON.stringify(photos),createdAt:new Date().toISOString()});
      if(photos.length)await tx.update(uploads).set({postId:id}).where(inArray(uploads.key,photos));
    });
    // Rule-flagged text gets one AI check before anyone is notified.
    if(rule.flag){const v=await aiReview(id,p.body);if(v&&shouldHide(v))return json({id,underReview:true},201)}
    // Followers hear about open posts; crew-only posts stay inside the crew.
    if(!p.crewId){
      const fans=await db.select({id:follows.followerId}).from(follows).where(and(eq(follows.targetType,'rider'),eq(follows.targetId,user.userId)));
      await notify(fans.map(f=>f.id),{kind:'post',text:`${user.displayName} ${p.kind==='report'?`shared a road report from ${p.place}`:'shared a post'}`,link:`#post=${id}`},user.userId);
    }
    await track('post_created',user.userId,{kind:p.kind});
    return json({id},201);
  }catch{return json({error:'Your post was not shared. Please try again.'},503)}
}
