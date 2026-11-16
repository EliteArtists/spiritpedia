# Owner's decisions, 16 Nov afternoon: what was done

Every item below is done unless it says otherwise. The website changes go
live with this push. The app changes are on the local `release/1.0.2` branch.

## 1. Outreach emails switch on soon

Noted. Nothing is held back for app 1.0.2, but one thing must be set up
before outreach starts (see 2.4): **delivery reports don't reach us today.**

## 2. Fixes from the test

### 2.1 App: Buy on Amazon taps are counted (1.0.2)

- **Books:** a tap on Buy on Amazon now sends the same anonymous count the
  website sends (`/api/amazon-click`, platform "app"). It sends no user and
  no token, and it never holds up the trip to Amazon.
- **Offerings whose link is an Amazon product:** counted the same way. The
  1.0.2 branch already tags these links.
- Commit `eb76e2f1` on `release/1.0.2`. All 373 app tests pass.
- **Not counted until 1.0.2 is in the stores.** Until then, Admin → Activity
  shows website taps only.

### 2.2 School accounts say "School"

- **Website:** live with this push (`web/utils/accountType.js`).
- **App:** on `release/1.0.2`, with a test.

### 2.3 Report and Block on the website's reviews

- Every review shows small **Report** and **Block** links under it, except
  the reader's own. They use the app's reasons, wording and database calls.
- **Report:** choose a reason, add an optional note, Send. You're emailed at
  once, as with app reports, and the report appears in Admin → Reports.
- **Block:** asks first. Once blocked, that person's reviews disappear for
  the reader, on the website and in the app.
- **My Account** has a new "Blocked reviewers" card with Unblock. It only
  shows when there is someone to unblock.
- A signed-out reader who taps either link is asked to sign in.
- Checked with lint and the build, and the database calls were tested in
  this morning's walk-through. **I haven't clicked through it in a browser
  while signed in.** Please try it once after the deploy.

### 2.4 One test outreach email from live

- **Sent:** one journey email 1, "An invitation from Spiritpedia", to
  **rossbaiken+journeytest@gmail.com** at 16:22 UK time today.
  - It used live's database and live's email account, and the same code as
    the admin's Start button.
  - A TEST listing ("TEST Outreach Journey", `test-outreach-journey-2026-11-16`)
    and its journey are on live now, so you can see it in Admin → Outreach.
  - Resend reports it **delivered**.
- **"Delivered" will not appear in the admin.** This is a real gap, found by
  this test:
  - Resend has **no webhook** set up.
  - Vercel has **no `RESEND_WEBHOOK_SECRET`**: the live webhook address
    answers "webhook_secret_not_set".
  - So no outreach email has ever been marked delivered or bounced, and a
    bounced address would not stop its journey on its own.
- **Your steps (about 5 minutes):**
  1. Resend → **Webhooks** → **Add endpoint**:
     - URL: `https://www.spiritpedia.co/api/email/resend-webhook`
     - Events: `email.delivered` and `email.bounced` only.
     - Save.
  2. Open the new webhook and copy its **Signing secret** (it starts with
     `whsec_`).
  3. Vercel → `spiritpedia-e58y` → Settings → Environment Variables → add
     `RESEND_WEBHOOK_SECRET` with that value, for Production.
  4. Vercel → Deployments → the latest one → **Redeploy**.
- Resend won't resend the report for today's email, because the webhook
  didn't exist when it was delivered. **To see "delivered" in the admin, it
  needs one more test email after step 4.** Say if you want it. Either way,
  I'll delete the TEST listing and its journey when you say you've seen it.
  Nothing more will go to it: the next email in the sequence is due in 21
  days.

### 2.5 The admin works beyond 1,000 accounts

- One shared helper now reads every page of accounts
  (`web/utils/supabaseAdmin.js` → `emailsById`).
- It's used by the Inbox and overview, Claims, Reports, and the push test's
  "send to this email" lookup.
- All four had read only the first 1,000 accounts.

### 2.6 Deleted explorer accounts are counted

- Admin → **People** now reads, for example, "14 registered · 0 explorer
  accounts deleted".
- Each self-serve deletion of an account with no listing leaves an
  anonymous row: when, website or app, and the kind of account. It's
  already marked resolved, so it never reaches the Inbox. There are no
  names, emails or ids.
- No migration was needed: the table from 0013 already had the right
  columns.
- The count starts today. Earlier deletions left nothing to count.

## 3. App links on the website (built)

You chose "Spiritpedia is even better on the app" everywhere. "Follow"
appears nowhere.

| Where | Who sees it | What |
| :--- | :--- | :--- |
| Apple's Smart App Banner | iPhone and iPad, in Safari | Apple's own banner (App Store ID 6821430226). On a teacher's page it also passes that page's address to the app. Not on /admin |
| Android strip, top of page | Android, after the cookie question is answered | The star, "Spiritpedia is even better on the app" and a purple **Get the app** button. × hides it for 30 days; a tap on the button hides it for 90. Never on /admin or sign-in pages |
| Footer | Everyone | The line and the badge: iPhone sees the App Store badge only, Android the Google Play badge only, a computer both. New **About** link |
| **/about** (new) | Everyone | Your text, word for word (with a final full stop), then the app line with the badges and Apple's and Google's trademark lines |
| Welcome card | Once, after a website sign-up | "Welcome to Spiritpedia." and the app line with the badge, with an × |
| Explorer welcome email | Website sign-ups | The app line and both badges, before the sign-off. The copy document was updated first |
| Teacher, school and organisation pages | Everyone | One purple text link: "Spiritpedia is even better on the app →" |
| My Library | Everyone | The same link |
| **spiritpedia.co/get-app** | Anyone | A phone goes straight to its store; a computer sees both badges. A short link you can use anywhere |

- **Badges:** Apple's and Google's official files, unchanged, in
  `web/public/badges/`, with PNG copies for email. Google's badge
  page now sends you to Google's Partner Marketing Hub, and Apple's moved to
  toolbox.marketingtools.apple.com; both files came from those official pages.
- **Taps are counted** in Admin → Activity, in a new **Get the app** panel:
  - which placement, which store and which kind of device;
  - how often the Android strip and the welcome card are closed.
  - It's counts only, never who tapped, and Play Console sees the placement
    too.
- The privacy page has one new sentence about it, and its date is updated.
- **Your step:** run migration **0052** (`supabase/migrations/0052_app_store_clicks.sql`):
  1. Supabase → the **dev** project → SQL Editor → New query → paste the
     whole file → Run.
  2. The last row should read `clicks_rows 0`, `writer_exists true`,
     `read_exists true`.
  3. Then the same on **live**.
  4. Until it runs, the links all work, and the panel says "Not counting yet".
- **Please check:**
  - The welcome card's heading, "Welcome to Spiritpedia.", is my addition.
  - The welcome email uses only your line (no longer sentence).
- **Not done:** deep links, so that tapping a spiritpedia.co link opens the
  same page in the app. They need an app release (see section 7).
- **Can be done now:** the README's open item to add the App Store and
  Google Play links to the Amazon Associates site list.

## 4. Why the website didn't scroll smoothly, and what changed

These were measured on the live homepage at phone size, with the processor
slowed four times to stand in for a phone, then on the fixed version.

1. **About 1,500 hidden tooltips on the homepage. This was the main cause.**
   - Every badge on every card had its own hover tip, hidden but still drawn
     on every frame.
   - Each tip had a blur and its own full-size copy of the star picture
     (1536×1024 shown at 20px; 1,522 copies loaded at once).
   - **Now:** a closed tip isn't on the page at all and has no blur. The star
     is a small copy (21 KB instead of 252 KB), loaded only when a tip opens.
   - The tips look and fade the same.
2. **The page kept redrawing when nobody touched it.**
   - The search box's typing animation and blinking cursor kept running.
   - Every Timeless Teachers card ran its own photo-rotation timer, off
     screen too.
   - **Now:** the typing animation pauses when the search box is scrolled
     away, and a card rotates only while it's on screen.
   - Idle work over 8 seconds fell from about 3 seconds to under 1 second
     (0.2 seconds once scrolled down).
3. **Every card in a shelf was drawn,** including hundreds off to the side
   (one homepage row has about 900).
   - **Now:** cards after the sixth in each row are skipped until they come
     near the screen. The row doesn't jump.
4. **Blurred sticky header bars and cookie banner.** A blur on a bar that
   stays on screen has to be redone on every scroll frame, and on iPhones
   and Androids that is a known cause of stutter.
   - **Now:** the blur is gone, with a slightly more solid navy, so it looks
     the same.
   - This one comes from how phones are known to behave; the test couldn't
     measure a phone's graphics chip.

**Homepage scrolling, before and after (phone size):**

| | Before | After |
| :--- | :--- | :--- |
| Painting | 281ms | 29ms |
| Touch checks | 343ms | 34ms |
| Layer building | 417ms | 26ms |
| Total main-thread work | 2.0s | 1.0s |

- On a computer, painting fell from 310ms to 117ms, and touch checks from
  110ms to 6ms.
- Subject pages improved the same way.
- Teacher pages were already light.

**Your call:** the homepage still has about 3,000 images across its shelves.
Loading fewer cards per shelf at first, as subject pages already do with
paging, would help most. It changes what's shown, so it waits for your OK.

**Files:**
- `ListingBadges.jsx`, `HealerCard.js`, `EmotionSearch.js`
- `ContentShelf.js`, `SubjectPagedShelf.jsx`
- `HomeMasthead.jsx`, `CookieBanner.jsx`, `LibraryView.js`
- `app/subject/[slug]/page.js`, `globals.css`
- new `public/Transparent_Symbol_small.png`

## 5. Decorah Zen Center

On hold, as it was.

## 6. Tonight's sprint

The five retries come first:
- the Sati Center
- Centre Sivananda Paris
- Kathie and Paul Scott
- Shakti Shala
- San Francisco Zen Center

Each runs once with the new name, dev then live. This is written into README
§18.7 (item 5) and the night-sprint routine, so "Start the night sprint"
picks it up.

## 7. Everything waiting for app 1.0.2

**Already built on `release/1.0.2` (local branch, all 373 app tests pass):**
1. Crisis check: hyphens count as spaces ("self-harm").
2. Crisis check: joined-up forms ("selfharm", "killmyself").
3. Offerings whose link is an Amazon product are tagged, with the
   disclosure under them.
4. The disclosure sentence beside the menu's Affiliate Disclosure entry.
5. Schools & Academies and Retreat Centres & Platforms: nearest first once
   an area is set.
6. **New today:** Buy on Amazon taps counted (books and Amazon offerings).
7. **New today:** school accounts say "School".

**Still to build for 1.0.2:**
1. **Near You** sorts and never hides anyone. Today the app shows only
   people within 50 km plus online ones. Also "Closest to you" as the full
   list, as on the website.
2. **Subject search** ignores spaces, hyphens and capitals ("breath work",
   "tai-chi"), as on the website.
3. **Subject pages in tier order**, nearest first within each tier, as on
   the website.
4. **Deep links:** a spiritpedia.co link opens the same page in the app.
   - Needs from you: the Play Console **app-signing** SHA-256 (Setup → App
     signing; not the upload key), and Associated Domains switched on for
     `co.spiritpedia.app` in the Apple developer site. I'll give exact steps.
   - Then two website files and the app's settings.
5. **Check in the simulator** whether Safari's banner "Open" lands on the
   right teacher (it should, with deep links).
6. **Before building:** bring `main`'s newer `app/tool/build_release.sh`
   (the store-build config check) into the branch.

## For you to decide

- Resend webhook and Vercel secret (2.4), then whether to send one more test
  email to see "delivered", and when to delete the TEST listing.
- Run migration 0052, dev then live (3).
- The welcome card heading and the welcome email wording (3).
- Fewer cards per homepage shelf at first, for smoother scrolling (4).
- Try Report and Block once on the live site while signed in (2.3).
- The Play app-signing SHA-256 and Associated Domains, when you want deep
  links in 1.0.2 (7).
