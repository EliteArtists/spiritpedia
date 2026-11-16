# Owner's answers, 16 Nov evening: what was done

## 1. Resend webhook and the second test email

- **Fresh production deploy:** the homepage change below (commit
  `663e9b42`) redeployed the website with your new secret.
- **Webhook check:** the webhook address used to answer
  "webhook_secret_not_set". It now answers "bad_signature" to an unsigned
  test, so the secret is in place and Resend's signed reports get through.
- **Second test email:** the TEST listing ("TEST Outreach Journey") and its
  journey were made again on live. Only one journey can run per listing, so
  this afternoon's, whose email could never be marked delivered, was deleted
  first. Email 1 went to **rossbaiken+journeytest@gmail.com** at **17:59 UK
  time**.
- **Delivered:** live recorded it as delivered at 17:59:51, about 1.5 seconds
  after sending, from Resend's webhook. Admin → Outreach should show the TEST
  listing with email 1 sent and delivered.
- **Bounces:** these use the same webhook, so a bounced address will now stop
  its journey on its own.
- **Not deleted yet.** The TEST listing and journey stay until you say you've
  seen them. Nothing more will be sent, because email 2 isn't due for 21
  days.
- The admin guide's gap note about "Delivered" has been removed.

## 2. Migration 0052

Run on dev and live (owner). The Get the app panel in Admin → Activity now
counts taps.

## 3. Welcome card and welcome email

Kept as they are.

## 4. Homepage: fewer cards per shelf at first

- Every homepage shelf now draws its first **12 cards**, and 12 more each
  time the end of the row comes near, the same way subject pages load theirs.
  Nothing is hidden: scrolling along a row reaches every card (checked on the
  Worldwide row: 12, 24, 36, 48, then all 59).
- The same applies to every other row built the same way (My Library,
  teacher pages' "near you" rows, Explore More).
- Measured on a local build against live's data, at phone size:

| | Before today | After this afternoon | Now |
| :--- | :--- | :--- | :--- |
| Images in the first load | 3,093 | 3,093 | 194 |
| Page size | 7.8 MB | 7.8 MB | 3.9 MB |
| Main-thread work while scrolling (phone, slowed 4×) | 2.0 s | 1.0 s | 0.4 s |

- Files: `web/components/ShelfTrack.jsx` (new), `web/components/ContentShelf.js`.
  Commit `663e9b42`.

## 5. App 1.0.2 (built; ready for you to build and submit)

Everything is on the local branch `release/1.0.2`, version **1.0.2, build
29**. The branch still said 1.0.1 (28), the build already submitted, so it
was raised. All 383 app tests pass, and `flutter analyze` is clean. No store
build was made: building and uploading is yours.

**New since this afternoon:**
1. **Near You never hides anyone.** Once an area is set, it shows every
   practitioner, nearest first, with how far away each is, and those with no
   town last. "Closest to you" is the same full list, no longer the ten
   nearest. (`db781026`)
2. **Subject search spellings:** "breath work", "tai-chi" and "quantumtouch"
   find the right subject. The feelings search and the crisis check are
   unchanged. (`7d3f00e0`)
3. **Subject pages in tier order:** Superhero, Ascended Master, Luminary, then
   the rest. Once an area is set, nearest first within each tier. Channels and
   apps put Spiritpedia's own first. (`1105779a`)
4. **The newer build script** from `main`: `app/tool/build_release.sh`
   refuses to build if the store settings are missing or incomplete.
   (`ef617e3f`)

**Already on the branch:** the two crisis-check fixes, Amazon offering links
with their disclosure, the disclosure sentence in the menu, nearest-first
Schools and Retreat Centres, Buy on Amazon taps counted, and the School
label.

**Deep links** wait for 1.0.3, as you said.

### Before you start

- **Apple:** 1.0.2 can only go to review once 1.0.1 (build 28) is approved.
  If 1.0.1 is still in review, you can still upload build 29 and test it in
  TestFlight.
- **Google Play:** production needs production access. If it hasn't been
  granted yet, build 29 can go to closed testing.
- **A copy of the app on the 1.0.2 branch is ready** at
  `~/Sites/spiritpedia-1.0.2`, so building it doesn't touch the main folder.
  - Its first iPhone build sets up its own build files, which takes extra
    time and disk space.
  - Check free space first: `df -h /System/Volumes/Data`. It needs a few GB
    (README §13).
- **Optional:** as with 1.0.1, I can open it in the simulator first so you
  can look at Near You and a subject page before you build. Say if you want
  that.

### Build and upload for iPhone and iPad

1. In Terminal: `cd ~/Sites/spiritpedia-1.0.2/app`
2. Run `tool/build_release.sh ios`.
   - If it says "Refusing to build", a value is missing from
     `config/prod.json`. Tell me which one.
3. When it finishes, run `open build/ios/archive/Runner.xcarchive`.
4. In Xcode's Organizer, choose **Spiritpedia 1.0.2 (29)** → **Distribute
   App** → **App Store Connect** → **Upload**. Keep the defaults.
   - Or drag `build/ios/ipa/Spiritpedia.ipa` into Transporter and click
     **Deliver**.
5. Quit Xcode when the upload finishes, because this Mac is short of memory.
6. In App Store Connect → Spiritpedia → TestFlight, wait for build 29 to
   finish processing. If asked about encryption, answer standard encryption
   only.

### Submit to Apple (once 1.0.1 is approved)

7. App Store Connect → Spiritpedia → **+** beside iOS App → version
   **1.0.2**.
8. Under Build, choose **29**.
9. Paste the "What's new" text below.
10. App Privacy needs no change. 1.0.2 collects no new kind of data: an Amazon
    tap is counted with nobody's name or account attached.
11. **Add for Review** → **Submit**. A demo account is only needed if Apple
    asks.

### Build and upload for Android

12. In the same Terminal folder, run `tool/build_release.sh android`.
13. The file is `build/app/outputs/bundle/release/app-release.aab`.
14. Play Console → Spiritpedia:
    - If production access is granted: **Production** → **Create new
      release**.
    - If not: **Testing** → **Closed testing** → your track → **Create new
      release**.
15. Upload the `.aab` and name the release **1.0.2 (29)**.
16. Paste the "What's new" text below into the release notes.
17. **Next** → **Save** → **Send for review** (or **Start rollout**).

### What's new in 1.0.2 (for both stores)

> - Near You now shows every practitioner, nearest first, with how far away
>   each one is.
> - Subject pages list teachers by tier, nearest first within each tier once
>   you've set your area.
> - Schools & Academies and Retreat Centres & Platforms show the nearest
>   first once you've set your area.
> - Subject search is more forgiving: "breath work" or "tai-chi" find the
>   right subject.
> - We now recognise more ways of writing phrases that mean someone may need
>   support, so help is offered when it's needed.
> - Amazon links carry a clear affiliate disclosure.
> - School accounts are labelled School in My Account.

### After it's in both stores

- Tell me, and I'll merge `release/1.0.2` into `main` (that also fixes
  `main`'s safety test) and update the README's Near You notes.
- Admin → Activity will then count Buy on Amazon taps from the app too.

## 6. Amazon Associates

You're adding the App Store and Google Play links yourself.

## For you to decide

- Look at Admin → Outreach for the TEST listing (sent and delivered), then
  tell me to delete it and its journey.
- Whether you want a simulator look at 1.0.2 before building it.
- Build and submit 1.0.2 (section 5). On Apple, it can only go to review once
  1.0.1 is approved.
- Then tell me it's in both stores, so I can merge the branch.
