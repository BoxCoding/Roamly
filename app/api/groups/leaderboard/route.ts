import {and,eq,inArray} from 'drizzle-orm';
import {getDb} from '../../../../db';
import {accounts,crewMembers} from '../../../../db/schema';
import {getUser,isAdmin} from '../../../auth';
import {crewLeaderboard} from '../../../../lib/feed';
import {json} from '../../../../lib/http';
export const dynamic='force-dynamic';

// Top riders of a crew by finished rides and km. Members only.
export async function GET(request:Request){
  const user=await getUser();if(!user)return json({error:'Sign in first.'},401);
  const id=new URL(request.url).searchParams.get('id')||'';if(!/^[0-9a-f-]{36}$/.test(id))return json({error:'Invalid crew.'},400);
  try{
    const db=getDb(),[m]=await db.select().from(crewMembers).where(and(eq(crewMembers.crewId,id),eq(crewMembers.userId,user.userId),eq(crewMembers.status,'active'))).limit(1);
    if(!m&&!isAdmin(user))return json({error:'Members only.'},403);
    const board=await crewLeaderboard(id),names=board.length?await db.select({userId:accounts.userId,name:accounts.name,publicId:accounts.publicId}).from(accounts).where(inArray(accounts.userId,board.map(b=>b.userId))):[];
    return json({leaders:board.map(b=>{const a=names.find(n=>n.userId===b.userId);return {name:a?.name||'Rider',publicId:a?.publicId||null,rides:b.rides,km:b.km}})});
  }catch{return json({error:'The leaderboard could not be loaded.'},503)}
}
