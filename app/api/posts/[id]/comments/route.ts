import {and,asc,count,eq,gte} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '../../../../../db';
import {accounts,comments} from '../../../../../db/schema';
import {getUser,isAdmin} from '../../../../auth';
import {COMMENTS_PER_DAY,commentInput} from '../../../../../lib/feed-schema.mjs';
import {postAccess} from '../../../../../lib/feed';
import {notify} from '../../../../../lib/notify';
import {json,readJson} from '../../../../../lib/http';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};

export async function GET(_request:Request,{params}:Ctx){
  const {id}=await params;
  try{
    const user=await getUser(),admin=isAdmin(user),a=await postAccess(id,user?.userId,admin);if(!a?.canSee)return json({error:'Post not found.'},404);
    const rows=await getDb().select({c:comments,name:accounts.name,publicId:accounts.publicId}).from(comments).leftJoin(accounts,eq(accounts.userId,comments.authorId)).where(eq(comments.postId,id)).orderBy(asc(comments.createdAt)).limit(200);
    return json({comments:rows.map(({c,name,publicId})=>({id:c.id,body:c.body,createdAt:c.createdAt,author:{name:name||'Rider',publicId},canDelete:Boolean(user)&&(c.authorId===user!.userId||a.post.authorId===user!.userId||admin)}))});
  }catch{return json({error:'Comments could not be loaded.'},503)}
}

export async function POST(request:Request,{params}:Ctx){
  const {id}=await params;const user=await getUser();if(!user)return json({error:'Sign in to comment.'},401);
  const req=await readJson(request,1500);if('error' in req)return req.error;
  const parsed=commentInput.safeParse(req.body);if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Write a comment.'},400);
  try{
    const a=await postAccess(id,user.userId,isAdmin(user));if(!a?.canSee)return json({error:'Post not found.'},404);
    const db=getDb(),[{n}]=await db.select({n:count()}).from(comments).where(and(eq(comments.authorId,user.userId),gte(comments.createdAt,new Date(Date.now()-86400000).toISOString())));
    if(n>=COMMENTS_PER_DAY)return json({error:`You can post up to ${COMMENTS_PER_DAY} comments a day.`},429);
    const cid=crypto.randomUUID();
    await db.insert(comments).values({id:cid,postId:id,authorId:user.userId,body:parsed.data.body,createdAt:new Date().toISOString()});
    await notify([a.post.authorId],{kind:'comment',text:`${user.displayName} commented on your ${a.post.kind==='report'?'road report':'post'}`,link:`#post=${id}`},user.userId);
    return json({id:cid},201);
  }catch{return json({error:'Your comment was not posted.'},503)}
}

// Comment authors, the post author and admins can delete a comment.
export async function DELETE(request:Request,{params}:Ctx){
  const {id}=await params;const user=await getUser();if(!user)return json({error:'Sign in first.'},401);
  const req=await readJson(request,200);if('error' in req)return req.error;
  const parsed=z.object({commentId:z.string().uuid()}).strict().safeParse(req.body);if(!parsed.success)return json({error:'Invalid comment.'},400);
  try{
    const db=getDb(),[c]=await db.select().from(comments).where(and(eq(comments.id,parsed.data.commentId),eq(comments.postId,id))).limit(1);
    if(!c)return json({error:'Comment not found.'},404);
    const a=await postAccess(id,user.userId,isAdmin(user));
    if(c.authorId!==user.userId&&a?.post.authorId!==user.userId&&!isAdmin(user))return json({error:'You cannot delete this comment.'},403);
    await db.delete(comments).where(eq(comments.id,c.id));
    return json({deleted:true});
  }catch{return json({error:'The comment was not deleted.'},503)}
}
