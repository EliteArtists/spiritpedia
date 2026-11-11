# Admin build (11 Nov 2026)

Everything in your 11 Nov admin message is built and live on the website (commit 6ebcd33). Four migrations are written but not run: you run them on dev, then live. Each new page works before its migration runs, and says plainly what is waiting on it.

## 1. The four fixes you asked me to prove on live

**a) Inbox refresh: why it didn't work.**
- The earlier fix reloaded the queue only when the Inbox page first opened.
- **Clicking Inbox while already on it did nothing.** A link to the page you're on doesn't reach the page at all.
- **When it did reload, nothing showed it.** No spinner and no time, so a reload with nothing new looked like no reload.
- **Every other page kept the data from the first load.** The data provider sits in the admin layout, which persists, so Activity's totals, Pending items and Claims showed what was read when the dashboard first opened, until a full browser reload.

**The fix:**
- Every admin page re-reads when you open it.
- Clicking the page you're already on re-reads it.
- **Refresh** sits next to the word "Inbox", with "Updated 14:02:31".
- Only the newest read can land, so two quick clicks can't race.

**c) Activity "Totals across everyone".**
- **Visits were never lost.** Live records website and app activity every day, today included (11 Nov: 42 website opens and 4 app opens by early afternoon).
- **What was stale was the page.** Its database totals came from the dashboard's one read (as above). The rest only showed top-20 lists, which barely move from one visit to the next, and there was no headline number at all.

**Now:**
- A **"Totals across everyone"** panel shows pages opened, videos watched, saves and shares for the period, each with **today's** figure and the latest day with activity.
- The page re-reads **every minute**, and has **Refresh** with an **"Updated" time**.
- "In the database" has its own Refresh and Updated time.

**d) Pending items, checked against the live data.**

| Card | Showed | Real | Why |
| :-- | --: | --: | :-- |
| Practitioners awaiting review | 1 | 1 | Correct: an account from 17 Oct that chose "practitioner" and never filled anything in (the Inbox calls it "Incomplete application"). Decline it in the Inbox and the card goes to 0. |
| Claim requests | 1 | **0** | **Bug:** it showed the number of claimed listings (only the Spiritpedia listing). It now counts requests waiting for a decision. |
| Reported reviews | 1 | 1 | Correct: an open report from 31 Oct on the video "10 Minute Qigong Routine for Self Healing…". Decide it under Reports. |

- Each card now **opens its items**:
  - Practitioners awaiting review → Inbox, Applications filter.
  - Claim requests → Inbox, Claims filter.
  - Reported reviews → Reports.
- The counts refresh on every visit.

**b) Ingestion: Add Listing.**
- One form adds an individual, channel, app, organisation, school or publisher.
- **Tier names follow the kind:** Superstar, Shining Star and Rising Star for everything except people.
- **Town:** a base town and country, showing the town Near You will use, or warning that an alias is needed.
- **Contact:** email and the page that publishes it, contact form, phone and booking link. Publishers take an email only.
- **"Read channel":** subscriber count and avatar through the YouTube API, with a suggested tier.
- **Linked listings:** teachers for schools and organisations, authors for publishers.
- **Subjects:** at most three.
- **Checks:** the same as the sprint ingest. A matching name or slug stops the insert; a matching website or YouTube channel warns. "Add" only works after "Check" has passed on exactly what's in the form.
- **Fixed on the same page:** the list for linking a listing stopped at 1,000 rows; live has 1,275.
- **For you:** make sure `YOUTUBE_API_KEY` is set in Vercel for Production. Without it, "Read channel" says the key is missing, and you can type the numbers in instead.

**Proof on live: still to do.** Live /admin needs your password, which I can't type. Once you're logged in in Chrome, I'll click through Inbox, Activity, Pending items and Ingestion on www.spiritpedia.co and add what I see here.

## 2. The rest of the list

**Quick fixes:**
- **Activity counts:** listings by kind (Practitioners, Channels, Apps, Organisations, Schools), plus Publishers and **teacher links**. Each count opens the directory filtered to it.
- **"New this week":** by kind, plus publishers, teacher links, books, offerings, free resources, videos and sign-ups.
- **Content directory:** a **kind filter** and a kind badge. Tiers are named for the kind, so an organisation reads "Superstar", not "Superhero". The "No email" filter combines with it.
- **School labels:**
  - A school's claim request no longer reads "Practitioner" in the Inbox.
  - On People, an owner is named for what they manage (School, Organisation, Publisher…).
  - A school's or organisation's broken picture reads "Logo".
- **Journey greeting:** non-people get "Hello,".
- **Daily journey job:** re-reads each listing's kind before every send, and pauses the journey if the kind isn't approved.

**Monitoring pages:**
- **Outreach (new):** every journey with its full history, filtered by kind and by state, including stopped and claimed ones. Each opens to show its 8 emails, with delivered, bounced and replied.
- **Claims (rebuilt):**
  - Every kind and publishers.
  - **Managed by their owner**, with a working **Revoke Claim** (with a confirm step). Spiritpedia's own listing can't be revoked.
  - **Every claim request** and what became of it, with a link to the Inbox for pending ones.
  - The "No publisher claims yet" placeholder is gone.
- **Publishers (new):** a searchable directory with tier, ✓ Verified, No email and Claimed.

**Ops (new page):**
- Held plans, plans on dev but not live, the retry list and sprint reports.
- They come from `node scripts/ops-sync.mjs --env live`. Now part of the routine in README §20 and the night-sprint skill: after the live insert, and after your morning decisions.
- A dry run against live today: **64 held plans, 0 dev-only listings, 10 retry entries, 21 sprint reports.**

**Decisions built:**
- **Journeys:**
  - Publishers can have journeys. The database already allowed a journey to point at a publisher (migration 0020); the start route and the daily job now handle it.
  - Channels, apps, organisations, schools and publishers stay **switched off**, showing "Waiting for the approved wording for …". Switching a kind on is a one-line change once you send the wording.
- **Resend webhook (delivered and bounced only, no clicks):**
  - A permanent bounce stops that journey.
  - **To switch it on:**
    1. In Resend → Webhooks, add `https://www.spiritpedia.co/api/email/resend-webhook`.
    2. Tick only `email.delivered` and `email.bounced`.
    3. Put the signing secret (`whsec_…`) into Vercel as `RESEND_WEBHOOK_SECRET`, then redeploy.
  - Until then the endpoint refuses everything. It tracks emails sent after 0044 runs.
- **Mark replied:** records `replied_at` (with a date) and stops a running journey. Undo is there if it's clicked by mistake.
- **Contacted via form:** records that you used a listing's contact form, with the date. It's allowed for any kind, because it sends nothing. Say if you'd rather limit it to individuals.
- **Amazon "buy" clicks:**
  - Every Buy on Amazon button on book and offering pages counts a click, anonymously (no user, no IP), without slowing the trip to Amazon.
  - An **Amazon clicks** panel is on Activity.
  - Counting starts once 0046 runs.
  - **App 1.0.2:** the button sends the same small message to `/api/amazon-click` with `platform: 'app'`.

**Item links (link + title):**
- Migration 0047 makes an offering unique on listing + link + title, and a free resource on link + title.
- The ingest's duplicate check uses the same key. Until 0047 runs, a second item on the same link is left out with a clear note.
- **Cleanup report, nothing applied:** `docs/reports/2026-11-11-item-link-fragments.md`. Live has **40** items with a #fragment (not 35), on 21 pages:
  - **21 are real anchors:** keep.
  - **14 are made up:** strip after 0047. They include the five Florence Scovel Shinn audiobooks, the two Jikiden Reiki seminars, Esther Perel's tickets link and two Satipanya retreats.
  - **5 weren't checked:** jkzmeditations.com's robots.txt now blocks us (3 items), and Adyashanti's page refused (2). Neither was retried.
  - Jon Kabat-Zinn's three free resources come from a site that now blocks us, so they may need a review, not just a link fix.

**Buddhist Geeks:** out. The plan is filed in `dropped/` with your reason, and README §18.7 lists it under Out.

## 3. Migrations: run on dev, then live

| # | File | What it does | Check row (dev and live, run straight after) |
| :-- | :-- | :-- | :-- |
| 0043 | place aliases (from this morning) | 22 aliases | dev about **125, 824, 1** |
| 0044 | `0044_outreach_tracking.sql` | replied, email-or-form, delivered and bounced per email | **2, true, true, 0, 0, 0, 0** |
| 0045 | `0045_ops_items.sql` | the Ops table | **0, true** |
| 0046 | `0046_amazon_buy_events.sql` | anonymous Amazon click counts | **0, true, true** |
| 0047 | `0047_item_links_link_title.sql` | link + title uniqueness | **2, 0** |

After 0045 on live, I run `node scripts/ops-sync.mjs --env live` to fill the Ops page. After 0047 on live, I apply the fragment cleanup on your OK.

## 4. Checks

- **Web tests:** 210 of 210 pass, including 33 new ones (journeys, the webhook signature, Amazon clicks, ingestion checks). Script tests: 6 of 6.
- **Lint:** no errors in any changed file. The four files with older errors weren't touched.
- **Production build:** passes.
- **Next.js security advisory:** the build stopped once with a notice that this Next.js version (16.4.0) has a known security advisory, and recommends upgrading. I didn't upgrade. It's your call; I can do it on a branch and test it.
- **Not yet tried for real:**
  - a real insert from the Ingestion form
  - a real YouTube lookup on live
  - a real Resend webhook event
  - the Amazon panel with data (it needs 0046)

## 5. After your answers (11 Nov, afternoon)

**Shared outreach wording: installed, switched off.**
- C1–C8 from `docs/email-copy-2026-11-11-shared-journey.md` are in, word for word, with "Claim your listing:" throughout.
- They're chosen automatically for channels, apps, organisations, schools and publishers. The practitioner sequence is unchanged.
- **The C4 sentence comes only from stored links:**
  - Teachers are named only when linked.
  - A publisher's books are named only when it has some.
  - A channel never says "episodes" today, because no episodes are stored.
  - Otherwise it uses the fallback sentence.
- 80 renders (5 kinds × 8 emails, with and without links) are tested against the doc word for word.
- **To read every email:** `docs/reports/2026-11-11-shared-journey-preview.md` has all 40, using a real listing of each kind.
- **Still off:** journeys for those kinds can't start. To switch them on later, add the kinds to `OUTREACH_KINDS_APPROVED` in `web/utils/journey.js` and deploy. No email was sent.

**What the check found:**
- **Claim link:** works for a school and a publisher, checked on live while signed out.
- **Claim card wording:** for a school, organisation, channel or app it still says "We found your Spiritpedia profile / Yes, this is me". Only publishers get "this is us". A small website fix; say if you want it.
- **Stop requests:** a reply asking us to stop relies on someone reading love@ and pressing Stop or Mark replied. That's manual.
- **Fixed:** asking to stop through one listing didn't block another listing with the same inbox (a school and its founder, say). Now an address that asked to stop is never written to again, from any listing.
- **Not recorded yet:** the recipient type (business or personal inbox), and where a publisher's email was found. The doc asks for both.
- **Publisher books:** "books from your catalogue" means the books by the publisher's linked authors, the same ones its page shows. Books have no publisher column of their own.
- **No admin Start button for publishers yet:** the start route accepts them, but no control calls it.
- **Test inbox:** `JOURNEY_TEST_EMAIL` is still set on Vercel.
- **Solicitor:** the questions at the end of your doc are still open.

**Next.js security upgrade: ready, not deployed.**
- Branch `security/next-upgrade` (commit b05058d), not pushed. It moves 16.4.0 → 16.4.1, the lowest version with the fixes.
- **It fixes two critical flaws and one high one**, all in the version live runs today:
  - running code on the server without logging in, through the image optimiser;
  - the same through cached functions;
  - a way to knock the site over.
- **Tested on the branch:**
  - all 210 tests pass (before this afternoon's wording tests);
  - lint is the same as main;
  - the full build passes with no security stop;
  - 13 pages and routes were smoke-tested on the built site, including the image optimiser;
  - page sizes are within 1–3.5% of live.
- **Deploying it** is a merge into main and a push. Say OK and I'll do it the same hour.
- The linter package was left as it was. Its newer version flags 9 older patterns, and it isn't part of the advisories.

**Item links:** the cleanup script is ready and dry-run on live.
- 16 to strip: the 14 made up plus Adyashanti's 2.
- Jon Kabat-Zinn's 3 are kept by your decision. 21 real anchors stay.
- None would clash.
- It needs 0047 on live first. Then I run it with `--after-0047 --apply`, and it writes a before-and-after log.

**Migrations:** 0043 has run on dev and live. 0044–0047 weren't on either database when I checked.

**Disk:** 1.2 GB free. The upgrade build used most of it.

## 6. For you

1. Run migrations 0043 to 0047 on dev, then live, and tell me the check rows.
2. In Vercel, Production:
   - check `YOUTUBE_API_KEY` is set;
   - add `RESEND_WEBHOOK_SECRET` after making the webhook in Resend.
3. **OK to deploy the Next.js security upgrade** (two critical flaws on live today).
4. The check rows for 0044–0047. I then fill Ops, and apply the item-link cleanup.
5. Claim card wording for non-person kinds ("listing / this is us"): yes or no.
6. Publisher books for C4: the books by linked authors, as built, or always the fallback sentence?
7. Megan Riley's photo (you're checking).

## 7. Rule slips

- **The Ops helper's `git stash`:** to compare lint before and after, it ran `git stash` and `git stash pop` in the shared working folder. That briefly hid the other helpers' uncommitted work. It came back whole: no conflicts, and the build and all tests pass on the result.
- **The upgrade helper's stray files:** it wrote one to `/tmp` and one to `.claude/worktrees/`. Both were deleted straight away.
