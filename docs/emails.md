# Every email Spiritpedia sends

An inventory, as of build 15 (16 October 2026), before the emails are rewritten
in the guiding star's voice. Report only: nothing here has been changed.

There are **three senders**:

1. **The website, through Resend** (`web/utils/email.js`). Fourteen emails:
   eight transactional, five outreach. (The two claim-decision emails, 6a and
   6b, were added on 17 October 2026.) The app never sends email itself; it calls the
   website's routes.
2. **Supabase Auth**, through its own email settings. The sign-in codes and the
   change-email codes. Their wording lives in the Supabase dashboard, not in
   this repo.
3. Nothing else. Vercel crons and the admin pages send only through (1).

## How the website's emails are sent

- **From:** `Spiritpedia <hello@accounts.spiritpedia.co>`. The outreach journey
  is the one exception: it comes from `Spiritpedia <love@spiritpedia.co>`.
- **Reply-to:** `love@spiritpedia.co`, on every email.
- **Blind copy:** every email is also sent to `spiritpedialove@gmail.com`, an
  archive inbox. Nothing in the database records that an email went out.
- **Format:** HTML and plain text, except the journey, which is plain text only,
  with no links.
- **Greeting:** "Hi {first name}", where the first name is the first word of
  `user_profiles.full_name` (the name the app's star now asks for) or the
  review's author name. With no name, it is **"Hi there"**.
- **Sign-off:** "With love, The Spiritpedia team". The report email to the admin
  has none.
- **A failed email never undoes the action** that triggered it, and is not
  retried.

## The emails

| # | Email | Trigger | From | To | Subject | Current wording, in one line |
|---|---|---|---|---|---|---|
| 1 | **Explorer welcome** | A new account is created as an explorer: on the website at sign-up, or in the app (since build 14, after "I'm exploring" on "How will you use Spiritpedia?"). Route `/api/email/explorer-welcome`, once per account | hello@accounts | The new member | Welcome to Spiritpedia | "Welcome to Spiritpedia. It's a place to follow the teachers, practices and ideas that speak to you…"; invites them to save favourites to My Library; link: Explore Spiritpedia |
| 2 | **Practitioner welcome** | A new account is created as a practitioner on the website; or (since 16 October) an app account is upgraded to practitioner when they sign in on the website after "I share my work". Route `/api/email/practitioner-welcome`; skipped unless the account is a practitioner | hello@accounts | The new practitioner | Welcome to Spiritpedia | "We're glad you're here both as a practitioner and as someone who can explore the work of others"; their practitioner space; link: Continue your practitioner setup |
| 2a | **Listing live** | The admin approves a listing in the Inbox (`/api/admin/practitioner`): a practitioner, channel, app, organisation or publisher, or a resubmission. Not when Approve is pressed again on an approved one | hello@accounts | The owner | Your listing on Spiritpedia is live | "Good news: {listing} is now live on Spiritpedia"; links: see it here, your account page; reply or write to love@ for anything they can't edit (`utils/listingApproved.js`) |
| 3 | **Review received** | A member submits a review, on the website or in the app. Route `/api/email/review-received` | hello@accounts | The reviewer | We've received your review of {title} | "Thank you for reviewing {title} by {creator}. Your review is now with our team for assessment. We'll email you once we've reviewed it." |
| 4 | **Review approved** | The admin approves the review (Admin → Reviews; `/api/admin/reviews`) | hello@accounts | The reviewer | Your review of {title} is now live | "Your review… has been accepted and is now live"; thanks them, says it helps others decide; link: View your review |
| 5 | **Review rejected** | The admin rejects the review (Admin → Reviews) | hello@accounts | The reviewer | An update on your review of {title} | "After assessing your submission, we're unable to publish your review"; asks them to email love@ or reply for more information, or if we misunderstood |
| 6 | **Review reported** (to the admin) | A member reports a review from the app's "⋯" menu. Route `/api/email/review-reported` | hello@accounts | **love@spiritpedia.co** | Review reported: {reason} — {title} | Factual: the star rating, title, author, reason, their note, the review's text as it was, links to it and to the dashboard, and "Reports are promised a decision within 24 hours." No greeting or sign-off |
| 6a | **Claim approved** | The admin approves a "Request to claim it" in the Inbox (`/api/admin/claim-request`) | hello@accounts | The claimant | Your claim to {listing} is approved | "Your request to manage {listing} on Spiritpedia has been approved. The listing is now linked to your account"; links: your account page, view your listing |
| 6b | **Claim rejected** | The admin rejects a "Request to claim it" | hello@accounts | The claimant | An update on your claim to {listing} | "We weren't able to confirm that the listing is yours, so we can't link it to your account"; reply or write to love@ if we've got it wrong |
| 7 | **Journey 1** (practitioner outreach) | The admin starts a claim journey on an unclaimed practitioner (Admin → record → Outreach; `/api/admin/journey/start`). Sent at once | **love@spiritpedia.co** | The practitioner's `contact_email` (or `JOURNEY_TEST_EMAIL` while that is set) | We came across your work | Found their work online; Spiritpedia explained; invites an interview; says we made a short public listing they haven't approved, offers the link, claiming, corrections or removal, all by replying |
| 8 | **Journey 2** | Day 21, by the daily cron (`/api/cron/journey-emails`), unless the profile was claimed or removed | love@ | As above | A place for your work on Spiritpedia | A follow-up: established teachers (Eckhart Tolle, Abraham Hicks, Ram Dass) sit beside newer practitioners; reply to claim, or to be removed or stop the emails |
| 9 | **Journey 3** | Day 42, cron | love@ | As above | Help people find your services on Spiritpedia | Finding a practitioner starts with a question; Spiritpedia puts teachings and services together, online or in person; reply to claim; or to be removed |
| 10 | **Journey 4** | Day 63, cron | love@ | As above | Let people discover your work | People want to understand your approach before booking; a profile brings intro, videos, resources and links together; the listing is a starting point; the interview offer still stands |
| 11 | **Journey 5** | Day 84, cron | love@ | As above | A final invitation from Spiritpedia | "This is our final follow up"; still welcome to talk or claim; nothing to do if the timing isn't right; no more reminders; reply to be removed |
| 12 | **Sign-in code**, new address ("Confirm signup" template) | Someone signs in with an email that has no account yet (website or app; the same 6-digit-code flow) | Supabase Auth's sender: check Dashboard → Authentication → Emails → SMTP Settings | The person signing in | Set in the dashboard | Set in the dashboard: it carries the 6-digit code (`{{ .Token }}`). **Not in the repo** |
| 13 | **Sign-in code**, existing account ("Magic Link" template) | Someone signs in with an email that already has an account | As above | The person signing in | Set in the dashboard | As above: the 6-digit code. **Not in the repo** |
| 14 | **Change email: code to the new address** ("Change Email Address" template) | Account → Change email, in the app (two codes) | As above | The new address | Set in the dashboard | Carries the code (`{{ .Token }}`), fixed and tested on live on 14 October. **Not in the repo** |
| 15 | **Change email: code to the current address** (same template) | The same moment ("Secure email change" is on) | As above | The current address | Set in the dashboard | As above, its own code |

**Supabase templates that exist but nothing uses:** Reset Password (there are
no passwords), Invite User, and Reauthentication. Worth rewriting only if they
are ever switched on.

**Dev differs from live:** the dev project is on the free plan and sends
Supabase's default templates (plain "Your code is…" wording, from Supabase's own
address). Rewrites happen on live.

## Not emails, but in the same voice

- **The first push notification:** "✦ Testing, testing… just checking my light
  reaches you. Nothing to do. I'll only shine when it matters." Once per
  account, when notifications are turned on (`web/utils/push.js` → `WELCOME`).
- **The star's lines in the app:** "I am your guiding star", "Tap me anytime to
  come home", the Tailor Spiritpedia introduction, the save prompt, "How will
  you use Spiritpedia?", "Shall I show you practitioners near you?", "Would you
  like to share your name?", "Welcome back, {name}".

## What's needed before the rewrite

1. **The Supabase template texts** (emails 12–15): Dashboard → the **live**
   project → Authentication → Emails → Templates. Copy the subject and body of
   Confirm signup, Magic Link and Change Email Address, or let me read them
   from a received email.
2. **The Supabase sender:** Dashboard → Authentication → Emails → SMTP Settings
   → the sender name and address. If custom SMTP is on, it is probably through
   Resend too, but the repo doesn't record it.
3. **Decisions for the voice:**
   - Is it always the star speaking ("I"), or the team ("we")? Today it is the
     team everywhere ("With love, The Spiritpedia team"), while the star's own
     lines in the app say "I".
   - Do the outreach journey emails stay in the team's voice? They are written
     as a person to a person, from love@, and are deliberately plain.
   - The report email to the admin is internal and probably stays factual.
