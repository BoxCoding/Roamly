import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {liveOrigin,account} from './test-live.mjs';
// Phase 4 against the local dev server: feed, road intel, likes, comments, reports, follows, notifications,
// badges and crew leaderboard. Backdates one ride in the LOCAL database (DATABASE_URL or the default roamly DB).
const origin=liveOrigin();
const call=(method,path,body,cookie)=>fetch(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
const get=async(path,cookie)=>{const r=await call('GET',path,null,cookie);return {status:r.status,body:await r.json()}};
const me=async c=>(await get('/api/session',c)).body.user;
const inbox=async c=>(await get('/api/notifications',c)).body.notifications;
const sql=q=>execFileSync('psql',[process.env.DATABASE_URL||'roamly','-tAc',q]).toString().trim();

const [a,b,c,d]=await Promise.all(['Feed Author','Feed Reader','Feed Third','Feed Fourth'].map(name=>account(origin,{name})));
const admin=await account(origin,{email:'moderator@roamly.test',name:'Moderator'});
const [A,B]=await Promise.all([a,b].map(me));
const crews=[];
try{
  // Posts and road intel.
  assert.equal((await call('POST','/api/posts',{body:'hi'})).status,401);
  assert.equal((await call('POST','/api/posts',{kind:'report',body:'Potholes'},a)).status,400,'report needs details');
  assert.equal((await call('POST','/api/posts',{body:'x',routeId:'atlantis'},a)).status,404);
  const {id:post}=await (await call('POST','/api/posts',{body:'Sunrise at Lavasa today'},a)).json();
  const {id:report}=await (await call('POST','/api/posts',{kind:'report',body:'Fresh potholes after the toll',place:'Khopoli',reportType:'road',condition:'bad',routeId:'konkan'},a)).json();
  const anon=(await get('/api/feed')).body.posts;assert(anon.some(p=>p.id===post)&&anon.some(p=>p.id===report),'open posts are public');
  const intel=(await get('/api/feed?kind=report&route=konkan')).body.posts;assert(intel.some(p=>p.id===report)&&!intel.some(p=>p.id===post),'road intel = reports for the route');

  // Crew-only posts follow the crew's visibility.
  const {id:priv}=await (await call('POST','/api/groups',{name:'Feed Private Crew',city:'Pune',vehicle:'Bike',meetup:'X',cadence:'Sun',description:'d',links:{},visibility:'private'},a)).json();crews.push(priv);
  assert.equal((await call('POST','/api/posts',{body:'members only',crewId:priv},b)).status,403,'non-members cannot post to a crew');
  const {id:crewPost}=await (await call('POST','/api/posts',{body:'Members only plan',crewId:priv},a)).json();
  assert(!(await get('/api/feed',b)).body.posts.some(p=>p.id===crewPost),'private crew posts hidden from outsiders');
  assert.equal((await get('/api/posts/'+crewPost,b)).status,404);

  // Join request -> owner notified; approval -> rider notified; then the member sees the crew post.
  await call('PATCH','/api/groups',{id:priv,joined:true},b);await call('PATCH','/api/groups',{id:priv,joined:true},b);
  assert.equal((await inbox(a)).filter(n=>n.kind==='join-request').length,1,'one notice per request, not per click');
  await call('POST','/api/groups/members',{id:priv,rider:B.publicId,action:'approve'},a);
  assert((await inbox(b)).some(n=>n.kind==='crew'&&n.link==='#crew='+priv));
  assert((await get('/api/feed',b)).body.posts.some(p=>p.id===crewPost),'members see crew posts');

  // Likes and comments.
  let r=await (await call('POST',`/api/posts/${post}/react`,{like:true},b)).json();assert.equal(r.likes,1);
  r=await (await call('POST',`/api/posts/${post}/react`,{like:true},b)).json();assert.equal(r.likes,1,'one like per rider');
  assert.equal((await get('/api/feed',b)).body.posts.find(p=>p.id===post).liked,true);
  r=await (await call('POST',`/api/posts/${post}/react`,{like:false},b)).json();assert.equal(r.likes,0);
  const {id:cmt}=await (await call('POST',`/api/posts/${post}/comments`,{body:'Beautiful!'},b)).json();
  assert((await inbox(a)).some(n=>n.kind==='comment'),'author hears about comments');
  assert.equal((await call('DELETE',`/api/posts/${post}/comments`,{commentId:cmt},c)).status,403,'others cannot delete comments');
  assert.equal((await call('DELETE',`/api/posts/${post}/comments`,{commentId:cmt},a)).status,200,'post author can');

  // Follows.
  assert.equal((await call('POST','/api/follow',{type:'rider',id:A.publicId,follow:true},a)).status,400,'no self-follow');
  assert.equal((await call('POST','/api/follow',{type:'crew',id:priv,follow:true},c)).status,400,'private crews cannot be followed');
  await call('POST','/api/follow',{type:'rider',id:A.publicId,follow:true},c);
  assert((await inbox(a)).some(n=>n.kind==='follow'));
  const {id:p2}=await (await call('POST','/api/posts',{body:'New post for followers'},a)).json();
  assert((await inbox(c)).some(n=>n.link==='#post='+p2),'followers hear about new open posts');
  assert((await get('/api/feed?scope=following',c)).body.posts.some(p=>p.id===p2));
  assert.equal((await get('/api/feed?scope=following',d)).body.posts.length,0);
  assert.equal((await get('/api/riders/'+A.publicId,c)).body.rider.following,true);

  // Crew follow -> new rides reach followers.
  const {id:open}=await (await call('POST','/api/groups',{name:'Feed Open Crew',city:'Pune',vehicle:'Bike',meetup:'X',cadence:'Sun',description:'d',links:{}},a)).json();crews.push(open);
  await call('POST','/api/follow',{type:'crew',id:open,follow:true},d);
  assert.equal((await get('/api/groups',d)).body.groups.find(g=>g.id===open).following,true);
  const ride={title:'Feed test ride',routeId:'konkan',startDate:new Date(Date.now()+3*864e5).toISOString().slice(0,10),days:3,meetupPoint:'Pune',meetupTime:'06:00',capacity:2,minExperience:'Beginner',vehicle:'Bike',stay:'Comfort',distanceKm:700,description:''};
  const {id:rideId}=await (await call('POST','/api/rides',{crewId:open,ride},a)).json();
  assert((await inbox(d)).some(n=>n.link==='#ride='+rideId),'crew followers hear about new rides');

  // Waitlist promotion and ride updates notify riders.
  await call('POST',`/api/rides/${rideId}/rsvp`,{status:'going',waiver:true},b);
  assert.equal((await (await call('POST',`/api/rides/${rideId}/rsvp`,{status:'going',waiver:true},c)).json()).status,'waitlist');
  await call('POST',`/api/rides/${rideId}/rsvp`,{status:'none'},b);
  assert((await inbox(c)).some(n=>n.text.startsWith('A seat opened up')),'promoted rider is told');
  await call('POST',`/api/rides/${rideId}/updates`,{body:'Meet at the petrol pump'},a);
  assert((await inbox(c)).some(n=>n.kind==='ride-update'));

  // Badges and leaderboard from a finished ride (backdated locally).
  sql(`update rides set start_date='${new Date(Date.now()-10*864e5).toISOString().slice(0,10)}' where id='${rideId}'`);
  const st=(await get('/api/riders/'+A.publicId,c)).body.rider.stats;
  assert.equal(st.rides,1);assert.equal(st.km,700);assert.equal(st.reports,1);assert.equal(st.followers,1);
  assert.deepEqual(st.badges.map(x=>x.id),['first-ride','tourer','leader']);
  const leaders=(await get('/api/groups/leaderboard?id='+open,a)).body.leaders;assert.deepEqual(leaders.map(l=>[l.rides,l.km]),[[1,700],[1,700]]);
  assert.equal((await get('/api/groups/leaderboard?id='+open,d)).status,403,'members only');

  // Notifications: unread count and mark read.
  assert((await get('/api/notifications?count=1',c)).body.unread>0);
  await call('POST','/api/notifications',{read:'all'},c);
  assert.equal((await get('/api/notifications?count=1',c)).body.unread,0);

  // Post reports: 3 distinct reporters hide it; admins restore or remove.
  assert.equal((await call('POST',`/api/posts/${p2}/report`,{reason:'spam'},a)).status,400,'no self-report');
  for(const x of [b,c,d])await call('POST',`/api/posts/${p2}/report`,{reason:'spam'},x);
  assert(!(await get('/api/feed')).body.posts.some(p=>p.id===p2),'hidden after 3 reports');
  assert.equal((await get('/api/admin?view=posts',b)).status,403);
  assert((await get('/api/admin?view=posts',admin)).body.posts.some(p=>p.id===p2&&p.status==='hidden'));
  assert.equal((await call('POST',`/api/posts/${p2}/moderate`,{action:'restore'},admin)).status,200);
  assert((await get('/api/feed')).body.posts.some(p=>p.id===p2),'restored');

  // Deleting: authors and admins only.
  assert.equal((await call('DELETE','/api/posts/'+post,{},b)).status,403);
  assert.equal((await call('DELETE','/api/posts/'+post,{},a)).status,200);
  for(const id of [report,crewPost,p2])await call('DELETE','/api/posts/'+id,{},admin);
}finally{for(const id of crews)await call('DELETE','/api/groups',{id},a)}
console.log('Feed passed: posts and road intel, crew-only visibility, likes, comments, follows (riders and crews), notifications (join, approve, comment, follow, new post, new ride, waitlist seat, ride update), badges, leaderboard, post reports and moderation.');
