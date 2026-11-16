import {and,eq} from 'drizzle-orm';
import {getDb} from '../../../../db';
import {accounts,crews,crewMembers,profiles} from '../../../../db/schema';
import {getUser} from '../../../auth';
import {withDefaults} from '../../../../lib/profile-schema.mjs';
import {PROFILE_LINKS,cleanLinks,profileCompleteness} from '../../../../public/domain.mjs';
import {json} from '../../../../lib/http';
export const dynamic='force-dynamic';

// A rider's public card, visible to signed-in riders only. Never includes email or account IDs.
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const user=await getUser();if(!user)return json({error:'Sign in to see rider profiles.'},401);
  const {id}=await params;if(!/^[a-f0-9]{12}$/.test(id))return json({error:'Rider not found.'},404);
  try{
    const db=getDb();
    const [account]=await db.select().from(accounts).where(eq(accounts.publicId,id)).limit(1);
    if(!account||account.status!=='active')return json({error:'Rider not found.'},404);
    const [[row],groups]=await Promise.all([
      db.select().from(profiles).where(eq(profiles.userId,account.userId)).limit(1),
      db.select({id:crews.id,name:crews.name,city:crews.city,role:crewMembers.role}).from(crewMembers).innerJoin(crews,eq(crews.id,crewMembers.crewId))
        .where(and(eq(crewMembers.userId,account.userId),eq(crewMembers.status,'active'),eq(crews.status,'active'),eq(crews.visibility,'public'))),
    ]);
    const p=withDefaults(row?JSON.parse(row.details):{});
    return json({rider:{publicId:account.publicId,name:account.name,memberSince:account.createdAt,isYou:account.userId===user.userId,
      homeCity:p.homeCity,experience:p.experience,bio:p.bio,ridingSince:p.ridingSince,styles:p.styles,pace:p.pace,lookingFor:p.lookingFor,regions:p.regions,languages:p.languages,
      links:cleanLinks(p.links||{},PROFILE_LINKS).links||{},vehicles:(p.vehicles||[]).map((v:{type:string,make:string,model:string,year:number})=>({type:v.type,make:v.make,model:v.model,year:v.year})),
      completeness:profileCompleteness(p),groups}});
  }catch{return json({error:'This profile could not be loaded.'},503)}
}
