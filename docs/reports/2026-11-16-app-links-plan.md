# "Better on the app": where the website points to the app (plan, 16 Nov 2026)

**This is a plan only. Nothing has been built or changed.** It waits for your OK.

## Summary

- **iPhone and iPad (Safari):** Apple's own Smart App Banner at the top of every page. Apple draws it, and Apple decides when it comes back after someone closes it. On a teacher's page it also tells the app which teacher to open.
- **Android:** a slim "Get the app" strip at the top of the page (never a pop-up). One tap on × hides it for **30 days**. After a tap on "Get the app" it stays hidden for **90 days**.
- **Official store badges** (unchanged, as Apple and Google require) in five places: the footer, a new About page, a one-time welcome card after sign-up, the explorer welcome email, and the new `/get-app` page.
- **One small line** on teacher pages and in My Library: "Save and follow on the app".
- **The right store for each device:** iPhone/iPad → App Store; Android → Google Play; computers (and anything we can't tell) → both.
- **Taps counted in Admin → Activity** in a new "Get the app" panel: which placement, which store, which kind of device. Counts only, never who tapped, like the Amazon buy clicks.
- **Two things only you can give us:** the App Store **Apple ID** (the number in the app's App Store link). It is **not anywhere in the repo**, and we won't guess it. Before deep links: the Play **app-signing** key's SHA-256 (see "What you need to supply").
- **There is no About page on the site today.** The plan adds one at `/about`, and it needs a few lines of your words.

## Where each link appears

| # | Placement | Device(s) | What the visitor sees | Exact wording (draft for your OK) | File(s) to change |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | Smart App Banner (every page except /admin) | iPhone and iPad, in Safari only | Apple's grey banner at the very top: app icon, name, "Open" or "View" | Apple writes it from the App Store listing. We don't set any words | `web/app/layout.js` (site-wide `itunes` metadata); `web/app/healers/[slug]/page.js` (`generateMetadata`, teacher's own app-argument) |
| 2 | Android "Get the app" strip (top of page) | Android phones and tablets, in a browser | Thin navy strip: star icon, one line, purple button, × to close | "**Spiritpedia is better on the app.** Free on Google Play." Button: "**Get the app**". × reads "Not now" to screen readers | New `web/components/AppBanner.jsx`, placed in `web/app/layout.js` above the page |
| 3 | Footer (every public page) | All: iPhone shows the App Store badge only, Android shows Google Play only, a computer shows both | One quiet line and the badge(s), above "© 2026 Spiritpedia" | "**Spiritpedia is better on the app.**" + badge(s) | `web/components/SiteFooter.jsx` + new `web/components/StoreBadges.jsx` |
| 4 | About page (new, `/about`) | Same device rule as the footer | A short "Spiritpedia on your phone" section with the badge(s) | "**Spiritpedia on your phone.** Save teachers, books and videos, and take your Library with you. Free on iPhone, iPad and Android." | New `web/app/about/page.js`; footer link "About"; `web/app/sitemap.js` |
| 5 | After sign-up (one-time welcome card) | Same device rule | A small card on the page they land on after entering their code. Shown once, with a × | "**Welcome to Spiritpedia.** Your Library is ready. It's even better on the app: sign in there with the same email and everything you save will be waiting." + badge(s) | `web/app/auth/verify/page.js` (sets a one-time flag before leaving); new `web/components/WelcomeAppCard.jsx` in `web/app/layout.js` |
| 6 | Explorer welcome email (website sign-ups only) | Both badges for everyone (an email can't tell the device) | A short paragraph and two badge images before the star's farewell | "**Spiritpedia is also on your phone.** Sign in to the app with this email address and your Library will be waiting." | `docs/email-copy-2026-10-21.md` first (copy is final there), then `web/utils/emailTemplates.js` (`explorerWelcome`, web branch only) and `web/utils/emailParts.js` (badge row); badge PNGs in `web/public/email/` |
| 7 | Teacher pages (also school and organisation pages, same file) | Same device rule. One text link, not badges | One small grey line under the teacher's badges, with the link in purple | "**Save and follow on the app** →" (see note on "follow" below) | `web/app/healers/[slug]/page.js` + new `web/components/AppLine.jsx` |
| 8 | My Library | Same device rule. One text link | One small line under "Your saved archive", whether the Library is empty or full | "**Save and follow on the app** →" | `web/components/LibraryView.js` (uses `AppLine.jsx`) |
| 9 | `/get-app` page and links | iPhone → straight to the App Store; Android → straight to Google Play; computer → a simple page with both badges | Nothing, or the page with both badges | Page title: "**Get the Spiritpedia app**". "Free on iPhone, iPad and Android." | New `web/app/get-app/route.js` (or page) + `web/utils/appStores.js` |

All the links in rows 3–9 go through one counting address, `/get-app/app-store` or `/get-app/google-play`, which counts the tap and sends the visitor on (see "Tracking"). That is also a short link you can use anywhere: `spiritpedia.co/get-app`.

## 1. iPhone and iPad: Apple's Smart App Banner

- **What it is:** one line in each page's header, `<meta name="apple-itunes-app" content="app-id=…, app-argument=…">`. Next.js writes it for us from `metadata.itunes` in `web/app/layout.js`. No code runs in the visitor's browser.
- **Where it shows:** Safari on iPhone and iPad only. Chrome on iPhone, and the browsers inside Instagram, Facebook, Gmail and so on, never show it. That is Apple's rule, not ours.
- **Closing it:** Apple controls this. Once closed, Safari hides it for a while and we can't change how long. That is the calm behaviour you asked for.
- **If they already have the app:** the banner says "Open" instead of "View". On a teacher's page, the plan sets `app-argument` to that page's own address (`https://www.spiritpedia.co/healers/<slug>`). The app's screens already mirror the website's addresses (`app/lib/router.dart`: "so a spiritpedia.co link can later open the same screen"). See "Deep links" for what still has to be checked.
- **Not on /admin:** the admin layout will switch it off, because it has no visitor to talk to.
- **Needs:** the App Store Apple ID (you supply it). Until we have it, this part can't be built.
- **Taps can't be counted on our side.** Apple doesn't tell the page when someone taps its banner. App Store Connect → App Analytics → Sources → **Web Referrer** shows downloads that came from spiritpedia.co, and that is where those numbers live.

## 2. Android: the small "Get the app" strip

- **Look:** a slim strip in the page (not floating over it) above everything else. Navy `#0a0f1d`, a hairline border `white/10`, the star (`Spiritpedia_Header_Symbol.png`), one line of grey text, a small purple pill button (`#7c3aed`, as on "Accept All"), and an ×. About 56 px tall, and it pushes the page down rather than covering it. It never overlaps the cookie notice or the floating My Library button, which are both at the bottom.
- **Who sees it:** Android phones and tablets in any browser, including in-app browsers (Play links open the Play Store from there too).
- **Who doesn't:** iPhone/iPad (they have Apple's banner), computers, `/admin`, the sign-in and sign-up screens (`/auth/*`). Also not anyone whose cookie question isn't answered yet: they get one question at a time, so the strip waits until the next page after the cookie choice.
- **Dismissal rule:**
  - **×**: hidden for **30 days**.
  - **"Get the app"** tapped: hidden for **90 days** (they most likely have it now).
  - Remembered on that browser only (`localStorage`, key `spiritpedia:app-banner`, holding the date it may come back). If the browser blocks storage, × hides it until the tab is closed. Never an error.
  - This is a preference the visitor asked for, not tracking, so it needs no cookie consent. It sets no cookie.
- **Never** a full-screen pop-up, never on a timer, never re-shown on the same visit after ×.

## 3. The badges

- **Official files only, unmodified.**
  - Apple: "Download on the App Store", black version, from Apple's marketing tools (tools.applemarketingtools.com). Don't recolour, crop, animate or put it inside a button shape. Keep clear space of at least a quarter of its height around it, and on screen at least 40 px tall.
  - Google: "Get it on Google Play", from play.google.com/intl/en_gb/badges. Don't change it. When shown next to the Apple badge it must be **the same size or larger**.
  - Both are free to use. We can download them ourselves; you only need to OK it.
- **None are in the repo today** (`web/public` has only Spiritpedia logos and `email/spiritpedia-star.png`). We'll add:
  - `web/public/badges/app-store.svg`
  - `web/public/badges/google-play.svg`
  - PNG copies in `web/public/email/` (Gmail and Outlook don't show SVG in emails)
- **Trademark lines** (Apple's and Google's wording), once, at the bottom of the About page: "Apple, the Apple logo, iPhone and iPad are trademarks of Apple Inc., registered in the U.S. and other countries. App Store is a service mark of Apple Inc. Google Play and the Google Play logo are trademarks of Google LLC."
- **One shared component** (`StoreBadges.jsx`) draws them everywhere, so the device rule and the tap counting are written once.

Where they go:
- **Footer:** the line "Spiritpedia is better on the app." and the badge(s), small (40 px), above the © line. Plus a new "About" link in the © row.
- **About:** a new page (`/about`). There is none today. It needs a few lines from you about Spiritpedia. We'll add the app section and the trademark lines.
- **After sign-up:** today, a new explorer goes straight from the code screen to the homepage. Nothing welcomes them on the site. Just before that move, the verify page sets a one-time flag (`sessionStorage`), and a small welcome card shows once on the page they land on, with the badge(s) and an ×. Practitioners go to their setup form, and the card waits until they've finished it (no distraction mid-form).
- **Welcome email:** only the **website** version of the explorer welcome. People who signed up in the app already have it. Both badges are shown, because an email can't know the phone. The email copy is "final" in `docs/email-copy-2026-10-21.md`, so the words change there first, then in the template, and the template tests are updated. **Question for you:** should the practitioner welcome get the line too? The plan says no for now, because it is about their listing.

## 4. The line on teacher pages and in My Library

- **Teacher pages:** one line under the teacher's badges, in the right-hand column: "**Save and follow on the app** →". It covers schools and organisations too, because they use the same page.
- **My Library:** the same line under "Your saved archive". It shows whether the Library is empty or full, and it sits above the "your library lives on this browser only" sign-up card, not inside it.
- **The link goes to:** the store for that device. On a computer, the words link to `/get-app`, which shows both badges. On an iPhone where the app is installed, the Smart App Banner above already says "Open".
- **Please check the word "follow".** The app has no "follow" button today: you save (heart) a teacher, and Discoveries notifications suggest things. People may look for a Follow button. Two softer options:
  - "**Save teachers and get gentle discoveries on the app** →"
  - "**Keep your Library with you on the app** →" (for My Library)

  We'll use your exact words unless you choose one of these.

## 5. Device rules

| Visitor | What we show | Store link |
| :-- | :-- | :-- |
| iPhone, Safari | Apple's banner; the App Store badge only; the line links to the App Store | App Store |
| iPhone, Chrome or an in-app browser (Instagram, Gmail…) | No banner (Apple's doesn't appear and we don't add one); the App Store badge only | App Store |
| iPad (including new iPads that say they're a Mac; we check for a touch screen) | As iPhone | App Store |
| Android phone or tablet, any browser | Our strip; the Google Play badge only | Google Play |
| Mac, Windows, Linux computers | No banner; **both** badges | Both |
| Anything we can't recognise | No banner; both badges | Both |
| The Spiritpedia app itself | The app opens spiritpedia.co links in the phone's own browser, so the site behaves as above (someone who has the app may see the strip once and close it; harmless) | — |

- **How we tell:** one small helper, `web/utils/appStores.js`, reads the browser's user-agent. It is used on the server (for `/get-app` redirects) and in the browser (for badges and the strip), with tests. Nothing like it exists in the site yet.
- **First load:** the page first draws with **both** badges, then narrows to one once the browser has said what it is. That way nothing jumps or flashes the wrong store on cached pages.
- **Your call:** for iPhone visitors in Chrome or in-app browsers, the plan shows nothing extra (as you said, Apple's banner only). If you'd like them to see our small strip too, it's one switch.

## 6. Tracking in Activity

The Amazon "Buy" clicks are counted in a separate, anonymous daily table (migration 0046, `/api/amazon-click`, `AmazonClicksPanel` in Admin → Activity). The general Activity stream (`/api/activity`, `web/utils/activity.js`, migration 0021) only takes content events (open, save, search…) and would reject these. So the plan copies the Amazon model exactly.

- **Migration 0052 `app_store_clicks`** (dev first, then live, with exact steps for you):
  - A table `app_store_clicks_daily`. One row per day × placement × store × device × action, holding a count.
  - No user, no IP, no session. Kept 25 months, like the Amazon table, and cleared by the existing nightly purge.
  - One writer function, `log_app_store_click()`, service role only. One reader for the admin.
- **Event names:**
  - `app_store_tap`: a tap on any badge, line, the strip's button, or a link in the email.
  - `app_banner_dismiss`: the × on the Android strip (and on the welcome card), so you can see whether it annoys people.
- **Properties:**
  - `placement`: `footer`, `about`, `after_signup`, `welcome_email`, `teacher_page`, `library`, `android_banner`, `get_app_page`
  - `store`: `app_store` or `google_play`
  - `device`: `iphone`, `ipad`, `android`, `desktop`, `other`
  - `action`: `tap` or `dismiss`
- **How it's counted:** every link points at `/get-app/app-store?from=<placement>` (or `google-play`). The server counts it and sends the visitor straight on to the store. Because no script is needed, the same address works inside the welcome email. The strip's × is sent quietly in the background (`sendBeacon`, as the Amazon button does).
- **In the admin:** a new panel, "**Get the app**", on Admin → Activity, under "Amazon buy clicks":
  - one row per placement, with columns App Store | Google Play | Total
  - a small line beneath: "Android strip closed: N"
  - a device split (iPhone / iPad / Android / computer)

  It follows the page's 7/30/90-day choice. The web/app switch doesn't apply, because it's all website.
- **The stores' own numbers:** Play links carry `referrer=utm_source=spiritpedia&utm_medium=<placement>`, so Play Console → Acquisition shows installs by placement. Apple's equivalent (`pt=` and `ct=` on App Store links) needs your **provider token** from App Store Connect. It's optional; without it, App Store Connect still shows "Web Referrer: spiritpedia.co".
- **Privacy policy:** these are anonymous totals like the Amazon ones, and no cookie is set. One added sentence in `/privacy` (store taps are counted, never who tapped) for your OK.

## 7. Deep links (opening the same teacher in the app)

- **Today:**
  - The app's screens already use the website's addresses (`/healers/:slug`, `/books/:slug`, `/videos/:slug`, `/offerings/:slug`, `/free-resources/:slug`, `/publishers/:slug`), and unknown ones open Discover politely.
  - **But the app isn't set up to receive links yet.** There are no Associated Domains in `app/ios/Runner/Runner.entitlements` (only push), no link `intent-filter` in `AndroidManifest.xml`, and no `web/public/.well-known/` folder (no `apple-app-site-association`, no `assetlinks.json`).
  - So a spiritpedia.co link always opens the website today, even with the app installed.
- **What works without an app update:** the Smart App Banner's `app-argument`. When the app is installed, Safari hands it the teacher's address when "Open" is tapped. Whether the app then shows that teacher needs a simulator check (Flutter's built-in deep linking is on by default in this Flutter version). If it doesn't, the app simply opens on Discover, which is harmless. We'll check it during your simulator review.
- **Full deep links (later, separate step, needs an app release, e.g. alongside 1.0.2):**
  - iOS: add `applinks:www.spiritpedia.co` and `applinks:spiritpedia.co` to the app's entitlements, and turn on Associated Domains for `co.spiritpedia.app` (Team `KT2XV84345`) in the Apple developer site. **Dashboard steps for you.**
  - Android: an `autoVerify` intent-filter for `https://www.spiritpedia.co` and `https://spiritpedia.co`.
  - Website: `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`, served as JSON (a small header rule in `web/next.config.mjs`).
  - `assetlinks.json` needs the **app-signing** key's SHA-256 from Play Console → Setup → App signing. The README only records the **upload** key's fingerprint, which is not the same thing.
  - Once that's live, tapping any spiritpedia.co teacher link on a phone with the app opens that teacher in the app. The website plan above doesn't wait for this.

## 8. What you need to supply

1. **The App Store Apple ID.** In App Store Connect → Spiritpedia → App Information → "Apple ID". It's a number about 10 digits long, and it's also the `id…` number at the end of the app's apps.apple.com link. **It isn't in the repo** (I searched the README, docs, the iOS project and the website), and we will not guess it. Without it, the Smart App Banner and every App Store link wait.
2. **Your OK to download the official badges** from Apple and Google (no account needed), or send the files if you already have them.
3. **A few lines for the new About page** (who Spiritpedia is for, what it is). We'll add the app section and trademark lines.
4. **Your choice of wording:** the "follow" line (section 4), and whether the practitioner welcome email gets the badges.
5. **Optional:** the App Store Connect **provider token** (for App Store campaign numbers).
6. **Before deep links only:** the Play **app-signing** SHA-256, and turning on Associated Domains in the Apple developer site (exact steps given when we get there).
7. **Small housekeeping:** the README's open item, "add the App Store and Play links to the site list" for Amazon Associates, can be done once you have the App Store link.

## 9. Risks and how the plan handles them

- **Wrong App Store ID:** the banner would advertise nothing or the wrong app. We take it only from you, and we check that the apps.apple.com link opens Spiritpedia before building.
- **Too much "get the app":** a visitor could see the Apple banner, the footer, the teacher line and the welcome card on one visit.
  - The Android strip waits for the cookie answer, and the welcome card shows once.
  - The teacher and Library lines are one quiet line each, never a button.
  - Nothing moves, pops or repeats on a timer.
- **The page jumping:** the Android strip is in the page, not floating, and it's decided before it draws, so text doesn't jump. A computer never gets it.
- **Email link-checkers** (Outlook's Safe Links, some company filters) open links automatically, which could inflate "welcome email" taps a little. We'll note this next to that row in the admin.
- **Uncountable Apple-banner taps:** a limit of Apple's banner. We use App Store Connect's Web Referrer instead.
- **Badge rules:** an altered or resized-unequal badge can draw a complaint from Apple or Google. The one shared component keeps both at the same height.
- **Email copy is "final":** changing the welcome email means editing `docs/email-copy-2026-10-21.md` first, as the code says.
- **"Follow":** the app doesn't have a follow button yet (section 4).
- **iPads that pretend to be Macs:** handled by the touch-screen check. If one slips through, it sees both badges, which still works.

## 10. Build order and rough effort

| Step | What | Rough effort | Needs |
| :-- | :-- | :-- | :-- |
| 1 | `web/utils/appStores.js` (store links, device rule) with tests; download official badges into `web/public/badges` and `web/public/email` | 1–2 hours | Your OK on badges; App Store ID |
| 2 | Migration 0052 (dev then live, your dashboard steps), `/get-app` counting redirect and page, "Get the app" panel in Admin → Activity | 3–4 hours | You run 0052 on dev, then live |
| 3 | Smart App Banner: site-wide in `layout.js`, teacher `app-argument`, off on /admin | 30 minutes | App Store ID |
| 4 | `StoreBadges.jsx` and the footer | 1 hour | — |
| 5 | Android strip `AppBanner.jsx` with the 30/90-day rule | 2 hours | — |
| 6 | Teacher-page and My Library line (`AppLine.jsx`) | 1 hour | Your wording choice |
| 7 | Welcome card after sign-up | 1–2 hours | — |
| 8 | About page (`/about`, footer link, sitemap) | 1 hour once your words arrive | Your About text |
| 9 | Welcome email: copy doc, template, PNG badges, tests | 1–2 hours | Your OK on the email words |
| 10 | Privacy sentence; README section; report | 30 minutes | Your OK |
| 11 | Check on the iPhone and Android simulators (one at a time), then push `web/` (which deploys) | 1 hour | — |
| 12 | **Later, with an app release:** full deep links (entitlements, intent-filter, `.well-known` files) | 3–4 hours + an app build | Play app-signing SHA-256; Associated Domains switched on |

**Steps 1–11 come to about 2 days of work.** They are all website changes; none needs an app update. Steps 3, 4 and 5 can go live first, as soon as the App Store ID arrives. Step 12 rides on the next app release.
