import {and,count,eq} from 'drizzle-orm';
import {getDb} from '../../../../../db';
import {postReports,posts} from '../../../../../db/schema';
import {getUser,isAdmin} from '../../../../auth';
import {HIDE_POST_AFTER,postReportInput} from '../../../../../lib/feed-schema.mjs';
import {postAccess} from '../../../../../lib/feed';
import {json,readJson} from '../../../../../lib/http';
import {aiReview} from '../../../../../lib/ai-moderation';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};

// One report per rider; enough distinct reports hide the post until an admin reviews it.
export async function POST(request:Request,{params}:Ctx){
  const {id}=await params;const user=await getUser();if(!user)return json({error:'Sign in to report.'},401);
  const req=await readJson(request,200);if('error' in req)return req.error;
  const parsed=postReportInput.safeParse(req.body);if(!parsed.success)return json({error:'Choose a reason.'},400);
  try{
    const a=await postAccess(id,user.userId,isAdmin(user));if(!a?.canSee)return json({error:'Post not found.'},404);
    if(a.post.authorId===user.userId)return json({error:'You cannot report your own post.'},400);
    const db=getDb();
    await db.insert(postReports).values({postId:id,reporterId:user.userId,reason:parsed.data.reason,createdAt:new Date().toISOString()}).onConflictDoNothing();
    const [{n}]=await db.select({n:count()}).from(postReports).where(eq(postReports.postId,id));
    // The first report asks the AI once; confident violations are hidden straight away for admins to review.
    if(n===1)await aiReview(id,a.post.body);
    if(n>=HIDE_POST_AFTER)await db.update(posts).set({status:'hidden'}).where(and(eq(posts.id,id),eq(posts.status,'active')));
    return json({reported:true});
  }catch{return json({error:'Your report was not sent.'},503)}
}
