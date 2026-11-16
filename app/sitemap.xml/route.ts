import {trips} from '../../public/catalog.mjs';
import {publicOrigin} from '../../lib/http';
export const dynamic='force-dynamic';
export function GET(request:Request){
  const o=publicOrigin(request),urls=['/','/routes',...trips.map(t=>`/routes/${t.id}`),'/guidelines','/terms','/privacy'];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${o}${u}</loc></url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml','Cache-Control':'public, max-age=3600'}});
}
