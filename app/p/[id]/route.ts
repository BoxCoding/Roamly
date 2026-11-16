import {eq} from 'drizzle-orm';
import {getDb} from '../../../db';
import {accounts,crews,posts} from '../../../db/schema';
import {escHtml,htmlResponse,staticPage} from '../../../lib/static-page';
import {publicOrigin} from '../../../lib/http';
export const dynamic='force-dynamic';

// Share link for a post or road report. Crew-only and hidden posts get a generic card.
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params,origin=publicOrigin(request),target=`/#post=${encodeURIComponent(id)}`;
  let title='A rider post on Roamly',description='Road intel and ride stories from riders across India.',image=`${origin}/app-icon-1024.png`;
  try{
    const [row]=/^[0-9a-f-]{36}$/.test(id)?await getDb().select({post:posts,name:accounts.name,crewVisibility:crews.visibility}).from(posts).leftJoin(accounts,eq(accounts.userId,posts.authorId)).leftJoin(crews,eq(crews.id,posts.crewId)).where(eq(posts.id,id)).limit(1):[];
    if(row&&row.post.status==='active'&&(!row.post.crewId||row.crewVisibility==='public')){
      const p=row.post;title=p.kind==='report'?`Road report: ${p.place} (${p.condition})`:`${row.name||'A rider'} on Roamly`;
      description=p.body.slice(0,180);const [photo]=JSON.parse(p.photos);if(photo)image=`${origin}/api/photos/${photo}`;
    }
  }catch{}
  return htmlResponse(staticPage({title,description,url:`${origin}/p/${id}`,image,head:`<meta http-equiv="refresh" content="0;url=${escHtml(target)}">`},
    `<h1>${escHtml(title)}</h1><p>${escHtml(description)}</p><p><a class="button" href="${escHtml(target)}">Open in Roamly</a></p><script>location.replace(${JSON.stringify(target)})</script>`),'public, max-age=300');
}
