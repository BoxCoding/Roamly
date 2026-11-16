// Shared shell for plain server-rendered pages (policies, route guides, share previews).
export const escHtml=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
type Meta={title:string,description:string,url?:string,image?:string,head?:string};
export function staticPage({title,description,url,image='/app-icon-1024.png',head=''}:Meta,body:string){
  return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(title)}</title><meta name="description" content="${escHtml(description)}">
<meta property="og:site_name" content="Roamly"><meta property="og:title" content="${escHtml(title)}"><meta property="og:description" content="${escHtml(description)}">
<meta property="og:image" content="${escHtml(image)}">${url?`<meta property="og:url" content="${escHtml(url)}"><link rel="canonical" href="${escHtml(url)}">`:''}<meta name="twitter:card" content="summary">
<link rel="icon" href="/favicon.svg"><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#244d3d">${head}
<style>
:root{--paper:#fbfaf6;--ink:#1f2a22;--muted:#5f6b5c;--accent:#244d3d;--line:#e3e6dd}
@media (prefers-color-scheme:dark){:root{--paper:#141a16;--ink:#e8ece4;--muted:#a3ad9d;--accent:#8fc4a8;--line:#2c352e}}
body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.7 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:720px;margin:0 auto;padding:40px 16px 64px}
h1{font-size:32px;line-height:1.2;margin:8px 0}h2{font-size:20px;margin:36px 0 8px;scroll-margin-top:16px}
p,li{color:var(--muted)}strong{color:var(--ink)}a{color:var(--accent)}
.back{font-size:14px;text-decoration:none}.updated{font-size:14px}
.button{display:inline-block;background:var(--accent);color:#fff;border-radius:8px;padding:10px 16px;text-decoration:none;font-weight:600}
table{width:100%;border-collapse:collapse;font-size:14px;margin:12px 0}th,td{text-align:left;vertical-align:top;padding:10px 8px;border-bottom:1px solid var(--line)}th{color:var(--ink)}
footer{margin-top:48px;font-size:13px;color:var(--muted)}footer a{margin-right:14px}
</style></head><body><main>
<a class="back" href="/">← Roamly</a>
${body}
<footer><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/guidelines">Community guidelines</a><a href="/routes">Routes</a></footer>
</main></body></html>`;
}
export const htmlResponse=(html:string,cache='public, max-age=3600',status=200)=>new Response(html,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':cache}});
