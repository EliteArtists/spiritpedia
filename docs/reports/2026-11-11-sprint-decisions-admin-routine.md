# Sprint decisions applied, admin assessment, nearest-first, and the daily routine (11 Nov 2026)

## 1. The big sprint is live

**160 new listings are on live**, with no errors:
- the 157 from the sprint;
- Belur Math;
- Bodhi Be (on dev since 10 Nov, with his channel photo);
- Barbara Süss.

40 teacher links went in with them. **Live now has 1,275 listings.**

- **One item left out:** Peggy Rowe Ward's Blessing Bowl session, because it is today. It stays on dev until it expires.
- **Checked on the live site:** Plum Village, Belur Math, Barbara Süss, CYI Paris and Bodhi Be all load.

**Your decisions, applied:**
- **Belur Math:** its photo is now its YouTube avatar, read through the API. Its two free resources use the same image, so the ingest never opens belurmath.org (which allows one request every 10 minutes). It's on dev and live.
- **Out:** 14 held plans are filed in `docs/content-audits/night-sprint-2026-11-09/dropped/`, each with your reason. None had ever been inserted.
  - NgalSo, FPMT, J. Brown, Bruce Taylor, Angela Shelby, Julie E. Brent, Daneshe, Choe Khor Sum Ling, YOGAJI Köln and Canmore.
  - The Cloudflare-only plans: Vedanta Brasil, Vairocana Zen, Arsha Vidya Gurukulam and Iyengar Hamburg. CYI La Rochelle was never a plan; it stays a skip.
- **Retry another day:** Orléans and Shakti Shala stay held and are on the README retry list (§18.7), with La Sarmiento and Bakara Wintner.
- **Lion's Roar:** out. It's in the README queue as "out unless a contact form appears".
- **Overlaps:** all kept, as listed. The Dalai Lama is not linked to Tushita Delhi.
- **Channels added on dev and live:** ISHTA Yoga to Alan Finger (@ishtayoga9), Yoga Farm Ithaca to Jeannie O'Neill (@yogafarmithaca475) and Leela to Eli Jaxon-Bear (@leelafoundation).
- **Tiers on stature: Luminary.**
  - Judith Hanson Lasater, Satish Kumar, Tricycle, Mindful, Udbodhan and Arsha Vidya Paramparā. Each plan records the reason, and they went to live as Luminary.
  - The Institute of Noetic Sciences, on dev and live. The tier log records it.
- **Section 20:** everything stays as it was.
- **Buddhist Geeks:** researched from buddhistgeeks.org, and **held**. Its pages publish no email and no contact form, only Substack subscribe links, which weren't followed.
  - The helper also left out 7 political videos ("Trump as Imperial Policy Returned", "Is the Insight Tradition Complicit in Genocide?" and others). Politics comes up often in 2025–26.
  - It could go in if a contact route turns up and you judge the politics acceptable.
- **Barbara Süss** (Mysore Vienna): on dev and live. She has a published email and three named photos from her own site. It's a short listing: one offering for the classes page, one for workshops ("Contact for pricing") and a practice guide.
- **Megan Riley** (Utrecht): **held.** Her only usable photo isn't named on her site. It's very likely her, but your condition was a usable photo of her. Please confirm it, or she can send one.
- **Heidi Priebe:** no change.
- **Recording artists who teach:** now in the brief and the queue.
- **Parked:** Omega's "unsure" names and Sounds True, in README §18.7 alongside Quantum-Touch. Channels and lineage lists come first in the queue and the brief.
- **Item links:** the rule is in README §18.4 and the brief: never a made-up #fragment. The proposal is in section 4.
- **Migration 0043** is written: `supabase/migrations/0043_place_aliases_big_content_sprint.sql`.
  - It adds 22 aliases: your 18 places, minus Scheveningen, Batesville and Waldbröl (they already resolve). Add Cedar Crest, Redwood Valley, McLeod Ganj and Pine Bush (also unplaced), Sussex County DE (an older listing), and plain spellings for two accented names.
  - **Salmon, Idaho is left out:** the nearest town of 5,000+ in Idaho is 187 km away.
  - **Run it on dev, then live.** On dev today the check row should read about **125, 824, 1** (the 1 is Salmon). Live's town counts will be higher by the new listings. The backfill covers listings inserted before you run it.

## 2. Schools and organisations nearest first

- **Website (live, 23338c8).**
  - **What changed:** once a visitor sets an area, Schools & Academies and Retreat Centres & Platforms sort nearest first, by the same rule as Practitioners Near You. Nobody is hidden, and listings with no town go last. With no area, the order is as before.
  - **Weight:** only the fields the cards need go to the browser.
  - **Checks:** in Chrome on the local site with the area set to Paris, Schools opened with CYI Paris, then Antwerp, Nantes and Clermont-Ferrand. There were no console errors, and all 183 web tests pass.
- **App, on `release/1.0.2` (4d7e072, local).** The same rule, with a new test. All 370 app tests pass.
  - The app's own Near You still filters (it shows people within 50 km plus online ones). The website's fix for that is already queued for 1.0.2 (README §18.7) and isn't done yet.

## 3. Admin dashboard assessment (report only; nothing changed)

**In short:** the admin never asks what kind a listing is. Totals, the directory, claims and email journeys are either for people only or lump every kind together. Each finding below was checked in the code; the two marked "inferred" weren't.

**Most important, in order:**
1. **Email journeys: only individuals can be started.**
   - Channels, apps, organisations and schools are refused in three places (`web/utils/journey.js:43-47`, the start route and the Outreach card).
   - All eight emails are written to one person, and the greeting would say "Hi White," to White Tiger Qigong.
   - There's no list of journeys, only one per listing record. Stopped and claimed journeys disappear from the card.
   - "Opened" can't be tracked, because the emails are plain text by design. Delivered, bounced and clicked could be tracked with a Resend webhook (a migration). "Replied" isn't recorded; a manual "Mark replied" button is the quick fix.
   - Publishers can't have a journey at all, because the journey table points at listings.
   - **Your decision needed:** the wording for each kind (you and the solicitor), click tracking, and whether publishers are in scope.
2. **Totals aren't split by kind.**
   - "Healers" counts every kind together, and only Schools has its own count. The Activity page's totals leave schools out.
   - "New this week" is just Healers, Books and Users.
   - Teacher links aren't counted anywhere.
   - **Bug:** the "Claim requests" card shows the number of claimed listings, not pending requests (`AdminLiveTabs.jsx:411-415`).
3. **Directory and People.**
   - The Content directory doesn't load the kind at all: there's no kind column or filter, so "No email" can't be narrowed by kind.
   - Tier badges always use the people names, so an organisation reads "Superhero" instead of "Superstar".
   - Publishers aren't listed anywhere in the admin.
   - People has only Practitioners and Explorers tabs, and badges every owner "Practitioner".
4. **Claims.**
   - The Claims page counts only listing claims. Its publisher section is a hard-coded "No publisher claims yet", though publisher claims do happen. "Revoke Claim" does nothing.
   - A school's claim request reads "Practitioner" in the Inbox. A school owner's account type reads "Practitioner" on the website and in the app; the app half has to wait for 1.0.2.
   - Applicants can't choose "A school" at sign-up.
   - Reviews, reported reviews, owner submissions and closed accounts already work for every kind.
5. **Things you can't see at all.**
   - **Plans:** held plans (63 files carry a hold), plans on dev but not live, the retry list and sprint history exist only in the repo. The live site can't read the repo (inferred), so this needs a sync script and a new table (a migration), shown on an admin "Ops" page.
   - **Broken images:** they do reach the Inbox, but publisher logos are never checked, and a school's logo is labelled "Profile Photo".
   - **Sends:** push shows last week's counts only, and email sends aren't listed anywhere.
   - **Amazon clicks:** there's no click tracking at all. A "buy" event needs a migration, plus changes on the website and in the app (1.0.2).
6. **Smaller things.**
   - The Ingestion form can't create a School, and its tier list always uses the people names.
   - App search counts schools as teachers (an app fix for 1.0.2).

**Suggested order:**
1. Quick website-only fixes (all small): the claim-count bug, counts by kind and teacher links, the directory kind filter and tier names, the school labels, the Ingestion form, and the greeting and kind checks in the journey code.
2. Monitoring pages: an Outreach page listing every journey with its history, Claims rebuilt for every kind including publishers, and a Publishers directory.
3. One sync that puts held plans, dev-only plans, the retry list and sprint reports into the admin (one migration).
4. Your decisions first: journey wording per kind, Resend tracking, Amazon click events.

<details><summary>The full assessment: every gap with file:line evidence, the fix, its size and whether the app is involved</summary>


Scope: `web/app/admin/**`, `web/components/admin/**`, `web/app/api/admin/**`, the crons and utils they use, migrations 0000–0042, README §9.4–9.9, §17.1, §17.2, §17.8, §17.11, §18.6, and the open-jobs list. Nothing was changed, run or queried.

**Facts that frame everything below**
- `healers.entity_type` allows `individual` (NULL counts as individual), `channel`, `app`, `organisation`, `school` (constraint in `supabase/migrations/0029_schools.sql:22-26`; `web/utils/listings.js:38`). **Publishers are not an entity_type.** They have their own `publishers` table, and a publisher account is linked through `user_profiles.linked_publisher_id`.
- Teacher links live in **`hub_teachers`** (`hub_id`, `teacher_id`, `role` founder/instructor, `created_at`). It was created as `school_teachers` in 0029 and renamed in `0030_hub_teachers.sql`. The only hubs are schools and organisations (`isHub`, `listings.js`).
- Tags: **[V]** means I verified it in code. **[I]** means I inferred it and it should be checked.

---

## 1. Email journeys (outreach C1–C8): the biggest gap

| # | Gap | Evidence | Fix | Size | App? |
|---|---|---|---|---|---|
| 1.1 | **[V] Only individuals can be started.** Channels, apps, organisations and schools are refused at three layers. | `web/utils/journey.js:43-47` (`outreachAllowedFor` = `!entityType \|\| 'individual'`); `web/app/api/admin/journey/start/route.js:33-38` (400 `not_an_individual`); Outreach card `web/app/admin/content/[healer_slug]/page.js:767-768` ("…Channels, apps and organisations get their own versions later", with schools not even named) | Make `outreachAllowedFor` return a template set per kind. Pick the template by `entity_type` in `sendJourneyEmail` (`web/utils/email.js:240-330`) and in the start route. | M for code, but **copy is the blocker** (see 1.2) | Website only |
| 1.2 | **[V] All eight emails are written for one person.** For example "interview you about what you do and the people you help", "book a session", "discover a practitioner". | `web/utils/emailTemplates.js:154-256` (`OUTREACH`, e.g. lines 172, 190-191, 212) | Write approved C1–C8 versions for each kind (or one platform/hub set). They go in `docs/email-copy-2026-10-21.md` and `emailTemplates.js` together, word for word (README §9.7). The solicitor's cold-email check also still applies (§9.8). | M–L (owner + solicitor) | Website only |
| 1.3 | **[V] The greeting would be wrong for non-people.** `practitionerFirstName` takes the first word of the listing name, so "White Tiger Qigong" gives "Hi White,". | `emailTemplates.js:156-163`; called in `email.js:302` | For any kind other than individual, pass `firstName: ''`, which makes the greeting "Hello,". | S | Website only |
| 1.4 | **[V] There is no list of journeys anywhere.** The admin can only see one journey at a time, by opening that listing's record. | Only routes: `api/admin/journey/start` and `api/admin/journey/[healer_slug]` (GET/PATCH). No list route. | Add an `/admin/outreach` page and a GET route. It should list every `healer_journeys` row joined to `healers(name, entity_type)`, filter by kind and status, and show next due, last sent and stop reason. | M | Website only |
| 1.5 | **[V] Finished or stopped journeys vanish, including claimed ones.** The card only returns the live journey. `stop_reason = 'claimed'` is recorded but never shown. | `api/admin/journey/[healer_slug]/route.js:9-20` (`.neq('status','stopped')`); cron sets `claimed` (`web/app/api/cron/journey-emails/route.js` ~line 67) | Return the history too, and show it on the card and on the new list (1.4). | S | Website only |
| 1.6 | **[V] "Opened" is not tracked and can't be.** There is no Resend webhook route, and no `opened`/`delivered` columns. The journey emails are deliberately plain text (README §9.8, §17.9), so an open pixel isn't possible. | No webhook route under `web/app/api/`; `healer_journeys` columns are only `email_n_sent_at` (`0009_healer_journeys.sql`, `0025`) | Practical option: Resend webhooks for **delivered / bounced / clicked**. Click tracking rewrites links, so the owner must decide that first. This means a new `/api/email/webhook` route and a new `email_events` table (migration, dev then live). | M | Website only |
| 1.7 | **[V] "Replied" is not tracked.** Replies land in the love@ mailbox, and nothing records them. | No `replied` anywhere (searched `app`, `utils`, `components`) | Start with a manual "Mark replied" button and a note on the journey. That needs a `replied_at` column (migration). Later, Resend inbound parsing could fill it automatically. | S manual / L automatic | Website only |
| 1.8 | **[V] Publishers can't have a journey at all.** `healer_journeys.healer_slug` is a foreign key to `healers`. | `0009_healer_journeys.sql` (`REFERENCES public.healers(healer_slug)`) | Either add a nullable `publisher_id` column (migration) or decide publishers are out of scope. | M | Website only |
| 1.9 | **[V] The cron never re-checks the kind.** A listing changed to School mid-journey keeps getting the person emails. | `cron/journey-emails/route.js` selects only `name, healer_slug, contact_email` (~line 54) | Select `entity_type` too, and stop the journey with `not_an_individual` once copy per kind exists. | S | Website only |
| 1.10 | **[V] A listing with only a contact form can't be reached.** The journey needs `contact_email`, and the "No email: contact form only" listings have no route forward. | start route `:40-45`; `contact_form_url` (0039) | Not a code fix. Record these as a manual-contact list, possibly as a "contacted via form" journey state. | S | Website only |

**Context [V]:** `JOURNEY_TEST_EMAIL` is still set and no real journey has ever started (README §9.8). So for now this section describes what will be missing, not anything that is going wrong.

---

## 2. Platform totals and "New this week"

| # | Gap | Evidence | Fix | Size | App? |
|---|---|---|---|---|---|
| 2.1 | **[V] Totals aren't split by kind.** "Healers" counts every `healers` row: people, channels, apps, organisations and schools together. Only schools have their own count. | `web/app/api/admin/overview/route.js:26-37`; strip `web/components/admin/StatStrip.jsx:10-19` | Count per `entity_type` (individual including NULL, channel, app, organisation, school). Either five head counts or one paged `select('entity_type, created_at')`. Relabel "Healers" to "Individuals" and add Channels, Apps, Organisations. | S | Website only |
| 2.2 | **[V] The "In the database" totals on Activity don't show schools either.** | `web/components/admin/AdminLiveTabs.jsx:372-377` (used by `app/admin/activity/page.js:226`) | Same counts as 2.1. | S | Website only |
| 2.3 | **[V] "New this week" has only Healers added (all kinds lumped), Books added and Users.** There's nothing for videos, offerings, free resources, publishers or kinds. | `overview/route.js:39-45`; `AdminLiveTabs.jsx:425-435` | Add counts this week per kind, plus videos, courses, free_resources, publishers and teacher links. | S | Website only |
| 2.4 | **[V] Teacher links aren't counted anywhere.** No total, no "this week", no hubs-without-teachers. | `hub_teachers` is never read in `overview/route.js`. It only appears in `components/admin/HubTeachers.jsx` (one hub's list on its record). | Count the total and this week's links from `hub_teachers.created_at`. Optionally add "hubs with 0 teachers" and "teachers on N hubs". | S | Website only |
| 2.5 | **[V] Bug: the "Claim requests" card shows claimed listings, not pending requests.** | `AdminLiveTabs.jsx:411-415` uses `c.claims`, which is the count of `linked_healer_slug` (`overview:188`). The pending count is `c.claim_requests` (`overview:194`). | Use `c.claim_requests`. | S | Website only |
| 2.6 | **[V] "Practitioners awaiting review" counts every pending applicant of any kind.** The applicant's kind is only `described_as` until approval. | `overview:185-187`; `AdminLiveTabs.jsx:407` | Rename it "Applications awaiting review". Optionally split it by `described_as`. | S | Website only |

---

## 3. People and the Content directory: filters by kind

| # | Gap | Evidence | Fix | Size | App? |
|---|---|---|---|---|---|
| 3.1 | **[V] The Content directory has no kind column or kind filter.** It doesn't even select `entity_type`. | `web/app/admin/content/page.js:30` (COLUMNS); filters `:46-59`, `:154-175` | Add `entity_type` to COLUMNS, a "Kind" select (Any / Individual / Channel / App / Organisation / School), and a kind badge on each row. | S | Website only |
| 3.2 | **[V] The "No email" filter can't be narrowed by kind.** It works on every row but can't be combined with a kind, because 3.1 doesn't exist. | `content/page.js:52-68, 167-170` | Comes free with 3.1. | S | Website only |
| 3.3 | **[V] Directory tier badges always use the people names.** An organisation shows "Superhero", not "Superstar". | `content/page.js:32-37, 281-284` | Use `tierName(tier, entity_type)` from `utils/badges.js:48`, as the record editor already does (`[healer_slug]/page.js:1271`). | S | Website only |
| 3.4 | **[V] Publishers aren't in the directory at all.** No page in the admin lists the `publishers` table. They only appear in the Inbox reviewer's dropdown and in Ingestion. | `grep from('publishers')` finds only `QueueReviewer.jsx` and `ContentIngestion.jsx` | Add a Publishers tab to Content (name, tier, claimed, contact, authors count). | M | Website only |
| 3.5 | **[V] The directory shows no journey state or teacher count.** | `content/page.js` rows | Add "On journey / stopped (reason)" and, for hubs, "N teachers". Both are cheap with one extra query each. | S–M | Website only |
| 3.6 | **[V] People has only Practitioners and Explorers tabs, and no kind filter.** Every owner is badged "Practitioner". Search doesn't cover the listing's name. | `web/app/admin/people/page.js:17-20, 52-65, 176-181` | Badge with `accountTypeLabel` (`utils/accountType.js`) using the linked listing's kind. Add a Kind filter on the Practitioners tab. That needs `entity_type` for linked listings, so the overview has to embed `healers(entity_type)` or look it up. | S–M | Website only |
| 3.7 | **[V] The header text is practitioner-era.** "healer records", "Back to Healer Directory", "This healer has claimed…". | `content/page.js:183, 253`; `[healer_slug]/page.js:764, 770, 776, 871, 1619` | Use "listings" and "this listing". | S | Website only |

---

## 4. Claims, applications, reviews, pending items

| # | Gap | Evidence | Fix | Size | App? |
|---|---|---|---|---|---|
| 4.1 | **[V] The Claims page lists only healer claims, shows no kind, and has a fake publisher section.** "Publisher claim requests: No publisher claims yet" is a hard-coded placeholder, but publisher claims really happen (`linked_publisher_id`). "Revoke Claim" does nothing. | `AdminLiveTabs.jsx:279-345` (`filter(p => p.linked_healer_slug)` at :281; placeholder :333-343; inert button :318-325); claim route handles publishers `api/admin/claim-request/route.js:164-194` | Rebuild Claims from `user_profiles` with `linked_healer_slug OR linked_publisher_id`, joined to the listing (name, kind, tier), with a Kind filter. Remove the placeholder. Either build revoke or remove the button. | M | Website only |
| 4.2 | **[V] The overview's claim count misses publisher claims.** | `overview/route.js:188` | Count `linked_healer_slug \|\| linked_publisher_id`. Split it by kind. | S | Website only |
| 4.3 | **[V] Inbox claim requests for a school are labelled "Practitioner".** | `web/components/admin/queue.js:197-202` (`LISTING_WORDS` has no `school`), used at `:421` | Add `school: 'School'`. Better: share one map with `utils/accountType.js` and `utils/badges.js`. | S | Website only |
| 4.4 | **[V] A school owner's "Account type" reads "Practitioner" on both platforms.** | Web `web/utils/accountType.js:6-11`; app `app/lib/features/account/account_service.dart:54-59` | Add `school → 'School'` on both. | S | **Website and app** (the app fix waits for 1.0.2) |
| 4.5 | **[V] Applicants can't say "A school", so it is never pre-filled in the Inbox.** | `web/utils/listings.js:13-21` (`DESCRIBED_AS_OPTIONS`), `:41-49` (`SUGGESTED`). The `described_as` check constraint is in 0020. | Add `school`. This needs a migration if the 0020 constraint lists the values (I didn't open that constraint). The sign-up forms on web and app would show it too. | S–M | Website, and app if the app has its own sign-up list [I] |
| 4.6 | **[V] The person record is practitioner-shaped.** People tier names are used for every kind. The badge reads "Practitioner"/"Explorer", not the account type. A publisher-linked account shows no listing at all. | `web/components/admin/PersonRecord.jsx:17-22, 638, 643`; `web/app/api/admin/person/route.js:40-62` (only `linked_healer_slug`) | Use `tierName` and `accountTypeLabel`. Load the publisher when `linked_publisher_id` is set. | S–M | Website only |
| 4.7 | **[V] Reviews and reported reviews work for every kind.** They are attached to content items (book, video, course, free_resource), never to a listing kind, and their emails use neutral `getContentMeta`. **No gap.** One small issue: neither page shows which listing, or what kind, owns the item. | `app/admin/reviews/page.js:31-39`; `app/admin/flags/page.js:37-42`; `utils/contentMeta.js` | Optional: show the owning listing and its kind. | S | Website only |
| 4.8 | **[V] Content from owners (submissions) and closed accounts already handle healers of any kind and publishers. No gap.** | `api/admin/submissions/route.js:46`; `overview:117-121, 147-151` | n/a | n/a | n/a |

---

## 5. Things the owner can't see at all

| # | Gap | Evidence | Fix | Size | App? |
|---|---|---|---|---|---|
| 5.1 | **[V] Held plans are invisible.** I counted **63 plan files with `sprint.held`** among about 1,482 plan JSONs in `docs/content-audits/` (count excludes `*.inserted.json`). Examples: `aaravindha-himadra.json`, `ally-bogard.json`, `arava-spiritual-center.json`. | Repo files only. Nothing in `web/` reads `docs/`. | **[I]** The deployed site (Vercel, `web/` root) can't read `../docs` at runtime. Options: (a) a script (`scripts/ops-sync.mjs`) that upserts held items, the retry list and sprint summaries into an `ops_items` table (migration, dev then live), shown on `/admin/ops`. (b) A generated `web/data/ops.json` committed with each sprint, which shows after the next deploy. (a) is better because it doesn't need a deploy. | M | Website only |
| 5.2 | **[V] Plans on dev but not on live are invisible.** **[I]** About 181 plans have a `.dev.inserted.json` but no `.live.inserted.json` marker. Some may be intentional, for example Quantum-Touch being parked. | `docs/content-audits/*.dev.inserted.json` vs `*.live.inserted.json` | Same sync as 5.1, with a "dev only" list. | M (with 5.1) | Website only |
| 5.3 | **[V] The retry-another-day list lives only in the README.** | `README.md:3113-3116` (Open jobs item 7), plus "Waiting" item 8 (`:3117-3119`) | Same sync as 5.1, or a small admin-editable list (`admin_tasks` table). | S–M | Website only |
| 5.4 | **[V] Sprint history is only in README §18.6 (`README.md:2903+`) and `docs/reports/` (33 files, `latest.md`).** | No admin page | Same sync as 5.1: one row per report (date, job, counts). Or render `docs/reports/latest.md` at build time. | S–M | Website only |
| 5.5 | **[V] Broken images *are* visible.** The daily cron `web/app/api/cron/broken-images/route.js` writes `broken_images`. The overview reads rows with `failures >= MIN_FAILURES` (`overview:99-111`), and `queue.js` turns them into Inbox items with a status line. **Gaps:** (a) **publisher logos (`publishers.logo_url`) are never checked**, because sources are only healers, books, courses, free_resources and videos (`utils/brokenImages.js:33-65`); (b) a school's or organisation's logo is labelled "Profile Photo" and the row doesn't show the listing's kind (`brokenImages.js:80-86`); (c) there's no dismiss, which is by design (§17.8). | as cited | Add a `publishers` source (`logo_url`, key `slug`). This needs `broken_images` to accept a publisher row: check whether `healer_slug` / `record_id` fit [I]. Label by kind. | S–M | Website only |
| 5.6 | **[V] Push sends: last week's counts by kind only, no per-send log.** | `web/app/api/admin/push-compose/route.js:29-30`; `components/admin/PushComposer.jsx:10` | Add a recent `push_sends` list (time, kind, status, without the person, matching the "totals only" rule) and failures. | S | Website only. The app writes the data already [I]. |
| 5.7 | **[V] Email sends aren't listed anywhere.** `email_sends` (B1, B2, D1, ownership check and others) is read only for the D6 timestamp in the Inbox (`overview:166-174`). The discovery-edition log exists per explorer only. Journey sends show per listing only (1.4). | as cited | Add an "Emails" page: counts by `kind` per day and recent failures. Resend events would come from 1.6. | S–M | Website only |
| 5.8 | **[V] There is no Amazon click tracking at all.** The activity kinds are `open, watch, save, unsave, share, review, pill, filter, search`, enforced both in `web/utils/activityGuard.js:15-16` and in the DB function (`0021_activity_learning.sql:220-221`). The website's "Buy on Amazon" is a plain `<a>` with no event (`web/app/books/[slug]/page.js:160-167`). The app's button doesn't log either (`app/lib/features/detail/book_screen.dart:166`). | as cited | Add a `buy` kind: migration to `log_activity`'s `c_kinds` / `c_content_kinds` (dev then live), `activityGuard.js`, an `onClick` on the website button, the app's `activityLogProvider` on the app button, and "Most bought-clicked" on Activity. Totals only, as Activity's rules already require. Until then, the Associates dashboard is the only source. | M | **Website and app** (app in 1.0.2 at the earliest) |
| 5.9 | **[V] Messages, Mailshots and Settings are 13-line placeholders.** The Inbox "Messages" filter is disabled. | `app/admin/{messages,mailshots,settings}/page.js`; `queue.js` (`message.live: false`) | Known (README §9.4). Listed for completeness. | n/a | Website only |

---

## 6. Other practitioner-only details

| # | Gap | Evidence | Fix | Size | App? |
|---|---|---|---|---|---|
| 6.1 | **[V] The Ingestion form can't create a School.** Its tier dropdown always shows people names (Superhero, Ascended Master…), even for channels and organisations, and it offers Ascended Master for a channel. The publisher section already uses `tierOptions`. | `web/components/admin/ContentIngestion.jsx:153, 1281-1290` (type: no school; "Organisation (network, school or community)"), `:1346-1356` (tiers) | Use `ENTITY_TYPES` / `LISTING_TYPES` from `utils/listings.js` and `tierOptions(entityType)` from `utils/badges.js`. Show a Founded field when the kind is school. | S | Website only |
| 6.2 | **[V] Dead code that looks live.** `PractitionersTab` / `AccountsTab` in `AdminLiveTabs.jsx` are dead (README §9.4). `StatsTab` and `ClaimsTab` from the same file are still used and carry the issues in 2.2, 2.5 and 4.1. | `AdminLiveTabs.jsx` | Delete the dead tabs. Move the two live ones into their pages. | S | Website only |
| 6.3 | **[V] The overview reads at most 1,000 auth users.** Above that, emails show as missing and "Users" undercounts. Not urgent at today's size. | `overview/route.js:157` (`perPage: 1000`, one page) | Page through `listUsers`. | S | Website only |
| 6.4 | **[V] `docs/admin-guide.md` doesn't mention schools or hubs.** | grep finds no "school" | Update it along with the README §17.11 admin line. | S | Docs |
| 6.5 | **[V] (Outside the admin) App search counts schools as teachers.** `platform()` in the search-count helper omits `school`, while `models.dart:142` `isPlatform` includes it. | `app/lib/features/search/content_search.dart:379-382` | Use `isPlatform` / add `school`. | S | **App only** (1.0.2) |

---

## Suggested order
1. Quick website wins (all S): 2.5 bug, 2.1–2.4 counts per kind and teacher links, 3.1–3.3 directory kind filter and tier names, 4.3, 4.4 (web half), 6.1, 1.3, 1.9.
2. Monitoring pages (M): the outreach list with history (1.4, 1.5), Claims rebuilt for every kind including publishers (4.1, 4.2), a Publishers directory (3.4).
3. Repo-only knowledge in the admin (M): one `ops_items` sync for held plans, dev-only plans, the retry list and sprint reports (5.1–5.4). Needs a migration (dev then live).
4. Owner and solicitor decisions first: journey copy per kind (1.2), Resend webhooks and click tracking (1.6), reply marking (1.7), Amazon `buy` events (5.8, web and app).


</details>

## 4. Proposal: keeping items unique without made-up #fragments

**Today:**
- An offering's link must be unique per listing (`courses_url_healer_unique`, migration 0031), and a free resource's link must be unique across the whole table (`free_resources_url_unique`).
- So when one page sells several things, helpers invented #fragments: five Florence Scovel Shinn audiobooks on one Audible author page, and Jikiden Reiki's seminar page split into "#repeat" and "#instructor".
- Live has **24 offerings and 11 free resources** with a fragment in the link. Some may be real anchors on their page.

**Proposal (recommended):**
1. **Migration (dev, then live):** make offerings unique on listing + link + title, and free resources on link + title, instead of the link alone. Two different things on one real page can then both be listed, with the page's real link. The same thing can't go in twice.
2. **Ingest:** the duplicate check uses the same key (link and title), so plans never need a fragment.
3. **Cleanup:** a one-off script lists the 35 rows. Where the fragment isn't a real anchor on the page, it strips it, or uses the item's own page when one exists (an Audible title page, for example). It writes a before-and-after log, like the image fixes. Report first, then apply on your OK.
4. **Already in the rules (README §18.4 and the brief):** no made-up fragments; until the migration, the second item is left out and noted.

The alternative is a separate `item_key` column. It's more flexible but adds a field every plan has to fill, so I'd go with link + title.

## 5. The daily routine

**README §20** now holds the standing routine:
- **Night:** the content sprint runs from the §18.7 queue, aiming for 100+. Clean listings go to dev, then live at the end; held ones wait for you.
- **Morning:** first, fix the broken images in the admin Inbox (§19) and report. Then your decisions on the night's report.
- **Day:** whatever we're building.

**Starting the night sprint:** say **"Start the night sprint"**, or type `/night-sprint`.
- **The steps** are in `.claude/skills/night-sprint/SKILL.md`, in the repo.
- **The helper prompt:** the standing prompt `docs/content-audits/night-sprint-2026-11-09/HELPER-PROMPT.md` now lives in the repo, so a new session doesn't depend on files from this one.
- **The names list** for duplicate checks comes from `scripts/dev-names.mjs`.

**Next steps: your own jobs** is the first section of the README, with dates:
- Google Play: listing and screenshots (11 Nov); apply for production (12 Nov); build 28 once access is granted. Outreach waits until the app is in both stores.
- App 1.0.2.
- Amazon Associates: payment, W-8BEN-E and the app store links; PA-API covers once eligible.
- World of Books.
- EU DSA trader status, before 1 Feb 2027.
- The Shift Network referral programme and the Insight Timer email.
- Owner photos: Ally Bogard; Kathie and Paul Scott.

## 6. For you to decide

1. **Admin:** which of the section 3 items to build, and in what order. The suggested order is there. Nothing changes until your OK.
2. **Item links:** the section 4 proposal (a migration, then a cleanup report).
3. **Megan Riley:** is the unnamed photo her?
4. **Buddhist Geeks:** list it if a contact route turns up, given the political videos?
5. **Migration 0043:** run it on dev, then live.

## 7. Rule slips

**Mine**
- **A temporary file in /tmp:** the local home-page check wrote one file to /tmp instead of the scratchpad. I deleted it straight away.

**The helper's**
- **Two requests to buddhistgeeks.org's robots.txt:** a status-only read, then a headers-only read of the same file to see where it redirected.
- **robots.txt not read for the image hosts:** yt3.ggpht.com for Buddhist Geeks' avatar, and the two teachers' own sites' images.
- **Sitemaps fetched alongside other requests,** though only after reading each site's robots.txt in its own step.
