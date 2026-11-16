import {publicOrigin} from '../../lib/http';
export const dynamic='force-dynamic';
export function GET(request:Request){
  return new Response(`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${publicOrigin(request)}/sitemap.xml\n`,{headers:{'Content-Type':'text/plain','Cache-Control':'public, max-age=3600'}});
}
