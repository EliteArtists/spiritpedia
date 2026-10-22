# Google Play: everything to fill in

Prepared on 22 October 2026 for the first upload of **Spiritpedia 1.0.0 (24)**
(`co.spiritpedia.app`). The answers come from what the code actually does
(`app/lib`, the website's API routes and the Privacy Policy), not from
memory. If the app changes what it collects, change this file and the App
Store label (README §12.6) together.

The developer account is a **personal** account (love@spiritpedia.co), so
Google requires a **closed test with at least 12 testers for 14 days in a
row** before you can apply for production. Testers come from Testers
Community.

---

## 1. Before the first upload

1. **App signing:** when asked, choose **Use Google-generated key** (Play App
   Signing). Google keeps the key that signs what people install; our
   **upload key** only proves an upload is ours. Its certificate:
   - SHA-256 `29:35:1F:3F:FB:79:F8:35:1B:2A:DD:21:9E:DA:A3:28:3D:F7:11:F7:14:EA:31:BE:D7:31:13:EE:87:D2:27:CE`
   - The key itself: `~/.secrets/spiritpedia/android/` (README §12.8).
2. **The file to upload:**
   `app/build/android-release/Spiritpedia-1.0.0-24.aab` (60.8 MB, version
   code 24, version name 1.0.0, target API 36, minimum API 24, 16 KB page
   aligned).
3. **Create the app:** Play Console → **Create app** → App name
   `Spiritpedia` → Default language English (United Kingdom) → **App** →
   **Free** → tick both declarations → Create app.

## 2. App content (Policy → App content)

| Item | Answer |
| :--- | :--- |
| **Privacy policy** | `https://www.spiritpedia.co/privacy` |
| **App access** | **All or some functionality is restricted.** Browsing, search and every page work without an account; saving, reviews, Tailor Spiritpedia and notifications need one. Sign-in is by a 6-digit code emailed to the address entered, so a reviewer can't use a shared password. Add an instruction: "Everything can be browsed without signing in. To try account features, enter any email address you can read; a 6-digit code is emailed to it, and a new address becomes a free account." (See §6 below: Google may still ask for a test login.) |
| **Ads** | **No, my app does not contain ads.** (Amazon links are affiliate links to books, not ads served by an ad network; there is no ad SDK.) |
| **Content rating** | See §3 |
| **Target audience** | **16–17** and **18 and over** (the Terms: "To create an account you must be at least 16 years old"). Not designed for children; do **not** tick any age under 13. Answer **No** to "Could your store listing unintentionally appeal to children?" |
| **News app** | No |
| **COVID-19 contact tracing / status** | No |
| **Data safety** | See §4 |
| **Government app** | No |
| **Financial features** | My app doesn't provide any financial features |
| **Health apps** | Spiritpedia is a directory of teachers, videos, books and practices, with no health tracking, diagnosis or treatment. Suggested category **Lifestyle**. If the health declaration asks, tick only the wellbeing/meditation-style option it offers (mindfulness, stress, relaxation) and **not** anything clinical. The feelings search sends anyone in crisis to helplines first (README §11) |
| **Advertising ID** | **No** — the app doesn't use it (the merged manifest has no `AD_ID` permission) |

## 3. Content rating (IARC questionnaire)

Category: **Reference, News, or Educational** (if offered; otherwise "All
other app types"). Email for the certificate: love@spiritpedia.co.

| Question | Answer | Why |
| :--- | :--- | :--- |
| Violence, blood, gore | No | |
| Sexual content or nudity | No | |
| Profanity or crude humour | No | |
| Controlled substances (drugs, alcohol, tobacco) | **Yes — references only** | Teacher biographies and videos discuss psychedelic research and therapy (e.g. Stanislav Grof, Paul Stamets). Nothing sold or encouraged |
| Gambling, simulated gambling | No | |
| Fear / horror | No | |
| Users can interact or exchange content | **Yes** | Reviews are public after moderation; users can report a review and block a reviewer |
| Shares the user's location with other users | No | The area is used to find practitioners near you; nobody else sees it |
| Digital purchases | No | Course prices link out to the teacher's own site |
| Unrestricted internet access / web browser | No | Links open in the phone's browser |

Expect a **Teen / PEGI 12**-type rating because of the drug references and
user content. Answer the same way each time; the questions change slightly.

## 4. Data safety

**Overview answers:**
- Does your app collect or share any of the required user data types? **Yes**
- Is all of the user data collected by your app encrypted in transit? **Yes**
  (HTTPS only)
- Do you provide a way for users to request that their data is deleted?
  **Yes** — in the app (Account → Delete account) and on the website. Deletion
  URL: `https://www.spiritpedia.co/account` (sign in, then **Delete
  account**; it takes effect at once). Users can also email
  love@spiritpedia.co.
- Shared with third parties: **No** for every type below. Supabase, Vercel,
  Google Firebase and Resend process data **on our behalf** (service
  providers), which Play does not count as sharing.

**Data types collected** (tick only these):

| Category → type | Optional? | Purposes | What it is in the app |
| :--- | :--- | :--- | :--- |
| Personal info → **Email address** | Optional (browsing needs no account) | App functionality, Account management, Developer communications | Sign-in codes, account, account emails, Day 4 and discovery emails (switchable) |
| Personal info → **Name** | Optional | App functionality, Developer communications | "Your name", used to greet and in emails |
| Personal info → **User IDs** | Optional | App functionality, Account management | The account ID |
| Personal info → **Political or religious beliefs** | Optional | App functionality, Personalization | Tailor Spiritpedia interests and learned subjects (spiritual practices). Declared to match the App Store label's Sensitive Info |
| Location → **Approximate location** | Optional | App functionality, Personalization | "Use my location": a position rounded to about a kilometre finds a town; only the town and country are kept |
| App activity → **App interactions** | Optional | App functionality, Analytics, Personalization | Saves (My Library); activity learning when switched on; anonymous totals |
| App activity → **In-app search history** | Optional | App functionality, Analytics, Personalization | Feelings and content searches, in anonymous totals, and kept per account only with learning on |
| App activity → **Other user-generated content** | Optional | App functionality | Reviews, reports, blocks |
| Device or other IDs → **Device or other IDs** | Optional | App functionality | The notification token (Firebase Cloud Messaging), only after the person turns notifications on |

For each, when asked: **Collected** yes; **Shared** no; **Processed
ephemerally** no (except Approximate location: the position itself is
ephemeral but the town is kept, so answer **no**); **Required or optional:**
optional.

**Not collected** (leave unticked): phone number, address, race, sexual
orientation, financial info, health and fitness, messages, photos and
videos, audio, files, calendar, contacts, web browsing history, crash logs,
diagnostics, precise location, installed apps.

## 5. Store listing (Grow → Store presence → Main store listing)

| Field | What's needed |
| :--- | :--- |
| App name | Spiritpedia |
| Short description (80 characters) | To write. Suggestion: "Timeless wisdom in one calm place, with an emotional way in." (60) |
| Full description (4,000) | Reuse the App Store description |
| App icon | **512 × 512 PNG**: ready at `app/build/android-release/play-icon-512.png` (the iOS 1024 px icon, `app/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-1024x1024@1x.png`, scaled down) |
| Feature graphic | **1024 × 500** PNG or JPG — **to make** |
| Phone screenshots | 2–8, 16:9 or 9:16, at least 1080 px on the short side — take from the Pixel 8 emulator (README §12.8) |
| Tablet screenshots | Optional for now; the iPad set can't be reused (different shape is fine, but they must show Android) |
| Category | Lifestyle |
| Contact email | love@spiritpedia.co |
| Website | https://www.spiritpedia.co |

## 6. Testing → Closed testing (personal accounts)

1. **Testing → Closed testing → Create track** (or use "Alpha").
2. **Testers:** create an email list with the Testers Community addresses
   (at least 12; add a few spare in case some drop out — the 12 must stay
   opted in for the whole 14 days).
3. **Create new release** → upload the `.aab` → release name `1.0.0 (24)` →
   release notes → **Review release** → **Start rollout to Closed testing**.
4. Copy the **opt-in link** and give it to the testers.
5. After **14 continuous days** with 12+ testers, **Dashboard → Apply for
   production** (Google asks a few questions about the test).

**Things that could block review:**
- **App access:** reviewers may insist on a working login. If they do, the
  options are a reviewer account whose inbox they can read (they won't have
  one) or a review-only sign-in path; decide before submitting to production.
  This is the same question Apple's review can raise.
- **Health / wellbeing:** keep the listing's wording away from treatment or
  cure claims (the same rule as the discovery editions' health-claim filter).

## 7. After the first Android release

- The app's Android push works end to end (checked 22 Oct 2026 on the Pixel 8
  emulator, Android 14: the permission prompt, a test notification in the
  background, the in-app note while open, turning off removes the token).
- Every later upload needs a higher version code: bump `version: 1.0.0+N` in
  `app/pubspec.yaml`, as for iOS.
