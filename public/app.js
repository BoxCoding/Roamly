import {estimate,credibility,matches,VEHICLES,fuelRate,tripPrice,LINK_KINDS,PROFILE_LINKS,RIDING_STYLES,RIDING_PACES,LOOKING_FOR,profileCompleteness,cleanLink,cleanLinks,planBudget,haversineKm,ROAD_FACTOR,STAY_TYPES} from './domain.mjs';
import {outline,tripAlerts,calendar} from './travel.mjs';
const $=s=>document.querySelector(s), main=$('#main'), modal=$('#modal');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=x=>'₹'+Math.round(x).toLocaleString('en-IN');
const photo=id=>`assets/${id}.jpg`;
const ownLinks=g=>linkList(g.links);
const linkList=links=>Object.entries(links||{}).filter(([k])=>LINK_KINDS[k]).map(([k,href])=>`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${LINK_KINDS[k].label} ↗</a>`).join('');
const providerName=()=>({google:'Google',facebook:'Facebook'})[session.user?.provider]||'email';
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const travelWindow=t=>t.months.map(m=>MONTHS[m].slice(0,3)).join(', ');
const vehicleLabel=type=>type==='Bike'?'♧ Bike':'▱ Car';
let crews=[];
const allGroups=()=>[...directoryGroups,...sampleGroups,...crews];
// Member crews live on the server so every rider sees them; samples stay illustrative.
async function loadCrews(){try{const r=await fetch('/api/groups');const d=await r.json();if(!r.ok)throw new Error(d.error);crews=d.groups.map(g=>({...g,server:true,icon:'♧',links:cleanLinks(g.links).links||{},organizerLinks:cleanLinks(g.organizerLinks,PROFILE_LINKS).links||{}}));if(['groups','discover'].includes(page))render()}catch{}}
async function crewRequest(method,body,done,url='/api/groups'){try{const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error);if(modal.open)modal.close();await loadCrews();render();toast(done)}catch(error){toast(error.message||'Please try again.')}}
const isSample=id=>sampleGroups.some(x=>x.id===id);
import {trips} from './catalog.mjs';
const sampleGroups=[{id:'weekend',name:'The Weekend Wanderers',city:'Bengaluru',vehicle:'Bike',members:248,icon:'♧',profile:100,completion:94,reviews:96,description:'Easy Saturday rides, breakfast stops, and a crew that waits for everyone.'},{id:'overland',name:'Overland Collective',city:'Mumbai',vehicle:'Car',members:186,icon:'⌁',profile:95,completion:92,reviews:96,description:'Thoughtful road trips for people who love the long way around.'},{id:'himalayan',name:'Himalayan Trail Riders',city:'Delhi',vehicle:'Bike',members:312,icon:'△',profile:100,completion:90,reviews:94,description:'Mountain enthusiasts sharing preparation, riding skills, and memorable routes.'}];
const directoryGroups=[
{id:'ibrmc',name:'India Bull Riders Motorcycle Club',city:'Delhi NCR · Mumbai · Bengaluru · Chennai + chapters',vehicle:'Bike',external:true,website:'https://indiabullriders.com/chapters/',description:'Motorcycle club with a chapter directory and group-ride activities. Check the official chapter page for local membership and current ride contacts.'},
{id:'xbhp',name:'xBhp motorcycling community',city:'India · online community',vehicle:'Bike',external:true,website:'https://www.xbhp.com/',description:'Motorcycling community and publication with rider discussions and travel stories. Use the official platform to find current local activity.'},
{id:'enfield-community',name:'Enfield Rider’s Community',city:'Kolkata · Assam · Bengaluru',vehicle:'Bike',external:true,website:'https://www.enfieldriderscommunity.com/',description:'Adventure touring community focused on Royal Enfield motorcycles. Check its official site for current rides and participation requirements.'}
];
// shortcut: trip and group data remains browser-local; add shared storage when cross-device sync is needed.
let session = {user:null, signInUrl:'/signin-with-chatgpt?return_to=%2F', signOutUrl:'/signout-with-chatgpt?return_to=%2F'};
let authLoading=true, authError=false;
let storageKey='roamly-v2:guest';
let state={saved:[],joined:[],groups:[],alerts:[]};
let garage=null, garageDraft=null, aiAvailable=false, latestPlan=null;
function loadState(){
  storageKey='roamly-v2:'+ (session.user ? session.user.id : 'guest');
  let saved;try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}')}catch{saved={}}
  if(!saved||typeof saved!=='object'||Array.isArray(saved))saved={};
  state={alerts:Array.isArray(saved.alerts)?saved.alerts.filter(a=>a&&typeof a.id==='string'&&typeof a.label==='string'&&Number.isFinite(Date.parse(a.at))):[],saved:Array.isArray(saved.saved)?saved.saved.filter(x=>typeof x==='string'):[],joined:Array.isArray(saved.joined)?saved.joined.filter(x=>typeof x==='string'):[]};
}
async function loadSession(){
  try{
    const response=await fetch('/api/session',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error('Session unavailable');
    const result=await response.json();
    if(result.user && (typeof result.user.id!=='string'||typeof result.user.name!=='string'))throw new Error('Invalid session');
    session={...session,user:result.user||null,signOutUrl:result.signOutUrl||session.signOutUrl,googleLogin:result.googleLogin===true,metaLogin:result.metaLogin===true};
    if(result.suspended)setTimeout(()=>toast('Your account is suspended. Contact the Roamly team if you think this is a mistake.'),0);
  }catch{authError=true}
  authLoading=false;loadState();render();loadCrews();checkAlerts();startBell();if(session.user)loadGarage().then(ok=>{if(ok&&!garage.updatedAt){garageDraft=structuredClone(garage.profile);open('<h2>Welcome to Roamly.</h2>');renderProfile()}if(ok&&$('#plan-garage'))$('#plan-garage').innerHTML='<option value="">Use manual assumptions</option>'+garage.profile.vehicles.map(v=>`<option value="${esc(v.id)}">${esc(v.make+' '+v.model)} · ${v.type}</option>`).join('')});fetch('/api/ai-plan').then(r=>r.json()).then(x=>{aiAvailable=x.available===true;if(aiAvailable&&$('.view-intro .demo-label'))$('.view-intro .demo-label').textContent='AI SUGGESTIONS AVAILABLE · REVIEW BEFORE TRAVEL';if(aiAvailable&&$('#request-ai')&&latestPlan.data.days<=30)$('#request-ai').disabled=false}).catch(()=>{});
}
let page='discover',filter={query:'',vehicle:'All',season:'All'}, toastTimer;
function persist(){try{localStorage.setItem(storageKey,JSON.stringify(state))}catch{toast('Browser storage is unavailable. Changes will last for this session.')}updateProfile()}
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3800)}
function updateProfile(){
  $('#saved-count').textContent=state.saved.length;
  $('#profile-label').innerHTML=authLoading?'Checking sign-in…<small>Please wait</small>':session.user?`${esc(session.user.name)}<small>Signed in with ${providerName()}</small>`:authError?'Sign-in unavailable<small>Tap to retry</small>':'Guest explorer<small>Sign in or register</small>';
  if(session.user?.admin&&!$('#nav-admin'))$('nav').insertAdjacentHTML('beforeend','<button class="nav-item" id="nav-admin" data-page="admin"><span>⚙</span> Admin</button>');if(!session.user?.admin)$('#nav-admin')?.remove();
  const top=$('#auth-button');top.textContent=authLoading?'Checking sign-in…':session.user?'My account':'Sign in';top.disabled=authLoading;
}
function open(content){$('#modal-body').innerHTML=content;modal.showModal()}
function heading(title,sub,extra=''){return `<div class="page-heading"><div><div class="eyebrow">THE WORLD LOOKS BETTER FROM THE ROAD</div><h1>${title}</h1><p>${sub}</p></div>${extra}</div>`}
function tripCard(t){return `<article class="trip-card"><div class="card-photo"><img src="${photo(t.image)}" alt="Illustrative landscape for this trip idea" loading="lazy"><span class="card-tag">${vehicleLabel(t.vehicle)} trip</span><button class="save ${state.saved.includes(t.id)?'saved':''}" data-save="${t.id}" aria-label="${state.saved.includes(t.id)?'Unsave':'Save'} ${esc(t.title)}" aria-pressed="${state.saved.includes(t.id)}">${state.saved.includes(t.id)?'♥':'♡'}</button><span class="photo-bottom">${t.level==='Easy going'?'◌':'↗'} ${t.level}</span></div><div class="card-body"><button class="card-action" data-trip="${t.id}"><div class="card-location">⌖ ${t.location}</div><h3>${t.title}</h3><div class="trip-meta"><span>▦ ${t.days} days</span><span>⌁ ${t.km} km</span></div></button><div class="card-separator"></div><div class="card-bottom"><span class="price">${money(tripPrice(t))} <small>/ person · 2 travelers</small></span><button class="text-link" data-trip="${t.id}">Explore ↗</button></div></div></article>`}
function groupRow(g,full=false){if(g.external)return `<article class="group-row"><div class="group-logo">♧</div><div class="group-info"><h3><button class="card-action" data-group="${esc(g.id)}">${esc(g.name)} ↗</button></h3><p>${esc(g.city)} · ${g.vehicle}</p></div><span class="credibility">Unrated</span><a class="join" href="${g.website}" target="_blank" rel="noopener noreferrer">Official site ↗</a>${full?`<div class="group-detail">${esc(g.description)}<br><span class="social-empty">Public directory reference · no imported membership or affiliation</span></div>`:''}</article>`;const joined=g.server?g.joined:state.joined.includes(g.id),sample=isSample(g.id);return `<article class="group-row"><div class="group-logo">${esc(g.icon||'♧')}</div><div class="group-info"><h3><button class="card-action" data-group="${esc(g.id)}">${esc(g.name)} ↗</button></h3><p>⌖ ${esc(g.city)} · ${g.server?g.members:Number(g.members)+(joined?1:0)} members · ${g.vehicle}${g.visibility==='private'?' · 🔒 Private':''}${g.pendingRequests?` · <strong>${g.pendingRequests} join request${g.pendingRequests>1?'s':''}</strong>`:''}</p></div><button class="credibility" data-score="${esc(g.id)}" title="See credibility signals">♢ ${sample?credibility(g)+' / 100':'Unrated'}</button><button class="join" data-join="${esc(g.id)}">${joinLabel(g,joined)}</button>${full?`<div class="group-detail">${esc(g.description)}<br><span class="social-empty">${sample?'Sample community · no live social connection':(g.underReview?'Under review · hidden from other riders until a moderator checks it':'Roamly member crew · organized by '+esc(g.organizer))}</span></div><div class="group-links">${ownLinks(g)||`<a href="https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(g.city+' '+g.vehicle+' road trip')}" target="_blank" rel="noopener noreferrer">Search Instagram ↗</a><a href="https://www.facebook.com/search/groups/?q=${encodeURIComponent(g.city+' road trip')}" target="_blank" rel="noopener noreferrer">Search Facebook groups ↗</a>`}</div>`:''}</article>`}
function discover(){return heading('Find your road. Find your people.','Extraordinary routes. Like-minded explorers. One unforgettable journey.',`<div class="date-note"><span>☀</span> A little wanderlust looks good on you.</div>`)+`<section class="hero"><img src="${photo('photo-1464822759023-fed622ff2c3b')}" alt="Sunlight over a dramatic green mountain valley"><div class="hero-content"><span class="hero-tag">FOR THE LOVE OF THE OPEN ROAD</span><h2>Take the scenic route.<br>Make a better story.</h2><p>Two wheels or four. Mountains or coastlines.<br>Your kind of adventure, with your kind of people.</p><button class="primary" data-page="planner">✧ Plan my next escape <span style="margin-left:16px">↗</span></button></div><div class="hero-caption">⌖ Somewhere worth getting lost.<small>Illustrative landscape</small></div></section><form class="search-panel" id="search-form"><div class="search-field"><label for="destination">WHERE TO?</label><input id="destination" name="query" placeholder="⌖  A place, a route, a little escape" value="${esc(filter.query)}" maxlength="100"></div><div class="search-field"><label for="vehicle">YOUR RIDE</label><select id="vehicle" name="vehicle"><option value="All">Bike or car</option><option>Bike</option><option>Car</option></select></div><div class="search-field"><label for="season">WHEN'S THE ADVENTURE?</label><select id="season" name="season"><option value="All">Any season</option><option>Winter</option><option>Summer</option><option>Monsoon</option><option>Autumn</option></select></div><button class="primary">Find my trip ↗</button></form><section><div class="section-heading"><div><h2>16 routes. Countless stories.</h2><p>Handpicked escapes for your next out-of-office.</p></div><div class="pills">${['All','Bike','Car'].map(v=>`<button class="pill ${filter.vehicle===v?'active':''}" data-filter="${v}">${v==='All'?'All trips':vehicleLabel(v)}</button>`).join('')}</div></div><div id="results-info" class="results-info"></div><div class="trip-grid" id="trip-results"></div></section><div class="lower-grid"><section><div class="section-heading"><div><h2>Your people are out there.</h2><p>Find a crew that shares your kind of adventure.</p></div><button class="text-link" data-page="groups">All communities ↗</button></div><div class="group-list">${[...directoryGroups,...sampleGroups].slice(0,2).map(g=>groupRow(g)).join('')}</div></section><section><div class="section-heading"><div><h2>Right place. Right season.</h2><p>A little timing makes a big difference.</p></div></div><div class="season-card"><div class="eyebrow">THE SEASONAL EDIT · OCT — FEB</div><h3>Cooler days.<br>Warmer memories.</h3><p>Follow the coast or head for the desert.<br>Find your next winter escape.</p><span class="season-icon">✳</span><button class="text-link" data-season="Winter">Explore winter routes ↗</button><div class="season-tags"><span>☀ Rajasthan</span><span>≈ Konkan coast</span><span>♧ Coorg</span></div></div></section></div>`}
function updateTrips(){const result=trips.filter(t=>matches(t,filter));$('#trip-results').innerHTML=result.length?result.map(tripCard).join(''):'<div class="empty">No matching routes yet. Try another place, vehicle, or season.</div>';$('#results-info').textContent=`${result.length} curated route${result.length===1?'':'s'} · distances and budgets are estimates${filter.season!=='All'?' · '+filter.season:''}`;$('#vehicle').value=filter.vehicle;$('#season').value=filter.season}
function planner(){return heading('A great trip starts with a little planning.','Places to explore, somewhere to pause, and a budget for everyone.')+`<div class="view-intro"><h2>Meet your trip co-pilot. ✧</h2><p>Choose a route, your vehicle and travel style. Plan sightseeing, breaks, stay areas and costs per person.</p><span class="demo-label">${aiAvailable?'AI SUGGESTIONS AVAILABLE · REVIEW BEFORE TRAVEL':'CURATED SUGGESTIONS · LIVE AI AWAITS SERVICE SETUP'}</span></div><div class="planner-layout"><form id="planner-form" class="panel"><h3>Make it your kind of journey</h3><div class="form-grid"><div class="form-field wide"><label for="plan-route">Route</label><select name="route" id="plan-route">${trips.map(t=>`<option value="${t.id}">${t.route}</option>`).join('')}<option value="custom">✎ My own route…</option></select></div><div id="custom-route" hidden><div class="form-field"><label for="plan-from">Starting from</label><input id="plan-from" name="from" maxlength="60" placeholder="e.g. Delhi"></div><div class="form-field"><label for="plan-to">Going to</label><input id="plan-to" name="to" maxlength="60" placeholder="e.g. Jaisalmer"></div><div class="form-field wide"><label for="plan-via">Stops on the way (optional, comma separated)</label><input id="plan-via" name="via" maxlength="320" placeholder="e.g. Jaipur, Jodhpur"></div></div><div class="form-field wide"><label for="plan-garage">Vehicle from your garage</label><select id="plan-garage" name="garage"><option value="">Use manual assumptions</option>${(garage?.profile.vehicles||[]).map(v=>`<option value="${esc(v.id)}">${esc(v.make+' '+v.model)} · ${v.type} · ${v.mileage} ${v.fuel==='Electric'?'km/kWh':'km/l'}</option>`).join('')}</select><button type="button" class="text-link" id="planner-profile">Manage my profile & vehicles ↗</button></div><div class="form-field"><label for="plan-vehicle">Vehicle type</label><select name="vehicle" id="plan-vehicle"><option>Bike</option><option>Car</option></select></div><div class="form-field"><label for="plan-month">Travel month</label><select name="month" id="plan-month">${MONTHS.map((x,i)=>`<option value="${i}" ${i===10?'selected':''}>${x}</option>`).join('')}</select></div><div class="form-field"><label for="plan-days">Days on the road</label><input id="plan-days" name="days" type="number" min="1" max="60" value="7" required></div><div class="form-field"><label for="plan-people">Travelers</label><input id="plan-people" name="people" type="number" min="1" max="30" value="2" required></div><div class="form-field"><label for="plan-km" id="km-label">Total distance (km) · AI refines this</label><input id="plan-km" name="distance" type="number" min="1" max="20000" value="650" required></div><div class="form-field"><label for="plan-stay">Stay style</label><select id="plan-stay" name="stay"><option>Budget</option><option selected>Comfort</option><option>Premium</option></select></div><div class="form-field"><label for="plan-fuel">Fuel / power source</label><select name="fuel" id="plan-fuel"><option>Petrol</option><option>Diesel</option><option>Hybrid</option><option>Electric</option></select></div><div class="form-field"><label for="plan-mileage" id="mileage-label">Mileage (km/l)</label><input id="plan-mileage" name="mileage" type="number" min="1" max="200" step="0.1" value="${VEHICLES.Bike.mileage}" required></div><div class="form-field"><label for="plan-rate" id="rate-label">Fuel price (₹/liter)</label><input id="plan-rate" name="fuelPrice" type="number" min="1" max="1000" step="0.1" value="${fuelRate()}" required></div><div class="form-field"><label for="plan-seats">Travelers per vehicle</label><input id="plan-seats" name="seats" type="number" min="1" max="${VEHICLES.Bike.maxSeats}" value="${VEHICLES.Bike.seats}" required></div><div class="form-field wide"><label for="plan-preferences">Your interests and requirements (for AI when configured)</label><textarea id="plan-preferences" name="preferences" maxlength="500" placeholder="Photography, vegetarian food, relaxed pace, short walks…"></textarea></div></div><p class="form-footnote">Vehicle count is rounded up from travelers ÷ seats. A convoy uses the same mileage assumption for every vehicle. Edit distance for your return journey. Stay prices are planning assumptions, not live quotes.</p><button class="primary" style="width:100%">Build my trip plan ↗</button></form><section class="panel" id="plan-result" aria-live="polite"><div class="result-placeholder"><div class="planner-art">⌁ ✧</div><h3>A little planning.<br>A lot of possibility.</h3><p>Your per-person costs, places, stays and<br>break suggestions will appear here.</p></div></section></div>`}
function render(){if(page==='admin'&&!session.user?.admin)page='discover';const titles={discover:'Discover',planner:'AI trip planner',groups:'Find your crew',rides:'Group rides',feed:'Ride feed',plans:'My plans',saved:'Saved trips',alerts:'Time alerts',admin:'Admin'};$('#page-title').textContent=titles[page];document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===page));if(page==='discover'){main.innerHTML=discover();updateTrips()}if(page==='planner')main.innerHTML=planner();if(page==='saved')main.innerHTML=heading('A little inspiration, saved.','The roads you want to come back to.')+`<div class="trip-grid" style="margin-bottom:35px">${trips.filter(t=>state.saved.includes(t.id)).map(tripCard).join('')||'<div class="empty">Your next adventure is waiting. Tap ♡ on a trip to save it.<br><br><button class="primary" data-page="discover">Discover trips ↗</button></div>'}</div>`;if(page==='groups')main.innerHTML=heading('Find your kind of people.','Shared roads. Shared stories. A community for every kind of explorer.',`<div class="button-row">${session.user?.admin?'<button class="secondary" data-page="admin">⚙ Admin dashboard</button>':''}<button class="primary" id="create-group">＋ Create a group</button></div>`)+`<form id="group-search" class="search-panel"><div class="search-field"><label for="group-query">FIND A COMMUNITY</label><input id="group-query" name="query" placeholder="Search by name, city, or vehicle" maxlength="100"></div><button class="primary">Search groups ↗</button></form><p class="results-info">Official community references, sample crews and your local groups. External communities manage membership on their own sites; no member locations are tracked.</p><div class="groups-grid" id="group-results">${allGroups().map(g=>groupRow(g,true)).join('')}</div><p class="form-footnote">Credibility combines profile completeness (25%), completed-trip rate (45%), and reviews (30%). Sample scores are illustrative and do not establish safety. New groups stay unrated until they have evidence.</p>`;if(page==='alerts')main.innerHTML=alertsPage();if(page==='admin'){main.innerHTML=adminPage();loadAdmin()}if(page==='rides'){main.innerHTML=ridesPage();loadRides()}if(page==='plans'){main.innerHTML=plansPage();loadPlans()}if(page==='feed'){main.innerHTML=feedPage();loadFeed()}updateProfile()}
async function loadGarage(){
  try{const response=await fetch('/api/profile',{cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error);garage=data;return true}catch{return false}
}
async function profile(){
  if(authLoading){toast('Checking your sign-in. Please wait.');return}
  if(authError){open('<h2>We couldn’t check your session.</h2><p>Please check your connection and try again.</p><button class="primary" id="retry-auth">Try again</button>');return}
  if(!session.user){open(authModal('signin'));return}
  open('<h2>Your explorer profile</h2><p>Loading your profile and vehicles…</p>');
  if(!await loadGarage()){open('<h2>Profile temporarily unavailable.</h2><p>Your existing profile has not been changed. Please retry when the connection is available.</p><button class="primary" id="retry-profile">Try again</button>');return}
  garageDraft=structuredClone(garage.profile);renderProfile();
}
function vehicleFields(v,i){return `<fieldset class="vehicle-editor" data-vehicle-row="${i}"><legend>${vehicleLabel(v.type)} ${i+1}</legend><input type="hidden" name="id" value="${esc(v.id)}"><div class="form-grid"><div class="form-field"><label for="v-type-${i}">Type</label><select name="type" id="v-type-${i}">${['Bike','Car'].map(x=>`<option ${v.type===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="form-field"><label for="v-year-${i}">Model year</label><input id="v-year-${i}" name="year" type="number" min="1980" max="${new Date().getFullYear()+1}" value="${v.year}" required></div><div class="form-field"><label for="v-make-${i}">Make</label><input id="v-make-${i}" name="make" maxlength="40" placeholder="Royal Enfield / Maruti" value="${esc(v.make)}" required></div><div class="form-field"><label for="v-model-${i}">Model</label><input id="v-model-${i}" name="model" maxlength="60" placeholder="Himalayan / Jimny" value="${esc(v.model)}" required></div><div class="form-field"><label for="v-fuel-${i}">Fuel type</label><select id="v-fuel-${i}" name="fuel">${['Petrol','Diesel','Hybrid','Electric'].map(x=>`<option ${v.fuel===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="form-field"><label for="v-mileage-${i}">Mileage (km/l; EV: km/kWh)</label><input id="v-mileage-${i}" name="mileage" type="number" min="1" max="200" step="0.1" value="${v.mileage}" required></div><div class="form-field"><label for="v-seats-${i}">Seats (1–${VEHICLES[v.type].maxSeats})</label><input id="v-seats-${i}" name="seats" type="number" min="1" max="8" value="${v.seats}" required></div><div class="form-field"><label for="v-cc-${i}">Engine cc (EV: 0)</label><input id="v-cc-${i}" name="engineCc" type="number" min="0" max="10000" value="${v.engineCc}" required></div></div><button type="button" class="text-link danger" data-remove-vehicle="${i}">Remove this vehicle</button></fieldset>`}
function renderProfile(){
  const d=garageDraft,done=profileCompleteness(d),me=session.user;
  const chips=(name,options,selected)=>`<div class="chip-picks">${options.map(o=>`<label class="chip-pick"><input type="checkbox" name="${name}" value="${esc(o)}" ${selected.includes(o)?'checked':''}><span>${esc(o)}</span></label>`).join('')}</div>`;
  const ph={instagram:'instagram.com/you',youtube:'youtube.com/@yourchannel',facebook:'facebook.com/you',x:'x.com/you',strava:'strava.com/athletes/123',threads:'threads.net/@you',website:'yourblog.in'};
  $('#modal-body').innerHTML=`<div class="eyebrow">YOUR RIDER PROFILE</div><h2>${esc(me.name)}</h2><p>Signed in with ${providerName()} · only signed-in riders can see your rider card.</p>
  <div class="profile-meter" role="img" aria-label="Profile ${done}% complete"><span style="width:${done}%"></span></div><p class="form-footnote">Profile ${done}% complete. A fuller profile helps organizers approve you and riders find their kind of crew.${me.publicId?` <button type="button" class="text-link" data-rider="${esc(me.publicId)}">View my rider card ↗</button>`:''}</p>
  <form id="profile-form">
  <h3>The basics</h3><div class="form-grid"><div class="form-field"><label for="home-city">Home city</label><input id="home-city" name="homeCity" maxlength="80" value="${esc(d.homeCity)}" placeholder="Noida"></div><div class="form-field"><label for="experience">Experience</label><select id="experience" name="experience">${['Beginner','Intermediate','Experienced'].map(x=>`<option ${d.experience===x?'selected':''}>${x}</option>`).join('')}</select></div>
  <div class="form-field"><label for="riding-since">Riding since <small>(year)</small></label><input id="riding-since" name="ridingSince" type="number" min="1950" max="${new Date().getFullYear()}" value="${d.ridingSince??''}" placeholder="2016"></div><div class="form-field"><label for="pace">Usual pace</label><select id="pace" name="pace"><option value="">Choose</option>${RIDING_PACES.map(x=>`<option ${d.pace===x?'selected':''}>${x}</option>`).join('')}</select></div>
  <div class="form-field wide"><label for="profile-bio">About your riding</label><textarea id="profile-bio" name="bio" maxlength="500" placeholder="Weekend tourer, love the hills, always up for a chai stop.">${esc(d.bio)}</textarea></div></div>
  <h3>How you ride</h3><p class="form-footnote">Riding style</p>${chips('styles',RIDING_STYLES,d.styles||[])}<p class="form-footnote">Looking for</p>${chips('lookingFor',LOOKING_FOR,d.lookingFor||[])}
  <div class="form-grid"><div class="form-field"><label for="regions">Regions you have ridden</label><input id="regions" name="regions" maxlength="200" value="${esc(d.regions)}" placeholder="Ladakh, Spiti, Konkan coast"></div><div class="form-field"><label for="languages">Languages</label><input id="languages" name="languages" maxlength="100" value="${esc(d.languages)}" placeholder="Hindi, English"></div></div>
  <h3>Social</h3><div class="form-grid">${PROFILE_LINKS.map(k=>`<div class="form-field"><label for="profile-${k}">${LINK_KINDS[k].label} <small>(optional)</small></label><input id="profile-${k}" name="link-${k}" type="text" inputmode="url" maxlength="200" value="${esc(d.links?.[k]||'')}" placeholder="${ph[k]}"></div>`).join('')}<p class="form-footnote" style="grid-column:1/-1">Links show on your rider card and on crews you organize.</p></div>
  <h3>My garage · ${d.vehicles.length} / 10 vehicles</h3><p class="form-footnote">Add each bike or car you own. Mileage can be adjusted to your real-world experience.</p>${d.vehicles.map(vehicleFields).join('')||'<p>No vehicles yet. Add your first ride below.</p>'}
  <div class="button-row"><button type="button" class="secondary" id="add-vehicle" ${d.vehicles.length>=10?'disabled':''}>＋ Add a vehicle</button><button class="primary" id="save-profile">Save profile & garage</button></div><p id="profile-status" class="form-footnote" role="status"></p></form>
  <a class="text-link auth-link" href="${session.signOutUrl}" target="_top">Sign out</a> · <a class="text-link" href="/privacy" target="_blank" rel="noopener">Privacy</a> · <button type="button" class="text-link danger" id="delete-account">Delete my account</button>`;
}
function captureProfile(){
  const form=$('#profile-form'),data=new FormData(form),since=String(data.get('ridingSince')||'').trim();
  return {homeCity:String(data.get('homeCity')||'').trim(),experience:data.get('experience'),bio:String(data.get('bio')||'').trim(),
    links:Object.fromEntries(PROFILE_LINKS.map(k=>{const raw=String(data.get('link-'+k)||'').trim();return [k,cleanLink(k,raw)??raw]}).filter(([,v])=>v)),
    ridingSince:since?Number(since):null,styles:data.getAll('styles'),pace:String(data.get('pace')||''),lookingFor:data.getAll('lookingFor'),
    regions:String(data.get('regions')||'').trim(),languages:String(data.get('languages')||'').trim(),
    vehicles:[...form.querySelectorAll('[data-vehicle-row]')].map(row=>Object.fromEntries([...row.querySelectorAll('input,select')].map(field=>[field.name,['year','mileage','seats','engineCc'].includes(field.name)?Number(field.value):field.value])))};
}
function authModal(mode){const reg=mode==='register';return `<div class="eyebrow">YOUR JOURNEY STARTS HERE</div><h2>${reg?'Create your Roamly account.':'Your next adventure awaits.'}</h2><p>Sign in to create your profile, add vehicles, and join groups.</p><form id="auth-form" data-mode="${mode}"><div class="form-grid">${reg?'<div class="form-field wide"><label for="auth-name">Name</label><input id="auth-name" name="name" maxlength="60" autocomplete="name" required></div>':''}<div class="form-field wide"><label for="auth-email">Email</label><input id="auth-email" name="email" type="email" maxlength="254" autocomplete="email" required></div><div class="form-field wide"><label for="auth-password">Password${reg?' <small>(8+ characters)</small>':''}</label><input id="auth-password" name="password" type="password" minlength="${reg?8:1}" maxlength="128" autocomplete="${reg?'new-password':'current-password'}" required></div></div><p id="auth-status" class="form-footnote" role="status"></p><button class="primary" style="width:100%">${reg?'Create account':'Sign in'}</button>${reg?'<p class="form-footnote">By creating an account you confirm you are 18+ and agree to the <a href="/terms" target="_blank">Terms</a> and <a href="/guidelines" target="_blank">Community guidelines</a>.</p>':''}</form><p class="form-footnote">${reg?'Already have an account?':'New to Roamly?'} <button type="button" class="text-link" data-auth-mode="${reg?'signin':'register'}">${reg?'Sign in':'Create an account'}</button></p>${session.googleLogin||session.metaLogin?`<div class="auth-divider">or continue with</div><div class="login-providers">${session.googleLogin?'<a class="secondary" href="/api/auth/google" target="_top">Google ↗</a>':''}${session.metaLogin?'<a class="secondary" href="/api/auth/meta" target="_top">Facebook ↗</a>':''}</div>`:''}`}
async function submitAuth(form,d){const reg=form.dataset.mode==='register',status=$('#auth-status'),button=form.querySelector('button.primary');button.disabled=true;status.textContent=reg?'Creating your account…':'Signing in…';
  try{const response=await fetch(reg?'/api/auth/register':'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(reg?{name:d.name,email:d.email,password:d.password}:{email:d.email,password:d.password}),signal:AbortSignal.timeout(15000)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Please try again.');location.reload()}
  catch(error){status.textContent=error.message||'Please try again.';button.disabled=false}}
function requireSignIn(){if(authLoading||authError||!session.user){profile();return false}return true}
function creation(type){if(!requireSignIn())return;if(type==='trip'){page='planner';render();toast('Start with a route and build your trip plan.');return}open(groupForm())}
document.addEventListener('click',e=>{const el=e.target.closest('button,a');if(!el)return;handleExtraClick(el);if(el.dataset.page){page=el.dataset.page;render();window.scrollTo({top:0,behavior:'smooth'})}if(el.dataset.filter){filter.vehicle=el.dataset.filter;render()}if(el.dataset.season){filter.season=el.dataset.season;filter.query='';filter.vehicle='All';page='discover';render();$('#search-form').scrollIntoView({behavior:'smooth',block:'start'})}if(el.dataset.save){if(authLoading)return toast('Please wait while your session loads.');if(authError){profile();return}const id=el.dataset.save;state.saved=state.saved.includes(id)?state.saved.filter(x=>x!==id):[...state.saved,id];persist();render();toast(state.saved.includes(id)?'A new adventure, saved.':'Trip removed from saved.')}if(el.dataset.trip){showTrip(el.dataset.trip)}if(el.dataset.plan){modal.close();page='planner';render();$('#plan-route').value=el.dataset.plan;syncRoute()}if(el.dataset.deleteCrew){if(confirm('Delete this group for everyone? Members and links will be removed. This cannot be undone.'))crewRequest('DELETE',{id:el.dataset.deleteCrew},'Group deleted.');return}if(el.dataset.join){if(!requireSignIn())return;const id=el.dataset.join,crew=crews.find(c=>c.id===id);if(crew)return toggleMembership(crew);state.joined=state.joined.includes(id)?state.joined.filter(x=>x!==id):[...state.joined,id];persist();if(modal.open)modal.close();render();toast(state.joined.includes(id)?'You joined this group in the demo.':'You left this demo group.')}if(el.dataset.score){const g=allGroups().find(g=>g.id===el.dataset.score);open(`<h2>${esc(g.name)}</h2>${isSample(g.id)?`<p>Illustrative credibility score: <strong>${credibility(g)} / 100</strong></p><div class="cost-row">Profile completeness (25%) <strong>${g.profile}%</strong></div><div class="cost-row">Completed-trip rate (45%) <strong>${g.completion}%</strong></div><div class="cost-row">Member reviews (30%) <strong>${g.reviews}%</strong></div><p>These are sample signals, not verified records. No score guarantees a safe trip or a trustworthy organizer.</p>`:'<p>This group is unrated. No completed-trip records or member reviews have been collected.</p>'}`)}if(['profile-button','auth-button','planner-profile','retry-profile'].includes(el.id))profile();if(el.id==='retry-auth'){modal.close();authLoading=true;authError=false;updateProfile();loadSession();}if(el.id==='create-top')creation('trip');if(el.id==='create-group')creation('group');if(el.classList.contains('modal-close'))modal.close();if(el.id==='help-button')open('<h2>A preview of the open road.</h2><p>Roamly is a working local-data prototype. Discover sample routes, save favorites, sign in with email, Google or Facebook, create and join rider crews, and build transparent trip estimates.</p><p>The planner shows per-person estimates and curated places, stays and breaks. Optional AI suggestions become available after service setup. Social buttons open searches on external platforms; they do not import private groups, track members, or verify social profiles.</p><p>Sign-in uses a signed, HttpOnly session cookie. Your profile and vehicles are stored in your account. Crews are shared with every rider. Saved trips, sample-group joins and reminders stay in this browser. Map links open external searches; social imports and live weather are not enabled.</p>')});
function syncRoute(){const custom=$('#plan-route').value==='custom';$('#custom-route').hidden=!custom;$('#plan-from').required=$('#plan-to').required=custom;if(custom)return $('#plan-from').focus();const t=trips.find(t=>t.id===$('#plan-route').value);$('#plan-days').value=t.days;$('#plan-km').value=t.km;$('#plan-vehicle').value=t.vehicle;$('#plan-garage').value='';resetVehicle()}
function resetVehicle(){const v=VEHICLES[$('#plan-vehicle').value];$('#plan-mileage').value=v.mileage;$('#plan-seats').value=v.seats;$('#plan-seats').max=v.maxSeats;$('#plan-fuel').value='Petrol';$('#plan-rate').value=fuelRate('Petrol');fuelLabels()}
function fuelLabels(){const ev=$('#plan-fuel').value==='Electric';$('#mileage-label').textContent=ev?'Efficiency (km/kWh)':'Mileage (km/l)';$('#rate-label').textContent=ev?'Charging cost (₹/kWh)':'Fuel price (₹/liter)'}
document.addEventListener('change',e=>{if(e.target.closest('[data-vehicle-row]')&&e.target.name==='type'){const row=e.target.closest('[data-vehicle-row]'),max=VEHICLES[e.target.value].maxSeats;row.querySelector('legend').textContent=vehicleLabel(e.target.value)+' '+(Number(row.dataset.vehicleRow)+1);const seats=row.querySelector('[name=seats]');seats.max=max;row.querySelector('label[for="'+seats.id+'"]').textContent='Seats (1–'+max+')'}if(e.target.id==='plan-route')syncRoute();if(e.target.id==='plan-vehicle'){ $('#plan-garage').value='';resetVehicle()}if(e.target.id==='plan-fuel'){fuelLabels();$('#plan-rate').value=fuelRate(e.target.value)}if(e.target.id==='plan-garage'){const v=garage?.profile.vehicles.find(v=>v.id===e.target.value);if(v){$('#plan-vehicle').value=v.type;$('#plan-mileage').value=v.mileage;$('#plan-seats').value=v.seats;$('#plan-seats').max=VEHICLES[v.type].maxSeats;$('#plan-fuel').value=v.fuel;$('#plan-rate').value=fuelRate(v.fuel);fuelLabels()}}});
document.addEventListener('submit',e=>{e.preventDefault();const f=e.target,formId=f.getAttribute('id'),d=Object.fromEntries(new FormData(f));if(formId==='search-form'){filter={query:d.query.trim(),vehicle:d.vehicle,season:d.season};updateTrips();document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x.dataset.filter===filter.vehicle))}if(formId==='group-form'){if(!requireSignIn())return;if(!d.name.trim()||!d.city.trim()||!d.description.trim()||!d.meetup.trim()||!d.cadence.trim())return toast('Please fill in all group details.');const {links,error}=cleanLinks(d);if(error)return toast(error);page='groups';const body={name:d.name.trim(),city:d.city.trim(),vehicle:d.vehicle,description:d.description.trim(),meetup:d.meetup.trim(),cadence:d.cadence.trim(),links,visibility:d.visibility==='private'?'private':'public'};f.dataset.edit?crewRequest('PUT',{...body,id:f.dataset.edit},'Group updated.'):crewRequest('POST',body,body.visibility==='private'?'Your private crew is live. Approve riders as they ask to join.':'Your crew is live. Every rider can now see it.')}if(formId==='group-search'){const q=d.query.toLowerCase().trim();const gs=allGroups().filter(g=>`${g.name} ${g.city} ${g.vehicle}`.toLowerCase().includes(q));$('#group-results').innerHTML=gs.map(g=>groupRow(g,true)).join('')||'<div class="empty">No matching crews. Try another city or create your own.</div>'}if(formId==='report-form'){crewRequest('POST',{id:f.dataset.crew,reason:d.reason,note:d.note.trim()},'Thanks. Your report was sent to the moderators.','/api/groups/report')}if(formId==='planner-form'){buildPlan(d)}if(formId==='profile-form'){saveGarage(f)}if(formId==='alert-form'){addCustomAlert(d)}if(formId==='auth-form'){submitAuth(f,d)}});
modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close()}});
const mapLink=q=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q);
const pp=value=>'₹'+Number(value).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
function placeCards(t){return `<div class="place-grid">${t.places.map(p=>`<article class="place-card"><h4>${esc(p.name)}</h4><p>Allow about ${p.minutes} minutes. Optional sightseeing stop; allow extra time for access and queues.</p><a class="text-link" href="${mapLink(p.name)}" target="_blank" rel="noopener noreferrer">Find on Google Maps ↗</a></article>`).join('')}</div>`}
function stayCards(t){return `<div class="place-grid">${t.stays.map(s=>`<article class="place-card"><h4>${esc(s.area)}</h4><p>${esc(s.type)} · illustrative ${money(s.min)}–${money(s.max)} / room / night.</p><a class="text-link" href="${mapLink('hotels and homestays in '+s.area)}" target="_blank" rel="noopener noreferrer">Find stays & current prices ↗</a></article>`).join('')}</div><p class="form-footnote">Suggested areas, not booked or verified properties. Check secure parking, check-in, reviews and availability directly.</p>`}
function stopCards(t){return `<div class="place-grid">${t.stops.map(s=>`<article class="place-card"><h4>${esc(s.name)}</h4><p>${esc(s.purpose)}</p><a class="text-link" href="${mapLink('restaurants fuel stations charging in '+s.name)}" target="_blank" rel="noopener noreferrer">Search facilities ↗</a></article>`).join('')}</div>`}
function showTrip(id){const t=trips.find(t=>t.id===id);if(!t)return;open(`<img class="detail-img" src="${photo(t.image)}" alt="Illustrative road-trip landscape"><div class="eyebrow">${esc(t.tag)}</div><h2>${esc(t.title)}</h2><p>${esc(t.desc)}</p><div class="detail-facts"><span>${esc(t.route)}</span><span>${t.days} days · approximately ${t.km} km</span><span>Typical travel months: ${esc(travelWindow(t))}</span></div><div class="notice">${esc(t.risk)} Verify current conditions before departure.</div><h3>Places to visit</h3>${placeCards(t)}<h3>Rest & food stops</h3>${stopCards(t)}<h3>Where to stay</h3>${stayCards(t)}<p>Starting planning budget: <strong>${money(tripPrice(t))} per person</strong> (2 travelers, Comfort stays). <a class="text-link" href="${t.source}" target="_blank" rel="noopener noreferrer">Tourism reference ↗</a></p><button class="primary" data-plan="${t.id}">Plan this route ↗</button><h3>Road intel · last 30 days</h3><div id="route-intel"><p class="form-footnote">Loading rider reports…</p></div><button class="secondary" data-new-report="${t.id}">＋ Share a road report</button>`);loadIntel(t.id)}
async function saveGarage(form){
  const button=$('#save-profile'),status=$('#profile-status');
  garageDraft=captureProfile();button.disabled=true;status.textContent='Saving your profile…';
  try{const response=await fetch('/api/profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:garageDraft,updatedAt:garage.updatedAt})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Profile could not be saved.');garage=data;status.textContent='Profile and all vehicles saved to your account.';toast('Your garage is saved.');if(page==='planner')render()}
  catch(error){status.textContent=error.message}
  finally{button.disabled=false}
}
function dayPlanHtml(t,days,aiPlan=null){
  const sequence=aiPlan?aiPlan.days.map(d=>({...d,places:d.placeIds?d.placeIds.map(id=>t.places.find(p=>p.id===id)):d.places.map(name=>({name})),stay:{area:d.stayArea},stop:{name:d.breakNote}})):outline(t,days);
  return sequence.map(d=>`<article class="plan-day"><strong>Day ${d.day} · ${esc(d.focus)}</strong><p>${d.places.length?d.places.map(p=>`<a href="${mapLink(p.name)}" target="_blank" rel="noopener noreferrer">${esc(p.name)} ↗</a>${p.minutes?` (~${p.minutes} min)`:''}`).join(' · '):'Keep this day flexible for travel, acclimatization or rest.'}</p><p>Break: ${esc(d.stop.name.replace(/\.+$/,''))}. Stop sooner whenever fatigue or conditions require it.</p>${d.day<days?`<p>Stay search area: <a href="${mapLink('hotels in '+d.stay.area)}" target="_blank" rel="noopener noreferrer">${esc(d.stay.area)} ↗</a></p>`:'<p>Final-day onward or return travel is not automatically included. Adjust distance and add a night if needed.</p>'}</article>`).join('');
}
function budgetHtml(d,r){
  const categories=[['Fuel / charging',r.fuel],['Accommodation',r.accommodation],['Food',r.food],['Tolls, parking & activities',r.extras],['Contingency · 15%',r.contingency]];
  return `<div class="budget-tiles"><div><small>GROUP ESTIMATE</small><strong>${money(r.total)}</strong></div><div><small>PER PERSON · ${d.people} TRAVELERS</small><strong>${pp(r.total/d.people)}</strong></div></div><p class="form-footnote">${d.days} days · ${r.vehicles} ${d.vehicle.toLowerCase()}${r.vehicles>1?'s':''} · ${esc(d.stay)} stays · ${d.distance} km · ${d.mileage} ${d.fuel==='Electric'?'km/kWh':'km/l'}</p><table class="cost-table"><thead><tr><th>Category</th><th>Group</th><th>Per person</th></tr></thead><tbody>${categories.map(([label,value])=>`<tr><td>${label}</td><td>${money(value)}</td><td>${pp(value/d.people)}</td></tr>`).join('')}<tr class="total"><td>Total</td><td>${money(r.total)}</td><td>${pp(r.total/d.people)}</td></tr></tbody></table><p class="form-footnote">Equal split among all travelers; rounded to two decimals per person. These are estimates, not quotes. ${d.days-1} nights, two people per room; food ₹650/person/day; extras ₹200/person/day plus ₹${VEHICLES[d.vehicle].perKm.toFixed(2)}/km/vehicle. Fuel or power price: ${money(d.fuelPrice)} per ${d.fuel==='Electric'?'kWh':'liter'}.</p>`;
}
function buildPlan(data){
  try{
    const custom=data.route==='custom',from=(data.from||'').trim(),to=(data.to||'').trim(),via=(data.via||'').split(',').map(x=>x.trim()).filter(Boolean);
    if(custom&&(from.length<2||to.length<2))throw new Error('Enter where your route starts and ends.');
    if(custom&&(via.length>5||via.some(x=>x.length<2||x.length>60)))throw new Error('Add up to 5 stops, separated by commas.');
    // Custom routes have no curated places or stays; the AI agents fill those in.
    const t=custom?{id:'custom',custom:{from,to,via},title:[from,...via,to].join(' → '),places:[],stays:[],stops:[],months:[],days:Number(data.days),risk:'Custom route: no curated safety notes. Check weather, road closures and permits for every stretch.'}:trips.find(t=>t.id===data.route);if(!t)throw new Error('Choose a valid route.');
    const d={...data,days:Number(data.days),people:Number(data.people),distance:Number(data.distance),mileage:Number(data.mileage),seats:Number(data.seats),fuelPrice:Number(data.fuelPrice),month:Number(data.month)};
    const r=estimate(d);latestPlan={trip:t,data:d,result:r};
    $('#plan-result').innerHTML=`<div class="eyebrow">YOUR ESCAPE, ON PAPER</div><h3 style="margin-top:9px">${esc(t.title)}</h3><div id="plan-budget">${budgetHtml(d,r)}</div><div class="notice">${t.custom?'':t.months.includes(d.month)?'This month broadly matches the listed travel window.':'This month is outside the typical travel window ('+esc(travelWindow(t))+'). Consider another date or route.'} ${esc(t.risk)}</div>${!t.custom&&d.days<t.days?`<p class="notice">This route usually needs about ${t.days} days. Your ${d.days}-day outline may be too rushed; add days or shorten the route.</p>`:''}<div id="ai-expert"></div>${t.custom?'':`<h3 class="subheading">Places to visit</h3>${placeCards(t)}<h3 class="subheading">Stay areas</h3>${stayCards(t)}<h3 class="subheading">Food, fuel & rest stops</h3>${stopCards(t)}`}<div class="section-heading subheading"><h3>Daily outline</h3><span id="plan-source" class="eyebrow">CURATED DRAFT</span></div><div id="daily-plan">${t.custom?'<p class="form-footnote">Your day-by-day plan for this custom route comes from the AI experts.</p>':dayPlanHtml(t,d.days)}</div><div id="ai-tips"></div><p class="form-footnote" id="ai-status">${!aiAvailable?'Live AI is not configured. This is a curated planning draft, with useful places and stop suggestions.':d.days>30?'AI expert plans cover up to 30 days. This is the curated draft.':session.user?'Your AI experts are working on this plan…':'Sign in to have the AI experts plan the route, roads and budget. Only route and trip settings are sent, not your profile.'}</p><div class="button-row"><button class="secondary" id="request-ai" ${!aiAvailable||d.days>30?'disabled':''}>✧ Ask the AI experts</button><button class="secondary" id="plan-alerts">◷ Set time alerts</button><button class="secondary" id="edit-plan" data-edit-plan-draft>✎ Edit & save plan</button><button class="primary" id="download-plan">↓ Download plan</button></div><p class="form-footnote">No live route optimization, bookings or traffic data. Check facilities, opening hours, detours and current road access.${t.source?` <a href="${t.source}" target="_blank" rel="noopener noreferrer">Tourism reference ↗</a>`:''}</p>`;
    if(innerWidth<850)$('#plan-result').scrollIntoView({behavior:'smooth'});
    if(aiAvailable&&session.user&&d.days<=30)requestAI();
  }catch(error){toast(error.message)}
}
const AGENT_LABELS={itinerary:'Itinerary',road:'Road',budget:'Budget',expert:'Expert'};
const bullets=items=>items.length?`<ul class="expert-list">${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';
function agentChips(state){return `<div class="agent-chips">${Object.entries(AGENT_LABELS).map(([k,label])=>`<span class="agent-chip ${state[k]||''}">${state[k]==='done'?'✓':state[k]==='failed'?'!':'◌'} ${label} agent</span>`).join('')}</div>`}
function expertHtml(d,data){
  const {road,budget,expert}=data.agents,b=data.baseline,state=Object.fromEntries(Object.keys(AGENT_LABELS).map(k=>[k,data.agents[k]?'done':'failed']));
  let html=`<div class="section-heading subheading"><h3>AI expert plan</h3><span class="eyebrow">MULTI-AGENT · REVIEW BEFORE TRAVEL</span></div>${agentChips(state)}`;
  if(expert)html+=`<p class="expert-overview">${esc(expert.overview)}</p><p class="form-footnote"><strong>When to go:</strong> ${esc(expert.bestTime)}</p>`;
  if(budget){const extra=budget.additions.reduce((n,a)=>n+a.group,0),total=b.total+extra;
    html+=`<h3 class="subheading">Expert budget</h3><table class="cost-table"><thead><tr><th>Route-specific cost</th><th>Group</th><th>Per person</th></tr></thead><tbody><tr><td>Baseline (fuel, stays, food, extras, contingency)</td><td>${money(b.total)}</td><td>${pp(b.total/d.people)}</td></tr>${budget.additions.map(a=>`<tr><td>${esc(a.label)}<br><small class="muted">${esc(a.note)}</small></td><td>${money(a.group)}</td><td>${pp(a.group/d.people)}</td></tr>`).join('')}<tr class="total"><td>Expert total</td><td>${money(total)}</td><td>${pp(total/d.people)}</td></tr></tbody></table><p class="notice">${esc(budget.verdict)}</p>${budget.savings.length?'<p class="form-footnote"><strong>Save money:</strong></p>'+bullets(budget.savings):''}`}
  if(road)html+=`<h3 class="subheading">Road plan</h3><table class="cost-table road-table"><thead><tr><th>Day</th><th>Route</th><th>Km</th><th>Drive</th></tr></thead><tbody>${road.segments.map(r=>`<tr><td>${r.day}</td><td><strong>${esc(r.from)} → ${esc(r.to)}</strong><br><small class="muted">${esc(r.terrain)}</small><br><small>⚠ ${esc(r.caution)}</small></td><td>${r.km?'~'+r.km:'—'}</td><td>${r.driveHours?'~'+r.driveHours+' h':'—'}</td></tr>`).join('')}</tbody></table><p class="form-footnote"><strong>Start time:</strong> ${esc(road.bestStartTime)}</p><p class="form-footnote"><strong>${d.fuel==='Electric'?'Charging':'Fuel'}:</strong> ${esc(road.fuelAdvice)}</p>${road.permits.length?'<p class="form-footnote"><strong>Permits & documents:</strong></p>'+bullets(road.permits):''}${road.vehicleChecklist.length?'<p class="form-footnote"><strong>Vehicle prep:</strong></p>'+bullets(road.vehicleChecklist):''}`;
  if(expert)html+=`<h3 class="subheading">Expert advice</h3>${expert.health.length?'<p class="form-footnote"><strong>Health & altitude:</strong></p>'+bullets(expert.health):''}${expert.packing.length?'<p class="form-footnote"><strong>Pack:</strong></p>'+bullets(expert.packing):''}<p class="form-footnote"><strong>Network:</strong> ${esc(expert.connectivity)}</p>${expert.etiquette.length?'<p class="form-footnote"><strong>Local etiquette:</strong></p>'+bullets(expert.etiquette):''}${expert.emergency.length?'<p class="form-footnote"><strong>Emergency:</strong></p>'+bullets(expert.emergency):''}`;
  return html;
}
async function requestAI(){
  if(!requireSignIn()||!latestPlan)return;
  const button=$('#request-ai'),status=$('#ai-status'),current=latestPlan,d=current.data;button.disabled=true;status.textContent='Your AI experts are working: itinerary, road, budget and local advice…';
  $('#ai-expert').innerHTML=`<div class="section-heading subheading"><h3>AI expert plan</h3><span class="eyebrow">AGENTS WORKING…</span></div>${agentChips({itinerary:'busy',road:'busy',budget:'busy',expert:'busy'})}`;
  try{const response=await fetch('/api/ai-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({routeId:current.trip.id,...(current.trip.custom?{custom:current.trip.custom}:{}),days:d.days,people:d.people,vehicle:d.vehicle,month:d.month,preferences:d.preferences||'',distance:d.distance,stay:d.stay,fuel:d.fuel,mileage:d.mileage,fuelPrice:d.fuelPrice,seats:d.seats}),signal:AbortSignal.timeout(60000)});const data=await response.json();if(!response.ok)throw new Error(data.error);if(latestPlan!==current||!$('#daily-plan'))return;
    // The road agent's per-day km total replaces the typed or curated distance.
    const aiKm=Math.round((data.agents.road?.segments||[]).reduce((n,x)=>n+x.km,0)),typedKm=d.distance;let kmNote='';
    if(aiKm>=1&&aiKm<=20000&&aiKm!==typedKm){d.distance=aiKm;current.result=data.baseline=estimate(d);$('#plan-budget').innerHTML=budgetHtml(d,current.result);$('#plan-km').value=aiKm;kmNote=`Distance set to ~${aiKm} km from the AI road plan (you entered ${typedKm} km); budget updated. `}
    current.ai=data;$('#ai-expert').innerHTML=expertHtml(d,data);
    if(data.agents.itinerary){$('#daily-plan').innerHTML=dayPlanHtml(current.trip,d.days,data.agents.itinerary);$('#ai-tips').innerHTML='<h3 class="subheading">AI considerations</h3>'+bullets(data.agents.itinerary.tips);$('#plan-source').textContent='AI ITINERARY · REVIEW REQUIRED'}
    status.textContent=kmNote+(data.failed.length?`${data.failed.join(', ')} agent could not answer; that part stays curated. `:'')+'AI estimates and road notes are planning guidance. Confirm prices, permits and current road conditions before travel.'}
  catch(error){if(latestPlan===current&&$('#ai-status')){$('#ai-expert').innerHTML='';$('#ai-status').textContent=error.message||'AI is unavailable. Your curated plan is still available.'}}
  finally{if($('#request-ai'))$('#request-ai').disabled=false}
}
function downloadFile(name,text,type='text/plain'){
  const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function alertsPage(){
  const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;
  return heading('A little reminder goes a long way.','Departure, rest breaks and check-ins — timed around your journey.')+`<div class="notice">In-app alerts work while this page is open and may be delayed by device sleep. For reminders when Roamly is closed, download and import the calendar file into your calendar app, then check its notification settings.</div><div class="planner-layout subheading"><form id="alert-form" class="panel"><h3>Add a reminder</h3><div class="form-grid"><div class="form-field wide"><label for="alert-label">Reminder</label><input id="alert-label" name="label" maxlength="120" required placeholder="Leave for the meetup / take a rest break"></div><div class="form-field wide"><label for="alert-time">Date and time (${esc(timezone)})</label><input id="alert-time" name="at" type="datetime-local" required></div></div><p class="form-footnote">Alerts are stored in this browser for your current account. Calendar exports use UTC to preserve the selected instant across time zones.</p><button class="primary">Add time alert</button></form><section class="panel"><h3>Upcoming & recent alerts</h3><div class="button-row"><button class="secondary" id="export-alerts" ${state.alerts.length?'':'disabled'}>↓ Calendar (.ics)</button><button class="secondary" id="enable-notifications">Enable browser notifications</button></div>${state.alerts.length?state.alerts.slice().sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)).map(a=>`<article class="alert-row"><div><strong>${esc(a.label)}</strong><p>${esc(new Date(a.at).toLocaleString())} · ${a.fired?'Due / delivered':'Scheduled'}</p></div><button class="text-link danger" data-delete-alert="${esc(a.id)}">Remove</button></article>`).join(''):'<p class="form-footnote">No alerts yet. Add one here or generate departure and rest reminders from a trip plan.</p>'}</section></div>`;
}
function addCustomAlert(data){
  const at=new Date(data.at).getTime();if(!data.label.trim()||!Number.isFinite(at)||at<=Date.now())return toast('Enter a reminder and a future date and time.');
  if(state.alerts.length>=500)return toast('Remove some old alerts before adding more.');
  state.alerts.push({id:crypto.randomUUID(),label:data.label.trim(),at:new Date(at).toISOString(),fired:false});persist();render();toast('Time alert added. Keep this page open or export to your calendar.');
}
function schedulePlan(){if(!latestPlan)return;const time=new Date(Date.now()+86400000);time.setHours(6,0,0,0);const local=new Date(time.getTime()-time.getTimezoneOffset()*60000).toISOString().slice(0,16);open(`<h2>Set trip reminders</h2><p>Daily reminders for departure, a break after 2 hours, lunch after 4 hours and check-in after 8 hours. Adjust these to your real schedule in your calendar.</p><div class="form-field"><label for="trip-departure">First departure (${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)})</label><input id="trip-departure" type="datetime-local" value="${local}" required></div><p class="form-footnote">${latestPlan.data.days} days × 4 reminders. In-app alerts need this page open; calendar reminders can work after it closes.</p><button class="primary" id="confirm-trip-alerts">Create reminders</button>`)}
function checkAlerts(){
  if(authLoading||authError)return;let changed=false;
  for(const alert of state.alerts){if(!alert.fired&&Date.parse(alert.at)<=Date.now()){alert.fired=true;changed=true;toast(alert.label);if('Notification'in window&&Notification.permission==='granted'){try{new Notification('Roamly time alert',{body:alert.label,tag:alert.id})}catch{}}}}
  if(changed){persist();if(page==='alerts')render()}
  const due=state.alerts.filter(a=>a.fired&&!a.dismissed),banner=$('#alert-banner');
  banner.hidden=!due.length;banner.innerHTML=due.length?`<strong>◷ ${due.length} reminder${due.length===1?'':'s'} due</strong><p>${due.slice(-3).map(a=>esc(a.label)).join('<br>')}</p><button class="text-link" id="dismiss-due">Dismiss delivered reminders</button> · <button class="text-link" data-page="alerts">View all alerts</button>`:'';
}
function showGroup(id){const g=allGroups().find(x=>x.id===id);if(!g)return;if(g.external){open(`<div class="eyebrow">PUBLIC COMMUNITY DIRECTORY</div><h2>${esc(g.name)}</h2><p>${esc(g.description)}</p><div class="detail-facts"><span>${esc(g.city)}</span><span>${g.vehicle}</span><span>Credibility: unrated</span></div><p>Membership, fees, current meetups and ride eligibility must be checked directly with the community. Roamly has not verified members or safety records and is not affiliated with this group.</p><a class="primary auth-link" href="${g.website}" target="_blank" rel="noopener noreferrer">Visit official community ↗</a>`);return}const detail=groupDetails[g.id]||{organizer:g.organizer||'Group creator',meetup:g.meetup||g.city,cadence:g.cadence||'Ask the organizer',experience:g.experience||'All experience levels',routes:[],rules:['Agree the route, meetup and emergency plan with the organizer.','Wear appropriate protective equipment and follow road rules.']};open(`<div class="eyebrow">${isSample(id)?'SAMPLE COMMUNITY · DETAILS ARE ILLUSTRATIVE':(g.visibility==='private'?'PRIVATE CREW · JOIN BY APPROVAL':'ROAMLY MEMBER CREW · OPEN TO EVERY RIDER')}</div><h2>${esc(g.name)}</h2><p>${esc(g.description)}</p><div class="detail-facts"><span>${esc(g.city)}</span><span>${g.vehicle} · ${g.server?g.members:Number(g.members)+(state.joined.includes(id)?1:0)} members</span><span>${esc(detail.experience)}</span></div><dl class="group-facts"><dt>Organizer</dt><dd>${g.organizerPublicId?`<button class="text-link" data-rider="${esc(g.organizerPublicId)}">${esc(detail.organizer)} ↗</button>`:esc(detail.organizer)}</dd><dt>Meetup area</dt><dd><a href="${mapLink(detail.meetup)}" target="_blank" rel="noopener noreferrer">${esc(detail.meetup)} ↗</a></dd><dt>Ride cadence</dt><dd>${esc(detail.cadence)}</dd></dl>${g.linksHidden?'<p class="notice">🔒 Chat and social links are shared with members once the organizer or a co-lead approves your request.</p>':''}${ownLinks(g)?`<h3>Join the conversation</h3><div class="group-links">${ownLinks(g)}</div>`:''}${linkList(g.organizerLinks)?`<h3>Connect with ${esc(detail.organizer)}</h3><div class="group-links">${linkList(g.organizerLinks)}</div>`:''}${g.server?`<h3>Group rides</h3><div id="crew-rides"><p class="form-footnote">Loading rides…</p></div>${['owner','colead'].includes(g.myRole)?`<div class="button-row"><button class="secondary" data-plan-ride="${esc(id)}">＋ Plan a ride</button></div>`:''}`:''}${g.server&&g.joined?'<h3>Top riders</h3><div id="crew-leaders"><p class="form-footnote">Loading…</p></div>':''}<h3>Riding / driving expectations</h3><ul>${detail.rules.map(r=>`<li>${esc(r)}</li>`).join('')}</ul><h3>Routes this crew is into</h3>${detail.routes.length?detail.routes.map(id=>{const t=trips.find(t=>t.id===id);return t?`<div class="alert-row"><span>${esc(t.title)}<small> · ${money(tripPrice(t))} / person estimate</small></span><button class="text-link" data-plan="${t.id}">Plan ↗</button></div>`:''}).join(''):'<p>No specific routes listed yet. Agree a trip with the organizer.</p>'}<p class="form-footnote">No live meetup or trip date has been verified. Home cities and meeting areas are not live member locations.</p><div class="button-row">${g.myRole==='owner'?'':`<button class="primary" data-join="${esc(id)}">${g.server?(g.joined?'Leave this group':g.pending?'Cancel request':g.visibility==='private'?'Request to join':'Join this group'):(state.joined.includes(id)?'Leave this group':'Join this group')}</button>`}${g.server&&!g.joined&&g.visibility!=='private'&&session.user?`<button class="secondary" data-follow-crew="${esc(id)}" data-on="${g.following?'0':'1'}">${g.following?'Following ✓':'Follow crew'}</button>`:''}${g.server&&(g.joined||session.user?.admin)?`<button class="secondary" data-members="${esc(id)}">Members${g.pendingRequests?` · ${g.pendingRequests} request${g.pendingRequests>1?'s':''}`:''}</button>`:''}${g.mine?`<button class="secondary" data-edit-crew="${esc(id)}">Edit group</button><button class="secondary" data-delete-crew="${esc(id)}">Delete this group</button>`:''}${g.server&&!g.mine?`<button class="text-link" data-report-crew="${esc(id)}" ${g.reported?'disabled':''}>${g.reported?'Reported ✓':'⚑ Report this group'}</button>`:''}</div>${g.underReview?'<p class="notice">This group was reported by several riders and is hidden from others until a moderator reviews it.</p>':''}`);if(g.server){loadCrewRides(id);if(g.joined)loadLeaders(id)}}
const groupDetails={weekend:{organizer:'Roamly demo host · Bengaluru',meetup:'Hebbal, Bengaluru',cadence:'Saturday mornings · confirm each ride',experience:'Beginner friendly',routes:['coorg','hampi','ooty'],rules:['Helmet and protective riding gear required.','Keep a lead and sweep rider; regroup at agreed stops.','No racing. Carry water, tools and a puncture kit.']},overland:{organizer:'Roamly demo host · Mumbai',meetup:'Vashi, Navi Mumbai',cadence:'One weekend convoy per month · illustrative',experience:'Intermediate',routes:['konkan','goa','kutch'],rules:['Seat belts for everyone and no phone use while driving.','Share fuel and toll assumptions before departure.','Respect convoy spacing and agree rest stops.']},himalayan:{organizer:'Roamly demo host · Delhi',meetup:'India Gate area, New Delhi',cadence:'Seasonal mountain expeditions · confirm dates',experience:'Experienced mountain riders',routes:['spiti','ladakh','rishikesh'],rules:['Allow acclimatization and a weather buffer.','Check vehicle condition and fuel range before remote sections.','Confirm permits, first-aid arrangements and local access.']}};
const REPORT_REASONS={spam:'Spam or advertising',scam:'Scam or asks for money',unsafe:'Unsafe riding or meetups',offensive:'Offensive or hateful',fake:'Fake or misleading',other:'Something else'};
function reportForm(id){const g=crews.find(c=>c.id===id);if(!g)return;open(`<div class="eyebrow">REPORT A GROUP</div><h2>${esc(g.name)}</h2><p>Tell us what is wrong. Reports are private; the organizer does not see who reported. After several reports a group is hidden until a moderator reviews it.</p><form id="report-form" data-crew="${esc(id)}"><div class="form-grid"><div class="form-field wide"><label for="report-reason">Reason</label><select id="report-reason" name="reason" required>${Object.entries(REPORT_REASONS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div><div class="form-field wide"><label for="report-note">Details <small>(optional)</small></label><textarea id="report-note" name="note" maxlength="300"></textarea></div></div><button class="primary">Send report</button></form>`)}
async function moderationQueue(){try{const r=await fetch('/api/moderation');const d=await r.json();if(!r.ok)throw new Error(d.error);open(`<div class="eyebrow">MODERATION QUEUE · ${d.queue.length} GROUP${d.queue.length===1?'':'S'}</div><h2>Reported groups</h2>${d.queue.map(c=>`<article class="plan-day"><strong>${esc(c.name)}</strong> · ${esc(c.city)} · by ${esc(c.organizer)} <span class="eyebrow">${c.status==='hidden'?'HIDDEN':'VISIBLE'}</span><p>${esc(c.description)}</p>${linkList(c.links)?`<div class="group-links">${linkList(c.links)}</div>`:''}<ul class="expert-list">${c.reports.map(x=>`<li><strong>${esc(REPORT_REASONS[x.reason]||x.reason)}</strong>${x.note?' · '+esc(x.note):''}</li>`).join('')||'<li>No open reports</li>'}</ul><div class="button-row"><button class="secondary" data-moderate="restore" data-crew="${esc(c.id)}">Keep / restore</button><button class="primary" data-moderate="remove" data-crew="${esc(c.id)}">Remove group</button></div></article>`).join('')||'<p>Nothing to review. Nice and quiet.</p>'}`)}catch(error){toast(error.message||'Queue unavailable.')}}
async function moderate(id,action){try{const r=await fetch('/api/moderation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action})});const d=await r.json();if(!r.ok)throw new Error(d.error);toast(action==='restore'?'Group restored.':'Group removed.');await loadCrews();moderationQueue()}catch(error){toast(error.message||'Please try again.')}}
function handleExtraClick(el){if(handleCommunityClick(el)||handleRideClick(el)||handlePlanClick(el)||handleFeedClick(el))return;if(el.id==='delete-account')return deleteAccount();if(el.id==='moderation-queue')return moderationQueue();if(el.dataset.moderate){if(el.dataset.moderate==='remove'&&!confirm('Remove this group for everyone?'))return;return moderate(el.dataset.crew,el.dataset.moderate)}if(el.dataset.reportCrew){if(!requireSignIn())return;return reportForm(el.dataset.reportCrew)}
  if(el.dataset.authMode){$('#modal-body').innerHTML=authModal(el.dataset.authMode);$('#auth-form input').focus()}
  if(el.id==='add-vehicle'){garageDraft=captureProfile();if(garageDraft.vehicles.length>=10)return;garageDraft.vehicles.push({id:crypto.randomUUID(),type:'Bike',make:'',model:'',year:new Date().getFullYear(),fuel:'Petrol',mileage:VEHICLES.Bike.mileage,seats:VEHICLES.Bike.seats,engineCc:350});renderProfile()}
  if(el.dataset.removeVehicle!==undefined){garageDraft=captureProfile();garageDraft.vehicles.splice(Number(el.dataset.removeVehicle),1);renderProfile()}
  if(el.dataset.group)showGroup(el.dataset.group);
  if(el.id==='request-ai')requestAI();
  if(el.id==='download-plan'&&$('#plan-result'))downloadFile('roamly-trip-plan.txt',$('#plan-result').innerText);
  if(el.id==='plan-alerts')schedulePlan();
  if(el.id==='confirm-trip-alerts'){try{const alerts=tripAlerts({title:latestPlan.trip.title,departure:$('#trip-departure').value,days:latestPlan.data.days});if(state.alerts.length+alerts.length>500)throw new Error('Remove old alerts before creating more (500 maximum).');state.alerts.push(...alerts);persist();modal.close();page='alerts';render();toast('Trip reminders created. Export them to your calendar for alerts when the app is closed.')}catch(error){toast(error.message)}}
  if(el.id==='export-alerts'){const future=state.alerts.filter(a=>Date.parse(a.at)>Date.now());if(!future.length)return toast('There are no future alerts to export.');downloadFile('roamly-reminders.ics',calendar(future),'text/calendar')}
  if(el.dataset.deleteAlert){state.alerts=state.alerts.filter(a=>a.id!==el.dataset.deleteAlert);persist();render();checkAlerts()}
  if(el.id==='dismiss-due'){state.alerts.forEach(a=>{if(a.fired)a.dismissed=true});persist();checkAlerts()}
  if(el.id==='enable-notifications'){if(!('Notification'in window))return toast('Browser notifications are not supported here. Use the calendar export.');Notification.requestPermission().then(p=>toast(p==='granted'?'Notifications enabled while Roamly is running.':'Notifications were not enabled. In-app alerts and calendar export are still available.')).catch(()=>toast('Use calendar export for reminders on this device.'))}
}
setInterval(checkAlerts,15000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkAlerts()});

{const err=new URLSearchParams(location.search).get('login_error');if(err==='google'||err==='meta'){history.replaceState(null,'',location.pathname+location.hash);setTimeout(()=>toast((err==='meta'?'Facebook':'Google')+' sign-in did not complete. Please try again.'),0)}}
render();
loadSession();

// Permanently deletes the account and everything stored for it on the server, then clears this browser's copy.
async function deleteAccount(){
  if(prompt('This permanently deletes your account, profile, garage, crews you organize, memberships and reports. It cannot be undone.\n\nType DELETE to confirm.')!=='DELETE')return toast('Account not deleted.');
  try{
    const r=await fetch('/api/account',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirm:'DELETE'})});
    if(!r.ok)return toast((await r.json().catch(()=>({}))).error||'Your account was not deleted. Please try again.');
    try{localStorage.removeItem(storageKey)}catch{}
    location.href='/?account_deleted=1';
  }catch{toast('Your account was not deleted. Please try again.')}
}
if(new URLSearchParams(location.search).get('account_deleted')){history.replaceState(null,'',location.pathname+location.hash);setTimeout(()=>toast('Your account and its data were deleted.'),0)}

// ---- Community: roles, private crews, rider cards, members, admin dashboard ----
const ROLE_LABELS={owner:'Owner',colead:'Co-lead',member:'Member'};
const shortDate=iso=>iso?new Date(iso).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'—';
const api=async(url,options)=>{const r=await fetch(url,options&&{...options,headers:{'Content-Type':'application/json'},body:JSON.stringify(options.body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Please try again.');return d};

function joinLabel(g,joined){
  if(!g.server)return joined?'Joined ✓':'Join +';
  return g.myRole==='owner'?'Owner ★':g.joined?'Joined ✓':g.pending?'Requested ⧗':g.visibility==='private'?'Request 🔒':'Join +';
}
function toggleMembership(crew){
  if(crew.myRole==='owner')return showGroup(crew.id);
  const want=!(crew.joined||crew.pending);
  if(!want&&crew.joined&&!confirm(`Leave ${crew.name}?`))return;
  crewRequest('PATCH',{id:crew.id,joined:want},want?(crew.visibility==='private'?'Request sent. The organizer or a co-lead will review it.':'You joined this group.'):(crew.pending?'Request cancelled.':'You left this group.'));
}

function groupForm(g=null){
  const v=k=>esc(g?.[k]||''),ph={whatsapp:'chat.whatsapp.com/invite-code',telegram:'t.me/yourgroup',instagram:'instagram.com/yourgroup',youtube:'youtube.com/@yourchannel',facebook:'facebook.com/groups/yourgroup',website:'yourgroup.in'};
  return `<h2>${g?'Edit your crew.':'Good company starts here.'}</h2><p>${g?'Changes show to every rider straight away.':'Create a crew for your next adventure. Your name and your profile\'s social links are shown as the organizer. You become its owner and can add co-leads.'}</p>
  <form id="group-form" ${g?`data-edit="${esc(g.id)}"`:''}><div class="form-grid"><div class="form-field wide"><label for="new-name">Group name</label><input id="new-name" name="name" required maxlength="60" value="${v('name')}"></div>
  <div class="form-field"><label for="new-city">Home city</label><input id="new-city" name="city" required maxlength="60" value="${v('city')}"></div><div class="form-field"><label for="new-vehicle">Your ride</label><select id="new-vehicle" name="vehicle">${['Bike','Car'].map(x=>`<option ${g?.vehicle===x?'selected':''}>${x}</option>`).join('')}</select></div>
  <div class="form-field wide"><label for="new-visibility">Who can join</label><select id="new-visibility" name="visibility"><option value="public" ${g?.visibility!=='private'?'selected':''}>Open: any rider can join and see the chat links</option><option value="private" ${g?.visibility==='private'?'selected':''}>Private: riders ask to join; links are for approved members</option></select></div>
  <div class="form-field wide"><label for="new-meetup">Meeting area</label><input id="new-meetup" name="meetup" maxlength="100" required placeholder="City area or public meeting point" value="${v('meetup')}"></div>
  <div class="form-field wide"><label for="new-cadence">Ride cadence / meetup time</label><input id="new-cadence" name="cadence" maxlength="100" required placeholder="Sunday mornings, 06:30 — confirm each ride" value="${v('cadence')}"></div>
  <div class="form-field wide"><label for="new-description">What's your group about?</label><textarea id="new-description" name="description" required maxlength="300">${v('description')}</textarea></div>
  ${Object.entries(ph).map(([k,p])=>`<div class="form-field"><label for="new-${k}">${LINK_KINDS[k].label} <small>(optional)</small></label><input id="new-${k}" name="${k}" type="text" inputmode="url" maxlength="200" placeholder="${p}" value="${esc(g?.links?.[k]||'')}"></div>`).join('')}
  <button class="primary">${g?'Save changes':'Create crew ↗'}</button></div></form>`;
}

async function showRider(id){
  if(!requireSignIn())return;
  try{
    const {rider:x}=await api('/api/riders/'+encodeURIComponent(id));
    const years=x.ridingSince?new Date().getFullYear()-x.ridingSince:null;
    const facts=[x.homeCity&&'⌖ '+x.homeCity,x.experience,years!==null&&(years<1?'Riding since '+x.ridingSince:`${years} year${years===1?'':'s'} riding`),x.pace&&x.pace+' pace'].filter(Boolean);
    open(`<div class="eyebrow">RIDER CARD${x.isYou?' · THIS IS HOW RIDERS SEE YOU':''}</div><h2>${esc(x.name)}</h2>
    <div class="detail-facts">${facts.map(f=>`<span>${esc(f)}</span>`).join('')}<span>Member since ${shortDate(x.memberSince)}</span></div>
    <div class="rider-stats"><div><strong>${x.stats.rides}</strong><small>group rides</small></div><div><strong>${x.stats.km.toLocaleString('en-IN')}</strong><small>km ridden</small></div><div><strong>${x.stats.reports}</strong><small>road reports</small></div><div><strong>${x.stats.followers}</strong><small>followers</small></div></div>
    ${x.stats.badges.length?`<div class="tag-list badges">${x.stats.badges.map(b=>`<span>🏅 ${esc(b.label)}</span>`).join('')}</div>`:''}
    ${x.isYou?'':`<div class="button-row"><button class="${x.following?'secondary':'primary'}" data-follow-rider="${esc(x.publicId)}" data-on="${x.following?'0':'1'}">${x.following?'Following ✓':'Follow'}</button><button class="text-link" data-rider-posts="${esc(x.publicId)}" data-name="${esc(x.name)}">See posts ↗</button></div>`}
    ${x.bio?`<p>${esc(x.bio)}</p>`:''}
    ${x.styles.length?`<h3>Rides</h3><div class="tag-list">${x.styles.map(s=>`<span>${esc(s)}</span>`).join('')}</div>`:''}
    ${x.lookingFor.length?`<h3>Looking for</h3><div class="tag-list">${x.lookingFor.map(s=>`<span>${esc(s)}</span>`).join('')}</div>`:''}
    ${x.regions||x.languages?`<dl class="group-facts">${x.regions?`<dt>Has ridden</dt><dd>${esc(x.regions)}</dd>`:''}${x.languages?`<dt>Speaks</dt><dd>${esc(x.languages)}</dd>`:''}</dl>`:''}
    ${x.vehicles.length?`<h3>Garage</h3><ul>${x.vehicles.map(v=>`<li>${vehicleLabel(v.type)} · ${esc(v.make)} ${esc(v.model)} (${v.year})</li>`).join('')}</ul>`:''}
    ${x.groups.length?`<h3>Crews</h3>${x.groups.map(g=>`<div class="alert-row"><span>${esc(g.name)}<small> · ${esc(g.city)} · ${ROLE_LABELS[g.role]||'Member'}</small></span><button class="text-link" data-group="${esc(g.id)}">Open ↗</button></div>`).join('')}`:''}
    ${linkList(x.links)?`<h3>Connect</h3><div class="group-links">${linkList(x.links)}</div>`:''}
    ${x.isYou?`<div class="button-row"><button class="primary" data-edit-profile>Edit my profile</button></div><p class="form-footnote">Profile ${x.completeness}% complete.</p>`:''}`);
  }catch(error){toast(error.message||'Profile unavailable.')}
}

async function showMembers(id){
  try{
    const g=crews.find(c=>c.id===id),d=await api('/api/groups/members?id='+encodeURIComponent(id));
    const pending=d.members.filter(m=>m.status==='pending'),active=d.members.filter(m=>m.status==='active');
    const actions=m=>{
      if(!d.canManage||m.role==='owner'||!m.publicId)return '';
      const b=(action,label,cls='secondary')=>`<button class="${cls}" data-member-action="${action}" data-crew="${esc(id)}" data-rider="${esc(m.publicId)}">${label}</button>`;
      if(m.status==='pending')return b('approve','Approve','primary')+b('reject','Decline');
      return (d.myRole==='owner'?(m.role==='member'?b('promote','Make co-lead'):b('demote','Remove co-lead')):'')+(d.myRole==='owner'||m.role==='member'?b('remove','Remove','text-link danger'):'');
    };
    const row=m=>`<div class="member-row"><span>${m.publicId?`<button class="text-link" data-rider="${esc(m.publicId)}">${esc(m.name)}</button>`:esc(m.name)} <span class="role-badge role-${m.role}">${ROLE_LABELS[m.role]||'Member'}</span><small> · ${m.status==='pending'?'asked':'joined'} ${shortDate(m.joinedAt)}</small></span><span class="member-actions">${actions(m)}</span></div>`;
    open(`<div class="eyebrow">${esc(g?.name||'CREW').toUpperCase()} · ${active.length} MEMBER${active.length===1?'':'S'}</div><h2>Members</h2>
    ${pending.length?`<h3>Join requests · ${pending.length}</h3>${pending.map(row).join('')}`:''}
    <h3>Crew</h3>${active.map(row).join('')}
    <p class="form-footnote">${d.canManage?(d.myRole==='owner'?'As owner you approve requests, choose co-leads and remove riders. Co-leads can approve requests and remove members.':'As co-lead you can approve requests and remove members.'):'Only the owner and co-leads can manage members.'}</p>`);
  }catch(error){toast(error.message||'Members unavailable.')}
}
async function memberAction(el){
  const {memberAction:action,crew:id,rider}=el.dataset;
  if(action==='remove'&&!confirm('Remove this rider from the crew?'))return;
  try{await api('/api/groups/members',{method:'POST',body:{id,rider,action}});toast({approve:'Request approved.',reject:'Request declined.',remove:'Rider removed.',promote:'Now a co-lead.',demote:'Co-lead removed.'}[action]);await loadCrews();showMembers(id)}
  catch(error){toast(error.message)}
}

// Admin dashboard (admins only; the server checks every call).
let adminView='riders';
function adminPage(){return heading('Run the road club.','Riders, crews and reports in one place.')+`<div class="admin-stats" id="admin-stats"><p class="form-footnote">Loading…</p></div>
  <div class="button-row"><button class="${adminView==='riders'?'primary':'secondary'}" data-admin-view="riders">Riders</button><button class="${adminView==='groups'?'primary':'secondary'}" data-admin-view="groups">Crews</button><button class="${adminView==='posts'?'primary':'secondary'}" data-admin-view="posts">Reported posts</button><button class="secondary" id="moderation-queue">⚑ Reported crews</button></div>
  <form id="admin-search" class="search-panel"><div class="search-field"><label for="admin-q">SEARCH ${adminView==='riders'?'RIDERS':'CREWS'}</label><input id="admin-q" name="q" maxlength="80" placeholder="${adminView==='riders'?'Name or email':'Crew name or city'}"></div><button class="primary">Search ↗</button></form><div id="admin-list" class="admin-list"></div>`}
async function loadAdmin(q=''){
  try{
    const [{overview:o},list]=await Promise.all([api('/api/admin?view=overview'),api(`/api/admin?view=${adminView}&q=${encodeURIComponent(q)}`)]);
    const tile=(n,label)=>`<div><strong>${n}</strong><small>${label}</small></div>`;
    $('#admin-stats').innerHTML=tile(o.riders,'riders')+tile(o.newRidersThisWeek,'new this week')+tile(o.activeGroups,'active crews')+tile(o.openReports,'open reports')+tile(o.hiddenGroups,'hidden crews')+tile(o.suspended,'suspended')+tile(o.aiPlansToday,'AI plans today');
    if(adminView==='posts'){$('#admin-list').innerHTML=list.posts.map(x=>`<div class="member-row"><span><strong>${esc(x.author)}</strong> <span class="role-badge role-${x.status==='active'?'member':'suspended'}">${x.status}</span>${x.kind==='report'?' · road report · '+esc(x.place):''}<small><br>${esc(x.body.slice(0,240))}<br>${x.reasons.length} report${x.reasons.length===1?'':'s'}: ${x.reasons.map(esc).join(', ')||'—'} · ${shortDate(x.createdAt)}</small></span><span class="member-actions">${x.status!=='active'?`<button class="secondary" data-admin-post="restore" data-post="${esc(x.id)}">Restore</button>`:`<button class="secondary" data-admin-post="restore" data-post="${esc(x.id)}">Keep</button>`}${x.status!=='removed'?`<button class="text-link danger" data-admin-post="remove" data-post="${esc(x.id)}">Remove</button>`:''}</span></div>`).join('')||'<p>No reported posts.</p>';return}
    $('#admin-list').innerHTML=adminView==='riders'
      ?(list.riders.map(r=>`<div class="member-row"><span><button class="text-link" data-rider="${esc(r.publicId)}">${esc(r.name)}</button>${r.role==='admin'?' <span class="role-badge role-owner">Admin</span>':''}${r.status==='suspended'?' <span class="role-badge role-suspended">Suspended</span>':''}<small><br>${esc(r.email||'no email')} · ${esc(r.provider)} · joined ${shortDate(r.createdAt)} · seen ${shortDate(r.lastSeenAt)} · owns ${r.groupsOwned} crew${r.groupsOwned===1?'':'s'}${r.suspendReason?' · reason: '+esc(r.suspendReason):''}</small></span><span class="member-actions">${r.isYou?'<small>You</small>':`<button class="secondary" data-admin-action="${r.status==='suspended'?'unsuspend':'suspend'}" data-rider="${esc(r.publicId)}">${r.status==='suspended'?'Unsuspend':'Suspend'}</button><button class="secondary" data-admin-action="${r.role==='admin'?'remove-admin':'make-admin'}" data-rider="${esc(r.publicId)}">${r.role==='admin'?'Remove admin':'Make admin'}</button>`}</span></div>`).join('')||'<p>No riders found.</p>')
      :(list.groups.map(g=>`<div class="member-row"><span><strong>${esc(g.name)}</strong> <span class="role-badge role-${g.status==='active'?'member':'suspended'}">${g.status}</span>${g.visibility==='private'?' 🔒':''}<small><br>${esc(g.city)} · ${g.vehicle} · by ${esc(g.organizer)} · ${g.members} member${g.members===1?'':'s'} · ${g.reports} report${g.reports===1?'':'s'} · created ${shortDate(g.createdAt)}</small></span><span class="member-actions">${g.status!=='active'?`<button class="secondary" data-admin-crew="restore" data-crew="${esc(g.id)}">Restore</button>`:''}${g.status!=='removed'?`<button class="text-link danger" data-admin-crew="remove" data-crew="${esc(g.id)}">Remove</button>`:''}</span></div>`).join('')||'<p>No crews found.</p>');
  }catch(error){$('#admin-stats').innerHTML=`<p class="notice">${esc(error.message)}</p>`}
}
async function adminAction(el){
  const {adminAction:action,rider}=el.dataset;let reason='';
  if(action==='suspend'){reason=prompt('Why are you suspending this rider? (shown to admins only)')??null;if(reason===null)return}
  if(action==='make-admin'&&!confirm('Give this rider full admin access?'))return;
  try{await api('/api/admin',{method:'POST',body:{rider,action,reason:reason.trim()}});toast({suspend:'Rider suspended.',unsuspend:'Rider restored.','make-admin':'Rider is now an admin.','remove-admin':'Admin access removed.'}[action]);loadAdmin($('#admin-q')?.value||'')}
  catch(error){toast(error.message)}
}
async function adminCrew(el){
  const {adminCrew:action,crew:id}=el.dataset;
  if(action==='remove'&&!confirm('Remove this crew for everyone?'))return;
  try{await api('/api/moderation',{method:'POST',body:{id,action}});toast(action==='restore'?'Crew restored.':'Crew removed.');await loadCrews();loadAdmin($('#admin-q')?.value||'')}
  catch(error){toast(error.message)}
}
document.addEventListener('submit',e=>{if(e.target.id==='admin-search')loadAdmin(String(new FormData(e.target).get('q')||'').trim())});

function handleCommunityClick(el){
  const d=el.dataset;
  if(d.rider&&!d.memberAction&&!d.adminAction){showRider(d.rider);return true}
  if(d.members){showMembers(d.members);return true}
  if(d.memberAction){memberAction(el);return true}
  if(d.editCrew){const g=crews.find(c=>c.id===d.editCrew);if(g)open(groupForm(g));return true}
  if(d.editProfile!==undefined){profile();return true}
  if(d.adminView){adminView=d.adminView;render();return true}
  if(d.adminAction){adminAction(el);return true}
  if(d.adminCrew){adminCrew(el);return true}
  return false;
}

// ---- Group rides: list, crew rides, ride form, ride detail with RSVP, checklist, updates and AI brief ----
let rideFilter='all',rideChecklist=[];
const PHASE_LABELS={upcoming:'Upcoming',ongoing:'On the road',past:'Done',cancelled:'Cancelled'};
const dayMonth=d=>{const x=new Date(d+'T00:00:00');return {day:x.getDate(),month:x.toLocaleString('en-IN',{month:'short'})}};
const rideDates=r=>{const s=new Date(r.startDate+'T00:00:00'),e=new Date(s);e.setDate(e.getDate()+r.days-1);const f=x=>x.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'});return r.days>1?`${f(s)} – ${f(e)}`:f(s)};
const rsvpLabel={going:'You are going ✓',maybe:'You said maybe',waitlist:'On the waitlist ⧗'};

function ridesPage(){
  return heading('Ride together.','Upcoming rides from your crews and open crews across Roamly.',`<div class="button-row"><button class="primary" data-page="groups">Find a crew ↗</button></div>`)+
  `<div class="button-row ride-filters"><button class="${rideFilter==='all'?'primary':'secondary'}" data-ride-filter="all">All upcoming</button>${session.user?`<button class="${rideFilter==='mine'?'primary':'secondary'}" data-ride-filter="mine">My rides</button>`:''}<button class="${rideFilter==='past'?'primary':'secondary'}" data-ride-filter="past">Past rides</button></div><div id="ride-list" class="ride-list"><p class="form-footnote">Loading rides…</p></div>`;
}
function rideCard(r){
  const {day,month}=dayMonth(r.startDate),full=r.going>=r.capacity;
  return `<article class="ride-card ${r.phase}"><div class="ride-date"><strong>${day}</strong><span>${month}</span></div><div class="ride-info"><h3><button class="card-action" data-ride="${esc(r.id)}">${esc(r.title)} ↗</button></h3>
  <p>${esc(r.crewName)}${r.crewVisibility==='private'?' 🔒':''} · ${esc(r.routeLabel)} · ${r.days} day${r.days>1?'s':''} · ${vehicleLabel(r.vehicle)}</p>
  <p>⌖ ${esc(r.meetupPoint)} · ${esc(r.meetupTime)} · ${r.going}/${r.capacity} going${r.waitlist?` · ${r.waitlist} waitlisted`:''}${r.minExperience!=='Beginner'?` · ${esc(r.minExperience)}+`:''}</p></div>
  <span class="ride-status">${r.phase!=='upcoming'?PHASE_LABELS[r.phase]:r.myRsvp?rsvpLabel[r.myRsvp]:full?'Full · waitlist':'Seats open'}</span></article>`;
}
async function loadRides(){
  try{const q=rideFilter==='mine'?'?mine=1':rideFilter==='past'?'?past=1':'';const {rides}=await api('/api/rides'+q);
    const list=rideFilter==='past'?rides.filter(r=>r.phase==='past'||r.phase==='cancelled').reverse():rides.filter(r=>r.phase!=='past');
    $('#ride-list').innerHTML=list.map(rideCard).join('')||`<div class="empty">${rideFilter==='mine'?'You have not RSVP\'d to any rides yet.':'No rides planned yet. Crew owners and co-leads can plan one from their crew page.'}<br><br><button class="primary" data-page="groups">Find a crew ↗</button></div>`}
  catch(error){$('#ride-list').innerHTML=`<p class="notice">${esc(error.message)}</p>`}
}
async function loadCrewRides(crewId){
  try{const {rides}=await api('/api/rides?crew='+encodeURIComponent(crewId));const el=$('#crew-rides');if(!el)return;
    el.innerHTML=rides.length?rides.map(r=>`<div class="alert-row"><span>${esc(r.title)}<small> · ${rideDates(r)} · ${r.going}/${r.capacity} going${r.myRsvp?' · '+rsvpLabel[r.myRsvp]:''}</small></span><button class="text-link" data-ride="${esc(r.id)}">Open ↗</button></div>`).join(''):'<p class="form-footnote">No upcoming rides yet.</p>'}
  catch{const el=$('#crew-rides');if(el)el.innerHTML='<p class="form-footnote">Rides could not be loaded.</p>'}
}

function rideForm(crewId,r=null){
  const crew=crews.find(c=>c.id===crewId),today=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
  const v=(k,d='')=>esc(r?.[k]??d),custom=r?.routeId==='custom';
  return `<div class="eyebrow">${esc(crew?.name||'CREW').toUpperCase()}</div><h2>${r?'Edit ride.':'Plan a group ride.'}</h2><p>${r?'Riders see changes straight away. Changing the route, dates or vehicle clears the AI brief so you can regenerate it.':'Crew members RSVP, the ride lead posts updates, and one AI brief is shared with everyone.'}</p>
  <form id="ride-form" data-crew="${esc(crewId)}" ${r?`data-ride-edit="${esc(r.id)}"`:''}><div class="form-grid">
  <div class="form-field wide"><label for="ride-title">Ride title</label><input id="ride-title" name="title" required maxlength="80" value="${v('title')}" placeholder="Sunday sunrise to Lavasa"></div>
  <div class="form-field wide"><label for="ride-route">Route</label><select id="ride-route" name="routeId">${trips.map(t=>`<option value="${t.id}" data-km="${t.km}" data-days="${t.days}" data-vehicle="${t.vehicle}" ${r?.routeId===t.id?'selected':''}>${esc(t.title)} · ${esc(t.route)}</option>`).join('')}<option value="custom" ${custom?'selected':''}>✎ My own route</option></select></div>
  <div id="ride-custom" class="form-grid wide" ${custom?'':'hidden'} style="grid-column:1/-1"><div class="form-field"><label for="ride-from">From</label><input id="ride-from" name="from" maxlength="80" value="${esc(r?.route?.from||'')}"></div><div class="form-field"><label for="ride-to">To</label><input id="ride-to" name="to" maxlength="80" value="${esc(r?.route?.to||'')}"></div><div class="form-field wide"><label for="ride-via">Via <small>(comma separated, up to 5)</small></label><input id="ride-via" name="via" maxlength="300" value="${esc((r?.route?.via||[]).join(', '))}"></div></div>
  <div class="form-field"><label for="ride-date">Start date</label><input id="ride-date" name="startDate" type="date" min="${today}" required value="${v('startDate')}"></div>
  <div class="form-field"><label for="ride-days">Days</label><input id="ride-days" name="days" type="number" min="1" max="30" required value="${v('days',1)}"></div>
  <div class="form-field"><label for="ride-meetup">Meetup point</label><input id="ride-meetup" name="meetupPoint" required maxlength="120" value="${v('meetupPoint',crew?.meetup||'')}"></div>
  <div class="form-field"><label for="ride-time">Meetup time</label><input id="ride-time" name="meetupTime" type="time" required value="${v('meetupTime','06:00')}"></div>
  <div class="form-field"><label for="ride-capacity">Seats (riders)</label><input id="ride-capacity" name="capacity" type="number" min="2" max="100" required value="${v('capacity',12)}"></div>
  <div class="form-field"><label for="ride-exp">Minimum experience</label><select id="ride-exp" name="minExperience">${['Beginner','Intermediate','Experienced'].map(x=>`<option ${r?.minExperience===x?'selected':''}>${x}</option>`).join('')}</select></div>
  <div class="form-field"><label for="ride-vehicle">Vehicle</label><select id="ride-vehicle" name="vehicle">${['Bike','Car'].map(x=>`<option ${(r?.vehicle||crew?.vehicle)===x?'selected':''}>${x}</option>`).join('')}</select></div>
  <div class="form-field"><label for="ride-stay">Stay budget</label><select id="ride-stay" name="stay">${['Budget','Comfort','Premium'].map(x=>`<option ${(r?.stay||'Comfort')===x?'selected':''}>${x}</option>`).join('')}</select></div>
  <div class="form-field"><label for="ride-km">Total distance (km)</label><input id="ride-km" name="distanceKm" type="number" min="1" max="20000" required value="${v('distanceKm',trips[0].km)}"></div>
  <div class="form-field wide"><label for="ride-desc">Notes for riders <small>(optional)</small></label><textarea id="ride-desc" name="description" maxlength="600" placeholder="Pace, breakfast stop, rules, what to bring">${v('description')}</textarea></div>
  ${r?`<div class="form-field wide"><label for="ride-status">Status</label><select id="ride-status" name="status"><option value="scheduled" ${r.status!=='cancelled'?'selected':''}>Scheduled</option><option value="cancelled" ${r.status==='cancelled'?'selected':''}>Cancelled</option></select></div>`:''}
  <button class="primary">${r?'Save ride':'Publish ride ↗'}</button></div></form>`;
}
function syncRideRoute(){
  const sel=$('#ride-route');if(!sel)return;const o=sel.selectedOptions[0],custom=sel.value==='custom';
  $('#ride-custom').hidden=!custom;$('#ride-from').required=$('#ride-to').required=custom;
  if(!custom&&!$('#ride-form').dataset.rideEdit){$('#ride-km').value=o.dataset.km;$('#ride-days').value=o.dataset.days;$('#ride-vehicle').value=o.dataset.vehicle}
}
document.addEventListener('change',e=>{if(e.target.id==='ride-route')syncRideRoute();if(e.target.name==='ride-check')saveChecklist(e.target.closest('[data-checklist]').dataset.checklist)});
document.addEventListener('submit',async e=>{
  const f=e.target;
  if(f.id==='ride-form'){
    const d=Object.fromEntries(new FormData(f)),custom=d.routeId==='custom';
    const ride={title:d.title.trim(),routeId:d.routeId,custom:custom?{from:d.from.trim(),to:d.to.trim(),via:d.via.split(',').map(x=>x.trim()).filter(Boolean).slice(0,5)}:null,startDate:d.startDate,days:Number(d.days),meetupPoint:d.meetupPoint.trim(),meetupTime:d.meetupTime,capacity:Number(d.capacity),minExperience:d.minExperience,vehicle:d.vehicle,stay:d.stay,distanceKm:Number(d.distanceKm),description:d.description.trim(),...(d.status?{status:d.status}:{})};
    try{
      if(f.dataset.rideEdit){const x=await api('/api/rides/'+f.dataset.rideEdit,{method:'PUT',body:ride});toast(x.briefCleared?'Ride updated. Regenerate the AI brief for the new plan.':'Ride updated.');showRide(f.dataset.rideEdit)}
      else{const {id}=await api('/api/rides',{method:'POST',body:{crewId:f.dataset.crew,ride}});toast('Ride published. Your crew can RSVP now.');showRide(id)}
      if(page==='rides')loadRides();
    }catch(error){toast(error.message)}
  }
  if(f.id==='ride-update-form'){
    const d=new FormData(f);
    try{await api(`/api/rides/${f.dataset.ride}/updates`,{method:'POST',body:{body:String(d.get('body')||'').trim(),pinned:d.get('pinned')==='on'}});toast('Update posted.');showRide(f.dataset.ride)}catch(error){toast(error.message)}
  }
});

function briefHtml(b){
  return `<p>${esc(b.summary)}</p><div class="brief-days">${b.days.map(d=>`<div class="plan-day"><strong>Day ${d.day} · ${esc(d.from)} → ${esc(d.to)}</strong><small> · ~${d.km} km · ~${d.rideHours} h</small><p>Stay: ${esc(d.stayArea)} (${esc(d.stayType)})${d.highlights.length?' · '+d.highlights.map(esc).join(', '):''}</p>${d.caution?`<p class="brief-caution">⚠ ${esc(d.caution)}</p>`:''}</div>`).join('')}</div>
  ${b.regroupPoints.length?`<h4>Regroup points</h4>${bullets(b.regroupPoints)}`:''}${b.fuelPlan?`<h4>Fuel plan</h4><p>${esc(b.fuelPlan)}</p>`:''}${b.safety.length?`<h4>Group safety</h4>${bullets(b.safety)}`:''}${b.packing.length?`<h4>Pack</h4>${bullets(b.packing)}`:''}`;
}
async function showRide(id){
  try{
    const {ride:r,checklist}=await api('/api/rides/'+encodeURIComponent(id));rideChecklist=checklist;
    const upcoming=r.phase==='upcoming',open_=upcoming&&r.status!=='cancelled',btn=(s,label)=>`<button class="${r.myRsvp===s||(s==='going'&&r.myRsvp==='waitlist')?'primary':'secondary'}" data-rsvp="${s}" data-ride-id="${esc(r.id)}">${label}</button>`;
    const shareUrl=location.origin+'/r/'+r.id,shareText=`${r.title} · ${rideDates(r)} · meetup ${r.meetupPoint} at ${r.meetupTime} · ${shareUrl}`;
    const roster=s=>r.roster.filter(x=>x.status===s).map(x=>`<span class="rider-chip">${x.publicId?`<button class="text-link" data-rider="${esc(x.publicId)}">${esc(x.name)}</button>`:esc(x.name)}${s==='going'&&x.ready?' ✓':''}</span>`).join('');
    open(`<div class="eyebrow">${esc(r.crewName).toUpperCase()}${r.crewVisibility==='private'?' · PRIVATE CREW':''} · ${PHASE_LABELS[r.phase].toUpperCase()}</div><h2>${esc(r.title)}</h2>
    ${r.status==='cancelled'?'<p class="notice">This ride was cancelled by the ride lead.</p>':''}
    <div class="detail-facts"><span>${rideDates(r)}</span><span>${esc(r.routeLabel)}</span><span>~${r.distanceKm} km</span><span>${vehicleLabel(r.vehicle)}</span><span>${esc(r.minExperience)}+ riders</span><span>${esc(r.stay)} stays</span></div>
    <dl class="group-facts"><dt>Meetup</dt><dd><a href="${mapLink(r.meetupPoint)}" target="_blank" rel="noopener noreferrer">${esc(r.meetupPoint)} ↗</a> at ${esc(r.meetupTime)}</dd><dt>Ride lead</dt><dd>${r.lead?.publicId?`<button class="text-link" data-rider="${esc(r.lead.publicId)}">${esc(r.lead.name)} ↗</button>`:esc(r.lead?.name||'Crew lead')}</dd><dt>Seats</dt><dd>${r.going} / ${r.capacity} going${r.maybe?` · ${r.maybe} maybe`:''}${r.waitlist?` · ${r.waitlist} on waitlist`:''}</dd>${r.perRider?`<dt>Est. per rider</dt><dd>${money(r.perRider)} <small>(fuel, ${esc(r.stay.toLowerCase())} stays, food, tolls, 15% buffer)</small></dd>`:''}</dl>
    ${r.description?`<p>${esc(r.description)}</p>`:''}
    ${!r.signedIn?'<p class="notice">Sign in to RSVP.</p><button class="primary" id="auth-button-ride" data-edit-profile>Sign in</button>':open_?(r.member||r.crewVisibility==='public'?`<h3>Are you in?</h3><div class="button-row">${btn('going',r.myRsvp==='waitlist'?'On waitlist ⧗':r.going>=r.capacity&&r.myRsvp!=='going'?'Join waitlist':'Going')}${btn('maybe','Maybe')}${r.myRsvp?`<button class="text-link" data-rsvp="none" data-ride-id="${esc(r.id)}">Can't go</button>`:''}</div>${!r.member?'<p class="form-footnote">RSVPing joins this open crew.</p>':''}${r.myRsvp==='waitlist'?'<p class="form-footnote">You get a seat automatically when one frees up.</p>':''}`:'<p class="notice">🔒 This is a private crew. Ask to join the crew to RSVP.</p>'):r.myRsvp?`<p class="form-footnote">${rsvpLabel[r.myRsvp]}</p>`:''}
    ${r.myRsvp&&r.myRsvp!=='maybe'?`<h3>My pre-ride checklist · ${r.myChecklist.length}/${checklist.length}</h3><div data-checklist="${esc(r.id)}" class="checklist">${checklist.map(c=>`<label><input type="checkbox" name="ride-check" value="${c.id}" ${r.myChecklist.includes(c.id)?'checked':''}> ${esc(c.label)}</label>`).join('')}</div>`:''}
    ${r.plan?ridePlanHtml(r.plan)+(r.canManage?`<p><button class="text-link" data-detach-plan="${esc(r.id)}">Remove plan from ride</button></p>`:''):r.canManage?'<p class="form-footnote">Tip: build the route in My plans and attach it here so riders see the map, stays and stops.</p>':''}
    <h3>AI ride brief</h3>${r.brief?briefHtml(r.brief)+`<p class="form-footnote">Shared with every rider · generated ${shortDate(r.briefAt)}. Check road and weather conditions before you ride.</p>`:`<p class="form-footnote">${r.canManage?'Generate one brief for the whole crew: day-by-day route, stays, regroup points, fuel plan and safety rules.':'The ride lead has not generated the brief yet.'}</p>`}
    ${r.canManage&&open_?`<div class="button-row"><button class="secondary" data-ride-brief="${esc(r.id)}" ${r.briefCount>=3?'disabled':''}>✧ ${r.brief?'Regenerate':'Generate'} AI brief <small>(${3-r.briefCount} left)</small></button></div>`:''}
    ${r.updates?`<h3>Ride updates</h3>${r.canManage?`<form id="ride-update-form" data-ride="${esc(r.id)}"><div class="form-field wide"><label for="ride-update-body">Post an update to riders</label><textarea id="ride-update-body" name="body" maxlength="600" required placeholder="Regroup at the Lonavala food mall, 8:15"></textarea></div><label class="form-footnote"><input type="checkbox" name="pinned"> Pin to top</label> <button class="secondary">Post update</button></form>`:''}${r.updates.map(u=>`<div class="ride-update ${u.pinned?'pinned':''}">${u.pinned?'<span class="role-badge role-owner">Pinned</span> ':''}<strong>${esc(u.author)}</strong><small> · ${shortDate(u.createdAt)}</small><p>${esc(u.body)}</p>${r.canManage?`<button class="text-link danger" data-delete-update="${esc(u.id)}" data-ride-id="${esc(r.id)}">Delete</button>`:''}</div>`).join('')||'<p class="form-footnote">No updates yet.</p>'}`:'<p class="form-footnote">Ride updates and the rider list are visible to crew members.</p>'}
    ${r.roster?`<h3>Riders</h3><p class="form-footnote">Going (✓ = checklist complete)</p><div class="rider-chips">${roster('going')||'—'}</div>${r.maybe?`<p class="form-footnote">Maybe</p><div class="rider-chips">${roster('maybe')}</div>`:''}${r.waitlist?`<p class="form-footnote">Waitlist</p><div class="rider-chips">${roster('waitlist')}</div>`:''}`:''}
    <div class="button-row"><button class="secondary" data-ride-ics="${esc(r.id)}">Add to calendar</button><a class="secondary" href="https://wa.me/?text=${encodeURIComponent(shareText)}" target="_blank" rel="noopener noreferrer">Share on WhatsApp ↗</a><button class="text-link" data-copy-ride="${esc(shareUrl)}">Copy link</button></div>
    ${r.canManage?`<div class="button-row"><button class="secondary" data-edit-ride="${esc(r.id)}">Edit ride</button><button class="text-link danger" data-delete-ride="${esc(r.id)}">Delete ride</button></div>`:''}`);
    window.__ride=r;if(r.plan)drawMap($('#ride-plan-map'),r.plan.days);
  }catch(error){toast(error.message||'Ride unavailable.')}
}
async function saveChecklist(id){
  const items=[...document.querySelectorAll('[data-checklist] input:checked')].map(x=>x.value);
  try{await api(`/api/rides/${id}/rsvp`,{method:'PATCH',body:{items}});const h=[...document.querySelectorAll('#modal-body h3')].find(x=>x.textContent.startsWith('My pre-ride'));if(h)h.textContent=`My pre-ride checklist · ${items.length}/${rideChecklist.length}`}catch(error){toast(error.message)}
}
function handleRideClick(el){
  const d=el.dataset;
  if(d.ride){showRide(d.ride);return true}
  if(d.rideFilter){rideFilter=d.rideFilter;render();return true}
  if(d.planRide){if(!requireSignIn())return true;open(rideForm(d.planRide));syncRideRoute();return true}
  if(d.rsvp){api(`/api/rides/${d.rideId}/rsvp`,{method:'POST',body:{status:d.rsvp}}).then(x=>{toast({going:'You are going. See you at the meetup!',waitlist:'Ride is full. You are on the waitlist.',maybe:'Marked as maybe.'}[x.status]||'RSVP removed.');showRide(d.rideId);loadCrews();if(page==='rides')loadRides()}).catch(e=>toast(e.message));return true}
  if(d.rideBrief){el.disabled=true;el.textContent='Generating brief… (about 10 seconds)';api(`/api/rides/${d.rideBrief}/brief`,{method:'POST',body:{}}).then(()=>{toast('AI brief ready for the whole crew.');showRide(d.rideBrief)}).catch(e=>{toast(e.message);showRide(d.rideBrief)});return true}
  if(d.editRide){const r=window.__ride;if(r)open(rideForm(r.crewId,r));return true}
  if(d.deleteRide){if(confirm('Delete this ride for everyone? RSVPs and updates are removed.'))api('/api/rides/'+d.deleteRide,{method:'DELETE',body:{}}).then(()=>{modal.close();toast('Ride deleted.');if(page==='rides')loadRides()}).catch(e=>toast(e.message));return true}
  if(d.deleteUpdate){api(`/api/rides/${d.rideId}/updates`,{method:'DELETE',body:{updateId:d.deleteUpdate}}).then(()=>showRide(d.rideId)).catch(e=>toast(e.message));return true}
  if(d.copyRide){navigator.clipboard?.writeText(d.copyRide).then(()=>toast('Ride link copied.'),()=>toast(d.copyRide));return true}
  if(d.rideIcs){const r=window.__ride;if(!r)return true;const [h,m]=r.meetupTime.split(':').map(Number);
    const events=Array.from({length:r.days},(_,i)=>{const at=new Date(r.startDate+'T00:00:00');at.setDate(at.getDate()+i);at.setHours(h,m,0,0);return {id:`${r.id}-${i+1}`,at:at.toISOString(),label:`${r.title} · Day ${i+1}${i===0?' · Meetup '+r.meetupPoint:''}`}});
    downloadFile(`roamly-${r.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,40)}.ics`,calendar(events),'text/calendar');return true}
  return false;
}
// Shared ride links (#ride=<id>) open the ride once the session is known.
{const m=location.hash.match(/^#ride=([0-9a-f-]{36})$/);if(m){const wait=setInterval(()=>{if(!authLoading){clearInterval(wait);showRide(m[1])}},200)}}

// ---- Route & stay planning: saved plans, day editor, map, attach to rides ----
let planDraft=null,planList=[],mapTimer=null;
const geoCache=new Map();
const BOOKING={google:a=>mapLink('hotels in '+a),booking:a=>'https://www.booking.com/searchresults.html?ss='+encodeURIComponent(a+', India'),airbnb:a=>'https://www.airbnb.co.in/s/'+encodeURIComponent(a+', India')+'/homes'};
const directions=(from,to)=>'https://www.google.com/maps/dir/?api=1&travelmode=driving&origin='+encodeURIComponent(from)+'&destination='+encodeURIComponent(to);
const stayLinks=a=>a?`<span class="stay-links">Find stays: <a href="${BOOKING.google(a)}" target="_blank" rel="noopener noreferrer">Google Maps ↗</a> <a href="${BOOKING.booking(a)}" target="_blank" rel="noopener noreferrer">Booking.com ↗</a> <a href="${BOOKING.airbnb(a)}" target="_blank" rel="noopener noreferrer">Airbnb ↗</a></span>`:'';
const splitList=v=>String(v||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,5);

// Leaflet + OpenStreetMap tiles, loaded only when a map is shown.
let leaflet=null;
function loadLeaflet(){
  return leaflet??=new Promise((resolve,reject)=>{
    const css=document.createElement('link');css.rel='stylesheet';css.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';document.head.append(css);
    const js=document.createElement('script');js.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';js.onload=()=>resolve(window.L);js.onerror=()=>{leaflet=null;reject(new Error('Map library unavailable.'))};document.head.append(js);
  });
}
async function geocode(names){
  const missing=[...new Set(names.filter(n=>n&&n.length>=2&&!geoCache.has(n)))];
  for(let round=0;missing.length&&round<4;round++){
    const {results,pending}=await api('/api/geocode',{method:'POST',body:{places:missing.slice(0,30)}});
    for(const [k,v] of Object.entries(results))geoCache.set(k,v);
    missing.splice(0,missing.length,...pending);
    if(missing.length)await new Promise(r=>setTimeout(r,1500));
  }
  return names.map(n=>geoCache.get(n)??null);
}
// Numbered stops: the start, then each day's end. Lines are straight sketches between towns, not road paths.
async function drawMap(el,days){
  if(!el)return;
  if(!session.user){el.innerHTML='<p class="form-footnote">Sign in to see the route map.</p>';return}
  const towns=[days[0].from,...days.map(d=>d.to)];
  el.innerHTML='<p class="form-footnote map-loading">Loading map…</p>';
  try{
    const [L,points]=await Promise.all([loadLeaflet(),geocode(towns)]);
    if(!el.isConnected)return;
    el.innerHTML='';el._map?.remove();
    const map=el._map=L.map(el,{scrollWheelZoom:false});
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
    const known=towns.map((t,i)=>({t,i,p:points[i]})).filter(x=>x.p);
    known.forEach(({t,i,p})=>L.marker([p.lat,p.lng],{icon:L.divIcon({className:'map-pin',html:`<span>${i===0?'S':i}</span>`,iconSize:[26,26]})}).addTo(map).bindPopup(`${i===0?'Start':'End of day '+i}: ${esc(t)}`));
    if(known.length>1)L.polyline(known.map(x=>[x.p.lat,x.p.lng]),{color:'#244d3d',weight:3,dashArray:'6 8'}).addTo(map);
    if(known.length)map.fitBounds(L.latLngBounds(known.map(x=>[x.p.lat,x.p.lng])).pad(.2));else map.setView([22.5,79],4);
    const lost=towns.filter((_,i)=>!points[i]);
    el.insertAdjacentHTML('afterend',lost.length?`<p class="form-footnote map-note">Not found on the map: ${lost.map(esc).join(', ')}. Try a nearby town name.</p>`:'');
    return points;
  }catch(error){el.innerHTML=`<p class="form-footnote">${esc(error.message||'Map unavailable.')}</p>`}
}

// A draft plan from the planner result: the AI road plan and itinerary when present, otherwise the curated outline.
function draftFromPlanner(){
  const {trip:t,data:d,ai}=latestPlan,n=Math.min(30,d.days);
  const road=ai?.agents?.road?.segments||[],itin=ai?.agents?.itinerary?.days||[],curated=t.custom?null:outline(t,n);
  const ends=t.custom?[t.custom.from,...t.custom.via,t.custom.to]:t.route.split('→').map(x=>x.trim());
  let prev=ends[0];
  const days=Array.from({length:n},(_,i)=>{
    const seg=road.find(s=>s.day===i+1),it=itin[i],cur=curated?.[i],last=i===n-1;
    const to=seg?.to||it?.stayArea||cur?.stay?.area||ends[Math.min(ends.length-1,Math.round((i+1)*(ends.length-1)/n))];
    const places=it?(it.placeIds?it.placeIds.map(id=>t.places.find(p=>p.id===id)?.name).filter(Boolean):it.places):(cur?.places||[]).map(p=>p.name);
    const day={day:i+1,from:(seg?.from||prev).slice(0,80),to:to.slice(0,80),km:Math.min(1500,Math.round(seg?.km??d.distance/n)),stayArea:last?'':(it?.stayArea||cur?.stay?.area||to).slice(0,100),stayType:'',stayBand:d.stay,places:places.slice(0,5),fuelStops:[],notes:(it?.breakNote||'').slice(0,300)};
    prev=day.to;return day;
  });
  // Without an AI road plan, split the distance over the days that actually move; same-town days are rest or sightseeing.
  if(!road.length){const moving=days.filter(x=>x.from.toLowerCase()!==x.to.toLowerCase());for(const x of days)x.km=moving.includes(x)?Math.min(1500,Math.round(d.distance/moving.length)):0}
  return {title:t.title.slice(0,80),routeId:t.id,settings:{people:d.people,vehicle:d.vehicle,fuel:d.fuel,mileage:d.mileage,fuelPrice:d.fuelPrice,seats:d.seats,month:d.month},days};
}

function plansPage(){
  return heading('Your roads, your way.','Edit the route day by day, pick where you stay each night, and the budget follows.',`<div class="button-row"><button class="primary" data-page="planner">＋ New plan from the planner</button></div>`)+
  `<div id="plan-list" class="plan-list"><p class="form-footnote">${session.user?'Loading your plans…':'Sign in to save and edit plans.'}</p></div><div id="plan-editor"></div>`;
}
async function loadPlans(){
  if(!session.user){if(planDraft)renderPlanEditor();return}
  try{({plans:planList}=await api('/api/plans'));
    $('#plan-list').innerHTML=planList.length?planList.map(p=>`<article class="plan-card ${planDraft?.id===p.id?'active':''}"><div><strong>${esc(p.title)}</strong><small>${p.days} day${p.days>1?'s':''} · ~${p.km} km · ${vehicleLabel(p.vehicle)} · edited ${shortDate(p.updatedAt)}</small></div><button class="secondary" data-open-plan="${esc(p.id)}">Open</button></article>`).join(''):'<p class="form-footnote">No saved plans yet. Build a plan in the AI trip planner and tap “Edit & save plan”.</p>';
    if(planDraft)renderPlanEditor();
  }catch(error){$('#plan-list').innerHTML=`<p class="notice">${esc(error.message)}</p>`}
}
function planBudgetHtml(p){
  try{const b=planBudget(p),s=p.settings;return `<div class="budget-tiles"><div><small>GROUP ESTIMATE · ${b.distance} KM</small><strong>${money(b.total)}</strong></div><div><small>PER PERSON · ${s.people} TRAVELER${s.people>1?'S':''}</small><strong>${money(b.perPerson)}</strong></div></div><p class="form-footnote">Fuel ${money(b.fuel)} · stays ${money(b.accommodation)} (${p.days.length-1} night${p.days.length===2?'':'s'}, per-night band) · food ${money(b.food)} · tolls & extras ${money(b.extras)} · 15% buffer ${money(b.contingency)}. Recalculated on every edit, no AI call.</p>`}
  catch(error){return `<p class="notice">${esc(error.message)}</p>`}
}
function planDayFields(d,i,total){
  const last=i===total-1,f=(name,label,value,extra='')=>`<div class="form-field"><label for="pd-${name}-${i}">${label}</label><input id="pd-${name}-${i}" name="${name}" value="${esc(value)}" ${extra}></div>`;
  return `<fieldset class="plan-edit-day" data-plan-day="${i}"><legend>Day ${i+1}</legend><div class="form-grid">
  ${f('from','From',d.from,'maxlength="80" required')}${f('to','To',d.to,'maxlength="80" required')}
  <div class="form-field"><label for="pd-km-${i}">Km <small class="km-hint" data-km-hint="${i}"></small></label><input id="pd-km-${i}" name="km" type="number" min="0" max="1500" value="${d.km}"></div>
  ${last?'<div class="form-field"><label>Night</label><p class="form-footnote">Last day: no stay included. Add a day for the ride home.</p></div>':`${f('stayArea','Stay area tonight',d.stayArea,'maxlength="100" placeholder="Town or area"')}
  <div class="form-field"><label for="pd-type-${i}">Stay type</label><select id="pd-type-${i}" name="stayType"><option value="">Any</option>${STAY_TYPES.map(x=>`<option ${d.stayType===x?'selected':''}>${x}</option>`).join('')}</select></div>
  <div class="form-field"><label for="pd-band-${i}">Budget band</label><select id="pd-band-${i}" name="stayBand">${['Budget','Comfort','Premium'].map(x=>`<option ${d.stayBand===x?'selected':''}>${x}</option>`).join('')}</select></div>`}
  ${f('places','Places to see <small>(comma separated)</small>',d.places.join(', '),'maxlength="420"')}${f('fuelStops','Fuel & break stops <small>(comma separated)</small>',d.fuelStops.join(', '),'maxlength="420"')}
  <div class="form-field wide"><label for="pd-notes-${i}">Notes</label><input id="pd-notes-${i}" name="notes" maxlength="300" value="${esc(d.notes)}"></div></div>
  <p class="form-footnote"><a href="${directions(d.from,d.to)}" target="_blank" rel="noopener noreferrer">Directions in Google Maps ↗</a> ${last?'':stayLinks(d.stayArea)}</p></fieldset>`;
}
function renderPlanEditor(){
  const p=planDraft,el=$('#plan-editor');if(!el||!p)return;
  el.innerHTML=`<section class="plan-editor"><div class="section-heading"><h3>${p.id?'Edit plan':'New plan'}</h3><span class="eyebrow">${p.days.length} DAYS · ${vehicleLabel(p.settings.vehicle)} · ${p.settings.people} TRAVELER${p.settings.people>1?'S':''}</span></div>
  <form id="plan-edit-form"><div class="form-field wide"><label for="plan-title">Plan name</label><input id="plan-title" name="title" maxlength="80" value="${esc(p.title)}" required></div>
  <div id="plan-map" class="plan-map"></div><div id="plan-edit-budget">${planBudgetHtml(p)}</div>
  ${p.days.map((d,i)=>planDayFields(d,i,p.days.length)).join('')}
  <div class="button-row"><button type="button" class="secondary" data-plan-day-add ${p.days.length>=30?'disabled':''}>＋ Add a day</button>${p.days.length>1?'<button type="button" class="text-link danger" data-plan-day-remove>Remove last day</button>':''}</div>
  <div class="button-row"><button class="primary">${p.id?'Save changes':'Save plan'}</button>${p.id?`<button type="button" class="secondary" data-attach-menu>Attach to a ride</button><button type="button" class="text-link danger" data-delete-plan="${esc(p.id)}">Delete plan</button>`:''}</div><p id="plan-save-status" class="form-footnote" role="status"></p></form></section>`;
  refreshPlanMap();
}
function capturePlan(){
  const f=$('#plan-edit-form');if(!f||!planDraft)return planDraft;
  planDraft.title=$('#plan-title').value.trim();
  planDraft.days=[...f.querySelectorAll('[data-plan-day]')].map((fs,i)=>{const v=n=>fs.querySelector(`[name="${n}"]`)?.value??'';
    return {day:i+1,from:v('from').trim(),to:v('to').trim(),km:Math.max(0,Math.min(1500,Math.round(Number(v('km'))||0))),stayArea:v('stayArea').trim(),stayType:v('stayType'),stayBand:v('stayBand')||'Comfort',places:splitList(v('places')),fuelStops:splitList(v('fuelStops')),notes:v('notes').trim()}});
  return planDraft;
}
// Redraw the map shortly after typing stops, then offer straight-line x road-factor km hints.
function refreshPlanMap(){
  clearTimeout(mapTimer);
  mapTimer=setTimeout(async()=>{
    document.querySelector('.map-note')?.remove();
    const points=await drawMap($('#plan-map'),planDraft.days);if(!points)return;
    planDraft.days.forEach((d,i)=>{const a=points[i],b=points[i+1],hint=document.querySelector(`[data-km-hint="${i}"]`);if(!hint)return;
      const km=a&&b?Math.round(haversineKm(a,b)*ROAD_FACTOR):null;
      hint.innerHTML=km&&Math.abs(km-d.km)>Math.max(15,d.km*.2)?`<button type="button" class="text-link" data-use-km="${i}" data-km="${Math.min(1500,km)}">use ≈${km}</button>`:''});
  },900);
}
document.addEventListener('input',e=>{
  if(!e.target.closest('#plan-edit-form'))return;
  capturePlan();$('#plan-edit-budget').innerHTML=planBudgetHtml(planDraft);
  if(['from','to'].includes(e.target.name))refreshPlanMap();
});
document.addEventListener('submit',async e=>{
  if(e.target.id!=='plan-edit-form')return;
  const p=capturePlan(),status=$('#plan-save-status'),body={title:p.title,routeId:p.routeId,settings:p.settings,days:p.days};
  status.textContent='Saving…';
  try{
    if(p.id)await api('/api/plans/'+p.id,{method:'PUT',body});else p.id=(await api('/api/plans',{method:'POST',body})).id;
    toast('Plan saved.');loadPlans();
  }catch(error){status.textContent=error.message;toast(error.message)}
});
async function openPlan(id){try{const {plan}=await api('/api/plans/'+id);planDraft={...plan,id};renderPlanEditor();loadPlans();$('#plan-editor').scrollIntoView({behavior:'smooth'})}catch(error){toast(error.message)}}
async function attachMenu(){
  try{const {rides}=await api('/api/rides');const mine=rides.filter(r=>r.canManage&&r.phase==='upcoming');
    open(`<h2>Attach “${esc(planDraft.title)}” to a ride</h2><p>Riders in that ride will see this route, map and stays. A copy is attached, so later edits here do not change the ride until you attach again.</p>${mine.map(r=>`<div class="alert-row"><span>${esc(r.title)}<small> · ${esc(r.crewName)} · ${rideDates(r)}</small></span><button class="secondary" data-attach-ride="${esc(r.id)}">Attach</button></div>`).join('')||'<p class="form-footnote">You do not lead any upcoming rides. Plan a ride from your crew page first.</p>'}`)}
  catch(error){toast(error.message)}
}
// Read-only plan inside a ride.
function ridePlanHtml(p){
  return `<h3>Route plan</h3><div id="ride-plan-map" class="plan-map"></div>${p.days.map((d,i)=>`<div class="plan-day"><strong>Day ${d.day} · ${esc(d.from)} → ${esc(d.to)}</strong><small> · ~${d.km} km</small>
  ${d.places.length?`<p>See: ${d.places.map(x=>`<a href="${mapLink(x)}" target="_blank" rel="noopener noreferrer">${esc(x)} ↗</a>`).join(' · ')}</p>`:''}${d.fuelStops.length?`<p>Fuel & breaks: ${d.fuelStops.map(esc).join(' · ')}</p>`:''}
  ${i<p.days.length-1&&d.stayArea?`<p>Night: ${esc(d.stayArea)}${d.stayType?' · '+esc(d.stayType):''} · ${esc(d.stayBand)} ${stayLinks(d.stayArea)}</p>`:''}${d.notes?`<p>${esc(d.notes)}</p>`:''}
  <p class="form-footnote"><a href="${directions(d.from,d.to)}" target="_blank" rel="noopener noreferrer">Directions ↗</a></p></div>`).join('')}`;
}
function handlePlanClick(el){
  const d=el.dataset;
  if(d.editPlanDraft!==undefined){if(!latestPlan)return true;planDraft=draftFromPlanner();page='plans';render();toast(latestPlan.ai?'Plan drafted from the AI road plan. Edit anything, then save.':'Plan drafted from the curated outline. Edit anything, then save.');return true}
  if(d.openPlan){openPlan(d.openPlan);return true}
  if(d.planDayAdd!==undefined){const p=capturePlan(),last=p.days.at(-1);if(!last.stayArea)last.stayArea=last.to;p.days.push({day:p.days.length+1,from:last.to,to:'',km:0,stayArea:'',stayType:'',stayBand:last.stayBand,places:[],fuelStops:[],notes:''});renderPlanEditor();return true}
  if(d.planDayRemove!==undefined){const p=capturePlan();p.days.pop();p.days.at(-1).stayArea='';renderPlanEditor();return true}
  if(d.useKm){const input=$('#pd-km-'+d.useKm);input.value=d.km;input.dispatchEvent(new Event('input',{bubbles:true}));el.remove();return true}
  if(d.deletePlan){if(confirm('Delete this plan? Rides it is attached to keep their copy.'))api('/api/plans/'+d.deletePlan,{method:'DELETE',body:{}}).then(()=>{planDraft=null;$('#plan-editor').innerHTML='';toast('Plan deleted.');loadPlans()}).catch(e=>toast(e.message));return true}
  if(d.attachMenu!==undefined){attachMenu();return true}
  if(d.attachRide){api(`/api/rides/${d.attachRide}/plan`,{method:'POST',body:{planId:planDraft.id}}).then(()=>{toast('Plan attached. Riders can see it in the ride.');showRide(d.attachRide)}).catch(e=>toast(e.message));return true}
  if(d.detachPlan){api(`/api/rides/${d.detachPlan}/plan`,{method:'POST',body:{planId:null}}).then(()=>{toast('Plan removed from the ride.');showRide(d.detachPlan)}).catch(e=>toast(e.message));return true}
  return false;
}

// ---- Ride feed: posts, road reports, comments, follows, notifications, leaderboards ----
const REPORT_TYPES={road:'Road condition',fuel:'Fuel / charging',police:'Police check',weather:'Weather',closure:'Closure / diversion',stay:'Stay / food'};
const CONDITIONS={good:'Good',caution:'Caution',bad:'Bad'};
let feedScope='all',feedRider=null,feedNext=null;
const ago=iso=>{const m=Math.round((Date.now()-Date.parse(iso))/60000);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':m<43200?Math.round(m/1440)+' d ago':shortDate(iso)};
const tripName=id=>trips.find(t=>t.id===id)?.title||'';

function composer(kind='post',routeId=''){
  const myCrews=crews.filter(c=>c.joined);
  return `<form id="post-form" class="composer" data-kind="${kind}"><div class="button-row composer-kinds"><button type="button" class="${kind==='post'?'primary':'secondary'}" data-compose="post">Post</button><button type="button" class="${kind==='report'?'primary':'secondary'}" data-compose="report">Road report</button></div>
  <div class="form-grid">${kind==='report'?`<div class="form-field"><label for="post-place">Where</label><input id="post-place" name="place" maxlength="80" required placeholder="Khandala ghat"></div>
  <div class="form-field"><label for="post-type">What</label><select id="post-type" name="reportType">${Object.entries(REPORT_TYPES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div>
  <div class="form-field"><label for="post-condition">Condition</label><select id="post-condition" name="condition">${Object.entries(CONDITIONS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div>`:''}
  <div class="form-field"><label for="post-route">Route <small>(optional)</small></label><select id="post-route" name="routeId"><option value="">No route</option>${trips.map(t=>`<option value="${t.id}" ${routeId===t.id?'selected':''}>${esc(t.title)}</option>`).join('')}</select></div>
  ${kind==='post'&&myCrews.length?`<div class="form-field"><label for="post-crew">Share with</label><select id="post-crew" name="crewId"><option value="">Everyone</option>${myCrews.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}${c.visibility==='private'?' (members only)':''}</option>`).join('')}</select></div>`:''}
  <div class="form-field wide"><label for="post-body">${kind==='report'?'What riders should know':'Share with riders'}</label><textarea id="post-body" name="body" maxlength="1000" required placeholder="${kind==='report'?'Fresh potholes after the toll, ride slow on the left lane. Fuel at the Khopoli pump.':'Sunrise at the ghat today, perfect weather.'}"></textarea></div></div>
  <div class="photo-picker"><label class="secondary photo-button">📷 Add photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple data-photo-input hidden></label><div class="photo-thumbs" data-photo-thumbs></div><small class="form-footnote">Up to 4. Location data is removed.</small></div>
  <button class="primary">${kind==='report'?'Share report':'Post'}</button></form>`;
}
function postCard(p){
  const report=p.kind==='report';
  return `<article class="post-card ${report?'report '+p.condition:''}" data-post-id="${esc(p.id)}"><div class="post-head">${p.author.publicId?`<button class="text-link" data-rider="${esc(p.author.publicId)}"><strong>${esc(p.author.name)}</strong></button>`:`<strong>${esc(p.author.name)}</strong>`}<small> · ${ago(p.createdAt)}${p.crewName?` · in ${esc(p.crewName)}`:''}</small></div>
  ${report?`<div class="report-tag"><span class="cond cond-${esc(p.condition)}">${CONDITIONS[p.condition]||''}</span> ${esc(REPORT_TYPES[p.reportType]||'Report')} · <a href="${mapLink(p.place)}" target="_blank" rel="noopener noreferrer">${esc(p.place)} ↗</a></div>`:''}
  <p class="post-body">${esc(p.body)}</p>${p.photos?.length?`<div class="post-photos n${p.photos.length}">${p.photos.map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="Photo shared by ${esc(p.author.name)}" loading="lazy"></a>`).join('')}</div>`:''}${p.routeId&&tripName(p.routeId)?`<button class="route-chip" data-trip="${esc(p.routeId)}">⌁ ${esc(tripName(p.routeId))}</button>`:''}
  <div class="post-actions"><button class="text-link ${p.liked?'liked':''}" data-like="${esc(p.id)}" data-on="${p.liked?'0':'1'}">${p.liked?'♥':'♡'} ${report?'Useful':'Ride on'} · ${p.likes}</button><button class="text-link" data-comments="${esc(p.id)}">💬 ${p.comments}</button><button class="text-link" data-copy-ride="${esc(location.origin+'/p/'+p.id)}">Share</button>${p.canDelete?`<button class="text-link danger" data-delete-post="${esc(p.id)}">Delete</button>`:session.user?`<button class="text-link" data-report-post="${esc(p.id)}">⚑</button>`:''}</div><div class="comments" id="comments-${esc(p.id)}" hidden></div></article>`;
}
function feedPage(){
  return heading('The road, live from riders.','Share rides, warn others about the road ahead, and follow riders you trust.')+
  `<div class="feed-wrap">${session.user?`<div id="composer-slot">${composer()}</div>`:'<p class="notice">Sign in to post, comment and follow riders. Anyone can read open posts.</p>'}
  <div class="button-row feed-tabs"><button class="${feedScope==='all'?'primary':'secondary'}" data-feed-scope="all">Everyone</button>${session.user?`<button class="${feedScope==='following'?'primary':'secondary'}" data-feed-scope="following">Following</button>`:''}<button class="${feedScope==='intel'?'primary':'secondary'}" data-feed-scope="intel">Road intel</button>${feedRider?`<button class="primary" data-feed-scope="rider">Posts by ${esc(feedRider.name)} ✕</button>`:''}</div>
  <div id="feed-list"><p class="form-footnote">Loading the feed…</p></div><div class="button-row"><button class="secondary" id="feed-more" hidden>Load more</button></div></div>`;
}
async function loadFeed(more=false){
  const q=new URLSearchParams();
  if(feedScope==='following')q.set('scope','following');if(feedScope==='intel')q.set('kind','report');if(feedScope==='rider'&&feedRider)q.set('rider',feedRider.id);
  if(more&&feedNext)q.set('before',feedNext);
  try{const d=await api('/api/feed?'+q);feedNext=d.next;const list=$('#feed-list');if(!list)return;
    const html=d.posts.map(postCard).join('');
    list.innerHTML=more?list.innerHTML+html:(html||`<div class="empty">${feedScope==='following'?'Follow riders and open crews to see their posts here.':feedScope==='intel'?'No road reports in the last 30 days. Be the first to share one.':'No posts yet. Share the first one.'}</div>`);
    $('#feed-more').hidden=!feedNext}
  catch(error){const list=$('#feed-list');if(list)list.innerHTML=`<p class="notice">${esc(error.message)}</p>`}
}
async function loadIntel(routeId){
  try{const {posts}=await api('/api/feed?kind=report&route='+encodeURIComponent(routeId));const el=$('#route-intel');if(!el)return;
    el.innerHTML=posts.length?posts.slice(0,5).map(postCard).join(''):'<p class="form-footnote">No rider reports for this route in the last 30 days.</p>'}
  catch{const el=$('#route-intel');if(el)el.innerHTML='<p class="form-footnote">Road intel could not be loaded.</p>'}
}
async function toggleComments(id,force=false){
  const box=$('#comments-'+id);if(!box)return;
  if(!box.hidden&&!force){box.hidden=true;return}
  box.hidden=false;box.innerHTML='<p class="form-footnote">Loading…</p>';
  try{const {comments}=await api(`/api/posts/${id}/comments`);
    box.innerHTML=comments.map(c=>`<div class="comment"><strong>${c.author.publicId?`<button class="text-link" data-rider="${esc(c.author.publicId)}">${esc(c.author.name)}</button>`:esc(c.author.name)}</strong> <small>${ago(c.createdAt)}</small><p>${esc(c.body)}</p>${c.canDelete?`<button class="text-link danger" data-delete-comment="${esc(c.id)}" data-post="${esc(id)}">Delete</button>`:''}</div>`).join('')+
      (session.user?`<form class="comment-form" data-comment-post="${esc(id)}"><input name="body" maxlength="500" required placeholder="Add a comment"><button class="secondary">Reply</button></form>`:'<p class="form-footnote">Sign in to comment.</p>')}
  catch(error){box.innerHTML=`<p class="form-footnote">${esc(error.message)}</p>`}
}
async function loadLeaders(crewId){
  try{const {leaders}=await api('/api/groups/leaderboard?id='+encodeURIComponent(crewId));const el=$('#crew-leaders');if(!el)return;
    el.innerHTML=leaders.length?`<ol class="leaders">${leaders.map(l=>`<li>${l.publicId?`<button class="text-link" data-rider="${esc(l.publicId)}">${esc(l.name)}</button>`:esc(l.name)} <small>· ${l.rides} ride${l.rides>1?'s':''} · ${l.km.toLocaleString('en-IN')} km</small></li>`).join('')}</ol>`:'<p class="form-footnote">The leaderboard fills up after the first finished group ride.</p>'}
  catch{const el=$('#crew-leaders');if(el)el.innerHTML=''}
}
async function showPost(id){
  try{const {post}=await api('/api/posts/'+encodeURIComponent(id));open(`<div class="eyebrow">${post.kind==='report'?'ROAD REPORT':'RIDER POST'}</div>${postCard({...post,likes:'…',comments:'…',liked:false,canDelete:false})}`);toggleComments(id,true)}
  catch(error){toast(error.message)}
}

// Notifications: a cheap unread-count poll every minute while the tab is visible.
let bellTimer=null;
async function refreshBell(){
  if(!session.user||document.hidden)return;
  try{const {unread}=await api('/api/notifications?count=1');const c=$('#bell-count');c.hidden=!unread;c.textContent=unread>9?'9+':unread}catch{}
}
function startBell(){const b=$('#bell-button');if(!b)return;b.hidden=!session.user;clearInterval(bellTimer);if(session.user){refreshBell();bellTimer=setInterval(refreshBell,60000)}}
async function showNotifications(){
  try{const {notifications}=await api('/api/notifications');
    open(`<div class="eyebrow">NOTIFICATIONS</div><h2>What's new</h2>${notifications.map(n=>`<div class="notice-row ${n.read?'':'unread'}"><span>${esc(n.text)}<small> · ${ago(n.createdAt)}</small></span>${n.link?`<button class="text-link" data-goto="${esc(n.link)}">Open ↗</button>`:''}</div>`).join('')||'<p class="form-footnote">Nothing yet. Join a crew or RSVP to a ride and updates will land here.</p>'}`);
    if(notifications.some(n=>!n.read)){await api('/api/notifications',{method:'POST',body:{read:'all'}});refreshBell()}}
  catch(error){toast(error.message)}
}
// In-app links: #ride=, #post=, #crew=, #rider=.
function goTo(hash){
  const [kind,id]=hash.replace(/^#/,'').split('=');
  if(modal.open)modal.close();
  if(kind==='plan'&&trips.some(t=>t.id===id)){page='planner';render();$('#plan-route').value=id;syncRoute();return}
  if(kind==='ride')return showRide(id);if(kind==='post')return showPost(id);if(kind==='rider')return showRider(id);
  if(kind==='crew'){page='groups';render();const wait=()=>crews.some(c=>c.id===id)?showGroup(id):loadCrews().then(()=>crews.some(c=>c.id===id)?showGroup(id):toast('This crew is not available.'));return wait()}
}
{const m=location.hash.match(/^#(post|crew|rider|plan)=([\w-]{2,40})$/);if(m){const wait=setInterval(()=>{if(!authLoading){clearInterval(wait);goTo(location.hash)}},200)}}

document.addEventListener('submit',async e=>{
  const f=e.target;
  if(f.id==='post-form'){
    const d=Object.fromEntries(new FormData(f)),kind=f.dataset.kind;
    if(f.dataset.uploading>0)return toast('Wait for the photos to finish uploading.');
    const photos=JSON.parse(f.dataset.photos||'[]').map(x=>x.key);
    const body={kind,photos,body:String(d.body||'').trim(),routeId:d.routeId||'',...(kind==='report'?{place:String(d.place||'').trim(),reportType:d.reportType,condition:d.condition}:{crewId:d.crewId||null})};
    try{const res=await api('/api/posts',{method:'POST',body});if(res.underReview)toast('Your post is waiting for an admin to review it.');else toast(kind==='report'?'Thanks! Your road report helps every rider on this route.':'Posted.');
      if(modal.open&&f.closest('#modal'))modal.close();if(page==='feed'){$('#composer-slot').innerHTML=composer(kind);feedScope=kind==='report'?'intel':feedScope;render()}}
    catch(error){toast(error.message)}
  }
  if(f.classList.contains('comment-form')){
    const id=f.dataset.commentPost,body=String(new FormData(f).get('body')||'').trim();
    try{await api(`/api/posts/${id}/comments`,{method:'POST',body:{body}});toggleComments(id,true)}catch(error){toast(error.message)}
  }
});
function handleFeedClick(el){
  const d=el.dataset;
  if(el.id==='bell-button'){showNotifications();return true}
  if(d.goto){goTo(d.goto);return true}
  if(d.feedScope){if(d.feedScope==='rider'){feedRider=null;feedScope='all'}else feedScope=d.feedScope;render();return true}
  if(el.id==='feed-more'){loadFeed(true);return true}
  if(d.compose){const f=el.closest('#post-form');f.outerHTML=composer(d.compose,f.querySelector('[name="routeId"]')?.value||'');return true}
  if(d.newReport){if(!requireSignIn())return true;open(`<h2>Share a road report</h2><p>Help riders on ${esc(tripName(d.newReport))}. Reports show in this route's road intel for 30 days.</p>${composer('report',d.newReport)}`);return true}
  if(d.like){if(!requireSignIn())return true;api(`/api/posts/${d.like}/react`,{method:'POST',body:{like:d.on==='1'}}).then(x=>{const label=el.textContent.includes('Useful')?'Useful':'Ride on';el.dataset.on=x.liked?'0':'1';el.classList.toggle('liked',x.liked);el.textContent=`${x.liked?'♥':'♡'} ${label} · ${x.likes}`}).catch(e=>toast(e.message));return true}
  if(d.comments){toggleComments(d.comments);return true}
  if(d.deletePost){if(confirm('Delete this post?'))api('/api/posts/'+d.deletePost,{method:'DELETE',body:{}}).then(()=>{el.closest('.post-card')?.remove();toast('Post deleted.')}).catch(e=>toast(e.message));return true}
  if(d.deleteComment){api(`/api/posts/${d.post}/comments`,{method:'DELETE',body:{commentId:d.deleteComment}}).then(()=>toggleComments(d.post,true)).catch(e=>toast(e.message));return true}
  if(d.reportPost){const reason=prompt('Why are you reporting this post? Type one: spam, scam, unsafe, offensive, fake, other','spam');if(!reason)return true;
    api(`/api/posts/${d.reportPost}/report`,{method:'POST',body:{reason:reason.trim().toLowerCase()}}).then(()=>{toast('Thanks. Admins will review it.');el.disabled=true}).catch(e=>toast(e.message));return true}
  if(d.followRider){if(!requireSignIn())return true;api('/api/follow',{method:'POST',body:{type:'rider',id:d.followRider,follow:d.on==='1'}}).then(x=>{toast(x.following?'Following. Their open posts show in your Following feed.':'Unfollowed.');showRider(d.followRider)}).catch(e=>toast(e.message));return true}
  if(d.followCrew){if(!requireSignIn())return true;api('/api/follow',{method:'POST',body:{type:'crew',id:d.followCrew,follow:d.on==='1'}}).then(async x=>{toast(x.following?'Following this crew: new rides and posts reach you.':'Unfollowed.');await loadCrews();showGroup(d.followCrew)}).catch(e=>toast(e.message));return true}
  if(d.riderPosts){feedRider={id:d.riderPosts,name:d.name};feedScope='rider';modal.close();page='feed';render();return true}
  if(d.adminPost){if(d.adminPost==='remove'&&!confirm('Remove this post for everyone?'))return true;api(`/api/posts/${d.post}/moderate`,{method:'POST',body:{action:d.adminPost}}).then(()=>{toast(d.adminPost==='remove'?'Post removed.':'Post kept.');loadAdmin()}).catch(e=>toast(e.message));return true}
  return false;
}

// Photos: resized in the browser (max 1600 px JPEG, which also drops EXIF), then re-encoded on the server.
async function shrink(file){
  const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'}).catch(()=>{throw new Error('This photo format is not supported here. Use JPEG or PNG.')});
  const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),c=document.createElement('canvas');
  c.width=Math.round(bitmap.width*scale);c.height=Math.round(bitmap.height*scale);c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);
  return new Promise((ok,fail)=>c.toBlob(b=>b?ok(b):fail(new Error('Could not read this photo.')),'image/jpeg',.85));
}
document.addEventListener('change',async e=>{
  if(!e.target.matches('[data-photo-input]'))return;
  const form=e.target.closest('form'),thumbs=form.querySelector('[data-photo-thumbs]'),have=JSON.parse(form.dataset.photos||'[]');
  const files=[...e.target.files].slice(0,4-have.length);e.target.value='';
  if(!files.length)return toast('Up to 4 photos per post.');
  form.dataset.uploading=Number(form.dataset.uploading||0)+files.length;
  for(const file of files){
    const slot=document.createElement('span');slot.className='photo-thumb loading';thumbs.append(slot);
    try{
      const blob=await shrink(file);
      const r=await fetch('/api/uploads',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:blob});const d=await r.json();if(!r.ok)throw new Error(d.error);
      const list=JSON.parse(form.dataset.photos||'[]');list.push({key:d.key,url:d.url});form.dataset.photos=JSON.stringify(list);
      slot.className='photo-thumb';slot.innerHTML=`<img src="${esc(d.url)}" alt=""><button type="button" data-remove-photo="${esc(d.key)}" aria-label="Remove photo">×</button>`;
    }catch(error){slot.remove();toast(error.message||'Photo upload failed.')}
    finally{form.dataset.uploading=Number(form.dataset.uploading)-1}
  }
});
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-remove-photo]');if(!b)return;
  const form=b.closest('form');form.dataset.photos=JSON.stringify(JSON.parse(form.dataset.photos||'[]').filter(x=>x.key!==b.dataset.removePhoto));b.parentElement.remove();
});
// Installable app: register the service worker (shell works offline; data needs a connection).
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('/sw.js').catch(()=>{});
