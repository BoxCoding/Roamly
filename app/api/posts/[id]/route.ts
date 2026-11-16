import {eq} from 'drizzle-orm';
import {getDb} from '../../../../db';
import {accounts,posts} from '../../../../db/schema';
import {getUser,isAdmin} from '../../../auth';
import {postAccess} from '../../../../lib/feed';
import {json,readJson} from '../../../../lib/http';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};

// One post (for shared #post= links).
export async function GET(_request:Request,{params}:Ctx){
  const {id}=await params;
  try{
    const user=await getUser(),a=await postAccess(id,user?.userId,isAdmin(user));
    if(!a?.canSee)return json({error:'Post not found.'},404);
    const [author]=await getDb().select({name:accounts.name,publicId:accounts.publicId}).from(accounts).where(eq(accounts.userId,a.post.authorId)).limit(1);
    const p=a.post;
    return json({post:{id:p.id,kind:p.kind,body:p.body,routeId:p.routeId,place:p.place,reportType:p.reportType,condition:p.condition,crewId:p.crewId,author:author||{name:'Rider',publicId:null},createdAt:p.createdAt}});
  }catch{return json({error:'This post could not be loaded.'},503)}
}

// Authors delete their own posts; admins can delete any.
export async function DELETE(request:Request,{params}:Ctx){
  const {id}=await params;const user=await getUser();if(!user)return json({error:'Sign in first.'},401);
  const req=await readJson(request,50);if('error' in req)return req.error;
  try{
    const [p]=await getDb().select({authorId:posts.authorId}).from(posts).where(eq(posts.id,id)).limit(1);
    if(!p)return json({error:'Post not found.'},404);
    if(p.authorId!==user.userId&&!isAdmin(user))return json({error:'You can only delete your own posts.'},403);
    await getDb().delete(posts).where(eq(posts.id,id));
    return json({deleted:true});
  }catch{return json({error:'The post was not deleted.'},503)}
}
