# Pre-launch tidy-up (16 Nov 2026)

Four parts, from the owner's message of 16 Nov. Part 1 is done on dev and live.
Part 2 is a test report only: nothing has been fixed yet. Part 3 is built.
Part 4 is a plan only.

## Part 1: the 13 Nov decisions (done, dev and live, Ops synced)

- **Ingest identity:** the ingest now identifies itself as
  `Spiritpedia/1.0 (+https://spiritpedia.co/about; love@spiritpedia.co)`
  (`scripts/lib/images.mjs`). It still obeys robots.txt, and a site that refuses
  this agent stays refused.
- **The 8 held plans, retried once:** six went in on dev and live: Mariana
  Caplan, Vicky Carter, Hayagriva Buddhist Centre, Cedar Rapids Zen Center, Two
  Arrows Zen and the Zen Center of New York City. Zen Fields still refuses and
  stays held.
- **Out (moved to `night-sprint-2026-11-09/dropped/` with the reason):** Eva
  Payne, Celia Roberts, Kali Basman, Julie Ryan, Jessica Graham, Julie Smith,
  Pooja Arora, Bruce Tift.
- **In (dev and live):**
  - Brooklyn Zen Center. The bio no longer mentions the pandemic, which the
    health check had flagged.
  - Clouds in Water Zen Center. "Getting Started in Zen" is now a course.
  - Zen Center North Shore.
  - Marysia Miernowska. The health check found no cure claims.
  - Gabriella Giubilaro, linked as founder of the Istituto Iyengar Yoga Firenze.
  - Political and identity pages stayed out throughout.
- **Decorah Zen Center: still held.**
  - Your OK for the small portrait was set up: the ingest now accepts a photo
    of at least 150 px when a plan says `small_photo_ok`.
  - The portrait passed one check. On the insert, sites.google.com answered
    HTTP 403, which counts as a refusal, so I didn't retry it.
- **Healthy Minds:** held until a usable photo. The "-24% depression" claim
  isn't in the listing's text anywhere, and stays out.
- **Luminary:** Pir Zia Inayat Khan, Zen Mountain Center, Chenrezig Institute
  and the Maitreya Instituut are raised on dev and live. The script is
  `docs/content-audits/owner-fixes-2026-11-16.mjs`, which logs the old values
  and can roll them back. Everyday Zen is still held (no photo); its plan now
  says Luminary.
- **New leads (4.9) queued in README §18.7:** Jim Tucker, Breath-Body-Mind,
  NDERF, Coyote Institute, Jung Platform, Norman Fischer, Shodo Spring and the
  Prague Yoga Collective. Tara Mandala and Marybeth Hyland are left as they are.
- **Worth a retry:** five older plans failed with the same socket errors under
  the old agent (Sati Center, Centre Sivananda Paris, Kathie and Paul Scott,
  Shakti Shala, SFZC). The new agent may load them on their next retry.

## Part 2: account and admin test (dev; report first, nothing fixed yet)

### How it was run

- Five TEST accounts were created on dev through the Admin API, with the email
  already confirmed: Explorer, Practitioner, Channel, App and Organisation.
  - Each used plus-addressing on your inbox.
  - Each profile row was made first, so no welcome email could go.
- There were four TEST listings, one per kind.
  - The Practitioner, Channel and Organisation listings carried their
    account's address, so those three were claimed by email match.
  - The App listing had no address, so it went through "Request to claim it"
    and was approved from the admin.
- Every step went through the real website routes, on a local copy of the
  website pointed at dev, and through the same database calls the app makes.
  - Sending email and push was switched off: no email or notification went to
    anyone.
  - Sign-in used the real email-code step. The code was generated without
    being sent.
- **At the end, each account was deleted with its own Delete button.** The
  TEST listings, reviews, reports, submissions, journey and click counts were
  then removed. Nothing from the test is left on dev, apart from a few opens
  and saves in today's anonymous Activity totals.

### What works

The test covered each kind (Explorer, Practitioner, Channel, App and
Organisation) unless a row says otherwise.

| Action | Result |
| :--- | :--- |
| Sign in with an email code | Works for every kind |
| Onboarding / welcome | Explorer: the welcome route ran (no email, as set up). The listing kinds held their welcome until the claim, then got the claim-approved email instead (both as designed) |
| My Library (save a book, a video and an offering) | Works for every kind |
| Tailor (interests) | Works for every kind |
| Write a review | Works for every kind. Each review waits for you. Admin → Reviews showed 5, and the Inbox counted 4 pending after one was approved |
| Report a review (app) | Works. The Inbox showed 1 open report |
| Block a reviewer (app) | Works; the blocked review is hidden from the person who blocked it |
| Claim by email match (Practitioner, Channel, Organisation) | Instant, and shown in Admin → Claims under each listing's own name |
| Request to claim (App) | In the Inbox, and the Claim requests count went to 1. Approving it linked the listing; the App account then saw its dashboard |
| Edit own listing | Works for all four listing kinds; the App could do so only after approval, as it should |
| Submit content (a free resource) | Works for all four listing kinds. "From owners" counted 3, then 4. Approve published it (the page loaded); reject with a reason worked |
| Push preferences and push token | Saved for every kind |
| Discovery emails switch | Off and on work for every kind |
| Activity | Opens and saves showed in Admin → Activity (today's totals and Most saved), with sign-ups by day: 5, website |
| Amazon Buy tap (website route, both "web" and "app" values) | Counted every time; Admin → Activity's Amazon panel showed the total |
| Account type labels | Explorer, Practitioner, Channel, App, Organisation, and "Practitioner (awaiting approval)" before approval: all right |
| Admin moderation | Approve a review, reject one with a reason, take a reported review down, approve and reject a submission, approve a claim request: all worked, each with the right counts |
| Outreach controls | Mark replied, which stops the journey on its own as designed; it showed in the Outreach list with its kind |
| Delete account | Works for every kind. Each claimed listing's closed-account note reached the Inbox, and the person's reviews, saves and submissions went with them |

### Problems found (for your OK before I fix them)

1. **Amazon purchases.** Three things are going on:
   - **Taps in the app are never counted.** The app opens Amazon directly and
     never reports the tap (`app/lib/features/detail/book_screen.dart`). The
     website does count taps, and I checked that live's counter works. Live
     has **never** recorded a tap, so your three purchases were almost
     certainly made in the app, or before the counter went live. The fix
     needs an app update (1.0.2): the app would send the same anonymous tap
     the website sends.
   - **Your own purchases won't show as sales.** Amazon doesn't credit an
     Associate's own orders (README §17.6).
   - **Reports lag and are split by country.** Amazon's reports run about a
     day behind. A purchase on amazon.co.uk appears in the UK account
     (`spiritpedia03-21`), not the US one.
2. **School accounts are labelled "Practitioner"** on the website's account
   page and in the app's My Account, where they should say School. It's a small
   fix in `web/utils/accountType.js` and `account_service.dart` (the app part
   goes in the next build).
3. **The website has no Report or Block on reviews.** Only the app has them
   (a known gap, README §9.6). You asked for both platforms; adding them to
   the website is a small job.
4. **Outreach can't be tested end to end on dev.**
   - Dev has no email-sending key, so Start is refused before anything is
     sent ("Could not check the address with Resend").
   - "Delivered" comes from Resend's webhook, which only reaches the live
     site.
   - Channels, apps and organisations are refused as designed, since they're
     switched off.
   - To see sent and delivered for real, I'd need your OK for **one** of
     these:
     - (a) a dev sending key; or
     - (b) one TEST journey on live, which the live test setting redirects to
       your plus-addressed inbox, deleted afterwards.
5. **The Inbox reads at most 1,000 accounts' addresses.** Beyond that, newer
   people's emails would be missing in the Inbox. Live has 14 accounts, so
   it isn't urgent, but it's worth fixing before it matters.
6. **Deleting an Explorer leaves no trace in the admin.** Only claimed
   listings get a closed-account note. That's by design, but you might want
   a count.

## Part 3: admin guide (built)

- **The guide:** `docs/admin-guide.md`. The file now lives at
  `web/docs/admin-guide.md` so the website can build it into the admin;
  `docs/admin-guide.md` points to it.
  - It has one section per admin screen, in sidebar order: what it's for,
    what it shows, what you do there and how often to look.
  - The older badge, approval and owners'-content notes are kept below the
    screen sections.
  - "Gaps: things you still can't see or do" is last.
- **The Help link** is in the admin sidebar, above Logout, and opens
  `/admin/help`.
  - I checked it on a local copy against dev.
  - It builds into the page, so editing the guide redeploys the website.

## Part 4: app links (plan only)

The plan is in `docs/reports/2026-11-16-app-links-plan.md`, with a table of
where each link appears. Before building, I need:

1. **The App Store Apple ID.** It's the number at the end of the
   apps.apple.com link. It isn't in the repo, and I won't guess it.
2. **Your OK to download Apple's and Google's official badges.**
3. **A few lines for an About page.** There is no About page yet.
4. **The wording.** The app has no "follow" yet, so the plan offers
   alternatives to "Save and follow on the app".

About 2 days of website work, with no app update needed. Deep links come
later, with an app release.

## For you to decide

- Part 2 fixes 1–5: which to do, and for 1, when the app update goes out.
- Outreach testing: (a) a dev key or (b) one TEST journey on live.
- Part 4: the App Store ID, the badges and the wording above.
- Decorah: hold it, or ask the centre for a photo.
