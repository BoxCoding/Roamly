import {count,eq} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '../../../db';
import {routes} from '../../../db/schema';
import {getUser,isAdmin} from '../../auth';
import {routeInput,toRoute} from '../../../lib/route-schema.mjs';
import {coverAllowed} from '../../../lib/ride-media';
import {getRoutes,invalidateRoutes} from '../../../lib/routes';
import {json,readJson} from '../../../lib/http';
export const dynamic='force-dynamic';

// Public list of active routes. ?all=1 (admins) adds hidden routes with their status.
export async function GET(request:Request){
  try{
    const all=new URL(request.url).searchParams.get('all')==='1';
    if(all&&!isAdmin(await getUser()))return json({error:'Admins only.'},403);
    return Response.json({routes:await getRoutes(all)},{headers:{'Cache-Control':all?'private, no-store':'public, max-age=60'}});
  }catch{return json({error:'Routes could not be loaded.'},503)}
}

async function save(request:Request,mode:'create'|'update'){
  const user=await getUser();if(!isAdmin(user))return json({error:'Admins only.'},403);
  const req=await readJson(request,30000);if('error' in req)return req.error;
  const parsed=routeInput.safeParse(req.body);if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Check the route.'},400);
  try{
    const db=getDb(),r=parsed.data,[existing]=await db.select().from(routes).where(eq(routes.id,r.id)).limit(1);
    if(mode==='create'&&existing)return json({error:'A route with this ID already exists.'},409);
    if(mode==='update'&&!existing)return json({error:'Route not found.'},404);
    // An uploaded cover must be this admin's own upload (or the route's current cover).
    if(!await coverAllowed(r.cover,user!.userId,existing?JSON.stringify(JSON.parse(existing.data).cover):null))return json({error:'Upload the cover photo again.'},400);
    const now=new Date().toISOString(),data=JSON.stringify(toRoute(r));
    if(existing)await db.update(routes).set({data,updatedAt:now}).where(eq(routes.id,r.id));
    else{const [{n}]=await db.select({n:count()}).from(routes);await db.insert(routes).values({id:r.id,data,sortOrder:n,createdBy:user!.userId,createdAt:now,updatedAt:now})}
    invalidateRoutes();
    return json({id:r.id},existing?200:201);
  }catch{return json({error:'The route was not saved. Please try again.'},503)}
}
export const POST=(request:Request)=>save(request,'create');
export const PUT=(request:Request)=>save(request,'update');

// Hide or show a route. Hidden routes leave Discover and the planner; rides and plans that use one keep working.
export async function PATCH(request:Request){
  const user=await getUser();if(!isAdmin(user))return json({error:'Admins only.'},403);
  const req=await readJson(request,200);if('error' in req)return req.error;
  const parsed=z.object({id:z.string().max(40),status:z.enum(['active','hidden'])}).strict().safeParse(req.body);if(!parsed.success)return json({error:'Invalid request.'},400);
  try{
    const done=await getDb().update(routes).set({status:parsed.data.status,updatedAt:new Date().toISOString()}).where(eq(routes.id,parsed.data.id)).returning({id:routes.id});
    invalidateRoutes();
    return done.length?json(parsed.data):json({error:'Route not found.'},404);
  }catch{return json({error:'Not saved. Please try again.'},503)}
}
