import {and,eq} from 'drizzle-orm';
import {getDb} from '../../../db';
import {accounts,crews,follows} from '../../../db/schema';
import {getUser} from '../../auth';
import {followInput} from '../../../lib/feed-schema.mjs';
import {notify} from '../../../lib/notify';
import {json,readJson} from '../../../lib/http';
export const dynamic='force-dynamic';

// Follow or unfollow a rider (by public ID) or an open crew.
export async function POST(request:Request){
  const user=await getUser();if(!user)return json({error:'Sign in to follow.'},401);
  const req=await readJson(request,200);if('error' in req)return req.error;
  const parsed=followInput.safeParse(req.body);if(!parsed.success)return json({error:'Invalid follow.'},400);
  const {type,id,follow}=parsed.data;
  try{
    const db=getDb();let targetId=id;
    if(type==='rider'){
      const [a]=await db.select({userId:accounts.userId,status:accounts.status}).from(accounts).where(eq(accounts.publicId,id)).limit(1);
      if(!a||a.status!=='active')return json({error:'Rider not found.'},404);
      if(a.userId===user.userId)return json({error:'You cannot follow yourself.'},400);
      targetId=a.userId;
    }else{
      const [c]=await db.select({visibility:crews.visibility}).from(crews).where(and(eq(crews.id,id),eq(crews.status,'active'))).limit(1);
      if(!c)return json({error:'Crew not found.'},404);
      if(follow&&c.visibility!=='public')return json({error:'Private crews can be joined, not followed.'},400);
    }
    const key=and(eq(follows.followerId,user.userId),eq(follows.targetType,type),eq(follows.targetId,targetId));
    if(follow){
      const added=await db.insert(follows).values({followerId:user.userId,targetType:type,targetId,createdAt:new Date().toISOString()}).onConflictDoNothing().returning({id:follows.targetId});
      if(added.length&&type==='rider')await notify([targetId],{kind:'follow',text:`${user.displayName} started following you`,link:`#rider=${user.publicId}`},user.userId);
    }else await db.delete(follows).where(key);
    return json({following:follow});
  }catch{return json({error:'That was not saved. Please try again.'},503)}
}
