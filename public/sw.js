// Roamly service worker: the app shell works offline; API data is never cached.
// Network first, so a new deploy shows up immediately when online.
const CACHE='roamly-shell-v1';
const SHELL=['/','/app.js','/style.css','/domain.mjs','/catalog.mjs','/travel.mjs','/favicon.svg','/icon-192.png','/manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET'||url.origin!==location.origin||url.pathname.startsWith('/api/'))return;
  const shell=e.request.mode==='navigate'?'/':url.pathname;
  if(e.request.mode!=='navigate'&&!SHELL.includes(shell)&&!url.pathname.startsWith('/assets/'))return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(shell,copy))}return r}).catch(()=>caches.match(shell).then(r=>r||Response.error())));
});
