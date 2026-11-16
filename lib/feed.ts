import {and,count,eq,inArray,isNull,or,type SQL} from 'drizzle-orm';
import {getDb} from '../db';
import {crews,crewMembers,follows,posts,rides,rideRsvps} from '../db/schema';
import {endDate} from './ride-schema.mjs';
import {badgesFor} from './feed-schema.mjs';

/** Crew IDs the viewer is an active member of. */
export async function myCrewIds(userId?:string){
  if(!userId)return [];
  return (await getDb().select({id:crewMembers.crewId}).from(crewMembers).where(and(eq(crewMembers.userId,userId),eq(crewMembers.status,'active')))).map(r=>r.id);
}
/** Posts the viewer may read: active, and either crew-less or in an active crew that is open or theirs. Use with a left join on crews. */
export function visiblePosts(mine:string[],admin=false):SQL{
  const crewOk=or(isNull(posts.crewId),and(eq(crews.status,'active'),or(eq(crews.visibility,'public'),mine.length?inArray(posts.crewId,mine):undefined)));
  return admin?and(eq(posts.status,'active'))!:and(eq(posts.status,'active'),crewOk)!;
}

/** Real activity behind badges: finished, non-cancelled rides the rider was going on. */
export async function riderStats(userId:string){
  const db=getDb(),today=new Date().toISOString().slice(0,10);
  const [going,led,[reports],[postCount],[followers],[following]]=await Promise.all([
    db.select({startDate:rides.startDate,days:rides.days,km:rides.distanceKm,status:rides.status}).from(rideRsvps).innerJoin(rides,eq(rides.id,rideRsvps.rideId)).where(and(eq(rideRsvps.userId,userId),eq(rideRsvps.status,'going'))),
    db.select({startDate:rides.startDate,days:rides.days,status:rides.status}).from(rides).where(eq(rides.leadId,userId)),
    db.select({n:count()}).from(posts).where(and(eq(posts.authorId,userId),eq(posts.kind,'report'),eq(posts.status,'active'))),
    db.select({n:count()}).from(posts).where(and(eq(posts.authorId,userId),eq(posts.status,'active'))),
    db.select({n:count()}).from(follows).where(and(eq(follows.targetType,'rider'),eq(follows.targetId,userId))),
    db.select({n:count()}).from(follows).where(eq(follows.followerId,userId)),
  ]);
  const done=(r:{startDate:string,days:number,status:string})=>r.status!=='cancelled'&&endDate(r.startDate,r.days)<today;
  const finished=going.filter(done);
  const stats={rides:finished.length,km:finished.reduce((n,r)=>n+r.km,0),longestDays:Math.max(0,...finished.map(r=>r.days)),reports:reports.n,ledRides:led.filter(done).length,posts:postCount.n,followers:followers.n,following:following.n};
  return {...stats,badges:badgesFor(stats)};
}

/** Top riders of a crew by finished rides, then km. */
export async function crewLeaderboard(crewId:string){
  const today=new Date().toISOString().slice(0,10);
  const rows=await getDb().select({userId:rideRsvps.userId,startDate:rides.startDate,days:rides.days,km:rides.distanceKm,status:rides.status})
    .from(rideRsvps).innerJoin(rides,eq(rides.id,rideRsvps.rideId)).where(and(eq(rides.crewId,crewId),eq(rideRsvps.status,'going')));
  const tally=new Map<string,{rides:number,km:number}>();
  for(const r of rows)if(r.status!=='cancelled'&&endDate(r.startDate,r.days)<today){const t=tally.get(r.userId)||{rides:0,km:0};t.rides++;t.km+=r.km;tally.set(r.userId,t)}
  return [...tally].map(([userId,t])=>({userId,...t})).sort((a,b)=>b.rides-a.rides||b.km-a.km).slice(0,10);
}

/** A post with its crew, and whether the viewer may read it. */
export async function postAccess(id:string,userId:string|undefined,admin:boolean){
  const [row]=await getDb().select({post:posts,crew:{status:crews.status,visibility:crews.visibility}}).from(posts).leftJoin(crews,eq(crews.id,posts.crewId)).where(eq(posts.id,id)).limit(1);
  if(!row)return null;
  const mine=row.post.crewId?await myCrewIds(userId):[];
  const crewOk=!row.post.crewId||(row.crew?.status==='active'&&(row.crew.visibility==='public'||mine.includes(row.post.crewId)));
  return {...row,canSee:admin||(row.post.status==='active'&&crewOk)};
}
