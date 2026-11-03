# 1.0.1 (build 28): built on dev, for the simulator review (3 Nov 2026)

1.0.1 (build 28, `1.0.1+28`, both stores) = build 27 + the push notification package + Near You "Closest to you" + the hubs app side.

Everything is built and tested on dev. **Nothing is live, pushed or uploaded.** Build 28 waits for your OK after the simulator review.

## Before the simulator review: your step

**Run migration `supabase/migrations/0032_push_package.sql` on dev** (SQL editor, whole file). The check at the end should read: true, true, true, true, 1, 0, 2.
- The app's notification switches and its record of app openings need it.
- Hubs and Closest to you work without it.

## What's in it

### 1. Push notifications (your package of 3 Nov)

Invitations only, never reminders. Every rule below is a pure, tested function in `web/utils/pushRules.js`.

**Two switches** in the app's Account → Notifications:
- **Discoveries** is off until the person turns it on.
- **Account updates** is on by default. It's the old `general` column, so builds 24–27 keep working.
- The I AM row is gone.

**Discoveries** go out at most once every 7 days, and at 10:00 local time.
- Admin messages and the welcome count toward the 7 days.
- Nothing goes within 48 hours of a discovery email, and a push never repeats that email's items.
- Nothing recommended in the last 90 days, nothing already saved, nothing under Never show, and no title that reads as a health claim.

Discoveries are checked in this order:
- **Invitations back:** after 10 days away, then 14 days after the first one, then nothing until they return. Each needs a strong recommendation; otherwise nothing is sent. The wording is exactly yours: with a name, "How are you feeling today, {name}?", which opens the search; without a name, it names the item and opens it.
- **New from someone they saved:** several additions are grouped into one. A single item opens that item; several open the teacher's page.
- **A free resource** for their strong subjects.

**Strong subjects** are More of, plus learned subjects when "Let Spiritpedia learn" is on.
- Search words are never used, so a crisis or distressing search can never be referred to.
- Learned subjects never include Death & the Afterlife, NDE or Mediumship. Those count only if chosen in More of.

**The welcome**, "It was lovely getting to know you, {name}…":
- It sits under Account updates (your choice) and counts toward the weekly limit.
- It goes once, at 19:00 local time the day after the first real visit: about 3 minutes in the app, a save, or a feeling search.
- If that evening is missed, it's tried on the next two evenings, then dropped.
- It doesn't name a subject.

**Account updates** have no weekly limit:
- **Review approved** opens the item.
- **Listing approved** opens the listing.
- **Claim approved** opens My Account.
- Declines are email only, and nothing is pushed for "received" events.
- A claim verified instantly gets its email only, since the person is on the page when it happens.

**Quiet hours** are 21:00–08:00 local time. An account update or admin message that falls in them waits until 08:00. Each phone sends its time zone every time it opens.

**Already looking at it:** when the app is open, it shows notifications itself on both platforms, and stays quiet if the screen the notification opens is already showing. This replaces the iPhone's own banner while the app is open.

**Admin → Notifications** (new page):
- A title, a message with `{name}`, and a version for people who gave no name (required whenever `{name}` is used).
- An optional in-app link.
- Three buttons: **Send test** (one account), **Who would get it?** (counts only) and **Send**.
- Send goes to everyone with Discoveries on. It skips anyone who had a discovery in the last week, and holds it for anyone in quiet hours until 08:00 their time.
- Below the form, counts of what was sent in the last 7 days.

**The hourly run** is `/api/cron/push`, called by Supabase pg_cron (your choice). It's for live only, set up by `supabase/scheduled/push-hourly.sql`.

Course and retreat reminders come later, as you said.

### 2. Near You: "Closest to you" (app and website)

As in `docs/reports/2026-11-03-near-you-plan.md`:
- When an area is set and nobody is within 50 km, the shelf becomes **Closest to you**.
- It shows the 10 nearest practitioners. Each card says how far away they are, in miles for the UK, the US, Liberia and Myanmar, and in km elsewhere.
- The note reads "Nobody near {town} yet. These are the closest to you."
- It always uses the area the person set, never live GPS.

### 3. Hubs, app side (job #10, now in 1.0.1)

It matches the website, using the same rules as `web/utils/listings.js`.

**New types.** The app knows `school` and `organisation`:
- A school is labelled "School" and gets the platform tier names (SHINING STAR · SCHOOL).
- Schools no longer appear on the practitioner shelves, the billboard or Near You.

**Two new shelves**, after Publishing Houses:
- **Schools & Academies** ("Train With a School").
- **Retreat Centres & Platforms** ("Discover Where They Teach"), which appears only with 5 or more organisations. Official listings come first, then by tier, then by most teachers. There's no See all.
- Explore These Channels now holds only channels and apps.

**School and organisation pages:**
- Our Teachers, with the founder first.
- A school shows its logo panel with "Founded 2008 · Visit website →".

**Teacher pages** show the "Founder of / Teaches at / Teaches on" line. Each hub name links to its page.

**Logo cards:** the SCHOOL and ORGANISATION labels are dark, so they show on the white panel.

**Small differences from the website:**
- The school card has no "View School →" text, matching the app's publisher card.
- Our Teachers respects the viewer's Never show subjects, as publisher authors already do.
- Names are sorted with Dart's own comparison, so names differing only in accents or capitals could sort a little differently.

**Not yet:** Isaac Osborne and Natalie Ramon, until their photos are confirmed. The published author badge (#15) also waits.

## Tests

- **App:** 369 pass, 1 skipped (the existing dev-only test). At build 27 it was 336.
  - New tests cover hubs (24), Closest to you, the two switches, app openings and the first visit, and staying quiet about the screen already showing.
  - `flutter analyze` finds no issues.
- **Website:** 177 pass. New tests cover the push rules (12) and Closest to you.
  - The lint is clean on every changed file, except for an `HealerCard.js` warning that was already there.

## App Privacy label (App Store Connect): what to change

**No new data types.**
- The time zone offset isn't location under Apple's definitions.
- App openings and the first-visit note are already covered by **Product Interaction**.
- The push token is already **Device ID**.

**One purpose to add, on my reading:** Apple's **"Developer's Advertising or Marketing"** purpose explicitly includes "sending marketing communications directly to your users". Admin and festival messages, and the discovery invitations, fall under that. So in App Store Connect → App Privacy, add that purpose to:
1. **Device ID** (the push token): App Functionality + **Developer's Advertising or Marketing**.
2. **Name** (used in `{name}`): App Functionality + **Developer's Advertising or Marketing**.

**Leave everything else as it is:**
- Product Interaction and Sensitive Info stay as they are. Choosing which discovery to send is already covered by **Product Personalization**.
- Everything stays linked to the user and not used for tracking.

If you'd rather treat discoveries purely as personalisation, the label can stay as it is. That's defensible, but adding the purpose is the safer reading.

**Google Play Data safety, to match:** add **Developer communications** to *Device or other IDs*. *Name* already lists it, and *App interactions* is unchanged.

**Privacy Policy:** `web/app/privacy/page.js` is updated (dated 3 Nov 2026, so it isn't legal advice). It covers:
- the two switches;
- the app-opening time and the time zone (not location);
- the first-visit note;
- what discoveries are chosen from (never search words or hidden subjects);
- the record of notifications sent, and how long it's kept.

**The wording is for your OK.** It goes live with the website push.

## Going live: the order, after your OK

1. **You:** migration 0032 on **live**.
2. **Me:** push the website. It deploys the push routes, Admin → Notifications, the approval hooks, Closest to you and the Privacy Policy.
3. **You:** on live, turn on the **pg_cron** and **pg_net** extensions. Then run `supabase/scheduled/push-hourly.sql` with the CRON_SECRET from Vercel pasted in. Don't save the query with the secret in it.
4. **Me:** build 28 for iOS (TestFlight) and Android (the closed test).
5. **You:** update the App Privacy label and Play's Data safety before 1.0.1 is submitted. Submit 1.0.1 once Apple approves 1.0.

## Also done

- **README:**
  - Android build 25 is recorded as uploaded to the closed test on 31 Oct.
  - The build table is fixed: 24 is the build in Apple review and the Google test.
  - Job #10 now points to 1.0.1.
  - Jobs #4, #12 and #19 are updated, plus §9.10, §9.11, §10.8, §10.11, §8.1 (0031 and 0032), and build row 28.
- **app/README and `docs/personalisation.md`** are brought up to date.
- **Disk:** only 5.3 GB was free. I cleared about 7 GB of my own working files from the finished content runs (temporary folders outside the repo), and 12 GB is now free. I didn't touch any of your caches; Google's and Codex's take about 8 GB between them.
- **Xcode 27** has no Simulator.app. The simulator window is in **DeviceHub** (Xcode → Open Developer Tool).
