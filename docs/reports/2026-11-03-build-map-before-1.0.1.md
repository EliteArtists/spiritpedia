# Build map before 1.0.1 (3 Nov 2026)

This is a report only: nothing was changed. It was checked against the app code (`app/`), the git history and the README. It waits for the owner's OK before 1.0.1 starts.

## 1. What's in each build since 24

Every build is version `1.0.0+N`. Each build includes everything in the builds before it.

| Build | Commit, date | Where it is | What it added |
| :--- | :--- | :--- | :--- |
| **24** | `9aca872`, 22 Oct | **Apple review** (1.0; archive `2026-10-22/Runner 3.xcarchive` kept). **Google closed test**, 15 testers | <ul><li>The welcome notification is asked for until the server confirms it.</li><li>"Turn off notifications on this phone" removes its token.</li><li>Account type shows the type set at approval.</li><li>Android: upload-key signing, the approximate-location permission, and in-app notes for notifications that arrive while the app is open.</li></ul>316 tests. |
| **25** | `b6ff298`, 27 Oct | **Android:** built (`app/build/android-release/Spiritpedia-1.0.0-25.aab`). It was planned for the closed test on 31 Oct, but the repo has no record that it was uploaded (see below). **iOS:** never uploaded; its files are deleted | <ul><li>**For You as a pill**: a page of the user's subjects on Discover, Videos and Books. The gold stars in the pillar lists. The old For You shelf removed.</li><li>**Publishing Houses** at the top of Books.</li><li>Publisher logos on white panels, with one meta line.</li><li>The **medical-care note** on homeopathy (committed 23 Oct, first shipped here).</li><li>**Co-written books** (migration 0027).</li></ul>333 tests. |
| **26** | `2b1142c`, 28 Oct | **iOS only.** Never uploaded; its files are deleted | <ul><li>For You with nothing chosen opens the same Tailor page and star words as Account.</li><li>Tailor's sections run More of · learning · Never show · Your Area.</li><li>"Do you want me to show you practitioners in your area?" with **Set Your Area**.</li><li>Clearing every choice goes back to View All quietly.</li></ul>334 tests. |
| **27** | `b8cb86d` + `3fee61e`, 28 Oct | **TestFlight** (iOS only; `app/build/ios-release/Spiritpedia-1.0.0-27.ipa`) | <ul><li>From For You, the star always says the Tailor intro.</li><li>Signed out, the learning switch is greyed, with "Sign in so I can learn from what you explore." and a **Sign in** link that keeps the user on Tailor.</li><li>The star's words on Tailor move on as soon as the page scrolls.</li></ul>336 tests. |

**Android has never had 26 or 27.** The next Android build carries everything from 25 to 27 at once.

## 2. App code committed after build 27

**None.** Since `3fee61e`, only two commits have touched `app/` (`97c7342` and `1ba4439`), and both change `app/README.md` alone. `app/pubspec.yaml` is still `1.0.0+27`. Build 27 is the current app code exactly.

## 3. Website-only features that still need app work

The app today has no idea of the School type or of hub links. Its code has no `school` type, no `hub_teachers` and no "Teaches at" or "Teaches on". So a School (White Tiger Qigong, Skies and Flora) shows in the app as an ordinary individual listing, with no type label, on the practitioner shelves. The website's Organisations (The Shift Network, Insight Timer, Omega, Commune, Kripalu, Esalen, 1440, and now IMS) show as channels in Explore These Channels, without their teachers.

| Website feature (live since) | App work needed | Where it's listed in Open jobs |
| :--- | :--- | :--- |
| **Schools** as a listing type, the school page, Schools & Academies shelf (30 Oct, `2cb1b62`, migration 0029) | Know `entity_type = 'school'`; school page; shelf; type label | **#10 Hubs: the app side** (and §17.11, "app in the build after 1.0.1") |
| **Hubs**: Our Teachers on schools and organisations, "Founder of / Teaches at" (schools) and "Teaches on" (organisations) lines on teacher pages (30 Oct, `b362123`, migration 0030) | Read `hub_teachers`; Our Teachers section; the lines on teacher pages | **#10** |
| **Retreat Centres & Platforms shelf** ("Discover Where They Teach"; organisations get their own shelf at 5 or more) (1 Nov, `23a78b0`) | Same rule as `splitOrganisations` (minimum 5, Official first, then tier, then most teachers) | **#13**, under "Organisations stay in Explore These Channels": "the app's goes in with the hubs app build" |
| **Type label fix**: SCHOOL and ORGANISATION shown in dark text on logo cards (1 Nov, `23a78b0`) | The app's `typeLabel` / `platformLabel` have no `school`. It needs adding, so the label shows on logo cards | **Not listed on its own.** It belongs with #10, but #10 doesn't name it |
| **Isaac Osborne and Natalie Ramon** for White Tiger (content, waiting for a photo) | None in code; it comes with the hubs build | **#10** (and #14) |
| **Published author badge** (not built anywhere yet) | Website first, then the app | **#15**: "the app with the hubs app build (#10)" |

Website features from the same period that the app **already has**: publishers' logo panels, the homeopathy medical-care note and co-written books (all in build 25). The Account-type wording is in build 24. The admin, broken-image, localhost image and shared-offering changes are website or admin only, so they need nothing in the app.

## 4. The plan

**Confirmed as written:**
- **1.0.1** = everything in build 27, plus **push notifications**, plus **Near You "Closest to you"**.
- It ships to **both stores**, as **build 28** (`1.0.1+28`), the next number after 27. For Android, 28 just has to be higher than 25, so it is.
- **Hubs on the app side** (#10, with the shelf, the label fix and #15's badge) follow in **1.0.2**.

**Points to settle before starting.** None of these changes the plan.
1. **Push notifications aren't designed yet in the repo.** Job #4 says Ross is designing the push package, under the "invitations only, never reminders" rule. Job #19 holds the ideas: "How are you feeling today, {name}?" and the once-only "It was lovely getting to know you". The welcome tray redesign (§16.1) belongs with it. The push plumbing has been in the app since build 6 and was checked on 22 Oct. What 1.0.1 adds is the content and timing, plus the admin composer's `{name}` placeholder. I need the package (or the owner's choice from #19) before building.
2. **"Closest to you" is marked "plan first; not built"** (job #12), for the app and the website. I'd write a short plan first: the distance cut-off, how many to show and the wording. Then build it in the app, and on the website in the same pass.
3. **Android 25:** the plan was to upload it to the closed test on 31 Oct. Nothing in the repo or README confirms it happened. Was it uploaded? Either way, 28 replaces it.
4. **Apple:** 1.0 (build 24) was in review as of the last README update. A new version can't be sent for review while 1.0 is still in review, but build 28 can go to TestFlight.
5. **The App Privacy label** (§12.6) has to be rechecked before 1.0.1, as README §1 says. It matters more if "Closest to you" uses location in a new way.
6. **The first Android build since 28 Oct downloads about 3.5 GB** (the Gradle cache was cleared). About 36 GB was free on 30 Oct. Use one simulator at a time.
7. **A README error to fix when 1.0.1 starts:** the build table (§10.1) says build 24 was "built, never uploaded". In fact 24 is the build in Apple review and in the Google closed test.

Waiting for the owner's OK before 1.0.1 starts.
