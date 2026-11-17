import assert from 'node:assert/strict';
import {liveOrigin,account} from './test-live.mjs';
// Routes from the database: public list, real covers, admin add/edit/hide, route pages.
const origin=liveOrigin();
const call=(method,path,body,cookie)=>fetch(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
const list=async(cookie,all='')=>(await (await call('GET','/api/routes'+all,null,cookie)).json()).routes;

const rider=await account(origin,{name:'Route Rider'});
const admin=await account(origin,{email:'moderator@roamly.test',name:'Moderator'});
const seeded=await list();
assert(seeded.length>=16,'catalog seeded into the database');
assert(seeded.every(r=>/^\/api\/photos\/[a-f0-9]{32}\.webp$/.test(r.cover.url)),'every route cover is served from our storage');
assert.equal(new Set(seeded.map(r=>r.cover.url)).size,seeded.length,'no two routes share a photo');
assert(seeded.find(r=>r.id==='konkan').cover.credit.includes('Wikimedia Commons'),'credit kept');

const id='test-route-'+Date.now().toString(36);
const route={id,title:'Test Western Ghats loop',location:'Maharashtra',route:'Pune → Lonavala → Pune',vehicle:'Bike',level:'Easy going',days:2,km:180,months:[6,7,8],tag:'',desc:'Monsoon waterfalls and ghats.',risk:'',
  places:[{name:'Bhushi Dam',minutes:60,area:'Lonavala',stayArea:'Lonavala'}],stays:[{area:'Lonavala',type:'Hotel',min:1200,max:4000}],stops:[{name:'Khopoli',purpose:'Fuel'}],source:'',
  cover:{url:'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/47/Jaisalmer_forteresse.jpg/500px-Jaisalmer_forteresse.jpg',credit:'Photo: Gérard Janot · CC BY-SA 3.0 · Wikimedia Commons',page:'https://commons.wikimedia.org/wiki/File:Jaisalmer_forteresse.jpg'},tags:['Monsoon']};
assert.equal((await call('POST','/api/routes',route)).status,403,'signed out');
assert.equal((await call('POST','/api/routes',route,rider)).status,403,'riders cannot add routes');
assert.equal((await call('POST','/api/routes',{...route,cover:null},admin)).status,400,'cover required');
assert.equal((await call('POST','/api/routes',{...route,places:[{...route.places[0],stayArea:'Nowhere'}]},admin)).status,400);
assert.equal((await call('POST','/api/routes',{...route,cover:{url:'https://evil.test/x.jpg',credit:'',page:''}},admin)).status,400,'only uploads or Wikimedia');
assert.equal((await call('POST','/api/routes',route,admin)).status,201);
assert.equal((await call('POST','/api/routes',route,admin)).status,409,'IDs are unique');
let mine=(await list()).find(r=>r.id===id);assert.match(mine.cover.url,/^\/api\/photos\/[a-f0-9]{32}\.webp$/,'Wikimedia pick copied into our storage');assert.equal(mine.cover.page,route.cover.page,'source page kept');
  assert.equal((await fetch(origin+mine.cover.url)).headers.get('content-type'),'image/webp');assert.equal(mine.places[0].id,id+'-p0');assert.deepEqual(mine.seasons,['Monsoon']);
assert.equal((await call('PUT','/api/routes',{...route,cover:mine.cover,km:200,title:'Test Ghats loop'},admin)).status,200,'re-saving the stored cover is allowed');
assert.equal((await list()).find(r=>r.id===id).km,200);
const page=await fetch(origin+'/routes/'+id);assert.equal(page.status,200);assert.match(await page.text(),/Test Ghats loop[\s\S]*Wikimedia Commons/);
assert.match(await (await fetch(origin+'/sitemap.xml')).text(),new RegExp(`/routes/${id}<`));

// Planner AI and rides accept the new route; hiding removes it from lists but keeps existing users working.
assert.equal((await call('PATCH','/api/routes',{id,status:'hidden'},rider)).status,403);
assert.equal((await call('PATCH','/api/routes',{id,status:'hidden'},admin)).status,200);
assert(!(await list()).some(r=>r.id===id),'hidden from the public list');
assert((await list(admin,'?all=1')).some(r=>r.id===id&&r.status==='hidden'),'admins still see it');
assert.equal((await call('GET','/api/routes?all=1',null,rider)).status,403);
assert.equal((await fetch(origin+'/routes/'+id)).status,404,'hidden route page');
assert.equal((await call('POST','/api/posts',{body:'Road report test',routeId:id},rider)).status,201,'posts can still tag a hidden route');
console.log('Routes passed: seeded from the catalog with unique real covers and credits, admin-only add/edit/hide, validation, route page and sitemap, hidden routes kept for existing posts.');
