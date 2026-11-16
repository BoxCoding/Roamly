import assert from 'node:assert/strict';
import sharp from 'sharp';
import {liveOrigin,account} from './test-live.mjs';
// Phase 5 against the local dev server: photo uploads (resize, metadata stripped), moderation rules,
// policy pages, route SEO pages, share previews, sitemap, robots and PWA files.
const origin=liveOrigin();
const call=(method,path,body,cookie,headers={})=>fetch(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...headers},...(body?{body:typeof body==='string'||body instanceof Uint8Array?body:JSON.stringify(body)}:{})});
const upload=(bytes,cookie,type='image/jpeg',extra={})=>fetch(origin+'/api/uploads',{method:'POST',headers:{Origin:origin,'Content-Type':type,...(cookie?{Cookie:cookie}:{}),...extra},body:bytes});

const [a,b]=await Promise.all(['Photo Rider','Photo Other'].map(name=>account(origin,{name})));
// A 3000x2000 JPEG carrying EXIF (including GPS-like data) that must not survive.
const original=await sharp({create:{width:3000,height:2000,channels:3,background:'#3a6'}}).jpeg().withExif({IFD0:{Make:'TestCam',Model:'Secret Serial 123'},IFD3:{GPSLatitude:'18/1 31/1 0/1',GPSLatitudeRef:'N'}}).toBuffer();
assert((await sharp(original).metadata()).exif,'fixture has EXIF');

assert.equal((await upload(original)).status,401);
assert.equal((await upload(original,a,'image/jpeg',{Origin:'https://evil.test'})).status,403);
assert.equal((await upload(Buffer.from('not an image'),a,'text/plain')).status,415);
assert.equal((await upload(Buffer.from('not an image at all'),a)).status,400,'garbage rejected');
const up=await upload(original,a);assert.equal(up.status,201);const photo=await up.json();
assert.equal(photo.width,1600);assert.equal(photo.height,1067);
const served=await fetch(origin+photo.url);assert.equal(served.headers.get('content-type'),'image/webp');
const meta=await sharp(Buffer.from(await served.arrayBuffer())).metadata();
assert.equal(meta.format,'webp');assert.equal(meta.exif,undefined,'EXIF (GPS, camera) stripped');assert.equal(meta.width,1600);
assert.equal((await fetch(origin+'/api/photos/../../etc/passwd')).status,404);

// Posts with photos: only your own, unused uploads.
const other=await (await upload(original,b)).json();
assert.equal((await call('POST','/api/posts',{body:'Steal a photo',photos:[other.key]},a)).status,400,"cannot use someone else's photo");
const {id:post}=await (await call('POST','/api/posts',{body:'Sunset at the ghat with photos',photos:[photo.key]},a)).json();
assert.deepEqual((await (await call('GET','/api/feed')).json()).posts.find(p=>p.id===post).photos,[photo.url]);
assert.equal((await call('POST','/api/posts',{body:'Reuse',photos:[photo.key]},a)).status,400,'a photo belongs to one post');

// Moderation rules.
assert.equal((await call('POST','/api/posts',{body:'Join here bit.ly/abc'},a)).status,400,'short links blocked');
assert.equal((await call('POST','/api/posts',{body:'Sunset at the ghat with photos'},a)).status,409,'duplicate post blocked');
assert.equal((await call('POST',`/api/posts/${post}/comments`,{body:'see https://a.in https://b.in https://c.in https://d.in'},b)).status,400,'link-spam comment blocked');
const flagged=await call('POST','/api/posts',{body:'Send me money as advance for the Goa ride booking, share your UPI ID now'},b);
assert.equal(flagged.status,201,'flagged text is checked, not blocked by rules');const fl=await flagged.json();
console.log(fl.underReview?'  AI hid the money-request post for review.':'  AI did not hide the money-request post (low confidence or AI unavailable).');

// Deleting the post deletes its photo.
assert.equal((await call('DELETE','/api/posts/'+post,{},a)).status,200);
assert.equal((await fetch(origin+photo.url)).status,404,'photo removed with the post');
await call('DELETE','/api/posts/'+fl.id,{},b);

// Pages and files.
const page=async p=>{const r=await fetch(origin+p,{redirect:'manual'});return {status:r.status,text:await r.text(),type:r.headers.get('content-type')}};
for(const p of ['/terms','/guidelines','/privacy','/routes'])assert.equal((await page(p)).status,200,p);
const route=await page('/routes/konkan');assert.match(route.text,/Plan this route in Roamly/);assert.match(route.text,/og:title/);
assert.equal((await page('/routes/atlantis')).status,404);
assert.match((await page('/sitemap.xml')).text,/\/routes\/konkan<\/loc>/);
assert.match((await page('/robots.txt')).text,/Disallow: \/api\//);
const manifest=JSON.parse((await page('/manifest.webmanifest')).text);assert.equal(manifest.display,'standalone');assert.equal(manifest.icons.length,3);
assert.match((await page('/sw.js')).text,/roamly-shell/);
for(const icon of ['/icon-192.png','/icon-512.png','/icon-maskable-512.png','/apple-touch-icon.png'])assert.equal((await fetch(origin+icon)).status,200,icon);

// Share previews: open crews show details, private ones stay generic.
const {id:openCrew}=await (await call('POST','/api/groups',{name:'Launch Open Crew',city:'Pune',vehicle:'Bike',meetup:'X',cadence:'Sun',description:'d',links:{}},a)).json();
const {id:privCrew}=await (await call('POST','/api/groups',{name:'Launch Private Crew',city:'Pune',vehicle:'Bike',meetup:'X',cadence:'Sun',description:'d',links:{},visibility:'private'},a)).json();
try{
  const ride={title:'Secret dawn run',routeId:'konkan',startDate:new Date(Date.now()+4*864e5).toISOString().slice(0,10),days:2,meetupPoint:'Hidden cafe',meetupTime:'05:30',capacity:6,minExperience:'Beginner',vehicle:'Bike',stay:'Comfort',distanceKm:300,description:''};
  const {id:openRide}=await (await call('POST','/api/rides',{crewId:openCrew,ride:{...ride,title:'Open dawn run'}},a)).json();
  const {id:privRide}=await (await call('POST','/api/rides',{crewId:privCrew,ride},a)).json();
  const op=await page('/r/'+openRide);assert.match(op.text,/Open dawn run/);assert.match(op.text,/#ride=/);
  const pr=await page('/r/'+privRide);assert.doesNotMatch(pr.text,/Secret dawn run|Hidden cafe/,'private ride details never leak');
  const {id:crewPost}=await (await call('POST','/api/posts',{body:'Members only secret plan',crewId:privCrew},a)).json();
  assert.doesNotMatch((await page('/p/'+crewPost)).text,/secret plan/,'crew-only posts stay private');
  await call('DELETE','/api/posts/'+crewPost,{},a);
}finally{for(const id of [openCrew,privCrew])await call('DELETE','/api/groups',{id},a)}
console.log('Launch checks passed: photo upload (auth, origin, type, resize to 1600 px, EXIF/GPS stripped, ownership, one post per photo, deleted with post), moderation rules (short links, link spam, duplicates, AI check on money requests), policy pages, route SEO pages, sitemap, robots, PWA manifest/icons/service worker, share previews without private leaks.');
