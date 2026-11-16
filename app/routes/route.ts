import {trips} from '../../public/catalog.mjs';
import {tripPrice} from '../../public/domain.mjs';
import {escHtml,htmlResponse,staticPage} from '../../lib/static-page';
export const dynamic='force-static';

const money=(n:number)=>'₹'+Math.round(n).toLocaleString('en-IN');
const html=staticPage({title:'Road trip routes in India · Roamly',description:`${trips.length} curated bike and car road trips across India with days, distance, places, stays and budget.`},
`<h1>Road trip routes in India</h1><p>Curated bike and car routes with the right season, places to see, where to stay and a starting budget. Plan any of them day by day in Roamly.</p>
<ul>${trips.map(t=>`<li><a href="/routes/${t.id}"><strong>${escHtml(t.title)}</strong></a> · ${escHtml(t.route)} · ${t.days} days · ~${t.km} km · ${t.vehicle} · from ${money(tripPrice(t))} per person</li>`).join('')}</ul>`);
export function GET(){return htmlResponse(html)}
