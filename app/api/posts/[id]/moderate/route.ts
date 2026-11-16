import {eq} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '../../../../../db';
import {postReports,posts} from '../../../../../db/schema';
import {getUser,isAdmin} from '../../../../auth';
import {json,readJson} from '../../../../../lib/http';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};

// Admins: restore (active, reports cleared) or remove (hidden for everyone, kept for the record).
export async function POST(request:Request,{params}:Ctx){
  const {id}=await params;const user=await getUser();if(!isAdmin(user))return json({error:'Admins only.'},403);
  const req=await readJson(request,100);if('error' in req)return req.error;
  const parsed=z.object({action:z.enum(['restore','remove'])}).strict().safeParse(req.body);if(!parsed.success)return json({error:'Invalid action.'},400);
  try{
    await getDb().transaction(async tx=>{
      const done=await tx.update(posts).set({status:parsed.data.action==='restore'?'active':'removed'}).where(eq(posts.id,id)).returning({id:posts.id});
      if(!done.length)throw new Error('missing');
      await tx.delete(postReports).where(eq(postReports.postId,id));
    });
    return json({id,action:parsed.data.action});
  }catch{return json({error:'That post could not be updated.'},404)}
}
