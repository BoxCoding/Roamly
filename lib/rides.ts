import {and,asc,count,eq,inArray} from 'drizzle-orm';
import {getDb} from '../db';
import {crews,crewMembers,rides,rideRsvps} from '../db/schema';
import {isAdmin,type Rider} from '../app/auth';
import {notify} from './notify';

type Db=ReturnType<typeof getDb>;
type Tx=Parameters<Parameters<Db['transaction']>[0]>[0];

/** What the viewer may do with a ride. canSee covers listing and reading; canManage is crew owner/co-lead, the ride lead, or an admin. */
export async function rideAccess(rideId:string,user:Rider|null){
  const db=getDb();
  const [row]=await db.select({ride:rides,crew:crews}).from(rides).innerJoin(crews,eq(crews.id,rides.crewId)).where(eq(rides.id,rideId)).limit(1);
  if(!row)return null;
  const [m]=user?await db.select().from(crewMembers).where(and(eq(crewMembers.crewId,row.crew.id),eq(crewMembers.userId,user.userId))).limit(1):[];
  const admin=isAdmin(user),member=m?.status==='active';
  const canSee=admin||(row.crew.status==='active'&&(row.crew.visibility==='public'||member));
  const lead=member&&(m!.role==='owner'||m!.role==='colead');
  return {...row,member,admin,canSee,canManage:Boolean(user)&&(admin||lead||(member&&row.ride.leadId===user!.userId)),role:member?m!.role:null};
}

/** Fill free seats from the waitlist, oldest request first. Call inside the transaction that freed the seat. */
export async function promoteWaitlist(tx:Tx,rideId:string,capacity:number){
  const [{going}]=await tx.select({going:count()}).from(rideRsvps).where(and(eq(rideRsvps.rideId,rideId),eq(rideRsvps.status,'going')));
  const free=capacity-going;
  if(free<=0)return;
  const next=await tx.select({userId:rideRsvps.userId}).from(rideRsvps).where(and(eq(rideRsvps.rideId,rideId),eq(rideRsvps.status,'waitlist'))).orderBy(asc(rideRsvps.createdAt)).limit(free);
  for(const n of next)await tx.update(rideRsvps).set({status:'going'}).where(and(eq(rideRsvps.rideId,rideId),eq(rideRsvps.userId,n.userId)));
  if(next.length){const [r]=await tx.select({title:rides.title}).from(rides).where(eq(rides.id,rideId));await notify(next.map(n=>n.userId),{kind:'ride',text:`A seat opened up: you are now going on ${r?.title||'the ride'}`,link:`#ride=${rideId}`},undefined,tx)}
}

/** Human route label: the catalog route line, or From → via → To. */
export const routeLabel=(routeId:string,route:string)=>{try{const r=JSON.parse(route);return routeId==='custom'?[r.from,...(r.via||[]),r.to].join(' → '):r.route||r.title||''}catch{return ''}};

/** A rider leaving or removed from a crew loses their RSVPs on its rides; freed seats go to the waitlist. */
export async function dropFromCrewRides(tx:Tx,crewId:string,userId:string){
  const crewRides=await tx.select({id:rides.id,capacity:rides.capacity}).from(rides).where(eq(rides.crewId,crewId));
  if(!crewRides.length)return;
  const dropped=await tx.delete(rideRsvps).where(and(eq(rideRsvps.userId,userId),inArray(rideRsvps.rideId,crewRides.map(r=>r.id)))).returning({rideId:rideRsvps.rideId,status:rideRsvps.status});
  for(const d of dropped)if(d.status==='going')await promoteWaitlist(tx,d.rideId,crewRides.find(r=>r.id===d.rideId)!.capacity);
}
