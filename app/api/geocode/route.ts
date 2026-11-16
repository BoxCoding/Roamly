import {inArray} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '../../../db';
import {geocodes} from '../../../db/schema';
import {getUser} from '../../auth';
import {json,publicOrigin,readJson} from '../../../lib/http';
export const dynamic='force-dynamic';

const input=z.object({places:z.array(z.string().trim().min(2).max(80)).min(1).max(30)}).strict();
const key=(q:string)=>q.toLowerCase().replace(/\s+/g,' ').trim();
// OpenStreetMap Nominatim allows about one request per second and asks apps to cache; every answer
// (including "not found") is stored, and lookups are spaced through one queue per server instance.
const PER_REQUEST=8,SPACING_MS=1100;
let queue:Promise<unknown>=Promise.resolve(),last=0;
function lookup(q:string,origin:string){
  const run=queue.then(async()=>{
    const wait=last+SPACING_MS-Date.now();if(wait>0)await new Promise(r=>setTimeout(r,wait));
    last=Date.now();
    const url='https://nominatim.openstreetmap.org/search?'+new URLSearchParams({q,format:'jsonv2',limit:'1',countrycodes:'in'});
    const r=await fetch(url,{headers:{'User-Agent':`Roamly/1.0 (+${origin})`,'Accept-Language':'en'},signal:AbortSignal.timeout(8000)});
    if(!r.ok)throw new Error('geocoder '+r.status);
    const [hit]=await r.json() as {lat:string,lon:string,display_name:string}[];
    return hit?{lat:Number(hit.lat),lng:Number(hit.lon),label:hit.display_name.slice(0,200)}:null;
  });
  queue=run.catch(()=>{});
  return run;
}

// Coordinates for place names (India). Returns {results:{name:{lat,lng}|null}, pending:[names to ask again]}.
export async function POST(request:Request){
  const user=await getUser();if(!user)return json({error:'Sign in to see maps.'},401);
  const req=await readJson(request,4000);if('error' in req)return req.error;
  const parsed=input.safeParse(req.body);if(!parsed.success)return json({error:'Send up to 30 place names.'},400);
  try{
    const db=getDb(),names=[...new Set(parsed.data.places)],keys=names.map(key);
    const cached=new Map((await db.select().from(geocodes).where(inArray(geocodes.query,keys))).map(g=>[g.query,g]));
    const results:Record<string,{lat:number,lng:number}|null>={},pending:string[]=[];let fetched=0;
    for(const name of names){
      const k=key(name),hit=cached.get(k);
      if(hit){results[name]=hit.lat==null?null:{lat:hit.lat,lng:hit.lng!};continue}
      if(fetched>=PER_REQUEST){pending.push(name);continue}
      fetched++;
      try{
        const g=await lookup(name,publicOrigin(request));
        await db.insert(geocodes).values({query:k,lat:g?.lat??null,lng:g?.lng??null,label:g?.label||'',createdAt:new Date().toISOString()}).onConflictDoNothing();
        results[name]=g?{lat:g.lat,lng:g.lng}:null;
      }catch{pending.push(name)}
    }
    return json({results,pending});
  }catch{return json({error:'Map locations could not be loaded.'},503)}
}
