import {getDb} from '../db';
import {notifications} from '../db/schema';

type Db=ReturnType<typeof getDb>;
type Tx=Parameters<Parameters<Db['transaction']>[0]>[0];

/** In-app notifications for several riders at once. The actor never notifies themselves. Never throws: a lost notice must not fail the action. */
export async function notify(userIds:Iterable<string>,n:{kind:string,text:string,link?:string},actorId?:string,db:Db|Tx=getDb()){
  const to=[...new Set(userIds)].filter(id=>id&&id!==actorId).slice(0,500);
  if(!to.length)return;
  const now=new Date().toISOString(),text=n.text.slice(0,200);
  try{await db.insert(notifications).values(to.map(userId=>({id:crypto.randomUUID(),userId,kind:n.kind,text,link:n.link||'',createdAt:now})))}catch{}
}
