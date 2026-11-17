import {and,desc,eq,gte,isNull} from 'drizzle-orm';
import {getDb} from '../../../db';
import {posts} from '../../../db/schema';
import {getRoutes} from '../../../lib/routes';
import {tripPrice} from '../../../public/domain.mjs';
import {escHtml,htmlResponse,staticPage} from '../../../lib/static-page';
import {publicOrigin} from '../../../lib/http';
export const dynamic='force-dynamic';

const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const money=(n:number)=>'₹'+Math.round(n).toLocaleString('en-IN');

// A crawlable guide for one catalog route, with the latest public road reports.
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params,t=(await getRoutes().catch(()=>[])).find(x=>x.id===id),origin=publicOrigin(request);
  if(!t)return htmlResponse(staticPage({title:'Route not found · Roamly',description:'This route is not in the Roamly catalog.'},'<h1>Route not found</h1><p><a href="/routes">See all routes</a></p>'),'no-store',404);
  let intel:{place:string,condition:string,body:string,createdAt:string}[]=[];
  try{intel=await getDb().select({place:posts.place,condition:posts.condition,body:posts.body,createdAt:posts.createdAt}).from(posts)
    .where(and(eq(posts.routeId,id),eq(posts.kind,'report'),eq(posts.status,'active'),isNull(posts.crewId),gte(posts.createdAt,new Date(Date.now()-30*86400000).toISOString()))).orderBy(desc(posts.createdAt)).limit(5)}catch{}
  const title=`${t.title}: ${t.route} road trip · Roamly`;
  const description=`${t.days}-day ${t.vehicle.toLowerCase()} trip, ~${t.km} km through ${t.location}. Best in ${t.months.map((m:number)=>MONTHS[m]).join(', ')}. Places, stays, stops and a budget from ${money(tripPrice(t))} per person.`;
  return htmlResponse(staticPage({title,description,url:`${origin}/routes/${id}`,image:/^https:/.test(t.cover.url)?t.cover.url:`${origin}/${t.cover.url.replace(/^\//,'')}`},
  `<h1>${escHtml(t.title)}</h1><p><strong>${escHtml(t.route)}</strong> · ${escHtml(t.location)} · ${t.days} days · ~${t.km} km · ${t.vehicle} · ${escHtml(t.level)}</p>
  <img src="${escHtml(t.cover.url)}" alt="${escHtml(t.title)}" style="width:100%;border-radius:10px;aspect-ratio:16/9;object-fit:cover">${t.cover.credit?`<p style="font-size:12px">${t.cover.page?`<a href="${escHtml(t.cover.page)}" rel="noopener">${escHtml(t.cover.credit)}</a>`:escHtml(t.cover.credit)}</p>`:''}
  <p>${escHtml(t.desc)}</p><p><a class="button" href="/#plan=${t.id}">Plan this route in Roamly</a></p>
  <h2>When to go</h2><p>${t.months.map((m:number)=>MONTHS[m]).join(', ')}. ${escHtml(t.risk)}</p>
  <h2>Places to see</h2><ul>${t.places.map((p:{name:string,minutes:number})=>`<li>${escHtml(p.name)} · about ${p.minutes} min</li>`).join('')}</ul>
  <h2>Where to stay</h2><ul>${t.stays.map((s:{area:string,type:string,min:number,max:number})=>`<li>${escHtml(s.area)} · ${escHtml(s.type)} · ${money(s.min)}–${money(s.max)} a night (typical range)</li>`).join('')}</ul>
  <h2>Food, fuel and rest stops</h2><ul>${t.stops.map((s:{name:string})=>`<li>${escHtml(s.name)}</li>`).join('')}</ul>
  <h2>Budget</h2><p>From about <strong>${money(tripPrice(t))} per person</strong> for two travellers with comfort stays: fuel, stays, food, tolls and a 15% buffer. Estimates, not quotes.</p>
  <h2>Road intel from riders · last 30 days</h2>${intel.length?`<ul>${intel.map(r=>`<li><strong>${escHtml(r.place)}</strong> (${escHtml(r.condition)}, ${escHtml(r.createdAt.slice(0,10))}): ${escHtml(r.body.slice(0,200))}</li>`).join('')}</ul>`:'<p>No recent rider reports. Riding it soon? Share what you find.</p>'}
  ${t.source?`<p><a href="${escHtml(t.source)}" rel="noopener">Tourism reference</a></p>`:''}`),'public, max-age=900');
}
