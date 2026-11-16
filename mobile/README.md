# Roamly — Android & iOS apps (Capacitor)

Native shells around the deployed Roamly site (`server.url` in `capacitor.config.json`). Every web deploy
updates the apps instantly; rebuild the native apps only for icon, name, permission or plugin changes.
App id: `app.roamly.rides`. Offline screen: `www/offline.html`.

What the app adds on top of the website (all in `public/app.js`, active only inside the app):
- Bottom tab bar layout, bottom-sheet dialogs, safe areas for notches and home bars.
- Android back button: closes the open sheet, then goes back to Discover, then minimises the app.
- Google / Facebook sign-in through the system browser (Google blocks sign-in inside WebViews). The site
  hands a short-lived, PKCE-bound code back on `roamly://auth`, which the app redeems at `/api/auth/app`.
- Native share sheet, light haptics on RSVP / like / join, external links in the system browser.
- Camera or gallery for post photos (permissions declared on both platforms).

## Android APK (no Android Studio needed)
```
gcloud builds submit mobile --config mobile/cloudbuild-android.yaml --project roamly-f22530 --region asia-south1
gcloud storage cp gs://roamly-f22530-builds/android/app-debug.apk .
```
Copy `app-debug.apk` to the phone and open it (allow "install unknown apps").
Play Store: needs a signed release build (`./gradlew bundleRelease` with an upload key) and a $25 Play Console account.

Device testing in Firebase Test Lab (robo crawl with screenshots):
```
gcloud firebase test android run --type robo --app app-debug.apk --device model=SmallPhone.arm,version=33 \
  --device model=MediumPhone.arm,version=36 --device model=MediumTablet.arm,version=35 --timeout 150s
```

## iOS
1. Install **Xcode** from the App Store (~15 GB), then `sudo xcode-select -s /Applications/Xcode.app`.
2. `cd mobile && npm install && npx cap sync ios && npx cap open ios`.
3. Run on a simulator, or on your iPhone with your Apple ID under *Signing & Capabilities* (free Apple ID apps expire after 7 days).
4. App Store / TestFlight: Apple Developer Program ($99/year) → *Product ▸ Archive*.

## Icons and splash
`assets/icon-only.png` (1024×1024), `icon-foreground.png`, `icon-background.png`, `splash.png`, then `npm run icons`.

## Moving to a custom domain
Change `server.url` and `allowNavigation` in `capacitor.config.json`, add the domain's
`/api/auth/google/callback` and `/api/auth/meta/callback` to the Google and Facebook OAuth settings, then rebuild the apps.
