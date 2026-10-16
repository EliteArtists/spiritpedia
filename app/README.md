# Spiritpedia: the app

The Flutter app for iPhone: **1.0.0 (13)** built 16 October 2026; build 12 is
in TestFlight.
It uses the same Supabase database, the same accounts and the same content as
the website in `../web`. This file is written so that a new session, with none
of the earlier conversations, can pick the app up.

Read the root README's **Handover → For the Flutter build** for the database
and website side.

---

## ⚠️ The crisis intercept: read before touching search

**Every search box in the app runs the crisis check first, on every
keystroke, before anything else and before anything is sent anywhere.** A
crisis phrase shows the crisis screen (findahelpline.com), and nothing goes to
any engine: not the feelings lookup, not the name search, not "See all", not
the keyboard's search key. The dual-path question ("hearing voices") comes
next, then the soft-tier line and the medical disclaimer.

- **One phrase list for the website and the app:** `web/shared/emotion-safety.json`.
  The app bundles it through a symlink (`assets/safety/`), and
  `web/shared/emotion-safety.cases.json` is checked by both `npm test` and
  `flutter test`, so the two cannot drift.
- **The code:** `lib/core/safety/emotion_safety.dart`, a port of the website's
  `utils/emotionSearchPatterns.js`, and the gates at the top of
  `lib/features/search/emotion_search_controller.dart` (`_evaluate`, `more`,
  `submit`).
- **The tests:** `test/features/search/two_engines_test.dart` ("the crisis
  intercept stays first in every search box") types every phrase, plain and
  as "I feel …", into all three boxes, and checks that neither engine received
  a single call.
- **Nothing personal overrides it.** Tailoring (More of, Never show) is
  applied only after the gates and never looks at them; there is a test for
  that too.

Do not shorten, reorder or skip these gates, and keep those tests passing.
Change the phrases only in the shared JSON.

---

## Overview

### Structure

```
lib/
  main.dart             starts Supabase and Firebase, holds the launch screen, portrait only
  app.dart              MaterialApp.router; the star layer and the intro sit above the router
  router.dart           go_router; paths mirror the website's (/healers/:slug, /books/:slug …)
  core/                 config, Supabase client, crisis safety, Amazon links, dates, retry
  data/                 models, the read-only content repository, shelf_rules.dart (pure rules)
  theme/                the website's colours and type (Geist)
  shared/widgets/       cards, shelves, tier badges, images
  features/
    intro/              first-launch intro, later-launch flight, then onboarding
    interests/          Tailor Spiritpedia: More of and Never show, the picker, onboarding
    shell/              Discover · Videos · Books, the floating pill
    star/               the star: its layer, flights (slipstream), StarPage, tier tips
    home/               Discover: For You, billboard, shelves, pills, Explore More
    videos/ books/      the other two tabs
    search/             two-engine search, Spiritpedia Suggests, the crisis screen
    detail/             teacher, book, video, publisher, offering, free resource
    subject/            subject pages
    reviews/            reviews with report, block and the ban rule
    library/            My Library: saves on the phone, synced with the account
    account/            sign-in, My Account, change email, delete account
    notifications/      push notifications
    menu/               the right-side frosted menu
docs/
  personalisation.md    what More of and Never show change, in plain English
  website-followups.md  website issues found while building the app (not fixed)
```

State is **Riverpod 3** (no code generation). Riverpod retries a failing
provider on its own, so providers catch their own errors
(`core/retry.dart` → `spiritpediaRetry`). Navigation is **go_router**.

### How it talks to Supabase and the website

- **Reads** use the anon key, directly from Supabase. RLS allows reading
  content and nothing else.
- **A person's own rows** are written with their own session, under RLS:
  `user_profiles`, `user_favourites`, `reviews` (forced to pending),
  `user_interests`, `notification_preferences`. Some go through
  `SECURITY DEFINER` functions instead: `register_push_token`,
  `report_review`, `block_review_author`, `save_counts`.
- **Anything needing the server's key** goes through the website's API
  routes, with the person's access token (`Authorization: Bearer …`):

  | Route | When |
  | :--- | :--- |
  | `/api/email/explorer-welcome` | once, when the profile row is first created |
  | `/api/email/review-received` | after a review is submitted |
  | `/api/email/review-reported` | after a review is reported (emails love@) |
  | `/api/account/delete` | Delete account |
  | `/api/push/welcome` | after notifications are turned on: the welcome notification, once per account |

- **Never put the service-role key in the app, and never loosen RLS** to
  make something easier. The anon key is public by design.

Sign-in is an emailed six-digit code (no passwords). Changing an email address
uses Supabase's "Secure email change": a code to the new address and one to the
current one. All of this is in `features/account/account_service.dart`, behind
an interface that `test/support/fake_account.dart` fakes for the tests.

### Dev and live

| | Dev | Live |
| :--- | :--- | :--- |
| Supabase project | `khtpbnof…` | `uzmvcgewxgvnybdhvsyx` |
| App config | `config/dev.json` (**not committed**; copy `config/dev.example.json`) | `config/prod.json` (committed: public values and the Amazon tags) |
| Website env | `web/.env.development.local` | `web/.env.local` |
| API routes | `http://localhost:3000` (`npm run dev` in `web/`) | `https://www.spiritpedia.co` |
| Firebase | `core/firebase/options_dev.dart` | `core/firebase/options_prod.dart` |

```bash
cd app
flutter pub get
flutter run --dart-define-from-file=config/prod.json   # live data
flutter run --dart-define-from-file=config/dev.json    # dev database, local website
```

Without the config the app opens on a screen naming what is missing. Flutter
is pinned to **3.47.7** (Dart 3.13.5) and `pubspec.lock` pins everything. iOS
plugins come through Swift Package Manager, so there is no Podfile.

**Migrations run on dev first, then live.** The person running the project
pastes each SQL file into the Supabase SQL editor themselves. Check each one
on dev with temporary accounts (deleted afterwards), and on live with
read-only checks only.

### Checks

```bash
flutter analyze        # must say "No issues found"
flutter test           # 259 tests at build 15, all passing
```

Screenshots for review come from a temporary integration test (a "tour") that
prints `SHOT:name` markers while a background loop runs `xcrun simctl io …
screenshot`. Tours are deleted afterwards and never committed.

### Build and upload

1. **Bump the build number** in `pubspec.yaml` (`version: 1.0.0+N`). Every
   TestFlight upload needs a new one.
2. `flutter analyze` and `flutter test`, then check it in the simulator.
3. `flutter build ipa --release --dart-define-from-file=config/prod.json`
4. Check the IPA (unzip it): `CFBundleVersion` is N, and the entitlements say
   `aps-environment` **production**.
5. Upload `build/ios/ipa/Spiritpedia.ipa` with **Transporter**. The person
   running the project uploads; there is no App Store Connect API key on this
   Mac.

**Build numbers so far:** 1–9 and 11–16 are real builds. **Build 10 was an
accidental duplicate of build 9**, uploaded from Xcode, so the numbering
jumped from 9 to 11. The next build is **17**.

The Mac's disk has filled up during a build before. `flutter clean` frees the
app's `build/` folder (about 7 GB), and everything in it is regenerated.

**iPhone only, portrait only.** iPad is Phase B. Bundle ID `co.spiritpedia.app`.
App-only pushes don't redeploy the website (`web/scripts/vercel-ignore-build.sh`);
anything under `web/` deploys live.

---

## What's built

### Phases 0–3a

| Phase | What |
| :--- | :--- |
| 0 | Skeleton, theme, native launch screen, intro |
| 1a | One crisis phrase list for the website and the app |
| 1b | Explore: shelves, subject pills, subject pages |
| 1c | Emotional search, the crisis intercept first |
| 1d | Teacher, book, video, publisher, offering and free-resource pages; saves on the phone |
| 2 | Email-code sign-in, profile, My Library sync (every save a slug, migration 0012), self-serve account deletion (0013) |
| 3a | Push notifications through Firebase Cloud Messaging only (0014) |

### A1–A3, onboarding and tailoring (builds 5–13)

**Discover · Videos · Books.**
- A floating pill of dark frosted glass. Discover is where the app opens.
- Each tab keeps its own history.
- One subject filter carries across all three tabs and the star.

**The star's rules.**
- **On a tab page** the star rests in the search bar. When the bar scrolls
  away, it flies into the start of the sticky pill row (the pills fade
  beneath it). Scrolling back, it flies back.
- **On detail pages** the star sits at the foot of the page. Tapping it goes
  home to the tab you came from, with the filter kept.
- **Every page change** is a flight along the slipstream.
- **There is only ever one star on screen** (`features/star/star_layer.dart`).
- **Press and hold the star, anywhere:** My Library, with a light haptic
  tap (`starHeld`). A normal tap is unchanged.
- **First launch:**
  - The star greets ("I am your guiding star") and flies into the search bar.
    The intro sits above the app's pages, so its text needs its own
    `Material`; without one Flutter draws it in its debug style.
  - A callout says "Tap me anytime to come home", with just Got it.
  - Onboarding follows, fading in over the callout as it fades out.
- **Later launches:** just the flight.
- **Reduce Motion:** no flights anywhere. The first launch still shows its
  messages.
- **Tier badges in shelf headings** (Superhero, Luminary, Local Hero) are
  tappable every time. The star explains what the tier means, and a tap
  anywhere closes it. Nothing appears on its own.
- **Debug builds only:** "Replay intro" in Account replays the intro and
  onboarding.

**The header and the menu.**
- **One row:** the search bar with the star (about 80% of the width), then a
  menu button. They scroll away together; the star docks.
- **The menu** is a right-side frosted drawer (`features/menu/app_menu.dart`).
  It holds:
  - Sign in (signed out only).
  - My Library, with a count.
  - Account and Notifications (signed in only).
  - Tailor Spiritpedia.
  - Share Spiritpedia.
  - The website's footer statement ("Spiritpedia celebrates the
    transformative power…", `siteStatement`, word for word from
    `web/components/SiteFooter.jsx`).
  - Terms, Privacy, Affiliate Disclosure and Contact (love@).

**Search: two engines, scoped tabs, and Suggests.**
- **The two engines.** Every box runs the feelings engine (`emotion_mappings`)
  and the name-and-title search together, and shows both. A title that
  contains a feeling word still shows ("September Astrology Forecast 2026").
- **Scoped tabs.** Discover's box searches everything. The Videos and Books
  boxes search their own kind, with an "Also found: …" line and a way to
  search everywhere.
- **Spiritpedia Suggests.** One video and one book, chosen by relevance (title
  match, the feeling's subjects), with small bonuses for how many people saved
  it (migration 0016) and for the person's More of subjects. A bonus never
  beats a title match.

**Channels kept apart from teachers.**
- Rows in `healers` with `entity_type` `channel` or `app` never sit with
  teachers. They have their own shelf, their own search group, and no tier
  badge.
- The website still mixes them (see `docs/website-followups.md`).

**Reviews with report, block and ban** (migration 0015, App Store guideline 1.2).
- **Report:** every review someone else wrote has a "⋯" menu with Report
  review. It asks for a reason and an optional note, and saves a snapshot of
  the review.
- **Block:** the same menu has Block this reviewer, which hides all their
  reviews from you everywhere. Blocked reviewers are listed in Account, where
  you can unblock them.
- **Ban:** a banned account can't post or edit reviews. Only the admin can
  ban.

**Dates on offerings.**
- Retreats and dated courses show "18–20 Sep 2026" or "On now · until …".
- An ended page says "This took place … — it has ended." and its
  call-to-action goes quiet.
- Retreat shelves are soonest first (`core/format/dates.dart`,
  `shelf_rules.dart` → `soonestFirst`).

**Explore More** has Free Resources, Courses & Programmes, Retreats & Live
Events, Downloads & Audio, and Memberships. Books & Literature is left out:
Books has its own tab. A tapped card becomes its shelf (no close control). All
shelves start closed on each launch and close again when Tailor Spiritpedia
is saved.

**Saving needs an account** (app and website, build 13).
- Signed out, a heart or Save opens a warm prompt: "Save it to your Library.
  Create a free account so your saves follow you everywhere." → Sign in /
  Create account (6-digit code, in the same sheet) or Not now
  (`features/library/save_prompt.dart`).
- After signing in, the save completes and the person is still where they
  were (`SavedItems.saveAfterSignIn`, made once the account's Library is
  down).
- Removing a save never asks. Browsing, search and Tailor Spiritpedia stay
  open to everyone. Saves already on a phone still move into the account at
  sign-in.
- The website does the same (`web/components/SavePrompt.jsx`,
  `web/utils/savePrompt.js`), with no "Explorer or Practitioner?" question:
  saving signs someone up as an explorer.

**Onboarding and Tailor Spiritpedia** (migrations 0017 and 0018).
- **When onboarding appears:** once, straight after the first-launch intro.
- **The question:** "What interests you most?" shows the five pillars as
  Discover-style pills. Each opens into subject chips, with "All of [pillar]"
  first.
- **The buttons:** "Explore Spiritpedia →" and "Skip for now". A quiet
  "Anything you'd rather not see?" opens the same picker in Never show mode.
- **Afterwards:** "Tailor Spiritpedia" in Account and the menu is one screen
  with More of and Never show. It is the star's space: the star flies in,
  floats at the top and types its introduction while the choices scroll
  underneath; then it can be swiped away, or glides down to the foot. "Don't
  show me again" stops it (`interests/tailor_star.dart`).
- **The pills and chips** have no icons or symbols; they read like the
  Discover pills.
- **More of** ranks in three levels everywhere: the chosen subjects, then the
  rest of their pillars, then everything else.
- **For You** on Discover's View All shows one content type per visit, in
  rotation: Free Resources → Courses & Programmes → Downloads & Audio →
  Retreats & Live Events (upcoming only) → Memberships. A type with nothing
  relevant is skipped; the turn is remembered between launches.
- **Never show:** an item goes if any of its subjects is hidden, unless it
  also carries a More of subject (More of wins). A teacher, channel or
  publisher goes only if every subject they cover is hidden; a teacher or
  channel whose content is all hidden goes too. A view left empty shows the
  star: "You've hidden most subjects. Adjust in Tailor Spiritpedia". A search
  by name finds hidden things behind "You've hidden this subject. Show
  anyway?"
- **Storage:** saved on the phone at once. When signed in, also saved to the
  account; the account wins if both have choices.
- **The full rules are in `docs/personalisation.md`.** Change that file and
  `data/shelf_rules.dart` together.

**Push notifications.**
- Firebase Cloud Messaging only. Firebase starts only after the person says
  yes, and only when signed in.
- The device token is registered with `register_push_token`.
  `notification_preferences` holds General (on) and IAM affirmations (off,
  for later).
- The server sends through `web/utils/push.js`, using the Firebase service
  account in Vercel.
- **The first notification** is sent once per account by `/api/push/welcome`
  as soon as someone turns notifications on: "✦ Testing, testing… just
  checking my light reaches you. Nothing to do. I'll only shine when it
  matters." No title, nothing to open. It replaced the old welcome ("Welcome
  to Spiritpedia ✨ / I'm your guiding star…") in build 13.
- **While the app is open**, every notification shows as the iPhone's own
  banner (`FirebasePushMessaging.showWhileOpen`, said at every launch). The
  grey in-app tray for pushes is gone.

**How will you use Spiritpedia?** (for build 14, `account/user_type_card.dart`)
- Once, for a brand-new account however it signed in (Account, the save
  prompt): "I'm exploring" or "I share my work".
- **Exploring** carries on in the app and sends the explorer welcome. Putting
  the card away counts as exploring. The welcome waits for the answer.
- **Sharing** (practitioners now; channels, apps and publishers later) notes
  the email as a practitioner-to-be (`/api/pending-user-type`) and opens
  `spiritpedia.co/auth/signup?as=practitioner`. Signing in there with the same
  email takes them to the application, upgrades the account to practitioner
  and sends the practitioner welcome (`web/utils/onboarding.js` →
  `ensureProfile`). No explorer welcome.

**Your area, the conductor and your name** (build 15; migration 0019)
- **Practitioners Near You** uses the person's area: in person within 50 km,
  nearest first, then online practitioners from anywhere. An area is a town
  (`places`), never a position; the rules are in `docs/personalisation.md` §4.
- **Setting it:** "Set your area" on the shelf, Tailor Spiritpedia → Your
  area, or the star's question. "Use my location" asks iOS for approximate
  location only (`NSLocationDefaultAccuracyReduced`), once, through
  `geolocator`; "Type my city" searches `places`. It only ever asks for
  "When In Use": with `NSLocationWhenInUseUsageDescription` present,
  geolocator_apple never asks for Always. `NSLocationAlwaysAndWhenInUse-
  UsageDescription` (same wording) is there only because Apple's upload scan
  sees the package's unused Always code (ITMS-90683, build 15). The app never
  asks for full accuracy and uses no other privacy-sensitive API (checked in
  the build-15 binary: no camera, photos, microphone, contacts, calendar,
  Bluetooth, motion, health or tracking; `LAContext` comes from secure storage
  but biometrics are never used, so no Face ID string is needed).
- **The conductor** (`features/star/conductor.dart`): the star does at most
  one thing a session (a cold start, or back after 30+ minutes). Session 1 is
  the intro. From the 5th visit, "Shall I show you practitioners near you?";
  from the 7th, "Would you like to share your name? I'll use it only to greet
  you here and in my emails." Each asks once, then once more 15+ visits and
  3+ weeks later, then never. Only on a main tab with nothing open, after
  about 3 seconds, and never in a session where the search has been opened.
  The star flies down onto a frosted tray; swiping it away is "Not now".
- **The name** is `user_profiles.full_name` (the emails already use it):
  phone + account, editable in Account → Your name. Later launches greet
  "Welcome back, Ross" before the short flight.

**My Account.**
- Email, with change email (two codes).
- Account type.
- Tailor Spiritpedia.
- Notifications.
- Blocked reviewers.
- Sign out (clears the phone's saves and tailoring; the account keeps them).
- Delete account (red, confirmed).

**Already done: don't rebuild.** Website link previews: books and videos show
their cover or thumbnail, title and description when shared, for example in
WhatsApp.

---

## Key docs

- **`docs/personalisation.md`**: exactly what More of and Never show change
  on Discover, Videos, Books, the pills, search and Suggests, what is never
  touched, and Discover's shelf order before and after.
- **`docs/website-followups.md`**: website issues found while building the
  app, unfixed. It covers channels mixed with teachers, memberships, search,
  report and block on the website, and offering dates. It lives in `app/` so
  that editing it doesn't redeploy the website.

---

## Migrations 0015–0019

All four are **on dev and on live**, and each was verified after it ran.

| File | What it does |
| :--- | :--- |
| `0015_review_moderation` | **Tables:** `review_reports` (each holds a snapshot of the review as reported), `user_blocks` and `review_bans`. **Functions:** `report_review()`, `block_review_author()` and `review_posting_banned()`. **Rules:** the public reviews read policy hides blocked reviewers from the person who blocked them, and the reviews trigger refuses banned accounts |
| `0016_save_counts` | `save_counts(type, slugs)`: how many people saved each book or video, totals only and at most 200 slugs. Used by Suggests |
| `0017_user_interests` | `user_interests`: one row per account, holding `subjects` (More of). Owner-only RLS, no signed-out access, deleted with the account. A trigger checks every slug against `public.subjects` and removes duplicates. A row means "has chosen", even if it's empty |
| `0018_hidden_subjects` | Adds `hidden_subjects` (Never show) to the same row. The trigger now checks both lists and refuses a subject that is in both |
| `0019_places_and_areas` | `places` (GeoNames towns of 5,000+, imported from `places.csv` through the dashboard), `healers.place_id` set by trigger from city and country, `user_preferences` (each member's area; owner-only), and `nearest_place(lat, lng)`, which returns a town and stores nothing |

Earlier migrations (0000–0014) are described in the root README.

---

## Admin: reported reviews

- **`/admin/flags`** is the **Reports** page (`web/app/admin/flags/page.js`).
  - **Tabs:** Open, Resolved, Dismissed and Banned reviewers.
  - **Each report shows** the review as reported next to how it stands now,
    the reason and note, who reported it, and how long it has waited. The
    Terms promise a decision within 24 hours, so a report shows red after a
    day.
  - **Actions:** Take review down, Ban reviewer (takes all their reviews down
    and resolves their open reports), Dismiss, Mark resolved and Lift ban.
- **Open reports** also show in the admin Inbox and the overview stats.
- **Every report** emails love@ at once (`/api/email/review-reported`,
  `utils/email.js` → `sendReviewReported`).
- **The Terms:** §7 has the no-tolerance line for abusive content. §14
  describes self-serve deletion (app: Account → Delete account; website:
  account page), with love@ as the fallback.

---

## Known issues and parked items

- **Turning notifications off doesn't remove the device token.** The
  preference saves as off, but the `push_tokens` row stays. Parked until the
  final notifications pass.
- **The first notification is sometimes not sent.** One test turned
  notifications on, registered the token and saved General as on, but no
  welcome was recorded. Parked with the item above.
- **Email change: probably working; retest during final testing.** On 14
  October a live account was changed from rossbaiken@ to wiseoly@ and back
  again while testing, so rossbaiken@ ended unchanged, and signing in with
  wiseoly@ on 15 October made a separate, new account. Both accounts are
  kept. The auth records fit that exactly (the identity is rewritten only
  when a change completes, checked on dev, same Supabase Auth version). The
  admin reads emails live from Supabase Auth, so a completed change shows
  there by itself. In final testing: change an email on live, check both
  codes arrive, that the app shows the new address, and that the admin does
  too.
- **The welcome tray needs a redesign.** In-app messages mustn't appear
  abruptly. (Pushes now show as iPhone banners, so this is for messages the
  app shows itself.) The plan:
  - Wait until the person is on a main tab.
  - Then the star flies down with its usual animation and lands on a tray
    carrying the message.
  - Never repeat "I am your guiding star".
  - Swipe or tap to dismiss; it hides by itself after a few seconds.
  - Frosted styling, to match the rest of the app.
- **Firebase must move to love@spiritpedia.co.** Both projects (dev, and live
  `spiritpedia-d190c`) are under the Elite Artists Google account, which will
  be archived in about a month (mid-November 2026). The first attempt was
  blocked by the Google Cloud organisation policy
  `iam.disableServiceAccountKeyCreation` on the spiritpedia.co organisation.
  In order:
  1. Turn that policy off for the spiritpedia.co organisation.
  2. Recreate both projects under love@. A half-built love@ dev project
     already exists; finish it rather than starting again.
  3. Upload the APNs key to both.
  4. Swap the server keys (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
     `FIREBASE_PRIVATE_KEY`, in the local `.env` files and in Vercel) and
     the FlutterFire config (`lib/core/firebase/options_dev.dart` and
     `options_prod.dart`).
  5. Redeploy the website, then ship a new build and check a notification
     arrives on dev and live.
  6. Only then delete the Elite Artists projects.
- **Dev can't use custom email templates.** The dev Supabase project is on
  the free plan, so its sign-in and change-email emails use Supabase's default
  templates. Live's Change Email Address template includes the code
  (`{{ .Token }}`), fixed on 14 October 2026; codes reached both addresses.
  (But see the email-change item above.)

---

## Next steps

1. **The polish pass**, across the whole app, from testing build 13 on a
   phone.
2. **Phase B: iPad.** Today the app is iPhone only and portrait only.
3. **The website follow-ups** in `docs/website-followups.md`, plus a public
   "⋯" (report and block) on the website's reviews.
4. **The before-launch list:**
   - The notification issues above.
   - The Firebase move (before the Elite Artists account is archived,
     mid-November 2026).
   - The welcome tray.
   - Have the Terms and Privacy Policy reviewed (they're a careful draft, not
     legal advice).
   - App Store listing and screenshots.

---

## Ways of working that have held

- **Plan first, then build after an OK.** A new migration is shown before
  anyone runs it.
- **Before every TestFlight upload:** run the tests and show the simulator.
- **Website changes deploy live,** so their diff is shown before pushing. App
  pushes don't deploy.
- **Never print secrets.** Scripts read keys from the env files without
  echoing them.
- **Don't commit `web/AGENTS.md`.**
