# Every email Spiritpedia sends

An inventory as of 22 October 2026, after the rewrite to the approved copy in
`docs/email-copy-2026-10-21.md` (the source of truth for wording: change it
there first). Codes (B1, C1–C8, D1–D13) are the ones that document uses.

There are **two senders**:

1. **The website, through Resend** (`web/utils/email.js`). The app never sends
   email itself; it calls the website's routes.
2. **Supabase Auth**, through its own email settings: the sign-in codes and the
   change-email codes. Their wording lives in the Supabase dashboard, not in
   this repo (see the end of this page).

## How the website's emails are sent

- **From:** `Spiritpedia <hello@accounts.spiritpedia.co>`. The outreach journey
  is the one exception: `Spiritpedia <love@spiritpedia.co>`.
- **Reply-to:** `love@spiritpedia.co`, on every email.
- **Blind copy:** every email also goes to `spiritpedialove@gmail.com`, the
  archive. It is also the only record of a decline reason: reasons are typed
  by the admin and go in the email, and are not stored.
- **Wording:** `web/utils/emailTemplates.js`, built with `web/utils/emailParts.js`
  (greeting, sign-offs, buttons, escaping). Tested in
  `emailTemplates.test.mjs`.
- **Greeting:** "Hi {first name}," when there is a first name, otherwise
  "Hello,". Never "Hi there". The first name is the first word of
  `user_profiles.full_name` (or of the review's author name); for outreach, the
  first word of the listing's name after any title ("Dr Jane Smith" → Jane).
- **Sign-offs:** the team ("With love, / The Spiritpedia team"), the Guiding
  Star ("Your Guiding Star / and the Spiritpedia Constellation", with "See
  you among the stars," on B1 and B2), or plain ("The Spiritpedia team") for
  decisions and notices.
- **Links:** always `https://www.spiritpedia.co`.
- **No ✦ anywhere** (it reads as another company's logo). Where an email shows
  a picture, the gold star logo (`LOGO_URL`,
  `web/public/email/spiritpedia-star.png`, alt "Spiritpedia"); in subjects,
  plain text and sign-offs, nothing.
- **Format:** HTML and plain text, buttons drawn as buttons. The outreach
  journey is plain text only, with its two links written out.
- **Once only:** emails that must not repeat claim a row in `email_sends`
  (migration 0025) before sending, keyed by which email and what it is about,
  and give it back if the send fails (`web/utils/emailOnce.js`). No addresses
  are stored there.
- **A failed email never undoes the action** that triggered it. Most are not
  retried; the daily jobs retry the welcome, Day 4 and the journey.

## Explorer emails (Guiding Star voice)

| # | Email | Trigger | Rules |
|---|---|---|---|
| B1 | **Welcome** "Welcome to Spiritpedia" | Account created: website `ensureProfile`; app, the moment the account is created (not after "How will you use Spiritpedia?"). Route `/api/email/explorer-welcome` | Explorers only; once per account. App version (tap and hold) when `signup_platform` is `app`, website version (My Library button) otherwise |
| B2 | **Day 4** "Follow the superheroes. Discover your local heroes." | Daily job `/api/cron/account-emails`, 09:00 UTC, 4+ days after the account was created | Explorers only: never a practitioner, a declined applicant or a listing owner; not if unsubscribed. Once per account. Carries an unsubscribe line and one-click `List-Unsubscribe` headers |
| B3 | **Personal discovery edition** "A little space for discovery" | Edition 1: the same daily job, 10+ days after the account was made, **only while `DISCOVERY_EDITIONS=on`** on Vercel (not yet). Edition 2 onwards (monthly) is not built | The same people as Day 4. A featured discovery plus at least two other sections, or skipped (retried daily to day 17). Designed HTML with the logo header, "View this edition online" (30 days, no name), "Change what I receive", unsubscribe and the one-click headers. Admin → People → explorer → Discoveries: preview (learning picks masked), test-send to love@ only, log. Records (`discovery_editions`, 0026) deleted after 12 months. Rules in README §9.7a |

**Unsubscribe:** `email_preferences` (migration 0025) holds `unsubscribed_at` and
the token in the link. The link opens `/unsubscribe`, which asks before
unsubscribing (mail scanners open links); mail clients' own button POSTs to
`/api/email/unsubscribe`. It stops Day 4 and discovery emails only; account and
review emails still go. "Change what I receive" opens `/email-preferences`,
and the account page has a **Discovery emails** switch for explorers who never
applied (website now; app in the next build), both turning them on or off.

## Account and review emails

| # | Email | Trigger | To | Notes |
|---|---|---|---|---|
| D1 | **Practitioner welcome** | Practitioner account created on the website, or an app explorer becoming a practitioner there. `/api/email/practitioner-welcome` | The new practitioner | Once per account. Held back while the account's email matches a listing (an instant claim's D7 is their welcome); released by "This isn't me" or a failed claim on the claim page, or by the daily job a day after sign-up |
| D2 | **Application received** "Thank you for sharing {listing} with Spiritpedia" | The practitioner form is submitted (`/api/profile/resubmit`) | The applicant | Once per application: a decline clears it, so sending in again gets a new one |
| D3 | **Listing live** "{listing} is now live on Spiritpedia" | Admin → **Inbox** → Approve (`/api/admin/practitioner`), the only way to approve | The owner | Not for a listing that was claimed (D7 goes instead). A person's record can't approve: setting "approved" there once left an account approved with no listing and no D3 (22 Oct 2026) |
| D4 | **Listing not published** "About your Spiritpedia listing" | Admin → Inbox → Reject, with a reason | The applicant | Reason required. Not sent again if Reject is pressed again. The account becomes an explorer, keeps `verification_status` rejected, and never gets Day 4 |
| D5 | **Claim request received** | A "Request to claim it" is saved; the page calls `/api/email/claim-request-received` | The claimant | Once per request; only for the caller's own request |
| D6 | **Ownership confirmation** | Admin → Inbox → claim request → "Send ownership check" (`/api/admin/claim-request`, `ownership_check`) | **The listing's published address**, never the claimant's | Once per request; the Inbox shows when it went. A reply is read by the admin and grants nothing by itself |
| D7 | **Claim approved** "You can now manage {listing}" | Admin approves a claim request or a verified claim; or an instant email-match claim on `/auth/claim` (`/api/email/claim-approved`) | The claimant | Once per account and listing, shared by all three paths |
| D8 | **Claim not confirmed** "About your request to manage {listing}" | Admin → Inbox → claim request → Reject, with a reason | The claimant | Reason required |
| D9 | **Review received** | A new review is saved, website or app (`/api/email/review-received`) | The reviewer | Not for an edit |
| D10 | **Review approved** | Admin → Reviews → Approve | The reviewer | Only when the status actually changes |
| D11 | **Review not published** | Admin → Reviews → Reject, or Admin → Flags → "Take review down", with a reason | The reviewer | Reason required. Nothing about a report or reporter is in it. A ban takes reviews down without emails |
| D12 | **Review reported** | A member reports a review in the app (`/api/email/review-reported`) | **love@spiritpedia.co** | Item, review and report references, reason, time (UTC), link to Admin → Flags |
| D13 | **Account deleted** | Deletion completes: self-service (website or app, `/api/account/delete`) or admin (Admin → person → Delete, "Send confirmation" ticked by default) | The address the account had | Only after a successful deletion; the account's `email_sends` rows are cleared first |

**Owners' content** (migration 0024, not part of the approved copy): **Content
approved** and **Content not added**, from Admin → Inbox → Content
(`/api/admin/submissions`, wording in `web/utils/contentSubmissions.js`). They use
the same greeting rule.

## Practitioner outreach journey (C1–C8, team voice)

- **Started** only by the admin's **Start email journey** button (admin listing
  record → Outreach; `/api/admin/journey/start`). Email 1 goes at once.
- **Then** the daily job `/api/cron/journey-emails` (08:00 UTC) sends emails 2–8
  at days **21, 42, 63, 84, 105, 126 and 147** from the start, one per run, and
  the lowest due first. Email 8 is the last.
- **From** `love@spiritpedia.co`; plain text; every email carries the listing
  link (`/healers/{slug}`) and the claim link (`/auth/claim?slug={slug}`), and
  offers removal.
- **The claim link works signed out:** it goes through sign-up as a
  practitioner and back to the listing after the code. An account whose email
  matches the listing claims it at once (D7); any other is offered "ask us to
  check and link it to your account".
- **Individuals only.** Channels, apps, publishers and organisations are
  refused until they have their own wording.
- **Stops** when the listing is claimed, removed, or loses its contact email;
  when Resend lists the address as bounced or complained (checked before every
  email; `suppressed`); after email 8; or when the admin presses Stop.
- **Never again:** a journey stopped as "Asked to stop emails"
  (`asked_to_stop`), "Asked for removal" (`removal_requested`) or `suppressed`
  blocks any new journey to that listing.
- **JOURNEY_TEST_EMAIL:** while set (it is set on Vercel for Production and
  Preview), every journey email goes to that test inbox instead of the
  practitioner. It stays set until the solicitor has checked cold email.

## Supabase Auth emails (not in this repo)

| Email | Trigger | Template |
|---|---|---|
| Sign-in code, new address | Signing in with an email that has no account (website or app) | "Confirm signup", carries `{{ .Token }}` |
| Sign-in code, existing account | Signing in with an email that has an account | "Magic Link" |
| Change email, to the new address | Account → Change email, in the app | "Change Email Address" |
| Change email, to the current address | The same moment ("Secure email change" is on) | The same template |

Reset Password, Invite User and Reauthentication exist but nothing uses them.
Dev is on the free plan and sends Supabase's default templates; the wording
that matters is on live (Dashboard → Authentication → Emails → Templates).

## Not emails, but in the same voice

- **The first push notification:** "Testing, testing… just checking my light
  reaches you. Nothing to do. I'll only shine when it matters." Once per
  account, when notifications are turned on (`web/utils/push.js` → `WELCOME`).
- **The star's first callout in the app:** "Tap me anytime to come home. Press
  and hold to open your Library." (`app/lib/features/intro/intro_overlay.dart`).
