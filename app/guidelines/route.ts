import {htmlResponse,staticPage} from '../../lib/static-page';
export const dynamic='force-static';

const html=staticPage({title:'Roamly community guidelines',description:'How riders keep Roamly safe, useful and friendly: posts, road reports, crews and group rides.'},`
<h1>Community guidelines</h1>
<p class="updated">Last updated 18 November 2026</p>
<p>Roamly works because riders look out for each other. Keep it that way.</p>

<h2>Do</h2>
<ul>
<li><strong>Share honest road intel.</strong> Say where, when and how bad. Update it if things change.</li>
<li><strong>Be clear in group rides.</strong> Real meetup points and times, an honest experience level, and updates when plans change.</li>
<li><strong>Respect every rider</strong>, on the road and in the app, whatever their bike, car, pace or experience.</li>
<li><strong>Report problems</strong> with ⚑. Three riders' reports hide a post or crew until an admin checks it.</li>
</ul>

<h2>Don't</h2>
<ul>
<li>Scams, advance-payment requests, fake rides or crews.</li>
<li>Spam, ads, referral links or short links that hide where they go.</li>
<li>Hate, harassment, threats, sexual content, or posting someone else's phone number, address or photos.</li>
<li>Encouraging dangerous or illegal riding: racing on public roads, stunts in traffic, riding drunk.</li>
<li>Misleading road reports or impersonating other riders or organisations.</li>
</ul>

<h2>How moderation works</h2>
<ol>
<li>Simple automatic rules stop obvious spam (too many links, short links, repeated text).</li>
<li>Text that looks like a money request, and posts that riders report, get one automatic AI check. Clear violations are hidden for an admin to review.</li>
<li>Admins make the final decision: keep, remove, or suspend the account.</li>
</ol>
<p>Breaking these guidelines can get your posts removed, your crew hidden or your account suspended.</p>`);

export function GET(){return htmlResponse(html)}
