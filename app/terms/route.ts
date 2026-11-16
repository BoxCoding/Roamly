import {htmlResponse,staticPage} from '../../lib/static-page';
export const dynamic='force-static';

const html=staticPage({title:'Roamly terms of use',description:'The plain-language rules for using Roamly: your safety, your content, and what Roamly does and does not promise.'},`
<h1>Terms of use</h1>
<p class="updated">Last updated 18 November 2026</p>
<p>By creating an account or using Roamly you agree to these terms, the <a href="/guidelines">community guidelines</a> and the <a href="/privacy">privacy policy</a>.</p>

<h2>Your safety is your responsibility</h2>
<ul>
<li>Roamly is a planning and community tool. Routes, distances, budgets, AI briefs and road reports are <strong>estimates and opinions</strong>, not guarantees. Always check current road, weather, permit and health conditions yourself.</li>
<li>Ride or drive within the law and your ability: valid licence and documents, a roadworthy vehicle, proper safety gear, no riding under the influence, no racing on public roads.</li>
<li>Group rides are organised by riders, not by Roamly. Ride leads and members are responsible for their own conduct and decisions. Roamly does not vet riders, vehicles or meetup points.</li>
</ul>

<h2>Your account</h2>
<ul>
<li>You must be 18 or older. Use your real name and keep your sign-in secure. One person per account.</li>
<li>You can delete your account at any time from your profile.</li>
<li>Admins may hide content, remove crews or suspend accounts that break these terms or the community guidelines.</li>
</ul>

<h2>Your content</h2>
<ul>
<li>You own what you post. You allow Roamly to store and show it in the app to the audience you chose (everyone, or your crew), and to resize photos for display.</li>
<li>Post only what you have the right to share. Do not post other people's phone numbers, addresses or photos without their consent.</li>
<li>Photos are re-encoded and their hidden location data is removed when you upload them.</li>
</ul>

<h2>Money</h2>
<p>Roamly does not take payments, hold money or sell bookings. Any money you share with riders for fuel, stays or rentals is between you and them. Never pay strangers in advance; report anyone who asks.</p>

<h2>Service</h2>
<ul>
<li>Roamly is provided as it is, without guarantees of availability or accuracy. Features may change.</li>
<li>To the extent the law allows, Roamly is not liable for injuries, losses or damages arising from trips, rides or meetups planned or arranged through the app.</li>
<li>Third-party links (maps, booking sites, social networks) are governed by their own terms.</li>
</ul>
<p>These terms are written in plain language and are governed by the laws of India.</p>`);

export function GET(){return htmlResponse(html)}
