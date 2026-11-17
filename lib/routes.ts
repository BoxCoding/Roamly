import {asc,eq} from 'drizzle-orm';
import {getDb} from '../db';
import {routes} from '../db/schema';
import {trips} from '../public/catalog.mjs';

export type Trip=(typeof trips)[number];
type Row={route:Trip,status:string};

// Routes change rarely, so each server instance keeps them for a minute; admin edits clear it at once.
let cache:{at:number,rows:Row[]}|null=null;
export const invalidateRoutes=()=>{cache=null};
async function all(){
  if(cache&&Date.now()-cache.at<60_000)return cache.rows;
  const rows=(await getDb().select().from(routes).orderBy(asc(routes.sortOrder),asc(routes.createdAt))).map(r=>({route:JSON.parse(r.data) as Trip,status:r.status}));
  cache={at:Date.now(),rows};
  return rows;
}
/** Active routes for Discover, the planner and route pages; admins can ask for hidden ones too. */
export async function getRoutes(includeHidden=false){return (await all()).filter(r=>includeHidden||r.status==='active').map(r=>includeHidden?{...r.route,status:r.status}:r.route)}
/** One route by ID (hidden ones included: rides and plans that already use a hidden route keep working). */
export async function getRoute(id:string){return (await all()).find(r=>r.route.id===id)?.route}

/** First start (and new catalog entries): copy public/catalog.mjs into the table. Existing rows, and admin edits, are kept. */
export async function seedRoutes(){
  const db=getDb(),now=new Date().toISOString();
  await db.insert(routes).values(trips.map((t,i)=>({id:t.id,data:JSON.stringify(t),sortOrder:i,createdAt:now,updatedAt:now}))).onConflictDoNothing();
  // Seeded rows that still hotlink the same Wikimedia photo switch to our stored copy; covers an admin changed are left alone.
  for(const row of await db.select().from(routes)){
    const t=trips.find(x=>x.id===row.id),d=JSON.parse(row.data);
    if(t&&/wikimedia\.org/.test(d.cover?.url||'')&&d.cover.page===t.cover.page&&d.cover.url!==t.cover.url)
      await db.update(routes).set({data:JSON.stringify({...d,cover:t.cover}),updatedAt:now}).where(eq(routes.id,row.id));
  }
}
