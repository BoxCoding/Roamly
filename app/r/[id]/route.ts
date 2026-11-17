import {eq} from 'drizzle-orm';
import {getDb} from '../../../db';
import {crews,rides} from '../../../db/schema';
import {routeLabel} from '../../../lib/rides';
import {escHtml,htmlResponse,staticPage} from '../../../lib/static-page';
import {publicOrigin} from '../../../lib/http';
export const dynamic='force-dynamic';

// Share link for a ride: link-preview tags for chat apps, then straight into the app.
// Only open crews' rides show details; private ones get a generic card.
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params,origin=publicOrigin(request),target=`/#ride=${encodeURIComponent(id)}`;
  let title='A group ride on Roamly',description='Join riders planning their next road trip together.',image=`${origin}/app-icon-1024.png`;
  try{
    const [row]=/^[0-9a-f-]{36}$/.test(id)?await getDb().select({ride:rides,crew:{name:crews.name,visibility:crews.visibility,status:crews.status}}).from(rides).innerJoin(crews,eq(crews.id,rides.crewId)).where(eq(rides.id,id)).limit(1):[];
    if(row&&row.crew.visibility==='public'&&row.crew.status==='active'){
      const r=row.ride,date=new Date(r.startDate+'T00:00:00Z').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
      title=`${r.status==='cancelled'?'Cancelled: ':''}${r.title} · ${date}`;
      // The cover is our upload, a catalog photo (relative URLs) or a Commons image (absolute).
      try{const c=r.cover&&JSON.parse(r.cover).url;if(c)image=/^https:/.test(c)?c:`${origin}/${c.replace(/^\//,'')}`}catch{}
      description=`${row.crew.name} · ${routeLabel(r.routeId,r.route)} · ${r.days} day${r.days>1?'s':''} · meetup ${r.meetupPoint} at ${r.meetupTime} · ${r.capacity} seats`;
    }
  }catch{}
  return htmlResponse(staticPage({title,description,url:`${origin}/r/${id}`,image,head:`<meta http-equiv="refresh" content="0;url=${escHtml(target)}">`},
    `<h1>${escHtml(title)}</h1><p>${escHtml(description)}</p><p><a class="button" href="${escHtml(target)}">Open in Roamly</a></p><script>location.replace(${JSON.stringify(target)})</script>`),'public, max-age=300');
}
