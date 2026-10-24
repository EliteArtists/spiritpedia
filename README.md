# Spiritpedia

A spiritual encyclopedia for the modern age: timeless wisdom, gathered in one
calm place, with an emotional way in. "How are you feeling today?" → "Lost" →
the teachers, videos, books and practices that meet you there.

**This README is the handover.** It is written for a developer taking the
project over tomorrow with no access to any earlier conversation. It was
rebuilt on 17 October 2026 and brought up to date on 22 October 2026 (the
email work, migrations 0024–0026, Inbox-only approval, no ✦; then the Firebase
move to love@spiritpedia.co, builds 23 and 24, and Android made ready for
Google Play), checked against the code, not memory. Where it
and the code disagree, the code is right and this file should be fixed.

The app has a second, more detailed file: **`app/README.md`**. The email
inventory is `docs/emails.md`, and the approved wording of every email is
`docs/email-copy-2026-10-21.md` (change wording there first); the admin's
how-to is `docs/admin-guide.md`; the personalisation rules are
`app/docs/personalisation.md`; website issues found while building the app are
`app/docs/website-followups.md`; everything to fill in on Google Play is
`docs/google-play.md`.

---

## Contents

1. [Where things stand](#1-where-things-stand)
2. [Rules for working on this project](#2-rules-for-working-on-this-project)
3. [Tech stack and how the pieces fit](#3-tech-stack-and-how-the-pieces-fit)
4. [Key identifiers](#4-key-identifiers)
5. [Where secrets live (names only)](#5-where-secrets-live-names-only)
6. [Repository layout](#6-repository-layout)
7. [The database](#7-the-database)
8. [Migrations](#8-migrations)
9. [The website](#9-the-website)
10. [The app](#10-the-app)
11. [The crisis intercept (website and app)](#11-the-crisis-intercept-website-and-app)
12. [Run, test, build and release](#12-run-test-build-and-release)
13. [This Mac: memory and disk](#13-this-mac-memory-and-disk)
14. [Test accounts must never cause an email](#14-test-accounts-must-never-cause-an-email)
15. [Things that will bite you](#15-things-that-will-bite-you)
16. [Known issues, open items and what's next](#16-known-issues-open-items-and-whats-next)
17. [Reference](#17-reference)
18. [Content ingestion](#18-content-ingestion)

---

## 1. Where things stand

| | State on 22 October 2026 |
| :--- | :--- |
| **Website** | Live at **https://www.spiritpedia.co** (Next.js on Vercel). Every push that changes `web/` deploys to production |
| **App (iOS)** | Flutter, iPhone and iPad. **1.0.0 (23)** is on TestFlight (the Firebase move). **1.0.0 (24)** is built (`app/build/ios/ipa/Spiritpedia.ipa` and `app/build/ios/archive/Runner.xcarchive`, 22 Oct 2026) and waiting to be uploaded (§12.6). Not yet on the App Store |
| **App (Android)** | The same code. **1.0.0 (24)** is built as a signed bundle, `app/build/android-release/Spiritpedia-1.0.0-24.aab`, ready for Google Play's closed test as soon as the (personal) developer account is verified (§10.15, §12.8, `docs/google-play.md`). Not yet on Google Play |
| **Database** | Supabase. Two projects: **live** (`uzmvcgew…`) and **dev** (`khtpbnof…`). Migrations `0000`–`0026` are on both |
| **Push** | Firebase Cloud Messaging only, with an APNs key. Moved on 22 Oct 2026 to two Firebase projects owned by **love@spiritpedia.co** (live `spiritpedia-ad62b`, dev `spiritpedia-dev-5e4d5`); checked end to end on iPhone, iPad and Android |
| **Emails** | The approved copy of 21–22 Oct 2026 is live (§9.7). The outreach journey is eight emails, redirected to a test inbox by `JOURNEY_TEST_EMAIL` until the solicitor has checked cold email; no journey is running. Day 4 is live. Personal discovery editions are built but **off** until `DISCOVERY_EDITIONS=on` is set on Vercel (§9.7a) |
| **Repository** | `https://github.com/EliteArtists/spiritpedia`, branch `main` only. No staging environment, no feature flags |

**Before submitting build 24 in App Store Connect:**
- Update the App Privacy label (§12.6): add **Device ID** and **Sensitive Info**,
  and **Product Personalization** as a purpose on Product Interaction and
  Search History.
- Add **13-inch iPad screenshots** (2064 × 2752). Twenty portrait screenshots
  from the iPad simulator are on the Desktop of the development Mac, in
  "Spiritpedia iPad screenshots".
- Check the App Store description doesn't say "iPhone only".

---

## 2. Rules for working on this project

These have held throughout and the project owner expects them.

1. **Plan first; build after an OK.** Show a plan (and any migration's SQL)
   before building.
2. **Never print secrets.** Scripts read keys from the env files without
   echoing them. The project owner pastes secret keys into files themselves.
3. **Nothing touches the live site or live database without approval.**
   - **Migrations: dev first, then live.** The project owner pastes each SQL
     file into the Supabase SQL editor. Check dev with throwaway accounts
     (deleted afterwards) and live with read-only checks only.
   - **Pushes that change `web/` deploy live**, so show the diff and wait for an
     OK first. Pushes that only change `app/`, `supabase/`, `docs/` or the root
     README don't deploy.
4. **Never loosen RLS, and never put the service-role key in the app.** The
   anon key is public by design. Writes that need the server's key go through
   the website's API routes.
5. **Admin API calls (`/auth/v1/admin/...`) are for dev only.**
6. **The crisis intercept stays first and unchanged in every search box,** and
   its tests must pass (§11).
7. **Test accounts never cause an email** (§14).
8. **App builds:** bump the build number before every TestFlight upload; run
   `flutter analyze` and `flutter test` and show the simulator before building.
9. **Dashboard work** (Supabase, Vercel, Firebase, App Store Connect): the
   project owner does it from exact, numbered, click-by-click steps.
10. **Don't commit `web/AGENTS.md`** (gitignored; `next dev` rewrites it).
11. **On this Mac:** one simulator at a time, the Xcode app kept closed, and
    never the full test suite during a simulator tour (§13).
12. **Approve or decline applications only in Admin → Inbox.** That is the
    one path that creates the listing and sends D3 or D4. A person's record
    can only send someone back to the Inbox (§9.4).
13. **No ✦ anywhere** (website, app, emails, subject lines): it reads as
    another company's logo. Where a picture can go, use the gold star logo
    image (`web/public/Spiritpedia_Header_Symbol.png`; in emails the small
    copy `web/public/email/spiritpedia-star.png`, alt "Spiritpedia"); where
    it can't, nothing. The Official badge just says OFFICIAL.
14. **Email wording is final once approved:** change
    `docs/email-copy-2026-10-21.md` and `web/utils/emailTemplates.js` together,
    word for word.

---

## 3. Tech stack and how the pieces fit

| Layer | Technology |
| :--- | :--- |
| **App** | Flutter **3.47.7** / Dart **3.13.5** (pinned in `pubspec.yaml`). Riverpod 3 (no code generation), go_router, `supabase_flutter` 2.18, `firebase_core` + `firebase_messaging`, `flutter_secure_storage` (the session), `shared_preferences`, `geolocator` (approximate location), `webview_flutter` (the YouTube player), `cached_network_image`, `share_plus`, `url_launcher`, `flutter_native_splash`. iOS 15+, iPhone and iPad; Android 7+ (API 24, target 36), ready for Google Play (§10.15). iOS plugins come through Swift Package Manager: **there is no Podfile** |
| **Website** | Next.js **16.4** (App Router, Turbopack, `proxy.js` instead of middleware), React 19, Tailwind 4, `@supabase/supabase-js` 2, `resend`, `@next/third-parties` (GA4). Node 24 |
| **Hosting** | Vercel, team `eliteartists-projects`, project **`spiritpedia-e58y`** (see §4: there are two projects) |
| **Database and auth** | Supabase (Postgres 17, PostgREST, Supabase Auth with emailed 6-digit codes). **Live** and **dev** projects |
| **Push** | Firebase Cloud Messaging only, for both platforms. The website sends through FCM's HTTP v1 API with a service account (`web/utils/push.js`, no Admin SDK). iOS delivery uses an **APNs auth key** uploaded to each Firebase project |
| **Email** | Resend for every website email (`web/utils/email.js`, wording in `emailTemplates.js`, the discovery edition in `discoveryEmail.js`; §9.7); Supabase Auth's own SMTP for sign-in and change-email codes |
| **Analytics** | GA4 on the website, only after cookie consent. The app has no analytics SDK; Admin → Activity is first-party totals (§9.9) |
| **Places** | GeoNames towns of 5,000+ people, imported into the `places` table |
| **Affiliate** | Amazon Associates, five stores, tagged at render (§17.6) |

```
            ┌──────────── Flutter app (iPhone, iPad, Android) ───────────┐
            │  reads content with the anon key; writes the person's own  │
            │  rows with their session (RLS); everything else ↓          │
            └───────┬───────────────────────────────┬────────────────────┘
                    │ Supabase (anon key + session)  │ HTTPS + Bearer token
                    ▼                                ▼
   ┌──────────── Supabase ────────────┐   ┌──── www.spiritpedia.co (Vercel) ────┐
   │ Postgres + RLS + definer RPCs    │◄──│ Next.js pages + /api routes          │
   │ Auth (6-digit email codes)       │   │ service-role key, Resend, FCM, crons │
   │ Storage: practitioner-images     │   └───────────────┬──────────────────────┘
   └──────────────────────────────────┘                   │ FCM HTTP v1
                                                           ▼
                              Firebase Cloud Messaging → APNs → iPhone, iPad (FCM direct → Android)
```

- **Reads** come straight from Supabase with the anon key. RLS lets it read
  content and nothing personal.
- **A person's own rows** (profile, saves, reviews, interests, area, push
  preferences) are written with their own session, under RLS and
  field-protection triggers, or through `SECURITY DEFINER` RPCs that take the
  identity from `auth.uid()`.
- **Anything that needs the service-role key** (emails, push, account deletion,
  activity logging, admin) goes through a website API route, which identifies
  the caller from their `Authorization: Bearer <access token>`, never from the
  request body.

---

## 4. Key identifiers

None of these are secrets.

| What | Value |
| :--- | :--- |
| GitHub | `EliteArtists/spiritpedia`, branch `main` |
| Website | **https://www.spiritpedia.co**. `spiritpedia.co`, `spirit-pedia.com` and `www.spirit-pedia.com` all redirect to it |
| Vercel | Team `eliteartists-projects`. **`spiritpedia-e58y` serves the site** and holds every environment variable. A second project, `spiritpedia`, builds the same repo and serves only `spiritpedia.vercel.app`; nobody visits it, and setting a variable there changes nothing the public sees. Worth deleting once someone confirms nothing uses that URL. Root Directory must be **`web`**; Node 24 |
| Supabase live | `uzmvcgewxgvnybdhvsyx` (`https://uzmvcgewxgvnybdhvsyx.supabase.co`) |
| Supabase dev | `khtpbnofcavoerorajni` (free plan, so it can't use custom email templates) |
| Firebase live | `spiritpedia-ad62b` ("spiritpedia"), sender ID `203830486586` (`app/lib/core/firebase/options_prod.dart`). Apps: iOS `1:203830486586:ios:e3b35461988cb851bff703`, Android `1:203830486586:android:c56680173f62d577bff703` |
| Firebase dev | `spiritpedia-dev-5e4d5` ("spiritpedia-dev"), sender ID `905307569923` (`options_dev.dart`). Apps: iOS `…:ios:9240e7885291f083cbf336`, Android `…:android:72566319b896f083cbf336` |
| Firebase owner | **love@spiritpedia.co** (since 22 Oct 2026). The old projects under the Elite Artists Google account (`spiritpedia-d190c`, `spiritpedia-dev`) are no longer used by anything and can be deleted |
| Google Play | Developer account: **personal**, love@spiritpedia.co (identity verification in progress on 22 Oct 2026). Package `co.spiritpedia.app`. Upload key certificate SHA-256 `29:35:1F:3F:FB:79:F8:35:1B:2A:DD:21:9E:DA:A3:28:3D:F7:11:F7:14:EA:31:BE:D7:31:13:EE:87:D2:27:CE` |
| Apple | Team ID `KT2XV84345`. Bundle ID **`co.spiritpedia.app`** (tests: `co.spiritpedia.app.RunnerTests`). Android `applicationId` is also `co.spiritpedia.app` |
| APNs | `aps-environment` is `development` in `Runner.entitlements`; App Store export signs it as **production** (check every IPA, §12.5). The APNs auth key is uploaded in each Firebase project's Cloud Messaging settings |
| Email addresses | Transactional from `Spiritpedia <hello@accounts.spiritpedia.co>`; journey (outreach) emails from `love@spiritpedia.co`; reply-to `love@spiritpedia.co`; every send blind-copied to an archive Gmail inbox |
| Admin | `https://www.spiritpedia.co/admin`, password login (§9.4) |
| Amazon Associates | US `spiritpedia-20` (primary), UK `spiritpedia03-21`, CA `spiritpedia0d-20`, ES `spiritpedi093-21`, AU `spiritpedia-22` (§17.6) |
| Simulators used for tours | iPhone 18 Pro `049C050F-9F21-44FE-B91A-B77FA3DBFB72` (iOS 27.0); iPad Pro 13-inch (M5) `57392128-5E80-4596-B073-B91810411A87` (iOS 26.5) |
| Android emulator | `Pixel_8_API_34_-_Test_Device_Clean` (Android 14, Google Play image, arm64), in `~/.android/avd` |

---

## 5. Where secrets live (names only)

**Never print, paste or commit a value.**

| File / place | Holds | In git? |
| :--- | :--- | :--- |
| `web/.env.local` (points at **live**) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `RESEND_API_KEY`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `JOURNEY_TEST_EMAIL`, `CRON_SECRET` | No (`.env*` in `web/.gitignore`) |
| `web/.env.development.local` (points at **dev**; `next dev` loads it over `.env.local`) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (the **dev** project `spiritpedia-dev-5e4d5`) | No |
| Vercel → `spiritpedia-e58y` → Settings → Environment Variables | Everything the live site needs: the Supabase three, `ADMIN_PASSWORD`, `ADMIN_NAME`, `RESEND_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `FIREBASE_PROJECT_ID` / `_CLIENT_EMAIL` / `_PRIVATE_KEY` (the **live** push service account lives only here), `AMAZON_TAG_US` / `_UK` / `_CA` / `_ES` / `_AU`, `JOURNEY_TEST_EMAIL` (Production and Preview), and `DISCOVERY_EDITIONS` once switched on | — |
| `app/config/dev.json` | `APP_ENV`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `API_BASE_URL` (dev; copy `dev.example.json`) | No (`app/.gitignore`) |
| `app/config/prod.json` | The same four (live) plus `AMAZON_TAG_US` / `_UK` / `_CA` / `_ES` / `_AU` | **Yes, on purpose**: only public values |
| `~/.secrets/spiritpedia/firebase/` on the development Mac (folder `700`, files `600`) | The two Firebase service-account keys: `live-spiritpedia-ad62b.json` (its values are in Vercel; not in any local env file) and `dev-spiritpedia-dev-5e4d5.json` (in `web/.env.development.local`) | No — outside the repo |
| `~/.secrets/spiritpedia/android/` on the development Mac (folder `700`, files `600`) | **The Google Play upload key**: `upload-keystore.jks` (alias `upload`, RSA 2048, valid 10,000 days) and `key.properties` (its passwords and path; `app/android/app/build.gradle.kts` reads it). **Back both up** (§12.8) | No — outside the repo |
| Firebase console (love@spiritpedia.co) | The APNs auth key (`.p8`, Key ID `83KR7QH76Q`, uploaded to both projects, development and production slots), and the service accounts behind `FIREBASE_*` | — |
| Supabase dashboard | Auth email templates and SMTP sender; the service-role key | — |

- **Email switches (not secrets, but they decide who gets emailed):**
  - `JOURNEY_TEST_EMAIL`: while set, every outreach journey email goes to that
    address instead of the practitioner. Set on Vercel (Production and
    Preview) on 21 Oct 2026; **leave it set until the solicitor has checked
    cold email** (§16.1).
  - `DISCOVERY_EDITIONS`: only the value `on` lets the daily job send personal
    discovery editions (§9.7a). Not set yet. To switch on: Vercel →
    `spiritpedia-e58y` → Settings → Environment Variables → add
    `DISCOVERY_EDITIONS` = `on` for Production → Deployments → ⋯ on the latest
    → Redeploy. The admin preview and test-send work without it.
  - `ACCOUNT_EMAILS_SINCE`: **dev testing only, never on Vercel.** Moves the
    date before which accounts get no Day 4, edition or late welcome
    (default `2026-10-22T00:00:00Z`, when `email_sends` records began).
- **`ADMIN_PASSWORD` is shared with live.** Never type it into a browser in a
  test; a script may read it from `web/.env.local` without printing it.
- `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` and the `FIREBASE_*` keys have
  no `NEXT_PUBLIC_` prefix, deliberately: they must never reach a browser.
- **An old, benign leak:** `web/.env.local` was committed in two early commits
  (`90a3b95`, `e8f0d72`) and removed in `4b8735b`. It held only the public URL
  and anon key, both since changed. Secret scanners will flag the history; no
  rotation or history rewrite is needed.
- `legal-draft.md` (the working copy of the legal wording) is deliberately
  never committed.

---

## 6. Repository layout

```
spiritpedia/
├── README.md               this handover
├── docs/
│   ├── emails.md           every email the platform sends, when and to whom
│   ├── email-copy-2026-10-21.md  the approved wording (source of truth)
│   ├── admin-guide.md      how to run the admin (badges, approving, owners' content)
│   ├── google-play.md      every Play Console answer (data safety, rating, audience, closed test)
│   └── content-audits/     one healer's research audit + ingestion plan each (§18)
├── scripts/ingest.mjs      ingestion: finds images, checks, inserts a healer's plan, dev or live (§18)
├── app/                    the Flutter app — see app/README.md
│   ├── lib/                main.dart, app.dart, router.dart, core/, data/, theme/, shared/, features/
│   ├── test/               318 tests (fakes in test/support/)
│   ├── integration_test/   search_typing_test.dart (tours go here temporarily, never committed)
│   ├── assets/safety/      symlink → web/shared/emotion-safety.json
│   ├── config/             dev.json (ignored), dev.example.json, prod.json
│   ├── docs/               personalisation.md, website-followups.md
│   ├── ios/  android/
│   └── pubspec.yaml        version 1.0.0+24
├── web/                    the Next.js site — run web commands from here
│   ├── app/                pages, /api routes, sitemap, robots
│   ├── components/         UI; components/admin/ for the dashboard
│   ├── utils/              Supabase clients, email, push, activity, listings, discovery editions… (+ *.test.mjs)
│   ├── public/             logos; public/email/spiritpedia-star.png is the emails' logo
│   ├── shared/             emotion-safety.json (+ .cases.json): the crisis phrases for web AND app
│   ├── proxy.js            the password gate on /admin
│   ├── scripts/            vercel-ignore-build.sh; generate-emotion-safety-cases.mjs
│   └── vercel.json         five cron schedules + the deploy-skip rule
└── supabase/
    ├── migrations/         0000 (schema baseline) … 0026, run by hand
    └── seed/               emotion_mappings.sql — the search vocabulary
```

There is no root `package.json`, no Supabase CLI project, no `CLAUDE.md`.

---

## 7. The database

### 7.1 Live and dev

| | Live | Dev |
| :--- | :--- | :--- |
| Project | `uzmvcgewxgvnybdhvsyx` | `khtpbnofcavoerorajni` |
| Used by | www.spiritpedia.co; `web/.env.local`; `app/config/prod.json` | `npm run dev` (`web/.env.development.local`); `app/config/dev.json` |
| Content | The real catalogue | A copy of the content tables (ids copied from live) |
| Plan | Paid (custom email templates) | Free (Supabase's default email templates) |

**`npm run dev` in `web/` uses dev**, because Next loads
`.env.development.local` over `.env.local`. Anything that reads `.env.local`
directly (a Node script, `next start`) is talking to **live**: treat it as
production.

Content (healers, books, videos, courses, free resources, publishers,
subjects) exists only in the databases and Supabase's own backups. The repo
holds the schema and the search vocabulary, not the content (§8.3).

### 7.2 Tables (37 in `public`, counted on live 22 Oct 2026)

**Content** — made in the dashboard before migrations existed; in `0000`.
Anyone can read; only the service role writes (migration `0007`).
- `healers`: every listing that isn't a publisher — people, channels, apps,
  organisations. Key columns: `healer_slug` (text, the public key), `name`,
  `bio`, `tier`, `entity_type`, `official`, `image_urls[3]`, `subject_slugs[]`,
  `availability_type`, `city`, `country`, `place_id`, `contact_email`, socials,
  `birth_year`/`death_year`.
- `books`, `videos`, `courses` (every paid offering, split by `product_type`:
  course, retreat, download, membership…), `free_resources` (`resource_type`).
- `subjects` (42), `publishers` (+ `contact_email`), `publisher_healers`
  (publisher ↔ author), `emotion_mappings` (emotion → weighted subjects).

**Each member's own** — owner-only under RLS unless noted.
- `user_profiles`: `user_type` (explorer / practitioner = "shares their
  work"), `verification_status`, `linked_healer_slug`, `linked_publisher_id`,
  `described_as`, `full_name`, `signup_platform` (web/app), application fields.
  A trigger pins the admin-controlled columns.
- `user_favourites`: saves (`content_type`, `content_slug` — always a slug since
  `0012`; `book_read` marks a book as read).
- `pending_user_types`: explorer/practitioner chosen before the code is typed.
- `reviews`: public when `status = 'approved'`.
- `user_interests` (More of `subjects`, Never show `hidden_subjects`),
  `user_preferences` (area `area_place_id`, `learning_enabled`).
- `push_tokens`, `notification_preferences`, `user_blocks`, `review_reports`
  (the reporter reads their own), `claim_requests`.
- `activity_events`, `subject_affinity`: opt-in learning data.
- `content_submissions` (0024): an owner's added or changed content waiting
  for the admin; the owner reads their own, every write is the service role.

**Reference:** `places` (GeoNames towns; public read).

**Service role only** (RLS on, no policies): `admin_notes`,
`healer_journeys`, `broken_images`, `account_deletions`, `notification_sends`,
`review_bans`, `activity_daily`, `subject_daily`, `search_misses`,
`content_removals` (0024), `email_sends` and `email_preferences` (0025),
`discovery_editions` (0026).

**Storage:** the public `practitioner-images` bucket. Each user can write and
delete only in their own `auth.uid()` folder.

### 7.3 Security conventions

- **RLS is on for every table.** A service-role-only table is "RLS on, no
  policies" and says so in its `COMMENT`.
- **New functions are granted to `anon` by default in Supabase.** Every
  function therefore starts with `REVOKE ALL ON FUNCTION … FROM PUBLIC, anon`
  and grants exactly who may call it: `authenticated`, or `service_role` only.
  The two read RPCs meant for signed-out visitors (`save_counts`,
  `nearest_place`) are granted to `anon` and `authenticated` on purpose.
- **Checked writes go through `SECURITY DEFINER` RPCs** with
  `SET search_path = public, pg_temp`. They take the identity from
  `auth.uid()`, and take an object (a review id), never a user id.
- **Protection triggers** (`user_profiles_protect_admin_fields`,
  `reviews_pin_author`) pin the columns admins control. They yield to roles
  other than `anon`/`authenticated` (that is how the service role moderates),
  and the profile trigger also yields to the transaction-local
  `app.claim_verified` flag that only the claim RPCs set.
- **Client inserts are shaped by policy:** a claim request can only be created
  as `pending`, with no proof fields.
- **Personal data is minimised:** no coordinates stored, no personal data in
  `account_deletions`, anonymous totals in their own tables, purge windows, and
  consent-triggered deletion of learned data.
- Migrations are idempotent (`IF NOT EXISTS`, `DROP … IF EXISTS` before
  `CREATE`), and most end with a read-only check `SELECT`.

---

## 8. Migrations

There is no migration runner. Each file is pasted into the Supabase SQL
editor **on dev first, then live**, by the project owner. Dev is checked with
throwaway users created through the Admin API (no email) and deleted
afterwards; live is checked read-only.

### 8.1 0012–0026 (on dev and live)

**`0012_favourites_slugs`** — data only, in one transaction.
- Rewrites legacy `user_favourites.content_slug` values (numeric ids for books,
  videos, healers; UUIDs for courses and free resources) to the item's slug,
  so the website and app save the same thing.
- A converted row that would clash with the unique key is dropped and the
  original kept; rows matching nothing are left alone.
- Records `book_read` as a content type (a comment; there's no CHECK).

**`0013_account_deletions`**
- `account_deletions` (`deleted_at`, `source` website/app, `user_type`,
  `linked_healer_slug`, `kept_image_count`, `resolved_at`): a note, with **no
  personal data**, that an account with a claimed listing was deleted, so the
  admin Inbox can review the listing. Service role only.

**`0014_push_notifications`**
- `push_tokens` (`token` unique, `platform` ios/android, `app_version`,
  `last_seen_at`): the owner can read and delete; there's no insert policy.
- `register_push_token(p_token, p_platform, p_app_version)` — definer,
  signed-in only. Upserts on the token (a token held by another account moves
  to the caller) and keeps each account's 10 most recent tokens.
- `notification_preferences` (`general` default on, `iam_affirmations` default
  off and reserved): owner select/insert/update.
- `notification_sends` (`user_id`, `kind` = 'welcome', unique): the guard that
  sends the welcome push once per account. Service role only.

**`0015_review_moderation`** (App Store guideline 1.2)
- `review_reports`: reason (spam / offensive / harassment / misleading /
  other), note ≤500, a **snapshot** of the review as reported, status (open /
  resolved / dismissed). One report per reporter per review.
- `user_blocks` (blocker → blocked): the public reviews read policy now hides
  reviews by anyone the reader has blocked.
- `review_bans`: service role only; the reviews trigger refuses banned
  accounts.
- RPCs (definer, `authenticated`): `report_review(id, reason, note)` (not your
  own; a repeat returns NULL), `block_review_author(review_id)`,
  `review_posting_banned()`.

**`0016_save_counts`**
- `save_counts(type, slugs[])` — definer, callable signed out. Totals only,
  for books ("Want to Read" saves) and videos, at most 200 slugs. Feeds
  Spiritpedia Suggests.

**`0017_user_interests`**
- `user_interests` (`user_id` PK, `subjects[]` ≤100): owner-only; `anon` has no
  access. A row means "has chosen", even if empty.
- A trigger removes duplicates, sorts, and refuses any slug not in `subjects`
  (an array can't carry a foreign key).

**`0018_hidden_subjects`**
- Adds `hidden_subjects[]` (Never show) to the same row. The trigger checks
  both lists and refuses a subject that's in both.

**`0019_places_and_areas`**
- `places`: GeoNames towns of 5,000+ (`name`, `ascii_name`, `region`,
  `country_code`, `country`, `lat`/`lng` NUMERIC(7,4), `population`), public
  read. Data imported by hand from a `places.csv` that isn't in the repo.
- `healers.place_id`, set by trigger from `city` + `country` through
  `resolve_place()` (knows aliases like UK/England → GB; picks the most
  populous). The file ends with a backfill that must be re-run after an import.
- `user_preferences` (`area_place_id`): owner-only.
- `nearest_place(lat, lng)`: rounds to 2 decimal places, searches about 110 km,
  returns one town, stores nothing. Callable signed out.

**`0020_listings_and_claims`** (account types)
- `user_profiles.described_as` (practitioner, channel, podcast, app, publisher,
  organisation, not_sure — a hint for the admin) and `linked_publisher_id`
  (pinned by the protection trigger, which is redefined).
- `healers_entity_type_known` CHECK (individual, channel, app, organisation, or
  NULL); `healers.official` (admin-only); `publishers.contact_email`.
- `claim_publisher_profile(slug)`: matches on the publisher's contact email, or
  the email's own (non-free-mail) domain in `website_url`; then makes the
  profile an approved practitioner linked to the publisher.
- `claim_requests`: for someone whose email doesn't match a listing. Exactly
  one of `healer_slug` / `publisher_id`; `connection` text; status pending /
  approved / rejected / withdrawn; `proof` (listing_email / code / other),
  `proof_code`. The owner can only insert a bare pending request and read their
  own; deciding goes through the server. One pending request per user per
  listing.
- `healer_journeys` can now target a publisher (`publisher_id`; exactly one of
  the two).

**`0021_activity_learning`**
- `user_preferences.learning_enabled` (default **off**) and
  `learning_changed_at` (the consent timestamp, set by trigger);
  `user_profiles.signup_platform` (web/app).
- **Layer 1, the member's own:** `activity_events` and `subject_affinity`
  (score ≥0, 30-day half-life). Owner can read and delete. No search words
  stored. Switching learning off (or deleting the row) deletes both, by
  trigger.
- **Layer 2, anonymous totals** (service role only): `activity_daily`,
  `subject_daily`, `search_misses` (1–60 chars).
- `log_activity(platform, events, user)` — definer, **service role only**, the
  only writer. ≤50 events; allow-listed kinds and content types; ≤20 subjects,
  each checked; always adds to the totals; records a search miss only without
  '@' or a run of 3+ digits; writes per-user events and scores only if that
  member has learning on, skipping their Never show subjects. Weights: open 1,
  watch 2, save 4, unsave −4 (floor 0), share 3, review 3, pill/filter/search 1.
- `purge_activity()` (daily cron): events after 30 days, search misses after
  90, totals after 25 months.
- Dashboard reads, service role only: `activity_top`, `subject_rising`,
  `search_misses_top` (minimum 2), `signups_by_day`.

**`0022_closed_publisher_accounts`** (17 Oct 2026)
- `account_deletions.linked_publisher_id` (→ `publishers`, ON DELETE SET NULL),
  so deleting an account that managed a publisher flags that listing for
  review, as a healer listing already was. Still no personal data.

**`0023_badges_and_official_reviews`** (18 Oct 2026)
- `healers.verified`, `publishers.verified` and `healers.official` now set
  themselves: `refresh_listing_badges()` (definer; reads `auth.users` for the
  love@spiritpedia.co account) recomputes them, run by a statement trigger on
  `user_profiles` (insert, delete, and updates of `linked_healer_slug`,
  `linked_publisher_id`, `verification_status`). Verified = an approved
  account is linked; Official = that account is love@spiritpedia.co. The
  `listings_pin_badges` triggers keep every other write (the admin's included)
  from changing them.
- `publishers.tier` (`superhero`/`luminary`/`local_hero`, default
  `local_hero`); Hay House and Sounds True start as `superhero`.
- `reviews.author_official`: set by `reviews_pin_author` from the author's
  linked listing's `official`, frozen after. An Official review is always
  named "Spiritpedia"; anyone else whose name contains "spiritpedia"
  (`review_name_reserved()`, ignoring case and punctuation) is saved with no
  name.
- The Spiritpedia listing becomes a Channel with https links.

**`0024_content_submissions`** (20 Oct 2026). Owners manage their own content (§9.5a).
- `content_submissions`: what a verified owner added (`kind` `new`) or changed
  (`edit`, with `target_id`), waiting for the admin. `fields` holds the
  proposed values in the target table's column names; `suggested_subjects`
  (≤5); `notes`; `image_path` (in the holding bucket); `author_pending` for a
  publisher's book by an author not on Spiritpedia yet. One pending edit per
  item (partial unique index). RLS: the owner reads their own; **every write
  is the service role** (the website's routes check ownership). Decided rows
  deleted after 12 months.
- `content_removals`: who removed what and when, with its link, and how many
  reviews and saves went with it. Service role only. Ingestion checks it.
- `remove_owned_content(type, id, user, name)` (definer, service role only):
  in one transaction deletes the item, its `reviews` and `user_favourites`
  (by type and slug), its `broken_images` row, withdraws any pending edit to
  it, and writes the removal.
- Storage bucket `content-submissions`: **private**, no policies, 5 MB, JPEG,
  PNG or WebP. Uploads go through `/api/content/image`; an approved image is
  copied to `practitioner-images/content/` (public) and the held copy deleted.

**`0025_email_journeys`** (21 Oct 2026). The approved emails (§9.7).
- `healer_journeys.email_6_sent_at`, `email_7_sent_at`, `email_8_sent_at`: the
  outreach journey is eight emails (days 0, 21, 42, 63, 84, 105, 126, 147).
  New stop reasons `suppressed` (Resend lists the address as bounced or
  complained) and `sequence_complete`; a journey that ended `asked_to_stop`,
  `removal_requested` or `suppressed` is never started again for that listing.
- `email_sends (kind, ref, sent_at)`, primary key `(kind, ref)`: "this email
  has gone", once per thing it is about. The website inserts the row before
  sending (the key is the lock against two racing requests) and deletes it if
  the send fails (`web/utils/emailOnce.js`). No addresses. Kinds include
  `explorer_welcome`, `practitioner_welcome`, `explorer_day4`,
  `application_received`, `claim_request_received`, `claim_approved`,
  `ownership_check`. Service role only.
- `email_preferences (user_id, unsubscribed_at, unsubscribe_token, created_at)`:
  an account's unsubscribe from Day 4 and discovery emails, and the
  unguessable token in the link that works without signing in. Deleted with
  the account. Service role only.
- Decline reasons are deliberately **not** stored: the admin types them and
  they go in the email (and its archive copy).

**`0026_discovery_editions`** (21 Oct 2026). Personal discovery editions (§9.7a).
- `discovery_editions`: one row per edition built for a person: `edition_number`
  (1 = Day 10), `status` (`sent`, `skipped`, `failed`, `test`),
  `status_reason`, `picks` (references to what was picked, with its section,
  subject, source and "why" line, never the content or HTML), `dropped`
  (sections left out and why), `sent_at`, `view_token` and `view_expires_at`
  ("View this edition online", 30 days).
- A unique index allows one **sent** edition n per person (the send lock); an
  index by person and time serves the repeat rules and the future monthly
  cadence. Picks whose source is activity learning are never shown to the
  team. Service role only; deleted with the account; rows older than 12
  months are deleted by the daily purge.

### 8.2 0000–0011

| File | What |
| :--- | :--- |
| `0000_production_baseline` | `pg_dump --schema-only` of live `public` on 9 Oct 2026, plus the `practitioner-images` bucket and policies. **For an empty project only**: it's plain `CREATE TABLE` and stops at the first existing table |
| `0001_user_profiles` | Profiles, RLS, the field-protection trigger |
| `0002_user_favourites` | Saves, unique on (user, type, slug) |
| `0003_claim_healer_profile` | The claim RPC (email or domain match); the trigger respects `app.claim_verified` and the service role |
| `0004_pending_user_types` | The explorer/practitioner choice across the verification gap, keyed by email |
| `0005_admin_notes` | Internal notes; RLS on, no policies |
| `0006_lock_down_content_writes` | **Superseded**: dropped policies by guessed names and did nothing |
| `0007_force_content_read_only` | Drops every policy on the 8 content tables by its real name and recreates public read only |
| `0008_reviews` | Reviews, RLS, the trigger that pins `status`/`author_healer_slug` (amended to yield to the service role) |
| `0009_healer_journeys` | The claim-outreach sequence; partial unique index so stopped journeys remain |
| `0010_broken_images` | The image-audit queue (amended to allow `healers`) |
| `0011_emotion_vocabulary` | 43 hand-added emotion rows; `ON CONFLICT … DO UPDATE SET weight`, so re-running resets their weights |

### 8.3 Rebuilding a database from the repo

In a new, empty project: `0000_production_baseline.sql`, then
`supabase/seed/emotion_mappings.sql` (3,531 rows / 701 emotions / 42 subjects),
then `0012`–`0022` in order, then import `places` from GeoNames and re-run the
`healers.place_id` backfill at the end of `0019`. `0001`–`0011` are already in
the baseline (harmless to re-run). The content rows are **not** in the repo: a
periodic `pg_dump --data-only` of the content tables to private storage (not
git) is an open item.

**Safe to re-run:** `0001`–`0022` (idempotent; `0011` resets its 43 weights),
the seed. **Never** run `0000` against an existing database.

---

## 9. The website

`web/`, Next.js 16 App Router. The homepage and content pages are server
components reading Supabase with the anonymous, **stateless** client
(`utils/supabase.js`). Anything about the visitor happens in the browser with
`utils/supabaseAuth.js`, because the session lives in `localStorage`
(`spiritpedia-auth`) and the server can't see it: protected pages mount, ask,
then redirect. `utils/supabaseAdmin.js` is the service role, server only.

### 9.1 Pages

| Path | What |
| :--- | :--- |
| `/` | Homepage: masthead, emotional search, sticky subject pills, then **Videos** and **Discover** tabs (§17.3). `?subject=` narrows every shelf |
| `/subject/[slug]` | Everything tagged with a subject; one video shelf per teacher (ISR, hourly) |
| `/healers/[slug]` | A listing: portraits, bio, socials, contact, offerings. "OFFICIAL" when `healers.official` |
| `/publishers/[slug]` | A publishing house: bio, authors, one book shelf per author |
| `/books/[slug]` · `/videos/[slug]` · `/offerings/[slug]` · `/free-resources/[slug]` | Detail pages, with reviews |
| `/library` | My Library (saves, by subject) |
| `/privacy` · `/terms` · `/affiliate-disclosure` | Legal pages (Privacy and Terms dated 17 October 2026) |
| `/auth/signup` | Email in, 6-digit code out. Sign-in and sign-up are one action. `?as=practitioner&claim=<slug>` carries an outreach claim link through sign-up |
| `/auth/verify` | Six code boxes; also where a magic link lands |
| `/auth/practitioner-setup` | One application form for everyone who shares their work; "What best describes you?" is an optional hint |
| `/auth/claim` | Offered when the email matches a listing (healer or publisher). `?slug=` is the outreach claim link: signed out it goes through sign-up and comes back (the slug waits in `sessionStorage` `pendingClaim`); a matching email claims at once (D7), any other is offered "ask us to check" |
| `/auth/claim-request` | "Request to claim it" when it doesn't match |
| `/auth/pending` | After an application |
| `/account` | Account centre; becomes the Practitioner or Publisher dashboard when approved; the learning switch; the **Discovery emails** switch (explorers who never applied); Delete account |
| `/unsubscribe` | `?token=`: asks before unsubscribing (mail scanners open links), then stops Day 4 and discovery emails. noindex |
| `/email-preferences` | `?token=`: "Change what I receive" from an email, discovery emails on or off, no sign-in. noindex |
| `/editions/[token]` | "View this edition online": the edition redrawn from its picks for 30 days, with no name and no unsubscribe or preferences links; afterwards "This edition has ended". noindex (a route handler, not a page) |
| `/admin/*` | The admin (§9.4) |
| `sitemap.xml` · `robots.txt` | Dynamic; paged with an `id` tiebreaker |

### 9.2 API routes

Auth: **Bearer** = the user's Supabase access token, verified with Supabase;
**Admin** = the admin cookie, re-checked in each route (`/api` is outside
`proxy.js`); **Cron** = `CRON_SECRET`.

| Route | Auth | What |
| :--- | :--- | :--- |
| `POST /api/activity` | Public, Bearer optional | Activity batch `{platform, events}` (≤32 KB) → `cleanBatch()` → RPC `log_activity` (§9.9) |
| `POST /api/account/delete` | Bearer | `{confirm:'DELETE', source}` → `utils/deleteAccountAndTell.js` → `utils/deleteAccount.js`: reads the address, deletes the auth user (cascades), their photos, notes a claimed listing (healer, or publisher since `0022`) in `account_deletions`, clears the account's `email_sends` rows, then sends D13 |
| `GET`/`PUT /api/account/email-preferences` | Bearer | The Discovery emails switch on the account page (website and app): `{on}` |
| `POST /api/pending-user-type` | Public (pre-auth) | Records explorer/practitioner against an email |
| `GET`/`PATCH /api/practitioner/profile` | Bearer | An approved practitioner's own listing and content; allow-listed fields only (`contact_email` and `tier` excluded) |
| `GET`/`PATCH /api/publisher/profile` | Bearer | A publisher's own row; `description` and `website_url` only |
| `GET`/`POST /api/content` | Bearer | A verified owner's content (`?as=healer\|publisher`): live items, waiting and turned-down submissions; POST `submit` (new or edit), `resubmit`, `withdraw`, `remove` (immediate, via `remove_owned_content`), `youtube_title` (YouTube oEmbed) (0024) |
| `POST /api/content/image` | Bearer | An image for a submission, checked by its first bytes, into the private `content-submissions` bucket under the owner's folder |
| `POST /api/profile/resubmit` | Bearer | The practitioner form is sent (first time, or a rejected applicant again): pending, and D2 once per application |
| `POST /api/email/explorer-welcome` | Bearer | B1, once per account (`email_sends`), app or website version by `platform`; and the welcome push |
| `POST /api/email/practitioner-welcome` | Bearer | D1, once per account. Held while the email matches a listing (`claim_first`); `afterClaim` releases it when the claim isn't taken |
| `POST /api/email/claim-approved` | Bearer | D7 after an instant email-match claim on `/auth/claim` (instead of D1), once per account and listing |
| `POST /api/email/claim-request-received` | Bearer | D5, for the caller's own claim request, once |
| `POST /api/email/review-received` | Bearer | D9, for a new review only |
| `POST /api/email/review-reported` | Bearer | D12 to love@ about a report (the app calls it) |
| `POST /api/email/unsubscribe` | Public, token | `?token=`: the one-click unsubscribe (RFC 8058) that mail clients POST; a GET redirects to `/unsubscribe` |
| `POST /api/email/preferences` | Public, token | `{token, on?}`: reads or sets discovery emails for `/email-preferences` |
| `POST /api/push/welcome` | Bearer | The first notification, once per account |
| `POST /api/admin/login` · `logout` | Public · Admin | The admin cookie (24 h, httpOnly) |
| `GET /api/admin/overview` | Admin | Counts and the Inbox queue |
| `GET /api/admin/activity` | Admin | Admin → Activity totals |
| `POST /api/admin/practitioner` | Admin | **The only way to approve or decline an application.** Approve creates a `healers` row (or creates/links a `publishers` row) and sends D3; an account already linked gets D7. Reject needs a reason, sends D4 and makes the account an explorer |
| `POST /api/admin/claim-request` | Admin | Make a `SPIRITPEDIA-XXXXXX` code; `ownership_check` (D6 to the listing's published address, once); approve (links the listing, stops any journey, D7) or reject with a reason (D8) |
| `GET`/`POST /api/admin/submissions` | Admin | Owners' content (0024): the waiting list and removals; one with its live row, duplicate, removal and link checks; approve (inserts, or applies only the changed columns of an edit; publishes the image) or reject with a reason. Emails the owner. `?removed=&type=` for ingestion |
| `GET`/`PATCH`/`DELETE /api/admin/person` | Admin | A person's record; PATCH edits allow-listed fields and can set `verification_status` only to `pending` (back to the Inbox; approving here is refused); DELETE removes the account and sends D13 unless `notify: false` |
| `GET`/`POST /api/admin/discoveries` | Admin | A person's next discovery edition as it would go today (learning picks masked) and their send log; POST `test` sends it to love@ only, "[Test]" in the subject |
| `GET`/`POST /api/admin/notes` | Admin | Internal notes (`ADMIN_NAME` as author) |
| `GET`/`PATCH /api/admin/reviews` | Admin | Moderation queue; PATCH emails the reviewer (D10, or D11 with the required reason) only when the status actually changes. Re-reads the row and answers 409 if it didn't |
| `GET`/`PATCH /api/admin/review-reports` | Admin | Reports: take down (`reject_review`, reason required, D11), ban/unban (no emails), resolve, dismiss |
| `PATCH /api/admin/account-deletions` | Admin | Mark a closed-account item resolved |
| `POST /api/admin/journey/start` · `GET`/`PATCH /api/admin/journey/[healer_slug]` | Admin | Start (individuals only; sends C1; refused after a never-again stop), read, stop (with a reason) or resume an outreach journey |
| `POST /api/admin/write` | Admin | Generic insert/update/delete on an allow-list of content tables (the content editor and ingestion) |
| `POST /api/admin/push-test` | Admin | Sends a test push to an account by email |
| `GET /api/cron/*` | Cron | The five scheduled jobs (§9.10) |

### 9.3 Sign-in and sessions

- **Email code only** — no passwords, no social sign-in. `signInWithOtp`
  with `shouldCreateUser: true` (the response never reveals whether the address
  had an account), then `verifyOtp({ type: 'email' })`. The code length is
  Supabase's "Email OTP Length" setting.
- **`components/AuthSync.jsx`**, mounted in the root layout, does the
  first-session work whenever a session appears (verify page, magic link or a
  returning visit): merges saves into `user_favourites`, `ensureProfile`, makes
  a save waiting on sign-in, syncs the area, and writes each heart through to
  the account.
- **`ensureProfile`** (`utils/onboarding.js`) upserts `user_profiles` with
  `ON CONFLICT DO NOTHING` and `.select()`: only the caller that actually
  created the row gets it back and sends the welcome, so two racing callers
  send one email. It sets `signup_platform: 'web'`, and upgrades explorer →
  practitioner (never down).
- **The explorer/practitioner choice** crosses the verification gap in
  `pending_user_types` (keyed by email, so it survives a magic link on another
  device), written through `/api/pending-user-type`; the daily
  `pending-signups` cron deletes rows older than 24 hours.
- **A refused session never loops** (`utils/sessionCheck.js`, 17 Oct 2026).
  `getUser()` classifies Supabase's answer: refused (`bad_jwt`,
  `user_not_found`, `session_not_found`, 400/401/403/404…) clears the saved
  session in this browser (`signOut({scope:'local'})`) so every page agrees the
  visitor is signed out; unreachable (offline, 5xx) keeps it, and `/account`
  shows **Try again** instead of redirecting. Before this, `/account` (asks
  Supabase) and `/auth/signup` (reads the saved copy) bounced a stale session
  back and forth for ever. Tested in `utils/sessionCheck.test.mjs`.

### 9.4 Admin

`/admin`, behind `proxy.js`: the cookie `spiritpedia-admin-session` must equal
SHA-256 of `spiritpedia-admin::<ADMIN_PASSWORD>`. With `ADMIN_PASSWORD` unset,
access is always denied. Needs `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_NAME`;
without them the data sections say why rather than showing an empty list.

| Section | What |
| :--- | :--- |
| **Inbox** (`/admin`) | One queue: applications, claim requests, reported reviews, pending reviews, broken images, closed accounts (a healer listing opens its editor; a publisher opens Ingestion on that publisher, since `0022`). A two-pane reviewer: pick the tier and the kind of listing (pre-filled from `described_as`), approve or reject (a reason box: the reason goes in the email), handle claim requests ("Send ownership check", approve, reject with a reason). **Applications are approved and declined here only** |
| **People** | Practitioners and Explorers; a record with Profile, Content, **Discoveries** (the next edition's preview with learning picks masked, what was left out and why, "Test-send to love@", the send log) and Admin Notes; edit; **Send back to the Inbox** (the record cannot approve or decline: setting "approved" there once left an account approved with no listing and no D3, 22 Oct 2026); delete (removes the `auth.users` row; everything personal cascades; "Send confirmation" ticked by default sends D13) |
| **Content** | The directory of every listing, and a record editor (`/admin/content/[healer_slug]`) for the listing and all six content types, with the Outreach card (start, stop with a reason, resume; which of the eight emails went when) |
| **Claims** | The record of claimed listings |
| **Reviews** | Pending / Approved / Rejected; approve or reject (with a reason) emails the reviewer |
| **Reports** (`/admin/flags`) | Reported reviews: the snapshot beside the current text, reason, reporter, age (red after 24 h, as the Terms promise). Take down (with a reason; D11), ban the reviewer (takes all their reviews down, no emails), dismiss, resolve, lift ban |
| **Activity** | Totals only, never one person (§9.9). `/admin/analytics` redirects here |
| **Ingestion** | The content ingestion form (YouTube id and Amazon ASIN parsing, duplicate guards) |
| Messages · Mailshots · Settings | Placeholders |

`PractitionersTab` and `AccountsTab` in `components/admin/AdminLiveTabs.jsx`
are dead code.

### 9.5 Account types, listings and claims

- **One sign-up for everyone who shares their work.** `user_type` is
  `explorer` or `practitioner` ("shares their work"). What kind of listing it
  becomes is decided by the admin at approval: a `healers` row with
  `entity_type` individual / channel / app / organisation, or a `publishers`
  row (`linked_publisher_id`). The applicant's "What best describes you?"
  (`described_as`) only pre-fills that choice.
- **Claims** are matched against every listing, healers and publishers alike
  (`utils/onboarding.js` → `findClaimableListing`; `utils/listings.js` →
  `chooseClaim`, where more than one match means no automatic claim). A match
  calls `claim_healer_profile()` or `claim_publisher_profile()`, the only
  browser paths to the pinned columns.
- **No match → "Request to claim it"** (`claim_requests`). The admin decides in
  the Inbox: first by emailing the listing's published address, else by a
  `SPIRITPEDIA-XXXXXX` code the claimant posts on their channel or site.
  Approving links the listing and stops any outreach journey. The claimant
  gets D5 when they ask, the listing's own address can be sent D6, and the
  claimant is emailed the decision (D7, or D8 with the reason; §9.7). The
  Inbox says whether each email went.
- **The outreach claim link** (`/auth/claim?slug=`) survives sign-up (§9.1).
- **Dashboards at `/account`:** `PractitionerDashboard` (profile, content,
  photo uploads to their own storage folder) and `PublisherDashboard`. Both
  manage content through `OwnContent` (§9.5a).
- **"OFFICIAL"**: `healers.official`, Spiritpedia's own listing. Shown instead
  of a tier, first among channels; set automatically for the listing linked to
  love@spiritpedia.co (0023). The badge is the word OFFICIAL, no symbol.
- Platforms (channel, app, organisation) are kept out of Practitioners Near
  You (`isPlatform`).
- **"Account type"** (website `/account` and the app's My Account) is the
  type set at approval, never the sign-up wording: Explorer; **Practitioner
  (awaiting approval)** until approved (or approved with no listing linked
  yet); then **Practitioner**, **Channel**, **App**, **Organisation** (from
  the linked listing's `entity_type`) or **Publisher** (`linked_publisher_id`).
  A declined applicant reads Explorer (their `user_type` reverts). One rule on
  both platforms: `web/utils/accountType.js` and `AccountProfile.typeLabel`
  in the app (from 22 Oct 2026; before, the website said "Sharing my work"
  and the app "Practitioner" for every practitioner). Approved accounts see
  the dashboard, whose header reads "Signed in as … · Channel".

### 9.5a Owners' own content (0024)

- **Who:** an approved account linked to its listing (Verified). A practitioner,
  channel, app or organisation manages everything on its listing; a publisher
  adds books for one of its linked authors (or "Author not on Spiritpedia
  yet", named in the notes) and manages only the books it added.
- **Add** (video, book, course, retreat, membership, free resource) and **edit**
  wait for the admin; the live row is untouched until approval, and approving
  an edit applies only the columns that changed. **Remove** is immediate, with
  the item's reviews and saves.
- **Rules** (`utils/contentSubmissions.js`, shared by both sides and tested):
  https links only, never made up; YouTube links stored as the standard watch
  link, the title filled in from YouTube; Amazon product links on a store
  `utils/affiliate.js` knows, stored without any tag; 1–5 subjects from the
  list; retreats need dates; duplicates refused against live items and
  waiting submissions; 20 waiting per account. An edit isn't blocked by
  something already live that today's rules wouldn't accept, unless they
  change it.
- **Images:** upload only, held privately until approved (§8.1, 0024).
- **Admin:** Inbox → Content, or "From owners" (`/admin/submissions`), which
  also lists removals. The review page (`/admin/submissions/[id]`) has the
  editable form, the real card as a preview, and the checks. `docs/admin-guide.md`.
- **The app** has no content editing; its account page links to the website.

### 9.6 Reviews and moderation

- On books, videos, offerings and free resources. **Nothing is public until
  approved** — enforced by the read policy (`status = 'approved'`), not the UI.
- The `reviews_pin_author` trigger forces `status = 'pending'`, derives
  `author_healer_slug` from the author's own profile, freezes them on update,
  refuses banned accounts, and yields to the service role so moderators can
  approve. A second submission upserts on (user, type, slug): an edit.
- **Official reviews (0023):** from the love@spiritpedia.co account, the
  trigger sets `author_official` and the name "Spiritpedia"; both pages show
  **Spiritpedia OFFICIAL**. The name is reserved for everyone else (the
  forms say so; the database saves such a review with no name).
- **Report and block exist in the app only** ("⋯" on each review); the website
  has no report/block button yet (§16). Every report emails love@ at once.

### 9.7 Emails

Every website email goes through `utils/email.js` (Resend). The full
inventory (trigger, recipient, rules for each) is **`docs/emails.md`**; the
approved wording is **`docs/email-copy-2026-10-21.md`** (final: change it
there and in `utils/emailTemplates.js` together, word for word).

- **From** `Spiritpedia <hello@accounts.spiritpedia.co>` (the outreach journey:
  `love@spiritpedia.co`), **reply-to** love@, every email **blind-copied** to
  the `spiritpedialove@gmail.com` archive (the only record of a decline reason).
- **Built from** `utils/emailParts.js`: "Hi {first name}," or "Hello," with no
  name; three sign-offs (the team "With love, / The Spiritpedia team"; the
  Guiding Star "Your Guiding Star / and the Spiritpedia Constellation"; plain);
  buttons; escaping; links always `https://www.spiritpedia.co`; `LOGO_URL`, the
  gold star logo for any email that shows a picture. **No ✦** in subjects,
  text or sign-offs (§2).
- **Once only:** `utils/emailOnce.js` (`sendOnce`, `sentAt`, `forgetSent`)
  claims an `email_sends` row before sending and gives it back if the send
  fails (0025).
- **A failed email never fails the action**; Resend's "resolved with an error"
  is checked. The daily jobs retry the welcome, Day 4 and the journey.
- **Reasons:** declining an application (D4), a claim (D8) or a review (D11)
  needs a reason typed in the admin (`components/admin/ReasonBox.jsx`); it
  goes in the email and is not stored.

| Code | Email | Sent by |
| :--- | :--- | :--- |
| B1 | Explorer welcome (app or website version) | Account creation: website `ensureProfile`; the app at account creation. `/api/email/explorer-welcome` |
| B2 | Day 4 "Follow the superheroes. Discover your local heroes." (with unsubscribe) | Daily `account-emails` job |
| B3 | Personal discovery edition 1 at Day 10 (§9.7a) | Daily `account-emails` job, only with `DISCOVERY_EDITIONS=on` |
| C1–C8 | Outreach journey (§9.8) | `/api/admin/journey/start` (C1); the `journey-emails` job (C2–C8) |
| D1 | Practitioner welcome | `/api/email/practitioner-welcome`; a day later from the daily job if held for a claim |
| D2 | Application received "Thank you for sharing {listing} with Spiritpedia" | `/api/profile/resubmit` |
| D3 | Listing live "{listing} is now live on Spiritpedia" | `/api/admin/practitioner` (Inbox → Approve only) |
| D4 | Listing not published "About your Spiritpedia listing", with the reason | `/api/admin/practitioner` (Inbox → Reject) |
| D5 | Claim request received | `/api/email/claim-request-received` |
| D6 | Ownership confirmation, to the listing's published address | `/api/admin/claim-request` (`ownership_check`) |
| D7 | Claim approved "You can now manage {listing}" | `/api/admin/claim-request`, `/api/admin/practitioner` ("Approve claim"), `/api/email/claim-approved` (instant claim) |
| D8 | Claim not confirmed "About your request to manage {listing}", with the reason | `/api/admin/claim-request` |
| D9 | Review received | `/api/email/review-received` |
| D10 | Review approved | `/api/admin/reviews` |
| D11 | Review not published, with the reason | `/api/admin/reviews`; `/api/admin/review-reports` (take down) |
| D12 | Review reported (to love@) | `/api/email/review-reported` |
| D13 | Account deleted | `/api/account/delete`; `/api/admin/person` DELETE ("Send confirmation") |
| — | Content approved / not added (owners' content, 0024) | `/api/admin/submissions` (wording in `utils/contentSubmissions.js`) |

The 22 Oct 2026 wording (D1–D5, D8, D9, D11) says plainly that we only check a
listing is genuine and really theirs; we are not judging anyone.

Sign-in and change-email codes are Supabase Auth's (templates in the
dashboard; live's Change Email template includes `{{ .Token }}`).

**Standing rule: affiliate links never go in email** (Amazon's agreement).

### 9.7a Explorer emails: Day 4, discovery editions, unsubscribe and preferences

- **Who:** explorers who have never applied (not a declined applicant, not a
  listing owner) and haven't unsubscribed (`utils/unsubscribe.js`
  `isExplorerForDay4`; `utils/discoveryEditions.js` `mayReceive`). Only
  accounts created on or after 22 Oct 2026 (`RECORDS_SINCE`), looking back at
  most 14 days, so older accounts are never suddenly emailed.
- **Day 4 (B2):** once per account, with an unsubscribe line and one-click
  `List-Unsubscribe` / `List-Unsubscribe-Post` headers.
- **Personal discovery editions (B3):** a designed HTML email ("A little space
  for discovery", subject line has no ✦): the logo header, a featured
  discovery, then at least two of: videos for their interests, someone near
  their area (or online), a timeless teacher, a free resource. Fewer than
  that and the edition is skipped (and tried daily up to day 17).
  - Selection (`utils/discoverySelect.js`, tested): deterministic per person
    and edition; from More of, saves, area, activity learning (only if
    switched on) and popularity; never a Never show subject; never a title
    that reads as a health claim (`readsAsHealthClaim`, kept broad until the
    solicitor); no repeat of a featured pick ever, or of other picks within
    three editions. "Popular" wording only when 10+ people saved the item.
  - Words in `utils/discoveryWords.js`; the email in `utils/discoveryEmail.js`
    (tables, inline styles, 600 px, Outlook button, dark scheme, phone
    stacking); data in `utils/discoveryData.js`; sending, preview and test in
    `utils/discoveryEditions.js`.
  - The lock is the `sent` row written before the email goes; a failed send
    marks it `failed`, freeing the number for the next day.
  - **Built but off:** only edition 1 (Day 10) is automatic, and only with
    `DISCOVERY_EDITIONS=on` (§5). The monthly cadence for edition 2 onwards
    is decided (monthly, skip a month when there isn't enough new) but not
    built; the table is ready for it.
  - Admin → People → an explorer → **Discoveries**: preview, left-out notes,
    test-send to love@ only, the log. Learning picks are masked as "A pick
    from personal learning — not shown".
  - Edition rows are deleted after 12 months; the online view lasts 30 days.
- **Unsubscribe and preferences:** every Day 4 and edition carries the
  unsubscribe link (`/unsubscribe?token=`, confirms first) and the
  one-click header (`/api/email/unsubscribe`); editions also carry "Change what
  I receive" (`/email-preferences?token=`). The **Discovery emails** switch on
  the account page (website `components/EmailPreferencesSwitch.jsx`; app
  `DiscoveryEmailsCard`, from build 22) does the same through
  `/api/account/email-preferences`. It stops Day 4 and editions only; account
  and review emails always go.
- **Resend suppression:** `isSuppressed()` asks Resend before each journey
  email; bounced or complained addresses stop the journey as `suppressed`.
- The Privacy Policy (dated 21 October 2026) covers these emails (legitimate
  interest, unsubscribe in every one), learning's part in them, and the
  12-month retention of edition records.

### 9.8 The healer outreach journey

Eight **plain-text** emails (C1–C8) from love@, inviting an unclaimed listing
to claim it, at `JOURNEY_SCHEDULE = [0, 21, 42, 63, 84, 105, 126, 147]` days
from `started_at`. Each carries the listing link (`/healers/{slug}`) and the
claim link (`/auth/claim?slug={slug}`, which works signed out, §9.1) and
offers removal. Started by hand from a listing's Outreach card (C1 at once);
the daily job sends at most one due email per journey, the lowest first.
- **Individuals only** (`utils/journey.js` `outreachAllowedFor`); channels,
  apps, organisations and publishers have no wording yet.
- **Stops** when the listing is claimed, removed or loses its contact address;
  when Resend lists the address as suppressed (checked before every email);
  after C8 (`sequence_complete`); or by the admin, with a reason.
- **Never again** after `asked_to_stop`, `removal_requested` or `suppressed`
  (`DO_NOT_CONTACT`).
- The double-send guard is the write itself: a conditional update claims that
  email's "sent" timestamp before sending, and puts it back if the send fails.
- **`JOURNEY_TEST_EMAIL` redirects every journey email while set**, and it is
  set on Vercel until the solicitor has checked cold email. **No journey has
  ever been started for a real listing.**

### 9.9 Activity (and Admin → Activity)

- **Browser:** `utils/activity.js` queues events (an item opened twice in a
  visit counts once) and sends them every 30 s, at 20 events, or when the page
  is hidden (`keepalive`). Signals: page opens (`components/TrackOpen.jsx`),
  video plays (`TrackWatch.jsx`), saves and unsaves, shares, new reviews, pill
  and filter taps, and settled searches (the subjects found, or the words only
  when nothing was found). Nothing is sent from `/admin`.
- **Server:** `/api/activity` → `utils/activityGuard.js` `cleanBatch()` drops
  anything malformed and **drops a search whose words match a crisis phrase**
  (and strips the words, keeping subjects, from an ambiguous one) → looks up
  subjects for content events → RPC `log_activity` with the caller's id when a
  Bearer token is present. Whether anything personal is kept is decided in the
  database (the member's `learning_enabled`).
- **The switch:** `components/LearningSwitch.jsx` on `/account` — "Let
  Spiritpedia learn from what I explore. Used only to tailor what you see.
  Never shown to our team, never shared, never used for advertising. Turn off
  anytime." Off by default; turning it off deletes what was learned.
- **Admin → Activity:** totals only (7 / 30 / 90 days; All / Web / App): most
  opened and saved, subjects rising, searches with no results (only terms seen
  at least twice), sign-ups by day and platform. Popularity-led, never
  commission-led.

### 9.10 Scheduled jobs (`web/vercel.json`)

All `GET`, all daily (the most a Hobby plan allows), guarded by `CRON_SECRET`
as `Authorization: Bearer` (Vercel sends its own copy) or `x-cron-secret` (for
a manual run). **503 means the secret is unset; 401 means it's wrong.**

| Job | UTC | Does |
| :--- | :--- | :--- |
| `/api/cron/activity-purge` | 05:00 | Retention: RPC `purge_activity()`; deletes every decided claim request, and every decided content submission (with any image it held), 12 months after its decision (`utils/claimRequests.js`, `utils/contentSubmissions.js`; pending ones are never touched); images uploaded to the holding bucket but never sent, after two days; and `discovery_editions` rows older than 12 months |
| `/api/cron/pending-signups` | 06:00 | Deletes `pending_user_types` older than 24 h (`?dry=1` counts only) |
| `/api/cron/broken-images` | 07:00 | Audits a seventh of the content image URLs plus every portrait (§17.8). `?dry=1`, `?shard=N` |
| `/api/cron/journey-emails` | 08:00 | The outreach journey (C2–C8) |
| `/api/cron/account-emails` | 09:00 | Day 4; discovery edition 1 at Day 10 (only with `DISCOVERY_EDITIONS=on`); the practitioner welcome a day after sign-up for anyone who neither claimed nor chose (and any welcome whose send failed). Once each per account (`email_sends`) |

`vercel.json` must stay in `web/` and Vercel's Root Directory must be `web`.

### 9.11 Push (server side)

`utils/push.js` signs a JWT with the service account (`FIREBASE_PROJECT_ID`,
`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) and calls FCM HTTP v1
directly. Dead tokens are removed: `UNREGISTERED`, an invalid token, and
`SENDER_ID_MISMATCH` (a token made by another Firebase project, i.e. by an
app build from before the 22 Oct 2026 move). The welcome push is sent once
per account (`notification_sends`) by `/api/push/welcome`, which answers
with a status (`sent`, `already_sent`, `no_devices`, `opted_out`,
`not_configured`, `failed`), and alongside the explorer welcome email. It
goes to **every device the account has at that moment**; a device turned on
later gets nothing. Admin → push-test sends a test to every device of one
account — the way to test a second device.

### 9.12 Analytics, consent and legal

- GA4 (`components/Analytics.jsx`) renders only when
  `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set, the visitor has accepted, and the page
  isn't `/admin`. Not rendering *is* the gate: no script, no cookie. The choice
  is `localStorage` `sp_cookie_consent`; the footer's **Cookie settings**
  reopens the banner, and declining after accepting deletes the `_ga` cookies.
- Privacy Policy and Terms (`components/LegalPage.jsx`) are dated
  **17 October 2026**. They are a careful draft, **not legal advice**: have a
  solicitor review them before public promotion — the full list of questions
  for the solicitor is in §16.1.

### 9.13 What deploys

`web/vercel.json` → `ignoreCommand` → `scripts/vercel-ignore-build.sh`: Vercel
skips the build when nothing under `web/` changed since the **last successful
deployment** (`VERCEL_GIT_PREVIOUS_SHA`). App-, Supabase-, docs- and
README-only pushes show as **Canceled** in Vercel — the rule working. In doubt
(no previous SHA, git error) it builds.

---

## 10. The app

`app/`. The detail (structure, every rule, migrations as the app sees them,
admin Reports) is in **`app/README.md`**; this section is the overview.

### 10.1 Builds 1–24

Version `1.0.0+N`. Phases 0–3a (9–10 Oct 2026, as `0.1.0+1`) came first:
skeleton and intro, one shared crisis phrase list, Explore, emotional search,
detail pages, email-code sign-in with Library sync and account deletion, push.

| Build | Date | What it added |
| :--- | :--- | :--- |
| 1 | 10 Oct | App icon, 1.0.0, App Store build settings |
| 2 | 10 Oct | The star, the floating tab bar, Books, sharing, hearts on cards |
| 3 | 11 Oct | Fixes and polish |
| 4 | 11 Oct | Discover · Videos · Books with one subject filter; the star returns to its tab |
| 5 | 11 Oct | Two-engine search; channels kept apart from teachers; the star flies on every page change |
| 6 | 11 Oct | Push notifications turn on (waits for Apple's token) |
| 7 | 13 Oct | Reviews with report and block; tier tips; My Account refresh; email change; retreat dates; saves in Suggests |
| 8 | 13 Oct | Tier badges explain themselves when tapped (no automatic tips) |
| 9 | 13 Oct | One-row header and the frosted menu |
| 10 | — | **Not a real build**: an accidental duplicate of 9, uploaded from Xcode |
| 11 | 14 Oct | Onboarding interests, For You, Affiliate Disclosure |
| 12 | 14 Oct | Tailor Spiritpedia: More of and Never show |
| 13 | 16 Oct | More of beats Never show; saving needs an account; the Tailor star; For You rotation; the new welcome push |
| 14 | 16 Oct | "How will you use Spiritpedia?" |
| 15 | 16 Oct | Your area (Practitioners Near You); the star's conductor; the area and name questions; "Welcome back" |
| 16 | 16 Oct | The Always-location purpose string Apple's upload scan wanted (ITMS-90683) |
| 17 | 17 Oct | Account types: Organisation listings shown as channels; "OFFICIAL" |
| 18 | 17 Oct | Activity learning ("Let Spiritpedia learn from what I explore") |
| 19 | 17 Oct | **The iPad**: the same app laid out for the larger screen, both orientations, Split View |
| 20 | 18 Oct | *Built, never uploaded (replaced by 21).* Badges (tiers by type, ✓ Verified, OFFICIAL, every badge explained by the star); Official reviews; Explore More as real shelves; the iPad two-stars fix |
| 21 | 18 Oct | Build 20, plus: the tier badge top left on cards (type bottom right); the top two tiers' tips reworded |
| 22 | 22 Oct | Everything since 21: the star's first callout "Tap me anytime to come home. Press and hold to open your Library." (checked on iPhone SE and on iPad in portrait and landscape); the explorer welcome sent from the website when the account is created (not on "I'm exploring"); "review received" only for a new review, never an edit; the **Discovery emails** switch on My Account (explorers who never applied); OFFICIAL with no ✦ (badge, tip, search line). 307 tests |
| 23 | 22 Oct | **On TestFlight.** Firebase moved to the love@spiritpedia.co projects (`spiritpedia-ad62b` / `spiritpedia-dev-5e4d5`). Push checked on iPhone and iPad |
| **24** | 22 Oct | **Current build (iOS IPA and Android bundle), waiting to be uploaded.** The welcome notification is asked for until the server confirms it (three tries, then at each start; build 23's iPad never sent the request); "Turn off notifications on this phone" removes the token it registered (it used to fail on the iPad); Account type shows the type set at approval; **Android**: release signing with the Play upload key, approximate-location permission, a notification arriving while the app is open shows as an in-app note with **Open**. 316 tests |

**Waiting for the next build (25)** — in the code, committed, tested (320
tests), not yet in any build:
- **Publishers:** any logo on a white, rounded, padded panel
  (`PublisherLogo` in `shared/widgets/cards.dart`), on the card and the page;
  the card's meta line is always one line (`publisherMeta`: "18 authors ·
  Founded 1984", or "Independent press"); the page puts the tier, founding
  year and website on one row under the name; "Their authors are joining
  Spiritpedia soon." when there are no books yet. Same as the website (§17.5).
- **The medical-care note** ("Complementary to, not a replacement for, medical
  care.") on the homeopathy subject screen and on homeopaths' profiles
  (`core/safety/medical_note.dart`), as on the website (§18.4).

### 10.2 Structure and startup

- `lib/main.dart`: keeps the native splash up; locks to portrait **only on a
  phone** (the screen's shorter side under 600 pt); starts Supabase with the
  session in the Keychain (`core/auth/secure_session_storage.dart`; a stale
  Keychain session from a previous install is cleared); starts Firebase
  (`initFirebase()`, live or dev options by `APP_ENV`; failing quietly means no
  push); shows a "missing configuration" screen instead of crashing without
  `--dart-define-from-file`.
- `lib/app.dart`: `MaterialApp.router`, dark only. Above the router, from the
  outside in: larger text on iPad, the **star layer** (so a star can fly from
  any screen to any other), and the **intro**. Notification taps open in-app
  paths. Debug builds accept `--dart-define=START_ROUTE=/account`.
- `lib/router.dart` (go_router): three tabs — `/` Discover, `/videos`,
  `/books` — each with its own history; `/library`, `/account`, `/tailor`,
  `/subject/:slug`, `/feel` (search; `?in=videos|books`); detail pages
  `/healers/`, `/books/`, `/videos/`, `/publishers/`, `/offerings/`,
  `/free-resources/:slug` (the website's paths, so shared links match).
- State is **Riverpod 3** without code generation; providers catch their own
  errors (`core/retry.dart`).
- The **menu** (`features/menu/app_menu.dart`) is a right-side frosted panel:
  Sign in (signed out), My Library, Account, Notifications, Tailor
  Spiritpedia, Share Spiritpedia, the website's footer statement, Terms,
  Privacy, Affiliate Disclosure, Contact.

### 10.3 The star and its conductor

There is **only ever one star on screen** (`features/star/star_layer.dart`).
- **Intro** (`features/intro/intro_overlay.dart`). First launch: "I am your
  guiding star" (2.4 s), a flight into Discover's search box, the callout "Tap
  me anytime to come home" (Got it), then onboarding. Later launches: just the
  flight, after "Welcome back, {name}" if a name is set. Reduce Motion: no
  flights.
- **Where it lives.** On a tab, in the search box; when the box scrolls away it
  flies into the start of the sticky pill row (the pills fade beneath it), and
  back. On other pages it floats at the foot (`FloatingHomeStar`); a tap goes
  home to the tab you came from, keeping the filter; press and hold opens My
  Library. Every page change is a flight along the slipstream (420–950 ms).
- **Tier tips.** The Superhero, Luminary and Local Hero badges on shelf
  headings explain the tier when tapped; nothing appears on its own.
- **The conductor** (`features/star/conductor.dart`) decides the star's one
  appearance per **session** (a cold start, or back after 30+ minutes).
  Session 1 is the intro. Then, in priority order:
  - from visit **3**, signed in with learning off: "Shall I learn from what you
    explore?" (Yes, learn / Not now);
  - from visit **5**, with no area: "Shall I show you practitioners near you?"
    (Use my location / Type my city / Not now);
  - from visit **7**, with no name: "Would you like to share your name?".
  Each is asked once, then once more at least 15 visits and 21 days later, then
  never. It waits for a quiet moment (a main tab on top, nothing open, the
  search not opened this session, 3 seconds), then flies down onto a frosted
  tray; swiping it away is "Not now". If the intro played this session, that
  was the appearance.
- **Debug builds only** (Account): Replay intro; "Star visits: N" with Set to
  3 / 5 / 7; Reset star questions. None of it reaches TestFlight.

### 10.4 Search: two engines, behind the crisis gate

`features/search/emotion_search_controller.dart`, 300 ms debounce. Every box
runs, in order: **(1) the crisis check** (synchronous, before anything is sent
— §11); **(2) the dual-path question** for ambiguous phrases; then **both
engines in parallel**:
- **Feelings:** `emotion_mappings` through the shared normaliser — exact
  emotion, the candidate cascade, then whole-word substring passes.
- **Names and titles:** `features/search/content_search.dart`, every word
  required, across teachers, channels, videos, books, subjects, courses and
  free resources.

Both show. **Scopes:** Discover's box searches everything; the Videos and
Books boxes search their own kind, with an "Also found" line. **Spiritpedia
Suggests:** one video and one book, ranked by relevance (title +1000/+600,
words matched, mapping weight), with small bonuses that never beat a title
match (people's saves via `save_counts`, More of, learned subjects, same
pillar). Never show holds name matches back behind "You've hidden this subject.
Show anyway?". 1.5 s after results settle, the search counts for activity
learning — never a crisis search.

### 10.5 Tailor Spiritpedia and onboarding

- **Onboarding** (first launch, after the intro): "Welcome to Spiritpedia. What
  interests you most?" — the five pillars, each opening into subject chips;
  "Explore Spiritpedia →" or "Skip for now"; "Anything you'd rather not see?"
  opens the same picker in Never show mode.
- **Tailor Spiritpedia** (menu, Account): Your area, **More of**, **Never
  show**, and the learning switch. The star flies in and speaks its
  introduction at the top while the choices scroll beneath ("Don't show me
  again" stops it).
- **Storage:** on the phone at once; signed in, also `user_interests`. Unsynced
  local changes win at sign-in, then the account, else local is uploaded.
- **Never show** hides an item if *any* of its subjects is hidden — unless it
  also has a More of subject (More of wins). A teacher, channel or publisher
  goes only if *every* subject they cover is hidden. An emptied view shows the
  star: "You've hidden most subjects. Adjust in Tailor Spiritpedia".

### 10.6 Personalisation ranking

`lib/data/shelf_rules.dart` (pure functions, tested) and
`app/docs/personalisation.md` (the same rules in plain English — change them
together). Nothing is ever removed by ranking, only reordered.
- **`interestLevel`:** 0 = carries a More of subject; **1 = a learned
  subject** (activity learning); 2 = another subject in a More of pillar; 3 =
  everything else. Ties: more chosen subjects, then learned weight, then the
  original order.
- **For You** (Discover, View All): levels 0–2, one content type per landing in
  rotation — Free Resources → Courses & Programmes → Downloads & Audio →
  Retreats & Live Events (upcoming) → Memberships.
- **Shelves:** Worldwide (Superheroes), Rising Voices (Luminaries),
  Practitioners Near You (Local Heroes and untiered), Timeless Teachers
  (Ascended Masters), Publishing Houses, Explore These Channels (channels, apps,
  organisations; Official first). The billboard runs three Superheroes then
  one Ascended Master.
- **Learned subjects:** each score halves every 30 days; only scores ≥3, top
  five, never a More of or Never show subject.

### 10.7 Activity learning (build 18)

`lib/features/learning/learning.dart`. A queue of events (an item opened
again within 30 minutes isn't a second open) sent to `/api/activity` every
30 s, at 20 events, or when the app goes to the background, kept on the phone
if it can't go. Signals: opens, video plays, saves and unsaves, shares, new
reviews, pill and filter taps, settled searches. **Everyone's events feed the
anonymous totals; only a signed-in member with the switch on has their own
events and scores kept** — decided on the server. The switch is in Tailor
Spiritpedia, off by default, and the star asks from visit 3. Learned subjects
rank at level 1 (§10.6).

### 10.8 Location and Practitioners Near You (build 15)

- An area is a **town** from `places`, never a position.
- "Use my location" asks iOS once for **approximate** location, **When In Use**
  only (`NSLocationDefaultAccuracyReduced`); the position is rounded to 2
  decimal places (about 1 km) before `nearest_place()`, which stores nothing.
  "Type my city" searches `places`.
- **Practitioners Near You:** in person within **50 km**, nearest first, then
  online practitioners from anywhere. With no area, everyone shows.
- The Always-location purpose string exists only because Apple's upload scan
  sees geolocator's unused code (ITMS-90683); the app never asks for Always.

### 10.9 Accounts and account types

- Sign-in by emailed 6-digit code, in Account or in place from the save
  prompt. **Saving needs an account** on both platforms: a signed-out heart
  opens "Save it to your Library", and the save completes after sign-in. Saves
  already on a phone move into the account at sign-in.
- **"How will you use Spiritpedia?"** once, for a new account. The explorer
  welcome (B1, app version) is sent when the account is created, not by this
  question (from build 22; earlier builds send it on "I'm exploring"). "I share my work" records the
  choice (`/api/pending-user-type`) and opens
  `spiritpedia.co/auth/signup?as=practitioner`, where the one application form
  lives. Listings are created and approved on the website (§9.5).
- **My Account:** email (change email uses two codes), account type (the type
  set at approval, §9.5), Your name
  (`user_profiles.full_name`), Tailor Spiritpedia, Notifications, Blocked
  reviewers, **Discovery emails** (from build 22; explorers who never applied:
  Day 4 and discovery editions on or off, through
  `/api/account/email-preferences`), Sign out (clears the phone's saves and
  tailoring; the account keeps them), Delete account (`/api/account/delete`,
  which sends D13).
- The app shows "OFFICIAL" listings first among channels, and organisations
  as channels.

### 10.10 Reviews and moderation (build 7, migration 0015)

Approved reviews (newest first) plus your own whatever its state; posting
upserts into `reviews` (forced to pending). Every review someone else wrote has
"⋯": **Report review** (reason, optional note; a snapshot is kept; love@ is
emailed) and **Block this reviewer** (hides all their reviews from you; listed
in Account to unblock). A banned account can't post. The admin decides on
Reports (§9.4). This is what App Store guideline 1.2 asks for.

### 10.11 Notifications

- Firebase starts at launch, but **no token exists until the person says yes**
  in Account → Notifications: the friendly screen → the system prompt (iOS;
  Android 13+) → token (waits for Apple's on iOS) → `register_push_token` →
  `notification_preferences` (General on; IAM affirmations off, reserved) →
  `/api/push/welcome` sends, once per account: "Testing, testing… just
  checking my light reaches you. Nothing to do. I'll only shine when it
  matters."
- **The welcome is asked for until the server confirms it** (from build 24):
  three tries a few seconds apart, then again at each start while the phone
  has notifications on, until the server answers `sent` or `already_sent`;
  then the phone remembers that for the account (`push_welcome_done_<user
  id>` in shared preferences). Before build 24 it was one request with its
  error swallowed: on 22 Oct 2026 an iPad turned on, saved its token and
  settings, and never reached the route (Vercel showed no request).
- **The phone remembers the token it registered** (`push_last_token`).
  "Turn off notifications on this phone" and sign-out remove that token, and
  whatever Firebase gives after waiting for Apple's, from the account, then
  delete it from Firebase (from build 24; before, it asked Firebase without
  waiting, got nothing on the iPad, and the row stayed). Account deletion
  leaves the removal to the server.
- At each start, a phone that said yes re-registers its current token (it
  rotates; this is also how phones moved to the new Firebase projects).
- **While the app is open:** on iOS the system banner shows
  (`showWhileOpen`); Android shows nothing for an app in front, so the app
  shows the title and text as a note with **Open** (from build 24). Tapping a
  notification opens its in-app path (`data.route`).

### 10.12 iPad (build 19)

`lib/theme/layout.dart` follows the **window's width, never the device**:
under 600 pt is the phone layout, byte-for-byte as before (every iPhone, and a
narrow Split View window); 600–1000 regular; 1000+ wide. Regular and wide get
cards ×1.2 / ×1.3, margins 32 / 48, text ×1.1, and maximum widths — reading
720, forms and sheets 560, trays 520, video 900, search row 760. The billboard
puts the portrait at the right; teacher and book pages put the picture beside
the words. iPad supports all four orientations and Split View (no
`UIRequiresFullScreen`; iPadOS 26 resizes every app anyway); iPhone stays
portrait. `test/ipad_test.dart` opens every screen at ten iPad and Split View
sizes. **Landscape has been checked in layout renders, not yet on a real
iPad.**

### 10.13 Badges and Explore More shelves (build 20)

- **Badges** (`lib/data/badges.dart`, the website's `web/utils/badges.js`
  word for word; README §17.1): `ListingBadgeRow` on cards, teacher and
  publisher pages and the billboard. Every badge is tappable; the star
  explains it. The tip bubble (`StarTipHost` in `star/tier_tips.dart`) lives
  on the `StarLayer` and hangs from wherever the star rests: below it in the
  search box or pill row, above it at the foot of a page. A tap anywhere
  closes it, and only closes it.
- **Explore More** (`home/explore_more.dart`): a shelf per section in a lazy
  `SliverList`, so each shelf (and its fetch) is built only as it comes within
  the scroll view's cache extent. The list's first child is empty on purpose:
  a sliver list always builds its first child at once. The four offering
  shelves share one fetch; results are kept for the session and shared with
  For You. See all → `/explore/:section?subject=` (`ExploreAllScreen`).
  The offerings query asks only for the columns cards need
  (`_offeringCardColumns`): 230 KB over the wire for all 1,025 live
  offerings, against 251 KB for `*`. The description is most of it; a short
  description column (a computed column, by migration) would cut far more.
- **The star never doubles up:** hiding the resting star is counted per
  holder (`StarLayerState.hold`/`release`), and the star's tray waits until
  no flight or intro is carrying the star.

### 10.14 Detail pages, links, the video player

Teacher, book, video, publisher, offering and free-resource pages share
`DetailScaffold` (share, save heart, the floating star). Shares are
`https://www.spiritpedia.co{path}`. Outbound links open in the browser, never an
in-app web view. Amazon links are rebuilt as `/dp/{ASIN}` with the store's tag
from `prod.json`. Videos play in a WebView embedding `youtube-nocookie.com`,
inline.

### 10.15 Android (build 24)

The same Flutter code, built for Google Play. **Ready to upload, not yet on
Google Play**: the developer account (personal, love@spiritpedia.co) is being
verified, and a personal account must run a **closed test with 12+ testers for
14 days** before production (testers from Testers Community).
`docs/google-play.md` has every Play Console answer.

- **Package** `co.spiritpedia.app`; **minimum API 24** (Android 7), **target
  and compile API 36** (Flutter's defaults; Play requires 35+); NDK 28; Gradle
  9.3.1, Android Gradle Plugin 9.1.0, Kotlin 2.4.0, Java 17. The version comes
  from `pubspec.yaml` (`1.0.0+24` → version name 1.0.0, version code 24), so
  the iOS and Android build numbers stay the same.
- **Signing:** `app/android/app/build.gradle.kts` reads
  `~/.secrets/spiritpedia/android/key.properties`; without it a release build
  falls back to the debug key (fine for `flutter run --release`, refused by
  Play). Play App Signing holds the real app-signing key (§12.8).
- **Firebase:** `options_prod.dart` / `options_dev.dart` carry the Android apps
  of both projects. No `google-services.json` and no Google Services Gradle
  plugin: the Dart options are enough for Cloud Messaging.
- **Manifest** (`android/app/src/main/AndroidManifest.xml`): `INTERNET`;
  `POST_NOTIFICATIONS` (Android 13+, asked only after the in-app screen);
  `ACCESS_COARSE_LOCATION` only (added for build 24 — without it
  `geolocator` refused, so "Use my location" never worked on Android); FCM
  auto-init off until yes; Analytics deactivated; default notification channel
  `general`, the white star icon `ic_notification` and the brand colour;
  `queries` for https, mailto and tel links.
- **Icon:** the gold star (adaptive icon, `mipmap-anydpi-v26`).
- **Checked on the Pixel 8 emulator (Android 14), 22 Oct 2026, release build
  against live:** browse, the star's callout, the save prompt and sign-in by
  code, saving, press-and-hold the star → My Library, Account type
  "Channel", Notifications (the system prompt, the welcome recorded, a test
  notification in the background and as the in-app note, tapping it opens
  Account), turning off removes the token. **Not yet checked:** every screen
  in turn, "Use my location" on Android, a real Android phone, tablets.
- **The bundle is 16 KB page-size aligned** (every `.so` checked), as Play
  requires for API 35+.

---

## 11. The crisis intercept (website and app)

**Every search box, on both platforms, runs the crisis check first, on every
keystroke, before anything else and before anything is sent anywhere.** A match
shows the crisis screen — warm, no clinical vocabulary, a link to
[findahelpline.com](https://findahelpline.com) for free, confidential support
in the visitor's own country, and a real "Take me back to Spiritpedia" — and
nothing reaches any engine, the Enter/search key included.

- **One phrase list:** `web/shared/emotion-safety.json`. 171 crisis phrases in
  seven categories (suicidal ideation 93, self-harm 12, eating disorder 14,
  active abuse 20, sexual assault 10, child protection 7, acute crisis 15); 16
  dual-path phrases ("hearing voices": channelling or distress? — asked, never
  guessed; "distressing" goes to the crisis screen); the soft-tier line; the
  medical disclaimer ("Complementary to, not a replacement for, medical care.")
  for quantum healing, homeopathy, energy medicine and ayurveda results; the
  normalisation lists.
- **The website:** `web/utils/emotionSearchPatterns.js` in
  `components/EmotionSearch.js`. **The app:** `lib/core/safety/emotion_safety.dart`
  (a port), reading the same file through the symlink `app/assets/safety/`;
  the gates sit at the top of `emotion_search_controller.dart`.
- **They can't drift:** `web/shared/emotion-safety.cases.json` (regenerate with
  `web/scripts/generate-emotion-safety-cases.mjs`) is checked by both
  `npm test` and `flutter test`. `app/test/features/search/two_engines_test.dart`
  types every phrase, plain and as "I feel …", into every box and checks no
  engine received a call; `learning_test.dart` checks no crisis search is ever
  logged; `/api/activity` re-checks on the server.
- **Nothing personal touches it.** More of, Never show and learning apply only
  after the gates.

Change phrases only in the shared JSON. Never shorten, reorder or skip the
gates. On 17 October 2026 the four crisis test files ran 20 times in a row on
their own with no hang.

---

## 12. Run, test, build and release

### 12.1 Website

```bash
cd web
npm install
npm run dev            # http://localhost:3000, against DEV (.env.development.local)
npm test               # node --test: 143 tests in utils/*.test.mjs
npx eslint app components utils
npm run build          # what Vercel runs
```

A dev server may already be on port 3000 (`lsof -ti:3000`); `npm run dev` then
exits, which looks like a failure. **Deploying is pushing to `main`** with a
change under `web/` — show the diff and get an OK first. Confirm a deploy with
`npx vercel ls` from `web/`, or by checking the live page.

### 12.2 App

```bash
cd app
flutter pub get
flutter run --dart-define-from-file=config/dev.json    # dev database + local website (npm run dev)
flutter run --dart-define-from-file=config/prod.json   # live data
flutter analyze        # must say "No issues found"
flutter test           # 316 tests, all passing at build 24 (one dev-only test skips)
```

In this environment Flutter is run through a clean login shell:
`env -i HOME="$HOME" USER="$USER" TERM=xterm-256color SHELL=/bin/zsh /bin/zsh -l -i -c 'cd …/app && flutter test'`.

### 12.3 Simulator tours (screenshots)

A temporary integration test drives the real app (dev config) and prints
`SHOT:<name>`; a shell loop reading its output runs
`xcrun simctl io <udid> screenshot <file>` on each marker. The test is
**deleted afterwards and never committed**. Boot one simulator, run the tour,
**shut it down**. Notes:
- Xcode 27 has no Simulator app; its device window is **DeviceHub**
  (`/Applications/Xcode.app/Contents/Applications/DeviceHub.app`).
  `simctl` can't rotate a device, and an app's own request to rotate is
  ignored on an iPad that supports Split View — so landscape needs DeviceHub
  or a real iPad. With the simulator booted, open DeviceHub and rotate from a
  script: `osascript -e 'tell application "System Events" to tell process
  "DeviceHub" to click menu item "Rotate Left" of menu 1 of menu bar item
  "Controls" of menu bar 1'` ("Rotate Right" to come back), then quit DeviceHub.
- **The smallest iPhone** this Mac can run is the iPhone SE (3rd generation)
  on iOS 26.5 (375 × 667 pt). Create it for the check
  (`xcrun simctl create "iPhone SE (3rd generation)"
  com.apple.CoreSimulator.SimDeviceType.iPhone-SE-3rd-generation
  com.apple.CoreSimulator.SimRuntime.iOS-26-5`) and delete it afterwards.
- If the intro plays, that's the star's appearance for the visit: test the
  conductor's trays with the intro off.

### 12.4 Before a TestFlight build

1. Bump `version: 1.0.0+N` in `app/pubspec.yaml`. **Every upload needs a new
   number**, and the archive you upload must be the one built after the bump.
2. `flutter analyze` and `flutter test` (and `npm test` if `web/` changed).
3. Look at it in the simulator (show the project owner).
4. Commit and push (app pushes don't deploy).

### 12.5 Build

```bash
cd app
flutter build ipa --release --dart-define-from-file=config/prod.json
```

This makes `build/ios/archive/Runner.xcarchive` and
`build/ios/ipa/Spiritpedia.ipa`. Check the IPA:

```bash
mkdir /tmp/ipa && cd /tmp/ipa && unzip -q …/app/build/ios/ipa/Spiritpedia.ipa
/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' Payload/Runner.app/Info.plist   # N
codesign -d --entitlements :- Payload/Runner.app | grep -A1 aps-environment         # production
```

Also check `UIDeviceFamily` is 1 and 2 and the iPad orientations are present.
Building the IPA replaces the previous one in the same folder.

### 12.6 Upload

The project owner uploads (there is no App Store Connect API key on this Mac).
Two ways:

**A. Xcode, Distribute App** (uses the archive):
1. In Terminal: `open app/build/ios/archive/Runner.xcarchive` — Xcode opens and
   adds the archive to the Organizer (Window → Organizer → Archives).
2. Select the **Runner** archive whose version reads `1.0.0 (N)`.
3. **Distribute App** → **App Store Connect** → **Upload** → leave automatic
   signing and the defaults → **Upload**.
4. Quit Xcode when it finishes (this Mac runs short of memory with it open).

Build 10 was an accidental re-upload from Xcode; check the version in the
Organizer before pressing Distribute.

**B. Transporter:** drag `app/build/ios/ipa/Spiritpedia.ipa` into Apple's
Transporter app → Deliver.

Then in **App Store Connect → Spiritpedia**:
- The build appears under TestFlight after processing; answer the export
  compliance question (standard encryption only).
- **App Privacy** must match what the app collects. The correct label from
  build 18 on, all **linked to the user, not used for tracking**:

  | Data type | Purposes |
  | :--- | :--- |
  | Name | App Functionality |
  | Email Address | App Functionality |
  | Coarse Location | App Functionality |
  | User ID | App Functionality |
  | Device ID (the push token) | App Functionality |
  | Product Interaction | App Functionality, Analytics, Product Personalization |
  | Search History | App Functionality, Analytics, Product Personalization |
  | Other User Content (reviews, reports, blocks) | App Functionality |
  | Sensitive Info (Tailor interests and learned subjects: religious or philosophical beliefs) | App Functionality, Product Personalization |

  Nothing else: no Health data, contacts, photos, purchases, advertising ID,
  crash or performance data, and no tracking (no analytics SDK in the app).
- **Screenshots:** iPhone, and from build 19 a 13-inch iPad set (2064 × 2752
  portrait or 2752 × 2064 landscape).

### 12.7 Migrations

Write the next numbered file, idempotent, revoking default function grants
(§7.3), ending with a check `SELECT`. Show it before anyone runs it. The
project owner runs it on **dev**; check it with throwaway users (Admin API,
email confirmed, deleted afterwards). Then **live**, checked read-only. Update
§8 here.

### 12.8 Android: build, test and Google Play

```bash
cd app
flutter build appbundle --release --dart-define-from-file=config/prod.json
#   → build/app/outputs/bundle/release/app-release.aab, signed with the upload key
```

Run it through the same clean login shell as the iOS build (§12.2). The first
build downloads Gradle and its dependencies (about 3–4 GB into `~/.gradle`) and
takes about 4 minutes. Copy the bundle out before clearing `build/app`: build
24's is `app/build/android-release/Spiritpedia-1.0.0-24.aab`, with the 512 px
Play icon beside it.

**Check the bundle:**
```bash
A=app/build/android-release/Spiritpedia-1.0.0-24.aab
keytool -printcert -jarfile $A | grep SHA256     # the upload key (§4), never the debug key
```
and in the merged manifest (`build/app/intermediates/merged_manifest/release/…`)
`versionCode`, `targetSdkVersion="36"` and the permissions (§10.15). Every
native library must be 16 KB aligned (read each `.so`'s LOAD alignment; all
were 16384 or 65536 at build 24).

**The emulator** (one at a time, never with an iOS simulator running, §13):
```bash
~/Library/Android/sdk/emulator/emulator -avd Pixel_8_API_34_-_Test_Device_Clean -no-snapshot -no-boot-anim &
~/Library/Android/sdk/platform-tools/adb wait-for-device
cd app && flutter run --release -d emulator-5554 --dart-define-from-file=config/prod.json
~/Library/Android/sdk/platform-tools/adb emu kill      # when done
```
- If it exits with "A snapshot operation … is pending", delete the `*.lock`
  files in `~/.android/avd/Pixel_8_API_34_-_Test_Device_Clean.avd/` and start
  it with `-no-snapshot`.
- An old copy signed with a different key won't update
  (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`; `flutter run` then quietly runs the
  old app): `adb uninstall co.spiritpedia.app` first.
- Screenshots: `adb exec-out screencap -p > shot.png`; taps:
  `adb shell input tap X Y` (the Pixel 8 is 1080 × 2400).
- Signing in sends a real code: use a real inbox (love@ was used, the owner
  read the code), never a made-up address (§14). Turn notifications off on the
  emulator afterwards so its token leaves the account.

**The upload key — back it up.** `~/.secrets/spiritpedia/android/`
holds `upload-keystore.jks` and `key.properties` (the password, randomly
generated). Put **both files** in the password manager (as attachments, or
the `.jks` as an attachment and the password as a field), and keep one
encrypted copy off this Mac (e.g. an encrypted disk image on a USB stick). With
Play App Signing, losing the upload key is recoverable (Play support can
register a new one) but slow; without a backup every update waits for that.
Never commit either file.

**Google Play:** everything to fill in, in order, is `docs/google-play.md`
(create the app, Play App Signing, app content, data safety, content rating,
target audience, store listing, the closed test).

---

## 13. This Mac: memory and disk

The development Mac has run out of both.
- **Memory:** run **one simulator at a time** and shut each down after
  (`xcrun simctl list devices booted`; `xcrun simctl shutdown <udid>`). Keep the
  Xcode app closed — builds run from the command line. **Never run the full
  test suite while a simulator tour runs.**
- **Disk** (228 GB): on 17 October 2026 it was full (130 MB free) during a
  build. Regenerable space, and how much it was then: `app/build` (keep
  `ipa/` and `archive/` until uploaded), `app/.dart_tool` (4 GB; `flutter pub
  get` recreates it), `web/.next`, Xcode `DerivedData` (3.5 GB), simulator
  data (`xcrun simctl erase <udid>`; the iPhone simulator had grown to 6.9 GB),
  `~/.gradle` (5 GB, Android only). Clearing them took it to 27 GB free.
  Check `df -h /System/Volumes/Data` before a release build (it needs a few GB).
- `~/Library/Developer/Xcode/Archives` holds archives named "App …" from
  February–September 2026 (`com.sundaysoullounge.booking`,
  `com.eliteartists.mobileapp`): **other projects', not Spiritpedia's — don't
  delete.** Of Spiritpedia's (`Runner`), only build 16's is kept (the last on
  TestFlight, for its crash reports); builds 1–21's were deleted on 22 Oct
  2026 (about 3 GB). A build's archive joins the Organizer when it is opened
  to upload (build 24's is `app/build/ios/archive/Runner.xcarchive`). Keep
  only the archive of the newest uploaded build.
- **22 October 2026, after the Android work:** about 3.5 GB free. Android
  added `~/.gradle` (3.6 GB: caches 2.9, wrapper 0.7, recreated by the next
  Android build) and the emulator lives in `~/.android/avd` (6.1 GB; its data
  can be wiped from Android Studio's Device Manager or with `emulator -avd …
  -wipe-data`). Cleared that day and safe to clear again: Xcode `DerivedData`
  (3.9 GB), `app/build/test_cache`, `app/build/ios/iphonesimulator` and
  `Debug-iphonesimulator`, `app/build/app` (Android intermediates, once the
  `.aab` is copied out). Keep `app/build/ios/SourcePackages` (1.2 GB) or the
  next iOS build downloads it again. Other big folders are not this project's
  (`~/Library/Caches/Google` 3.3 GB, VS Code updates 1.4 GB, Homebrew).

---

## 14. Test accounts must never cause an email

The dev Supabase project was warned in October 2026 for a high bounce rate:
browser walk-throughs had typed made-up addresses into the sign-in form.

- **Create test users through the Admin API with the email already confirmed**
  (`POST /auth/v1/admin/users` with `email_confirm: true`) — on dev only.
  Nothing is sent. Sign them in with a password grant, or
  `admin/generate_link` for a code; neither sends anything.
- **Never type a test address into the sign-in form** (website or app). For a
  signed-in browser, put the session into `localStorage` under
  `spiritpedia-auth`.
- **Create the test user's `user_profiles` row up front**, so the first-sign-in
  welcome isn't sent.
- **If a test really needs an email to arrive**, use plus-addressing on a real
  inbox (e.g. `rossbaiken+test1@gmail.com`). Never a made-up or no-mailbox
  address.
- `JOURNEY_TEST_EMAIL` redirects every outreach email while set.
- **Local runs that touch email:** start `npm run dev` with `RESEND_API_KEY=`
  empty (nothing can send) and a throwaway `ADMIN_PASSWORD` and `CRON_SECRET`
  in the process environment, never the live ones.
- The daily `account-emails` job only emails accounts created since 22 Oct
  2026; on dev, `ACCOUNT_EMAILS_SINCE` moves that date for a test (never on
  Vercel).
- **Discovery edition test-sends** go to love@ only. Deleting a test account
  from the admin sends D13 unless "Send confirmation" is unticked; on live,
  use a plus-addressed inbox (and ask before creating any live test account).
- Delete test users afterwards.

---

## 15. Things that will bite you

1. **PostgREST caps every response at 1,000 rows, silently.** Page with
   `.range()` ordered by `id`, never `created_at` alone (the bulk import gave
   thousands of rows the same timestamp).
2. **Three Supabase clients on the website**, not interchangeable:
   `utils/supabase.js` (anonymous, stateless, server components),
   `utils/supabaseAuth.js` (browser, holds the session),
   `utils/supabaseAdmin.js` (service role, server only).
3. **The anon key ships in every page and in the app.** Anything it may write,
   anyone may write.
4. **Two keys point at a listing:** videos and books carry a text
   `healer_slug`; courses and free resources a bigint `healer_id`.
5. **supabase-js returns `{ data: null, error }` instead of throwing.** A
   trailing `|| []` turns "unreachable" into "nothing here".
6. **`.env.local` is live.** A Node script reading it writes to production.
7. **`healer_slug` must never be renamed** — content finds its listing by that
   text, and the public page would 404.
8. **Deleting an account** removes the `auth.users` row and cascades through
   every personal table. **Deleting a listing** orphans its content.
   **Starting a journey** emails a real person. None of these can be undone.
9. **Env var changes need a redeploy** on Vercel (book pages are cached for an
   hour; the affiliate page is static).
10. **Riverpod 3:** a notifier must not `ref.invalidate` a provider that
    watches that same notifier — it's a circular dependency error.
11. **Deleting an `email_sends` row lets that email go again.** It is the
    once-only lock (0025); `forgetSent` is used on purpose (a decline lets a
    new application get a new D2; a deleted account's rows are cleared).
12. **A Next.js route file may only export route handlers and route
    options.** Any other export (even a constant) breaks the build; keep
    helpers unexported or in `utils/`.
13. **Approve only from the Inbox.** Changing `verification_status` by any
    other path (the SQL editor, a script) creates no listing and sends no
    email (§9.4).
14. **The Firebase app options are Dart files only** (`options_*.dart`).
    `flutterfire configure` registered the dev apps on 22 Oct 2026 but then
    failed (Ruby's `xcodeproj` gem is missing) after rewriting the Gradle
    files and adding `GoogleService-Info.plist` / `google-services.json`;
    those were reverted. To regenerate, use `firebase apps:sdkconfig` per
    app (logged in as love@: `firebase login:use love@spiritpedia.co`) and
    copy the values in.
15. **A token from another Firebase project fails with `SENDER_ID_MISMATCH`**
    and is now removed as dead. Any future project move strands every saved
    token until each phone opens a build with the new options.
16. **A welcome that was never requested leaves no trace** in the database:
    check Vercel's logs for `/api/push/welcome` before blaming delivery.

---

## 16. Known issues, open items and what's next

### 16.1 Before the App Store launch

1. **Upload build 24** (iOS) with the privacy label and iPad screenshots
   (§12.6), and test on TestFlight: turn notifications off and on on the iPad
   (the token row should go and come back) and check the welcome logic on a
   new account.
2. **Google Play** (§10.15, §12.8, `docs/google-play.md`): once the personal
   developer account is verified, create the app, upload
   `Spiritpedia-1.0.0-24.aab` to a **closed test** with 12+ testers (Testers
   Community) for **14 days**, then apply for production. Still to make: the
   1024 × 500 feature graphic and phone screenshots. Decide how a reviewer
   signs in (codes go to an inbox they can't read).
3. **Delete the old Firebase projects** under the Elite Artists Google
   account, `spiritpedia-d190c` and `spiritpedia-dev` (the move was finished
   and checked on 22 Oct 2026: §4). Only installs older than build 23 used
   them; their notifications stopped when the website switched.
4. **Notifications, still open:**
   - The **General** switch saves the preference but leaves the device token
     registered (it stops sends at the server, which is enough).
   - **The welcome tray needs a redesign:** in-app messages must never appear
     abruptly — wait for a main tab, the star flies down onto a frosted tray,
     never repeat "I am your guiding star", swipe or tap to dismiss, hide
     after a few seconds.
   - Fixed in build 24: the welcome that was never requested (it is now asked
     for until confirmed) and "Turn off on this phone" / sign-out leaving the
     token on the account (§10.11).
5. **Email change: retest on live** (change, both codes arrive, the app and
   admin show the new address). An earlier test left two live accounts
   (rossbaiken@ and wiseoly@); both are kept.
6. **The polish pass** across the app (from testing build 13 on a phone).
7. **Questions for a solicitor** (before public promotion; the legal pages are
   a careful draft, not legal advice):
   1. **The legal pages:** the Terms of Use and the Privacy Policy, as a whole.
   2. **Trademark:** registering "Spiritpedia" (and the star mark).
   3. **Marketing emails as a sole trader:** what consent and opt-out rules
      apply to outreach and future mailshots sent by a sole trader. **Cold
      email:** whether the outreach journey may go to practitioners' published
      addresses (`JOURNEY_TEST_EMAIL` stays set until this is answered).
      **Soft opt-in:** whether Day 4 and discovery editions to free accounts
      need a consent tick at sign-up before public launch.
      **Health-claim filter:** whether the discovery editions' title filter
      (`readsAsHealthClaim`) can be narrowed.
   4. **Spiritual interests as sensitive data:** whether Tailor Spiritpedia's
      choices and learned subjects count as special category data (religious
      or philosophical beliefs) under UK GDPR, and what that requires.
   5. **Activity-learning consent:** whether the switch (off by default, its
      wording, the consent timestamp, deletion when turned off) is valid
      consent.
   6. **Location data:** approximate location, rounded to a town and stored as
      a town only — what the Privacy Policy must say.
   7. **Mentioning Netflix in ads:** whether advertising can compare
      Spiritpedia to Netflix by name.
   8. **The App Store seller name vs the Privacy Policy's named controller:**
      whether they must match, and how.
   9. **BCC-ing every email to a Gmail archive:** whether that's acceptable,
      and what to say about it.
   10. **The UK ICO data protection fee:** whether it applies.
8. **App Store listing:** description, keywords, screenshots (iPhone and
   iPad), the privacy label above.

### 16.2 Emails

- **Switch on discovery editions** once the test-sends look right in Gmail,
  Apple Mail and Outlook: `DISCOVERY_EDITIONS=on` (§5). The earliest real
  edition 1 is for accounts created on 22 Oct 2026, on 1 November.
- **The monthly cadence** for edition 2 onwards: decided (monthly after Day
  10; skip a month when there isn't enough new), not built.
- **Listing photos:** most dev listing photos are hotlinked low-resolution
  images (93 of ~125 from `encrypted-tbn0.gstatic.com`), which is why the
  edition's featured photo is small. Copying listing photos into our own
  storage is a separate project.
- **Publisher, channel and organisation outreach:** no wording, so the journey
  refuses them. Write it, then start outreach to them.
- **No outreach journey has ever been started** for a real listing — a business
  decision, after the solicitor; everything is built and tested.
- **Most account and review emails are not retried** if Resend fails (only the
  welcome, Day 4 and the journey are); the Inbox says when an email didn't go.
- Account and review emails are simple HTML with no logo header; only the
  discovery edition has one.
- Dev Supabase is on the free plan: its sign-in emails use default templates.

### 16.3 Website follow-ups and gaps

- `app/docs/website-followups.md`: issues found while building the app.
  Channels mixed with teachers: fixed (18 Oct 2026). Memberships, search and
  offering dates: open.
- **Explore More on the website** is still tiles that fetch on demand. Real
  shelves would load as fast if each fetched only as it scrolls into view
  (an IntersectionObserver, as the app does with its cache extent) and asked
  for 12 rows rather than every live offering.
- **Report and block on website reviews** ("⋯" as in the app).
- **Back up the content:** a periodic `pg_dump --data-only` of the content
  tables to private storage, not git.
- **"Suggest a change"**: the public flagging content that isn't theirs.
  Separate from owners' own edits (0024), and later.
- **Delete the spare Vercel project** `spiritpedia` once nothing needs
  `spiritpedia.vercel.app`.
- Dead code: `PractitionersTab`, `AccountsTab` in
  `components/admin/AdminLiveTabs.jsx`.
- Smaller: a branded 404 page; reviews for healers and publishers (the table
  allows them; no UI); a `claimed_at` column (claimed status is inferred);
  Admin Messages / Mailshots / Settings are placeholders (mailshots will need
  the same unsubscribe and once-only rules as §9.7); subject pages still
  `select('*')` four collections uncapped (a TODO names the numbers).

### 16.4 What's next

- **Content ingestion, one healer at a time** (§18), towards 5,000 videos and
  5,000 books. Admin → Ingestion (`components/admin/ContentIngestion.jsx`)
  still adds single items by hand.
- **Android, after the closed test:** a pass over every screen on a real
  Android phone (the app was designed on iPhone/iPad), "Use my location" on
  Android, tablets, and Android's own back behaviour (it goes to Discover
  first).
- **IAM affirmations:** the reserved `notification_preferences.iam_affirmations`
  switch (off) is waiting for the affirmation notifications.
- **Amazon:** each of the five Associates accounts needs three qualifying sales
  by about 6 April 2027 or it closes; the Product Advertising API (licensed
  covers, prices) needs those sales first (§17.6).

---

## 17. Reference

### 17.1 Badges explained

Copied in full in `docs/admin-guide.md` (with the star's tips and how to
approve).

- **Type:** what it is. Practitioner (shown as "Individual" in admin),
  Channel (YouTube or podcast), App, Organisation, Publisher. Set at approval.
- **Tier:** how big it is. Set by the admin. **Never for sale:** paying for a
  listing never buys a tier.
- **✓ Verified:** the owner has confirmed it's theirs. Automatic, no checkbox
  (`verified`, migration 0023).
- **OFFICIAL:** Spiritpedia's own account only. Automatic, no checkbox
  (`healers.official`, migration 0023). No tier badge. The badge is the word
  OFFICIAL with no symbol (no ✦, §2).
- **Website search rows** show a small tier glyph: Superhero ★, Ascended
  Master ✹, Luminary ✶, Local Hero ◆, no tier ●; Spiritpedia's own listing
  shows the gold star logo image.

| Colour | Practitioners | Channels, apps, organisations, publishers | Stored as |
| :--- | :--- | :--- | :--- |
| Gold | Superhero | Superstar | `superhero` |
| Purple | Luminary | Shining Star | `luminary` |
| Green | Local Hero | Rising Star | `local_hero` |

Ascended Master (`ascended_master`) stays as it is, for people only: shown in
Timeless Teachers with a lifespan (`1931 — 2015`, or `b. 1931`). Guidance,
shown in admin and matching the star's tips: Superhero / Superstar ≈ worldwide
reach, 1M+ followers across social media; Luminary / Shining Star ≈ hundreds of
thousands; Local Hero ≈ a practitioner available in their area; Rising Star ≈
growing, under 100k. On cards the tier (with ✓ Verified, or OFFICIAL) sits
top left, the heart top right, a channel's type bottom right.

Every listing except Spiritpedia shows its tier, on cards and profiles,
website and app; channels, apps and organisations also show their type, beside
the tier. The button says **Book with [first name] →** for practitioners and
**Visit [name] →** for everyone else, Spiritpedia included.

### 17.2 Entity types

`healers.entity_type`: **individual** (NULL counts as individual), **channel**
(YouTube channel, podcast, collective), **app**, **organisation** (since
`0020`). Channels, apps and organisations keep their tier (named Superstar,
Shining Star, Rising Star) but leave the tier shelves, the billboard and
Practitioners Near You for **Explore These Channels**, Spiritpedia's own first.
On subject pages, in search and in My Library they are listed apart from the
teachers, on both platforms. **Publishers** are their own table, with a tier
since `0023`.

### 17.3 Subjects and the homepage

- **Five pillars** (`SUBJECT_TAXONOMY` in `web/components/SubjectPills.js`; the
  app mirrors them): Emotional Healing · Consciousness · Manifestation &
  Creation · Mystical & Spiritual Exploration · Body & Energy. 42 subjects in
  `subjects`; `subject_slugs` is a Postgres array matched with `@>` (so
  `eft-tapping` is one whole element).
- **Homepage:** navbar → emotional search → sticky subject pills → **Videos |
  Discover** tabs. **Discover** (default, server-rendered): the billboard
  (Superheroes and Ascended Masters three-to-one, rotating every 8 s), then
  Worldwide, Rising Voices, Practitioners Near You, Timeless Teachers,
  Publishing Houses, Explore These Channels, and **Explore More**, whose
  shelves (Free Resources, Books, Courses, Retreats, Downloads) are fetched
  only when chosen (first load went from ~8 MB to ~824 KB). **Videos** fetches
  nothing until opened: New to Spiritpedia, one shelf per pillar, Watch &
  Learn; with a subject filter, one shelf per teacher; and **For You** for a
  signed-in member with enough saves (rarity-weighted).
- An empty shelf renders nothing. Courses and free resources show only while
  `is_active` and not past `end_date`.

### 17.4 How a phrase finds its subjects (both platforms)

After normalising (lower-case, apostrophes stripped, ~117 lead-ins like "i
feel" peeled), four passes, first hit wins:
1. **Candidate cascade** — the query, then one candidate per lead-in, exact on
   the indexed `emotion` column.
2. **Content-token containment** — a stored emotion whose every content word is
   in the query ("my mum just died" → `my mum died`). Full coverage only; a
   looser rule matched "figured out" to `burnt out`.
3. **Reverse substring** — a stored emotion inside the query.
4. **Forward substring** — a stored emotion containing the query, whole words
   only (so "hope" doesn't find `hopeless`).

A query that is only stopwords retries against a smaller stopword set.
`emotion_mappings`: 701 emotions, 3,531 weighted rows, all 42 subjects, stored
lower-case and apostrophe-free. No fuzzy matching, by choice. Known gaps:
missing noun forms, a few unmatched phrases, typos.

### 17.5 Publishing houses

First-class entities: a homepage shelf with live author counts
(`publisher_healers`), profiles with one book shelf per author (by tier),
favourites (Saved Publishers in My Library). Since `0020` a publisher can be
claimed and has its own dashboard.

**How a publisher looks (since 23 Oct 2026, website; app from build 25):**
- **The logo panel** (`web/components/PublisherLogo.jsx`, shared by the card
  and the page; the app's `PublisherLogo`): whatever the logo — black
  wordmark, pale lilac one, wide banner, square icon — it sits on a white,
  rounded, padded panel, contained and centred, never stretched or cropped.
  White because most logos come on white; it keeps pale and dark logos
  readable on the dark site. On the card the panel is held at 16:9 so a
  logo's own shape never changes the card's height. No logo, or a broken
  one: the publisher's initial on the same panel. Which logo to store is an
  ingestion rule (§18.5: a square or high-contrast one).
- **The card's meta line** is always exactly one line, so cards line up:
  "18 authors · Founded 1984", "1 author", "Founded 1985", or **"Independent
  press"** when there is neither a count nor a year.
- **The page:** the logo panel with the name beside it (stacked and centred
  on a phone), and under the name one row: the tier pill, "Founded YYYY" when
  known, "Visit website →". The description runs full width below, capped
  and scrollable. Then Our Authors, Our Channels, and Published Titles (one
  shelf per author). With no books yet it says **"Their authors are joining
  Spiritpedia soon."**, which goes by itself once a linked author has a book.

### 17.6 Amazon Associates

- Tags are decided in one place per platform (`web/utils/affiliate.js`,
  `app/lib/core/affiliate/amazon.dart`) and **never stored**: each link is
  rebuilt as `https://www.{host}/dp/{ASIN}` and tagged for the store it already
  points at, from `AMAZON_TAG_US` / `_UK` / `_CA` / `_ES` / `_AU` (`_DE` `_FR`
  `_IT` recognised, unset). Website: Vercel variables. App: `app/config/prod.json`
  — **change both** when a tag changes.
- Only the book page's "Buy on Amazon" button is monetised
  (`rel="sponsored noopener noreferrer"`), with a one-line disclosure under it
  and `/affiliate-disclosure` in the footer. No prices shown. Never in email.
- OneLink is configured in the US and UK dashboards (no site code).
- Six book rows have unusable Amazon URLs and show no button (Goodreads URLs in
  `amazon_url` for books 114, 115, 133, 169, 171; a 9-character ASIN on 633).
- **Each account needs three qualifying sales by about 6 April 2027** (our own
  purchases don't count). PA-API (licensed covers and prices) comes after.

### 17.7 Content (measured on live, 8 October 2026)

126 listings (61 Superhero, 48 Luminary, 14 Ascended Master, 3 Local Hero; 116
individual, 9 channel, 1 app at the time) · 2,269 videos · 963 books · 1,103
courses and offerings · 461 free resources · 2 publishers (Hay House, Sounds
True) · 42 subjects · 4,895 sitemap URLs. Target: 5,000 videos and 5,000 books.

### 17.8 The broken-images audit

A daily cron checks the catalogue's 2,890 external image URLs (a seventh of
content images per day, every healer portrait — all three `image_urls` —
daily) and queues failures in `broken_images`, shown in the admin Inbox.
Rules learned from false positives: always send a User-Agent; a 404 is final,
a 403 must fail twice; a 200 with an HTML body is a broken image; vague content
types are judged by their magic bytes; a 202 is a bot challenge (recorded as
undetermined); URLs are dealt round-robin by host. Saving a new URL clears the
row. Video thumbnails (derived from YouTube) and four portraits behind bot
challenges (wim-hof, jason-stephenson, justin-perry, mikao-usui) can't be
audited.

### 17.9 Deliberately unfinished (don't "fix" without knowing why)

- No outreach journey started; journey emails are plain text (their two links
  written out), on purpose.
- Discovery editions are off until `DISCOVERY_EDITIONS=on`; edition 2 onwards
  isn't built.
- The admin search box and bell are rendered but inert.
- No fuzzy matching in emotion search.
- `courses.affiliate_status` is effectively unused, with drifted values.
- `broken_images` counts "undetermined" separately from broken.

### 17.10 Verifying a change

- `web/utils/*.js` are plain ES modules: a `node --input-type=module` script can
  import the real code and run it against a database. Never re-implement the
  pipeline in a harness; compare old and new by importing
  `git show HEAD:file` beside the current file.
- Driving the website's search box in a browser needs real keystrokes (click by
  accessibility ref, type, wait ~2 s); synthetic input events don't update React.
- The search dropdown shows two things: the emotion carousel and universal hits
  under section headers. A non-empty panel doesn't mean the emotion matched.

---

## 18. Content ingestion

When the project owner says **"content ingestion: here's [healer]"**, this is
the routine. One healer at a time, **fast and cheap**: the script does the
mechanical work (images above all, which used to take ~40 minutes a healer
by hand), and the assistant only turns the audit into a plan and handles
what the script couldn't solve. Spend credits on features, not on checking
items one by one.

### 18.1 The assistant's part, every time

1. Save the audit unchanged as `docs/content-audits/<healer-slug>.md` (ask
   for it if it wasn't pasted).
2. Turn it into the plan file `docs/content-audits/<healer-slug>.json` (18.3).
   For a **new healer**, write the healer row from the profile research too:
   bio, subjects, socials, and a **suggested** tier and type (§17.1).
3. Run the script on dev (it changes nothing):
   `node scripts/ingest.mjs docs/content-audits/<healer-slug>.json --env dev`
4. Handle **only** what it lists as UNSOLVED or PROBLEMS. Don't re-check what
   it solved.
5. Insert on dev: the same command with `--insert`.
6. Tell the owner exactly which pages to look at on localhost (the local site
   stays running on dev the whole time: `cd web && npm run dev`). List the
   defaults that were applied, briefly, and the suggested tier and type for a
   new healer. Then **stop** until they say OK.
7. Only after their OK: `--env live --insert` with the same plan. Don't start
   the next healer until they say so.
8. Commit the audit, the plan and the `.inserted.json` logs (`docs/` doesn't
   deploy).

**Batch mode** (the usual way since 23 Oct 2026): the owner sends several
audits at once. Ingest them one after another on dev without stopping, then
give **one** list of pages to check for the whole batch, with the defaults
applied and anything held back. Live only after their OK for the batch.
Keep going without them unless something genuinely needs their decision.

**Speed over perfection.** Make sensible default decisions without asking:
the first good image, the broadest subject dropped when there are more than
3, genuinely different items with the same title both kept, prices shortened
to the site's style (`$24.95 USD`). **Stop only** for what can't be decided:
a subject that doesn't exist, or content that looks harmful. A full
inventory audit against Spiritpedia's standards is a separate, later job.

### 18.2 What the script does (`scripts/ingest.mjs`)

```bash
node scripts/ingest.mjs <plan.json> --env dev               # find images, check, report
node scripts/ingest.mjs <plan.json> --env dev --insert      # the same, then insert
node scripts/ingest.mjs <plan.json> --env dev --rollback    # delete exactly what it inserted
# --verbose lists every item skipped as already in
```

- **Images**, all fetched in parallel, 30 seconds per item, no long-term
  stability checks (the daily broken-images check, §17.8, catches anything
  that breaks later). A good image loads, is an image, and is at least 300 px
  on its longer side. Google thumbnails (`encrypted-tbn0.gstatic.com`) and
  "image links" that are really web pages are replaced.
  - **Books:** the cover built from the ASIN
    (`https://m.media-amazon.com/images/P/{ASIN}.01._SCLZZZZZZZ_.jpg`, the
    publisher's cover, 500 px tall), which also corrects covers an audit got
    wrong; else the audit's cover if good; else the product image on the
    Amazon page (never its share image, which is an Amazon promo banner);
    else Open Library's cover for the ISBN, then by title and author. Kindle
    ASINs (`B0…`) and Indian-published titles often need the later steps.
    `"cover": null` puts a book in without one.
  - **Offerings and free resources:** the page's share image (`og:image`,
    then `twitter:image`), else its first large image, else the page in the
    item's optional `page` field, else the audit's image if good. Then, as
    defaults: the cover of a book in the plan that the title names (a
    teleclass on a book), else the healer's photo. `"image": null` means
    deliberately none.
  - **New healers:** their YouTube channel's picture (nearly always their
    face), else their official site's share image.
  - **Videos:** no image (YouTube supplies the thumbnail); each is confirmed
    still on YouTube (oEmbed), and one that isn't is left out.
  - **An existing healer's photos:** unusable ones (Google thumbnails, dead
    links, too small) are dropped; if none is left, one is found as for a
    new healer.
- **Amazon:** each ASIN is checked on amazon.com; a UK-only edition keeps its
  `amazon.co.uk` link (a default, listed).
- **An existing healer** can be changed through the plan's
  `healer.update` (e.g. `{"booking_url": null, "youtube_url": "…"}`); the
  old values are logged, and `--rollback` puts them back.
- **Defaults it applies, and lists:** more than 3 subjects → the broadest go
  first (`spirituality`, `consciousness`, `spiritual-awakening`, … see
  `BROADEST`); the image fallbacks above.
- **Checks:** every subject exists (unknown → PROBLEM); product and resource
  types; tier, type and the Ascended Master rules for a new healer; and
  duplicates, which are skipped: a video by YouTube id anywhere; a book by
  ASIN anywhere, or another edition of the same title under this healer; an
  offering by link or the same title; a free resource by link; anything an
  owner removed (`content_removals`, §9.5a). A same-titled book under another
  healer is noted and added anyway.
- **Writes back** the images it found and the subjects it trimmed into the
  plan, so the plan records what went in. After the first insert it sets
  `"images_final": true`, which freezes the images: live gets exactly what
  was checked on dev.
- **Inserts** only when nothing is unsolved. Slugs are made unique (the
  title, or the item's own `slug`; `-2`, `-3` on a clash). Each row is logged
  as it goes in `<plan>.<env>.inserted.json`, so a half-finished run is safe
  to run again (what's in is skipped) and `--rollback` deletes exactly the
  logged rows and the healer it created.
- Reads keys from `web/.env.development.local` (dev) or `web/.env.local`
  (live) without printing them, and refuses to run if the file points at the
  wrong project. On dev, a bigint id that collides (dev's id sequences lag
  behind its copied data) is retried with the next free id.

### 18.3 The plan file

```json
{
  "healer": {
    "healer_slug": "napoleon-hill",
    "create": {
      "name": "", "bio": "", "tier": "superhero|luminary|local_hero|ascended_master",
      "entity_type": "individual|channel|app|organisation", "subjects": [],
      "birth_year": null, "death_year": null,
      "website_url": "", "youtube_url": "", "instagram_url": "", "facebook_url": "",
      "twitter_url": "", "tiktok_url": "", "booking_url": "", "contact_email": "",
      "availability": "worldwide|local|local_online", "city": "", "country": "",
      "image_urls": []
    }
  },
  "videos": [{ "title": "", "url": "https://www.youtube.com/watch?v=…", "subjects": [] }],
  "books": [{ "title": "", "slug": "", "author": "", "asin": "…", "store": "amazon.com",
              "goodreads_url": "", "worldofbooks_url": null, "description": "", "subjects": [] }],
  "courses": [{ "title": "", "url": "", "page": "", "description": "", "price": "", "image": "",
                "product_type": "course|retreat|download|membership",
                "start_date": null, "end_date": null, "subjects": [] }],
  "free_resources": [{ "title": "", "url": "", "description": "", "image": "", "featured": false,
                       "resource_type": "practice|download|meditation|workshop|mini_course", "subjects": [] }]
}
```

`create` only for a new healer (leave it out when the healer exists);
`update` only for an existing one (only the fields to change). Any
item may carry its own `slug` (the audit's, usually shorter than the title).
Copy the audit's image links in; the script keeps or replaces them.

### 18.4 The rules

- **At most 3 subjects per item**, each an existing slug in `subjects` (42,
  §17.3), most relevant first. Older rows have more; new rows don't.
- **Amazon links** are stored as `https://www.amazon.com/dp/{ASIN}` (the US
  store is primary). If an audit's ASIN is a UK-only edition, use the US
  edition's ASIN. The tag is added at display, never stored (§17.6).
- **Videos** are stored as `https://www.youtube.com/watch?v={id}`. Videos and
  books link to the healer by `healer_slug`; courses and free resources by
  `healer_id`.
- **Ascended Masters** (`ascended_master`) are people only (`individual`), no
  longer living, with a lifespan (`death_year`, and `birth_year` if known);
  nobody else gets a lifespan. They show in Timeless Teachers.
- **Archive rules** (teachers who have died; what decides how much goes in):
  - **Professional estates** (a foundation or family that runs the work):
    full content.
  - **Institution legacies** (the teaching lives on through an institution):
    link to the institution.
  - **Public-domain teachers:** fully free (free resources, not paid
    offerings).
  - **No-estate figures:** maximum curation discipline; only what is clearly
    genuine and well sourced.
  - **Alan Watts, Ram Dass and Thich Nhat Hanh: official channels only.**
    AI voice clones of them are everywhere on YouTube.
- **Homeopathy content rules** (every homeopathy ingestion; list what was
  excluded):
  - Exclude any item whose title or description names a disease or
    condition it claims to treat or cure (cancer, COVID, autism, asthma,
    arthritis, allergies, skin, pain…), and anything about vaccines.
  - Exclude courses or material that argue against conventional medicine or
    tell people to stop medical treatment (e.g. "Antibiotic Alternatives",
    "Drug-Free Family").
  - Exclude sponsored or brand videos (Boiron or other remedy makers).
  - Prefer philosophy, history, case-taking, education and practice
    material.
  - Where a person's own website is mainly a shop, link to their About page
    instead (website and booking links).
  - Bios too: no list of conditions homeopathy treated, no "PhD in cancer
    management"-style lines.
  - If very little of a homeopath passes, say so and hold them back.
  - Homeopathy pages carry the note **"Complementary to, not a replacement
    for, medical care."** In search results (since the start), and since
    23 Oct 2026 on the homeopathy subject page and on the profile of every
    teacher with the homeopathy subject, website and app
    (`web/utils/medicalNote.js`, `app/lib/core/safety/medical_note.dart`; the
    wording comes from `web/shared/emotion-safety.json`).
- Courses: `affiliate_status` `none`; free resources: `is_featured` only when
  the plan says `featured: true`. `is_active` keeps its default (true). A
  dated offering gets `start_date`/`end_date` so it drops off when it's over.

### 18.5 Publishing house ingestion

When the owner sends a **publisher record** (a publishing house, not a
healer): save it as `docs/content-audits/<publisher-slug>.md`, write the plan
`docs/content-audits/<publisher-slug>.json`, run the same script, insert on
dev, give the pages to check, stop. Live after their OK, as for healers.

```json
{
  "publisher": {
    "slug": "awaken-village-press", "name": "", "description": "",
    "website_url": "", "logo_url": "", "founded_year": null,
    "tier": "superhero|luminary|local_hero", "subjects": [], "contact_email": null,
    "authors": [{ "name": "", "healer_slug": "existing-slug or null", "note": "their book(s), where found" }]
  }
}
```

- **The publisher row** (`publishers`): name, slug, the record's bio as the
  description, website, logo, founding year (null when unpublished), subjects
  and tier. Publishers have no social-link columns. **Suggest** the tier
  (shown as Superstar / Shining Star / Rising Star, §17.1) for the owner to
  confirm; small independent presses are usually Rising Star (`local_hero`).
- **The logo:** prefer a **square or high-contrast logo** over a wide, pale
  banner. The script tries the site's app icon and largest favicon first
  (at least 150 px, roughly square; Wix images are asked for at 600 px), and
  only then the share image; if neither is usable it says so. Failing that,
  use the social profile picture or the press's own logo file by hand.
  Whatever the logo, the card and the page show it the same way: on a white,
  rounded, padded panel, contained and centred, never stretched
  (`web/components/PublisherLogo.jsx`; the app's `PublisherLogo` in
  `shared/widgets/cards.dart`). The card's meta line always has one line
  ("18 authors · Founded 1984", or "Independent press"), and a publisher
  with no books yet says "Their authors are joining Spiritpedia soon."
- **Authors:** find the press's authors from its own site (books, projects,
  testimonials) and catalogues (Bookshop.org blocks scripts and shows a bot
  check in the browser: don't try to get past it). For each, look for an
  existing healer; give the ones who exist their `healer_slug`, and the script
  links them (`publisher_healers`). Everyone else is listed as **not on
  Spiritpedia yet**, with their book: that list goes to the owner (each is a
  possible new healer, and the outreach starts there). A name the owner asks
  about that can't be found anywhere is reported as such, never guessed.
- `--rollback` deletes the links and the publisher it created.

### 18.6 Done so far

| Healer | Dev | Live |
| :--- | :--- | :--- |
| Neale Donald Walsch (existing) | 23 Oct 2026: 19 videos, 20 books, 14 offerings, 2 free resources | 23 Oct 2026, the same |
| Napoleon Hill (existing, Ascended Master) | 23 Oct 2026: 20 videos, 21 books, 7 offerings, 20 free resources; booking link removed, YouTube added, Google-thumbnail photo dropped. The 5 Napoleon Hill Institute offerings kept out (owner's decision) | 23 Oct 2026, the same |
| Samuel Hahnemann (new, Ascended Master) | 23 Oct 2026: 3 videos, 9 books, 19 free resources, no paid offerings (public domain: fully free). Left out: the Latin-only Fragmenta book, the weak 4th video, the third-party Organon text | 23 Oct 2026, the same |
| Homeopaths batch 1 (all new, `homeopaths-batch-1.md`): George Vithoulkas, Dr. Rajan Sankaran, Dr. Farokh J. Master, Joette Calabrese, Dana Ullman | 23 Oct 2026, under the homeopathy rules: 79 videos, 44 books, 29 offerings, 20 free resources | 23 Oct 2026, the same (all Luminary, confirmed) |
| Awaken Village Press (new publisher, §18.5) | 23 Oct 2026: the publisher (Rising Star, logo: their lotus icon), no authors linked (none on Spiritpedia yet; 10 listed as missing) | 23 Oct 2026, the same |
| Amanda Johnson (new, Rising Star; Awaken Village Press's founder, linked to the press) | 24 Oct 2026: 12 videos, 2 books, 2 offerings. Dropped 4 publishing-industry videos; held back the "Dear Human Child" launch video for its author; "Unbroken" launch moved to Gabriella Cacciatore | 24 Oct 2026, the same |
| Awaken Village Press authors batch 2 (new, Rising Star, linked to the press): Amron Bevels, Gabriella Cacciatore | 24 Oct 2026: Amron 17 videos, 2 books, 11 offerings (images from her store page; 3 Money Matrix sales videos and her 1:1 services held back); Gabriella 1 video (her book launch), 1 book, 1 offering (her own channel's 2 videos and her 1:1 coaching left out) | |

Made with love in Tavira 💫
