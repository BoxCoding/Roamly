import {htmlResponse,staticPage} from '../../lib/static-page';
export const dynamic = "force-static";

// Plain page so Meta/Google reviewers and riders can read it without running the app.
const html = staticPage({title:'Roamly privacy policy',description:'What Roamly stores, why, who it is shared with, and how to delete your account.'},`<h1>Privacy policy</h1>
<p class="updated">Last updated 17 November 2026</p>
<p>Roamly helps riders discover road trips, plan them and find a crew. This page explains what we store, why, who else sees it and how you delete it. We do not sell your data and we do not show ads.</p>

<h2>What we store</h2>
<table>
<tr><th>Data</th><th>Why</th></tr>
<tr><td><strong>Account</strong>: name and email. For email sign-up, a salted password hash (never the password). For Google or Facebook sign-in, your account ID with that service, name and email.</td><td>To sign you in and keep your data in your account.</td></tr>
<tr><td><strong>Rider profile and garage</strong>: home city, experience, riding since, pace, riding styles, what you are looking for, regions ridden, languages, about text, vehicles and social links you add.</td><td>To fill in trip plans and to show your rider card to other <strong>signed-in</strong> riders. Your rider card never shows your email.</td></tr>
<tr><td><strong>Emergency info</strong> (optional): an emergency contact name and phone, and your blood group.</td><td>Private. Shown only to you and to the owner, co-leads and ride lead of a group ride while you are marked going on it, so they can get help if something happens. Never on your rider card.</td></tr>
<tr><td><strong>Crews</strong>: crews you create (name, city, meetup, description, WhatsApp/Telegram and other links, open or private), which crews you join or ask to join, your role in each (owner, co-lead, member), and reports you file with their reason and note.</td><td>Crews are listed for every visitor with a member count. Members of a crew can see each other's names and rider cards; the owner and co-leads also see join requests. Private crews show their chat links only to approved members. Reports are seen only by admins and never show who filed them.</td></tr>
<tr><td><strong>Group rides</strong>: rides your crew plans (date, route, meetup, seats), your RSVP (going, maybe, waitlist), your pre-ride checklist ticks, when you accepted the ride safety terms, and updates posted by ride leads.</td><td>Rides of open crews are listed for every visitor; rides of private crews only for members. Crew members see who is going and whether their checklist is complete. Rider names and updates are never shown to non-members.</td></tr>
<tr><td><strong>Saved trip plans</strong>: plans you save in My plans (route, days, towns, stays, stops, notes and budget settings).</td><td>Private to you. If you lead a ride and attach a plan, a copy is shown to everyone who can see that ride.</td></tr>
<tr><td><strong>Posts and road reports</strong>: what you post (text, place, route, report type and condition), comments, “Ride on / Useful” reactions and reports you file on posts.</td><td>Open posts are public to every visitor with your name. Posts shared with a private crew are visible only to its members. Road reports show in a route's road intel for 30 days. Reports on posts go to admins only.</td></tr>
<tr><td><strong>Photos</strong>: photos you attach to posts.</td><td>Resized and re-encoded when you upload them, which removes hidden metadata such as GPS location and camera details. Stored privately in Google Cloud Storage (India) and shown with the post to the post's audience. Deleted when you delete the post or your account.</td></tr>
<tr><td><strong>Follows and notifications</strong>: riders and open crews you follow, and in-app notifications about your crews, rides, posts and followers.</td><td>A rider you follow is told you followed them, and follower counts show on rider cards. Notifications are visible only to you.</td></tr>
<tr><td><strong>Ride stats and badges</strong>: computed from finished group rides you were going on, the rides you led and your road reports.</td><td>Shown on your rider card to signed-in riders, and on crew leaderboards to crew members.</td></tr>
<tr><td><strong>Account record</strong>: name, email, sign-in method, role (rider or admin), account status, when you joined and when you were last active.</td><td>To run the service and keep it safe. Admins can see this record, including your email, to handle reports and suspend accounts that break the rules.</td></tr>
<tr><td><strong>Email verification and password reset</strong>: whether you verified your sign-up email. Reset and verification links are signed, expire after an hour, and are not stored.</td><td>To keep accounts safe and let you recover a forgotten password.</td></tr>
<tr><td><strong>Product usage events</strong>: actions such as signing up, saving a profile, joining a crew, RSVPing or posting, with the time and your account ID (none when signed out). No IP address, device fingerprint or browsing history.</td><td>To understand which features riders use and fix what is not working. Kept on our own database in India, not shared with analytics or ad companies. Deleted with your account.</td></tr>
<tr><td><strong>AI usage count</strong>: how many AI plans you built today.</td><td>To enforce the daily limit.</td></tr>
</table>
<p>Saved trips, sample-group joins and reminders stay only in your browser's local storage, not on our servers.</p>

<h2>Cookies</h2>
<p>We use one signed, HttpOnly session cookie to keep you signed in (30 days), and a short-lived cookie during Google or Facebook sign-in to protect against forged logins. No advertising or analytics cookies.</p>

<h2>Who else processes your data</h2>
<ul>
<li><strong>Google Cloud</strong> (Mumbai region, India) hosts the app and its database.</li>
<li><strong>Google Gemini API</strong> receives the trip details you enter when you build an AI plan (route, dates, travellers, vehicle, budget and preferences), and ride details when a ride lead generates a group ride brief (route, dates, meetup, vehicle, number of riders, notes). Rider names and emails are not sent.</li>
<li><strong>Google</strong> or <strong>Meta (Facebook)</strong>, only if you choose to sign in with them. We receive your account ID, name and email; we do not post anything or read your friends, groups or pages.</li>
<li><strong>Google Gemini API (moderation)</strong>: when automatic rules flag a post (for example a money request) or a rider reports a post, the post's text (not your name or email) is sent once to Gemini to check it against the community guidelines.</li>
<li><strong>Resend</strong> sends account emails (email verification and password reset). It receives your email address and the email text only.</li>
<li><strong>Google Cloud Error Reporting</strong> receives technical error details (the error message and the page area where it happened) so we can fix crashes. No profile data is included.</li>
<li><strong>Google Fonts</strong> serves the page fonts, so your browser contacts Google when the page loads.</li>
<li><strong>OpenStreetMap</strong>: to draw route maps, our server looks up town names you enter (only the place names) with OpenStreetMap's Nominatim service and caches the coordinates. Map tiles load from OpenStreetMap and the map library from cdnjs (Cloudflare), so your browser contacts them when a map is shown.</li>
</ul>
<p>Map and social buttons open external sites (Google Maps, Instagram, YouTube, WhatsApp and others), which have their own policies.</p>

<h2 id="delete">Delete your data</h2>
<p>You can delete your account yourself at any time:</p>
<ol>
<li>Sign in to Roamly and open your profile.</li>
<li>Click <strong>Delete my account</strong> and type <strong>DELETE</strong> to confirm.</li>
</ol>
<p>This immediately and permanently deletes your account record, profile, garage, AI usage count, crews you organize (with their members, rides and reports), your saved plans, crew memberships, ride RSVPs, ride updates you posted, your posts, comments, reactions, follows, notifications and the reports you filed. It cannot be undone. To also clear saved trips on a device, clear this site's data in your browser.</p>
<p>If you signed in with Facebook, you can also remove Roamly under Facebook Settings → Apps and Websites; then sign in once more and use Delete my account to remove what Roamly stored.</p>

<h2>How long we keep it</h2>
<p>Until you delete your account. Crews removed by moderators are kept hidden for the record until their organizer deletes them or their account.</p>

<h2>Security</h2>
<p>Traffic is encrypted with HTTPS. To stop abuse, the number of changes from each internet address is counted for one minute in server memory and never stored. The database is backed up daily and kept for 7 days. Secrets are kept in Google Secret Manager. Passwords are stored only as salted PBKDF2 hashes, and repeated wrong passwords lock the account for 15 minutes.</p>

<h2>Your rights (India, DPDP Act 2023)</h2>
<p>You can access and correct your data from your profile, delete it with Delete my account, withdraw consent at any time by deleting your account, and nominate someone to act for you in case of death or incapacity by writing to the Grievance Officer. If you have a complaint about how we handle your data, contact the Grievance Officer below; we reply within 30 days. If you are not satisfied, you can complain to the Data Protection Board of India.</p>
<h2 id="grievance">Grievance Officer</h2>
<p><strong>Name:</strong> to be announced before public launch<br><strong>Email:</strong> to be announced before public launch</p>

<h2>Children</h2>
<p>Roamly is meant for adults planning road trips and is not directed at children under 18.</p>

<h2>Changes</h2>
<p>If this policy changes, we will update this page and its date.</p>
`);

export function GET() {
  return htmlResponse(html);
}
