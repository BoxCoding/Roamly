import {and,desc,eq,inArray,ne,or} from 'drizzle-orm';
import {getDb} from '../../../db';
import {crews,crewReports} from '../../../db/schema';
import {getUser,isAdmin} from '../../auth';
import {moderationInput} from '../../../lib/crew-schema.mjs';
import {json,readJson} from '../../../lib/http';
export const dynamic='force-dynamic';

const admin=async()=>{const user=await getUser();return isAdmin(user)?user:null};

// Queue: hidden crews and active crews with open reports. Reporter identities are not shown.
export async function GET(){
  if(!await admin())return json({error:'Moderators only.'},403);
  try{
    const db=getDb(),reports=await db.select().from(crewReports).orderBy(desc(crewReports.createdAt));
    const reportedIds=[...new Set(reports.map(r=>r.crewId))];
    const rows=await db.select().from(crews).where(and(ne(crews.status,'removed'),reportedIds.length?or(eq(crews.status,'hidden'),inArray(crews.id,reportedIds)):eq(crews.status,'hidden')));
    return json({queue:rows.map(c=>({id:c.id,name:c.name,city:c.city,description:c.description,links:JSON.parse(c.links),organizer:c.organizerName,status:c.status,reports:reports.filter(r=>r.crewId===c.id).map(r=>({reason:r.reason,note:r.note,createdAt:r.createdAt}))}))});
  }catch{return json({error:'The moderation queue could not be loaded.'},503)}
}

// restore: back to active and reports cleared. remove: hidden from everyone, kept for the record.
export async function POST(request:Request){
  if(!await admin())return json({error:'Moderators only.'},403);
  const req=await readJson(request,500);if('error' in req)return req.error;
  const parsed=moderationInput.safeParse(req.body);if(!parsed.success)return json({error:'Invalid action.'},400);
  try{
    const {id,action}=parsed.data;
    await getDb().transaction(async tx=>{
      const done=await tx.update(crews).set({status:action==='restore'?'active':'removed'}).where(eq(crews.id,id)).returning({id:crews.id});
      if(!done.length)throw new Error('missing');
      await tx.delete(crewReports).where(eq(crewReports.crewId,id));
    });
    return json({id,action});
  }catch{return json({error:'That group could not be updated.'},404)}
}
