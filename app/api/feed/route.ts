import {and,count,desc,eq,gte,inArray,lt,or} from 'drizzle-orm';
import {getDb} from '../../../db';
import {accounts,comments,crews,follows,postReactions,posts} from '../../../db/schema';
import {getUser,isAdmin} from '../../auth';
import {INTEL_DAYS,PAGE} from '../../../lib/feed-schema.mjs';
import {myCrewIds,visiblePosts} from '../../../lib/feed';
import {json} from '../../../lib/http';
export const dynamic='force-dynamic';

// Feed: ?scope=following, ?route=<catalog id>, ?crew=<id>, ?rider=<publicId>, ?kind=report (road intel, last 30 days), ?before=<ISO> to page.
export async function GET(request:Request){
  const q=new URL(request.url).searchParams,before=q.get('before'),route=q.get('route'),crew=q.get('crew'),rider=q.get('rider'),kind=q.get('kind');
  try{
    const db=getDb(),user=await getUser(),admin=isAdmin(user),mine=await myCrewIds(user?.userId);
    const filters=[visiblePosts(mine)];
    if(before&&!Number.isNaN(Date.parse(before)))filters.push(lt(posts.createdAt,before));
    if(route)filters.push(eq(posts.routeId,route.slice(0,40)));
    if(crew)filters.push(eq(posts.crewId,crew));
    if(kind==='report'){filters.push(eq(posts.kind,'report'));filters.push(gte(posts.createdAt,new Date(Date.now()-INTEL_DAYS*86400000).toISOString()))}
    if(rider){const [a]=await db.select({userId:accounts.userId}).from(accounts).where(eq(accounts.publicId,rider)).limit(1);if(!a)return json({posts:[]});filters.push(eq(posts.authorId,a.userId))}
    if(q.get('scope')==='following'){
      if(!user)return json({error:'Sign in to see riders and crews you follow.'},401);
      const f=await db.select().from(follows).where(eq(follows.followerId,user.userId));
      const riders=f.filter(x=>x.targetType==='rider').map(x=>x.targetId),crewIds=[...new Set([...f.filter(x=>x.targetType==='crew').map(x=>x.targetId),...mine])];
      if(!riders.length&&!crewIds.length)return json({posts:[]});
      filters.push(or(riders.length?inArray(posts.authorId,riders):undefined,crewIds.length?inArray(posts.crewId,crewIds):undefined)!);
    }
    const rows=await db.select({post:posts,author:{name:accounts.name,publicId:accounts.publicId},crewName:crews.name}).from(posts)
      .leftJoin(crews,eq(crews.id,posts.crewId)).leftJoin(accounts,eq(accounts.userId,posts.authorId)).where(and(...filters)).orderBy(desc(posts.createdAt)).limit(PAGE);
    const ids=rows.map(r=>r.post.id);
    const [likes,talk,liked]=ids.length?await Promise.all([
      db.select({postId:postReactions.postId,n:count()}).from(postReactions).where(inArray(postReactions.postId,ids)).groupBy(postReactions.postId),
      db.select({postId:comments.postId,n:count()}).from(comments).where(inArray(comments.postId,ids)).groupBy(comments.postId),
      user?db.select({postId:postReactions.postId}).from(postReactions).where(and(eq(postReactions.userId,user.userId),inArray(postReactions.postId,ids))):[],
    ]):[[],[],[]];
    const mineLiked=new Set(liked.map(l=>l.postId));
    return json({posts:rows.map(({post:p,author,crewName})=>({id:p.id,kind:p.kind,body:p.body,routeId:p.routeId,place:p.place,reportType:p.reportType,condition:p.condition,
      crewId:p.crewId,crewName,author:{name:author?.name||'Rider',publicId:author?.publicId||null},createdAt:p.createdAt,
      likes:likes.find(l=>l.postId===p.id)?.n||0,comments:talk.find(c=>c.postId===p.id)?.n||0,liked:mineLiked.has(p.id),
      mine:p.authorId===user?.userId,canDelete:p.authorId===user?.userId||admin})),next:rows.length===PAGE?rows.at(-1)!.post.createdAt:null});
  }catch{return json({error:'The feed could not be loaded. Please try again.'},503)}
}
