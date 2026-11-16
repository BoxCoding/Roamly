export const dynamic = "force-static";

// Plain page so Meta/Google reviewers and riders can read it without running the app.
const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Roamly privacy policy</title><meta name="description" content="What Roamly stores, why, who it is shared with, and how to delete your account.">
<link rel="icon" href="/favicon.svg">
<style>
:root{--paper:#fbfaf6;--ink:#1f2a22;--muted:#5f6b5c;--accent:#244d3d;--line:#e3e6dd}
@media (prefers-color-scheme:dark){:root{--paper:#141a16;--ink:#e8ece4;--muted:#a3ad9d;--accent:#8fc4a8;--line:#2c352e}}
body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.7 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:720px;margin:0 auto;padding:40px 16px 64px}
h1{font-size:32px;line-height:1.2;margin:8px 0}h2{font-size:20px;margin:36px 0 8px;scroll-margin-top:16px}
p,li{color:var(--muted)}strong{color:var(--ink)}a{color:var(--accent)}
.back{font-size:14px;text-decoration:none}.updated{font-size:14px}
table{width:100%;border-collapse:collapse;font-size:14px;margin:12px 0}th,td{text-align:left;vertical-align:top;padding:10px 8px;border-bottom:1px solid var(--line)}th{color:var(--ink)}
</style></head><body><main>
<a class="back" href="/">← Back to Roamly</a>
<h1>Privacy policy</h1>
<p class="updated">Last updated 18 November 2026</p>
<p>Roamly helps riders discover road trips, plan them and find a crew. This page explains what we store, why, who else sees it and how you delete it. We do not sell your data and we do not show ads.</p>

<h2>What we store</h2>
<table>
<tr><th>Data</th><th>Why</th></tr>
<tr><td><strong>Account</strong>: name and email. For email sign-up, a salted password hash (never the password). For Google or Facebook sign-in, your account ID with that service, name and email.</td><td>To sign you in and keep your data in your account.</td></tr>
<tr><td><strong>Rider profile and garage</strong>: home city, experience, riding since, pace, riding styles, what you are looking for, regions ridden, languages, about text, vehicles and social links you add.</td><td>To fill in trip plans and to show your rider card to other <strong>signed-in</strong> riders. Your rider card never shows your email.</td></tr>
<tr><td><strong>Crews</strong>: crews you create (name, city, meetup, description, WhatsApp/Telegram and other links, open or private), which crews you join or ask to join, your role in each (owner, co-lead, member), and reports you file with their reason and note.</td><td>Crews are listed for every visitor with a member count. Members of a crew can see each other's names and rider cards; the owner and co-leads also see join requests. Private crews show their chat links only to approved members. Reports are seen only by admins and never show who filed them.</td></tr>
<tr><td><strong>Account record</strong>: name, email, sign-in method, role (rider or admin), account status, when you joined and when you were last active.</td><td>To run the service and keep it safe. Admins can see this record, including your email, to handle reports and suspend accounts that break the rules.</td></tr>
<tr><td><strong>AI usage count</strong>: how many AI plans you built today.</td><td>To enforce the daily limit.</td></tr>
</table>
<p>Saved trips, sample-group joins and reminders stay only in your browser's local storage, not on our servers.</p>

<h2>Cookies</h2>
<p>We use one signed, HttpOnly session cookie to keep you signed in (30 days), and a short-lived cookie during Google or Facebook sign-in to protect against forged logins. No advertising or analytics cookies.</p>

<h2>Who else processes your data</h2>
<ul>
<li><strong>Google Cloud</strong> (Mumbai region, India) hosts the app and its database.</li>
<li><strong>Google Gemini API</strong> receives the trip details you enter when you build an AI plan (route, dates, travellers, vehicle, budget and preferences) to generate the plan. Your name and email are not sent.</li>
<li><strong>Google</strong> or <strong>Meta (Facebook)</strong>, only if you choose to sign in with them. We receive your account ID, name and email; we do not post anything or read your friends, groups or pages.</li>
<li><strong>Google Fonts</strong> serves the page fonts, so your browser contacts Google when the page loads.</li>
</ul>
<p>Map and social buttons open external sites (Google Maps, Instagram, YouTube, WhatsApp and others), which have their own policies.</p>

<h2 id="delete">Delete your data</h2>
<p>You can delete your account yourself at any time:</p>
<ol>
<li>Sign in to Roamly and open your profile.</li>
<li>Click <strong>Delete my account</strong> and type <strong>DELETE</strong> to confirm.</li>
</ol>
<p>This immediately and permanently deletes your account record, profile, garage, AI usage count, crews you organize (with their members and reports), your crew memberships and the reports you filed. It cannot be undone. To also clear saved trips on a device, clear this site's data in your browser.</p>
<p>If you signed in with Facebook, you can also remove Roamly under Facebook Settings → Apps and Websites; then sign in once more and use Delete my account to remove what Roamly stored.</p>

<h2>How long we keep it</h2>
<p>Until you delete your account. Crews removed by moderators are kept hidden for the record until their organizer deletes them or their account.</p>

<h2>Security</h2>
<p>Traffic is encrypted with HTTPS. Secrets are kept in Google Secret Manager. Passwords are stored only as salted PBKDF2 hashes, and repeated wrong passwords lock the account for 15 minutes.</p>

<h2>Children</h2>
<p>Roamly is meant for adults planning road trips and is not directed at children under 18.</p>

<h2>Changes</h2>
<p>If this policy changes, we will update this page and its date.</p>
</main></body></html>`;

export function GET() {
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
