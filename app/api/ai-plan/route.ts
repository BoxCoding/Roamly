import { env } from '../../../lib/env';
import {sql} from 'drizzle-orm';
import {getDb} from '../../../db';
import {aiQuota} from '../../../db/schema';
import {getUser} from '../../auth';
import {planRequest,validateAIPlan,geminiText} from '../../../lib/ai-plan.mjs';
import {AGENTS,agentBody,parseAgent,checkRoad,checkDays} from '../../../lib/agents.mjs';
import {getRoute} from '../../../lib/routes';
import {estimate} from '../../../public/domain.mjs';
import {json,readJson} from '../../../lib/http';
import {track} from '../../../lib/track';
export const dynamic='force-dynamic';
const model=()=>env.GEMINI_MODEL||'gemini-3.1-flash-lite';
type AgentName=keyof typeof AGENTS;

async function runAgent(name:AgentName,facts:unknown,custom:boolean){
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model())}:generateContent`,{method:'POST',headers:{'x-goog-api-key':env.GEMINI_API_KEY!,'Content-Type':'application/json'},signal:AbortSignal.timeout(40000),body:agentBody(name,facts,custom)});
  if(!response.ok)throw new Error(`${name} agent: provider error ${response.status}`);
  return parseAgent(name,JSON.parse(geminiText(await response.json())),custom);
}

export async function GET(){return json({available:Boolean(env.GEMINI_API_KEY),agents:Object.values(AGENTS).map(a=>a.label)})}
export async function POST(request:Request){
  const user=await getUser();if(!user)return json({error:'Sign in to get the AI expert plan.'},401);
  if(!env.GEMINI_API_KEY)return json({error:'Live AI is not configured. Curated route suggestions are available below.'},503);
  const req=await readJson(request,8000);if('error' in req)return req.error;
  const parsed=planRequest.safeParse(req.body);if(!parsed.success)return json({error:'Choose a route, 1–30 days, month, vehicle, distance, stay and up to 30 travelers. Preferences must be under 500 characters.'},400);
  const data=parsed.data,custom=data.routeId==='custom';
  if(custom!==Boolean(data.custom))return json({error:'Enter where the custom route starts and ends.'},400);
  const trip=custom?null:await getRoute(data.routeId);if(!custom&&!trip)return json({error:'Route not found.'},404);
  let baseline;try{baseline=estimate(data)}catch(error){return json({error:(error as Error).message},400)}
  const day=new Date().toISOString().slice(0,10);
  const quota=await getDb().insert(aiQuota).values({userId:user.userId,day,calls:1}).onConflictDoUpdate({target:aiQuota.userId,set:{day,calls:sql`CASE WHEN ${aiQuota.day} = ${day} THEN ${aiQuota.calls} + 1 ELSE 1 END`},setWhere:sql`${aiQuota.day} != ${day} OR ${aiQuota.calls} < 10`}).returning();
  if(!quota.length)return json({error:'Daily AI limit reached (10 expert plans). Curated suggestions are still available.'},429);
  const {preferences,...rest}=data;
  const facts={request:{...rest,month:new Date(2000,data.month).toLocaleString('en',{month:'long'})},travellerPreferences:preferences,route:trip??{userDefinedRoute:data.custom},baselineBudgetINR:baseline};
  // One quota unit runs all specialists in parallel; a failed agent leaves its section curated.
  const names=Object.keys(AGENTS) as AgentName[];
  const results=await Promise.allSettled(names.map(name=>runAgent(name,facts,custom).then(out=>
    name==='itinerary'?(trip?validateAIPlan(out,trip,data.days):checkDays(out as Parameters<typeof checkDays>[0],data.days)):name==='road'?checkRoad(out as Parameters<typeof checkRoad>[0],data.days):out)));
  const agents=Object.fromEntries(names.flatMap((name,i)=>results[i].status==='fulfilled'?[[name,(results[i] as PromiseFulfilledResult<unknown>).value]]:[]));
  const failed=names.filter(name=>!(name in agents)).map(name=>AGENTS[name].label);
  if(!names.some(name=>name in agents))return json({error:'The AI experts are unavailable right now. Your curated plan is still below.'},502);
  await track('plan_built',user.userId,{custom});
  return json({source:'ai',baseline,agents,failed});
}
