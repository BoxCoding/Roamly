import {and,count,eq} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '../../../../../db';
import {postReactions} from '../../../../../db/schema';
import {getUser,isAdmin} from '../../../../auth';
import {postAccess} from '../../../../../lib/feed';
import {json,readJson} from '../../../../../lib/http';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};

// "Ride on" (like) toggle.
export async function POST(request:Request,{params}:Ctx){
  const {id}=await params;const user=await getUser();if(!user)return json({error:'Sign in to react.'},401);
  const req=await readJson(request,100);if('error' in req)return req.error;
  const parsed=z.object({like:z.boolean()}).strict().safeParse(req.body);if(!parsed.success)return json({error:'Invalid reaction.'},400);
  try{
    const a=await postAccess(id,user.userId,isAdmin(user));if(!a?.canSee)return json({error:'Post not found.'},404);
    const db=getDb(),mine=and(eq(postReactions.postId,id),eq(postReactions.userId,user.userId));
    if(parsed.data.like)await db.insert(postReactions).values({postId:id,userId:user.userId,createdAt:new Date().toISOString()}).onConflictDoNothing();
    else await db.delete(postReactions).where(mine);
    const [{n}]=await db.select({n:count()}).from(postReactions).where(eq(postReactions.postId,id));
    return json({liked:parsed.data.like,likes:n});
  }catch{return json({error:'Your reaction was not saved.'},503)}
}
