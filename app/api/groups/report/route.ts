import {and,count,eq,ne} from 'drizzle-orm';
import {getDb} from '../../../../db';
import {crews,crewReports} from '../../../../db/schema';
import {getUser} from '../../../auth';
import {reportInput,HIDE_AFTER_REPORTS} from '../../../../lib/crew-schema.mjs';
import {json,readJson} from '../../../../lib/http';
export const dynamic='force-dynamic';

// Report a crew. Enough distinct reports hide it until a moderator reviews it.
export async function POST(request:Request){
  const user=await getUser();if(!user)return json({error:'Sign in to report a group.'},401);
  const req=await readJson(request,1000);if('error' in req)return req.error;
  const parsed=reportInput.safeParse(req.body);if(!parsed.success)return json({error:'Choose a reason (and keep the note under 300 characters).'},400);
  try{
    const db=getDb(),{id,reason,note}=parsed.data;
    const [crew]=await db.select({organizerId:crews.organizerId}).from(crews).where(and(eq(crews.id,id),ne(crews.status,'removed'))).limit(1);
    if(!crew)return json({error:'This group is not available.'},404);
    if(crew.organizerId===user.userId)return json({error:'You cannot report your own group.'},400);
    await db.insert(crewReports).values({crewId:id,reporterId:user.userId,reason,note,createdAt:new Date().toISOString()}).onConflictDoNothing();
    const [{reports}]=await db.select({reports:count()}).from(crewReports).where(eq(crewReports.crewId,id));
    if(reports>=HIDE_AFTER_REPORTS)await db.update(crews).set({status:'hidden'}).where(and(eq(crews.id,id),eq(crews.status,'active')));
    return json({id,reported:true});
  }catch{return json({error:'Your report was not sent. Please try again.'},503)}
}
