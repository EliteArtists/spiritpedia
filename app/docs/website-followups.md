# Website follow-ups (found while building the app; the website is unchanged)

Kept here, in `app/`, so recording them does not trigger a website deploy.
Line numbers are as of October 2026 (app builds 1.0.0 (5) to (7)).

## Channels and apps mixed in with teachers

The `healers` table holds teachers (`entity_type` `individual` or NULL) and
platforms (`channel`, `app`). Only the homepage tells them apart
(`components/HomePageContent.js:99-101`); no other public page reads
`entity_type`. The app now keeps them apart everywhere.

1. `web/components/HomePageContent.js:123`: `localHeroes` filters `healers`,
   not `individuals`. A channel or app with a `local_hero`, NULL or unknown
   tier shows in "Practitioners Near You" (221-232) **and** in "Explore These
   Channels" (269). (No live row triggers it today.)
2. `web/components/EmotionSearch.js:362-366` (query) and `715-717` (header):
   the universal search reads healers without `entity_type`; every match is
   listed under "HEALERS" with a tier glyph (`tierBadge`, 253-260).
3. `web/data/subjects.js:79` → `web/app/subject/[slug]/page.js:125-131`:
   one "Healers · Practitioners & Teachers" shelf holds channels and apps
   too. The meta description (line 31) says "Healers, books, videos…".
4. `web/data/subjects.js:132` (`getHomepageContent`): the same unsplit query.
   Imported nowhere: looks like dead code.
5. `web/components/LibraryView.js:166-172` (data from
   `web/app/library/page.js:71`, picked at `LibraryView.js:56`): saved
   channels and apps sit in "Saved Healers" / "Your Practitioners".
6. `web/components/HealerCard.js:21-26`, `143-167`: no entity awareness. A
   channel wears a tier badge (or the fallback "Teacher" pill, line 166) and
   person-like tooltips. Line 68 saves channels under `FAVORITE_KEYS.healers`.
7. `web/app/healers/[slug]/page.js`:
   - 127-158 `TierBadge`: a channel's profile shows a tier (or "Teacher").
   - 175: `og:type` `profile` ("a person page") for channels and apps.
   - 243, 407: "Book with {firstName}": a channel shows e.g. "Book with The".
   - 170: the not-found title says "Healer".
8. `web/app/publishers/[slug]/page.js:71-75`, `194-198`: linked channels and
   apps are listed under "Our Authors"; 114-120 give each an author shelf.
9. `web/components/PublisherCard.jsx:12`: "N authors" counts every
   `publisher_healers` row, channels included (used at
   `HomePageContent.js:258`, `LibraryView.js:183`).
10. `web/app/auth/claim/page.js:26`: a channel being claimed is previewed
    with a tier badge or "Teacher".

Minor: `web/app/sitemap.js:79, 118-120` lists channels as "Profiles" (no
user-facing label). Detail pages' "By {name}" and `VideoShelves.jsx:356-385`
per-healer video shelves are neutral in wording but cannot tell a channel
apart, since none of them fetch `entity_type`.

## Memberships (102 live)

They appear only on teachers' pages (`web/app/healers/[slug]/page.js:238,
480-486`). Where they could also go:

- a sixth Explore More option on the homepage (`web/components/ExploreMore.jsx`),
  as the app now has;
- a Memberships section on subject pages (`web/app/subject/[slug]/page.js`);
- the search, which does not look at offerings at all
  (`web/components/EmotionSearch.js`; the app's search now does).

## Search

- `web/components/EmotionSearch.js`: a title containing a mapped feeling
  word is never shown: once the feeling matches, the universal results are
  dropped ("September Astrology Forecast 2026" finds astrology, not the
  video). Its universal search also matches the whole phrase only, so words
  out of order miss. The app searches both engines and shows both.

## Reviews: report and block (app build 1.0.0 (7))

The app has a "⋯" menu on every review someone else wrote: Report review
(a reason and an optional note → `report_review()`, migration 0015) and Block
this reviewer (`block_review_author()`). The website's public review section
(`web/components/ReviewSection.jsx`, `ReviewCard` at 316-359) has neither. The
database already hides a blocked reviewer's reviews from the blocker on the
website too (the read policy), but there is no way to block or unblock there,
and no "Blocked reviewers" list on the website's account page.

## Offering dates

The website never shows when a retreat or dated course takes place:
`web/components/OfferingCard.js` and `web/app/offerings/[slug]/page.js` read
`start_date`/`end_date` but render neither. Lists hide offerings whose end date
has passed; an ended offering's page still opens with no notice. The app now
shows the dates on cards and pages ("18–20 Sep 2026", "On now · until …"),
says "This took place … — it has ended." on an ended page, and sorts retreat
shelves soonest first (`app/lib/core/format/dates.dart`,
`app/lib/data/shelf_rules.dart` → `soonestFirst`).
