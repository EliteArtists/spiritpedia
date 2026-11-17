# Outreach, 17 Nov 2026: what was done

## 1. The TEST listing and journey: deleted

- "TEST Outreach Journey", its journey and its message record are gone from
  live. I checked: nothing named `test-outreach…` is left.
- Your real activity today is untouched:
  - the journey you started for **Karina Grant** at 11:11. Email 1 went to
    her own address (not the test address) and is marked delivered.
  - the form contact you recorded for **Amanda Johnson**.

## 2. The app line in every outreach email

**Copy documents first:**
- `docs/email-copy-2026-10-21.md` (the practitioner sequence and D7)
- `docs/email-copy-2026-11-11-shared-journey.md` (channels, apps,
  organisations, schools and publishers)

**Then the code**, in plain text with no images:

- **Footer of every outreach email**, all eight, for every kind. Under the
  sign-off, after a dash line:

  > Spiritpedia is even better on the app: spiritpedia.co/get-app

- **Email 1's body**, both sequences: one sentence added after the one that
  says what Spiritpedia is, taken from your About page wording: "It's free, on
  the web and on the App Store and Google Play."
- **Claim approved (D7)**, a new line before "If you need a hand…":

  > Spiritpedia is also on the App Store and Google Play: spiritpedia.co/get-app

- Tests check the footer on all 48 outreach emails (8 practitioner, 40
  shared), the app sentence only in email 1, and D7's line. 234 website tests
  pass.

### Email 1 for a practitioner

```
Subject: An invitation from Spiritpedia

Hi Karina,

We came across your work on social sites and wanted to get in contact.

Spiritpedia is a place where people can discover spiritual teachers and practitioners, explore their work and find out how to book their services. It's free, on the web and on the App Store and Google Play. We'd love to interview you about what you do and the people you help. Would you be open to a conversation? You can simply reply to this email.

We've also made a short public listing for you from information available online. You can view it here: https://www.spiritpedia.co/healers/karina-grant. You haven't joined Spiritpedia or approved the listing. If you'd like to take charge of it, you can claim it here: https://www.spiritpedia.co/auth/claim?slug=karina-grant.

If anything is inaccurate, or you'd rather we remove the listing, reply and we'll take care of it. The interview is entirely optional.

With love,
The Spiritpedia team

—
Spiritpedia is even better on the app: spiritpedia.co/get-app
```

(Karina's email 1 went this morning, before this change, so she got the
earlier wording. Her email 2 onwards will have the footer.)

### Email 1 for an organisation

```
Subject: An invitation from Spiritpedia

Hello,

We came across your organisation and wanted to get in contact.

Spiritpedia is a place where people can discover spiritual teachings, communities and resources. It's free, on the web and on the App Store and Google Play. We'd love to speak with someone from your team about your work and the people it's intended for. Would you be open to a conversation? You can simply reply to this email.

We've made a free public listing for Grateful Living from information available online: https://www.spiritpedia.co/healers/grateful-living. You haven't joined Spiritpedia or approved the listing. If you'd like to take charge of it, you can claim it here: https://www.spiritpedia.co/auth/claim?slug=grateful-living.

To stop these emails, simply reply.

If anything is inaccurate, or you'd rather we remove the listing, reply and we'll take care of it. The interview is entirely optional.

With love,
The Spiritpedia team

—
Spiritpedia is even better on the app: spiritpedia.co/get-app
```

**Please check:**
- "It's free" is your About wording. In an invitation it could be read as
  "free for you to be listed". That's true today, but the solicitor
  questions in the shared copy ask about promising free participation. Say
  if you'd rather it read "It's free to use".
- The footer address is written short (`spiritpedia.co/get-app`), as you gave
  it. Gmail and Apple Mail make it a link; a few mail programs may show it
  as plain text.

## 3. Admin → Outreach: every journey, every kind

- **The list already showed every journey of every kind**, with filters:
  - by kind: Individuals, Channels, Apps, Organisations, Schools, Publishers;
  - by state: Running, Paused, Replied, Claimed, Contacted via form,
    Sequence complete, Do not contact, Stopped, each with a count.
- It probably looked publisher-only because the panel at the top is
  "Start a journey for a publisher", and the note under the heading said
  only individuals could be started. That note now says every kind is listed
  and where each is started.
- **Switched on for every kind.** You chose to switch the shared journeys on.
  Channels, apps, organisations, schools and publishers can now be started.
  Nothing starts by itself.

### Where the Start button is

**Practitioner, channel, app, organisation or school:**
1. Admin → **Content**.
2. Search for the listing and open it.
3. Click the **Outreach** tab, next to Profile and Content.
4. Click **Start email journey**. The line beside it shows the address email
   1 goes to. If it can't start, it says why instead (claimed, no address,
   asked to stop, or an inbox type that isn't allowed).

**Publisher** (publishers have no listing page in the admin):
1. Admin → **Publishers**.
2. Click **Email journey** on the publisher's row (new). It opens Admin →
   Outreach with that publisher already chosen.
3. Click **Start email journey**.
4. Or search for it in the "Start a journey for a publisher" panel on Admin
   → Outreach.

### Checked on every kind

- **How:**
  - Six TEST listings on **dev**, one per kind.
  - A local copy of the website.
  - Each Start button pressed in a real browser.
  - Emails redirected to rossbaiken+journeytest@gmail.com.
- **Result:**
  - All six said "Email 1 sent to rossbaiken+journeytest@gmail.com — the test
    address". Resend reports all six **delivered**.
  - All six appeared in the Outreach list with the right kind, Running and
    "1 of 8 sent".
- **Cleanup:** the TEST listings and journeys were deleted from dev
  afterwards. Nothing was started on live.
- **In your test inbox:** six test emails, "An invitation from Spiritpedia",
  sent early this afternoon. You can delete them.

## 4. No real journeys started

None. The only live journeys are the two you made today.

## Also

- **Next.js security warning:** the website's framework (Next.js 16.4.1)
  now warns of a known security problem on every build, and one of today's
  two local builds stopped on it. 16.4.6 is out. I haven't upgraded it.
  Upgrading in a separate commit is worth doing soon, and it would also stop
  a deploy from failing on this. Say if you want me to.
- The admin guide (Outreach and Gaps), `docs/emails.md` and the README are
  updated.

## For you to decide

- "It's free" in email 1, as is or "It's free to use" (section 2).
- The Next.js upgrade.

---

# Afternoon decisions, 17 Nov

## 1. "It's free to use"

Email 1 in both sequences now reads "It's free to use, on the web and on the
App Store and Google Play." I changed the copy documents first. Commit
`112ef7e5`.

## 2. Next.js 16.4.6

- The website is upgraded from 16.4.1 to 16.4.6, in its own commit
  (`67028d68`). The ESLint settings stay as they were.
- The build passes with no security warning, and all 234 tests pass.
- It is deployed: the live site is serving the new build.

## 3. App 1.0.2 (build 29), built for both stores

Built from `~/Sites/spiritpedia-1.0.2` with `tool/build_release.sh`.

**iPhone and iPad:**
- Archive: `~/Sites/spiritpedia-1.0.2/app/build/ios/archive/Runner.xcarchive`.
  It is **open in Xcode's Organizer** as Spiritpedia 1.0.2 (29), ready for
  Distribute App → App Store Connect → Upload.
- IPA, if you'd rather use Transporter:
  `~/Sites/spiritpedia-1.0.2/app/build/ios/ipa/Spiritpedia.ipa`.
- Checked: version 1.0.2, build 29, `co.spiritpedia.app`, push set to
  production, iPhone and iPad, all four iPad orientations.

**Android:**
- The file to upload to Play Console:
  `/Users/SundaySouLounge/Sites/spiritpedia-1.0.2/app/build/android-release/Spiritpedia-1.0.2-29.aab`
  (61 MB).
- Checked: version 1.0.2, version code 29, and it's signed with the Play
  upload key (SHA-256 `29:35:1F:…:27:CE`), not the debug key.

**Disk:** before building I cleared regenerable space: Xcode DerivedData,
the website's `.next` folder, and the app's test caches and simulator
builds. That took it from 4.8 GB free to 8.4 GB.

**Next:** follow section 5 of `docs/reports/2026-11-16-owner-answers-evening.md`
for review and release. Quit Xcode after the upload.
