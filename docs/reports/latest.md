# End-of-session handover — 19 Nov 2026

## 1. Git

Everything is committed and pushed to `main`; the working tree is clean. The only files
not in git are the ignored ones (env files, `app/config/dev.json`, build folders,
`web/AGENTS.md`, `.claude/scheduled_tasks.lock`, `.DS_Store`). `supabase/.temp/` (made by
the Supabase CLI) is now in `.gitignore`.

## 2. README brought up to date

- **Start here (handover, 19 Nov 2026)**, straight after the introduction, covers where
  things are, the recent decisions (newest first) and the open items:
  - 1.0.2 is live in both stores and merged;
  - outreach is running for real, with the first email 2s due 8 Dec;
  - night sprints are paused.
- **The owner's jobs table:** the Google Play rows are now one "Done" row, with two new
  open rows (Andrea Kennedy, the restore kit).
- **Open jobs:** item 1 (store status) is replaced; push, the hubs app side and Near You
  are marked shipped.
- **§1 Where things stand** is rewritten for 19 Nov.
- **§5:** `JOURNEY_TEST_EMAIL` no longer redirects on Vercel. `RESEND_WEBHOOK_SECRET` is
  added to the Vercel list. Vercel holds the real `CRON_SECRET`.
- **§13:** the 18 Nov disk notes and "never `flutter clean` in `main`".

## 3. New README sections

- **§21 Running Spiritpedia without Claude Code:**
  - each automatic job and where to check it's healthy;
  - the owner's day in the admin (Inbox, Up next, Reports, Claims, owner requests with
    the editing tools and the lock, Reviews);
  - what still needs Claude Code (migrations, app builds, content sprints, code).
- **§22 Restore on a new Mac:** the local-only items and where each is backed up, plus a
  checklist.

## 4. The admin at iPad sizes: checked and fixed

I checked every admin screen and every tab at **768×1024 and 1024×1366 (portrait)** and
**1024×768 and 1366×1024 (landscape)**. This ran on a local server against dev, with a
throwaway admin password and no email key. I checked for sideways scrolling, clipped
boxes, squeezed text and errors, and looked at the screenshots by eye.

Fixed, then deployed (website live, checked):

1. **Inbox queue, portrait:** the five-column grid left the Person / Detail column with
   no width, so the names and details disappeared. Below 1024 px each item is now a
   card.
2. **Inbox totals, landscape:** eight tiles across were too narrow for "Publishers" and
   "Resources". They now go eight across only from 1280 px.
3. **A listing's header, portrait:** the name and badges were squeezed into a narrow
   column beside the buttons. The buttons now go under the name.
4. **Ingestion tabs, portrait:** six tabs wrapped to three lines each. They're now a
   grid: two columns on a phone, three on an iPad, six on a wide screen.
5. **Content list:** a row with four badges ran past the edge. The badges now wrap.

The sidebar scrolls in landscape, so Logout stays reachable. `/admin/analytics` forwards
to Activity on purpose. 249 tests pass, and the build passes.

## 5. Things that exist only on this Mac (not in git)

These were left where they are; nothing was moved or deleted. Paths:

- **`web/.env.local`:** live keys. Its `CRON_SECRET` doesn't match Vercel's (see §6).
- **`web/.env.development.local`:** dev keys, including the dev Firebase service account.
- **`app/config/dev.json`:** dev app config, public values only. (`app/config/prod.json`
  **is in git** on purpose: public values only.)
- **`~/.secrets/spiritpedia/android/upload-keystore.jks`:** the Play upload key.
- **`~/.secrets/spiritpedia/android/key.properties`:** its passwords, alias and path.
- **`~/.secrets/spiritpedia/firebase/live-spiritpedia-ad62b.json`** and
  **`dev-spiritpedia-dev-5e4d5.json`:** the Firebase service accounts.
- **Store builds:**
  - `app/build/ios-release/Spiritpedia-1.0.0-27.ipa`, `-1.0.1-28.ipa` and `-1.0.2-29.ipa`;
  - `app/build/android-release/Spiritpedia-1.0.0-25.aab`, `-1.0.1-28.aab` and
    `-1.0.2-29.aab`;
  - the archives in `~/Library/Developer/Xcode/Archives/2026-10-28`, `2026-11-03` and
    `2026-11-17` (two copies of 1.0.2).
- **Claude Code memory:** `~/.claude/projects/-Users-SundaySouLounge-Sites-spiritpedia/memory/`
  (15 files).
- **`~/.ssh/id_ed25519`:** the GitHub SSH key.
- **`docs/image-fixes/*.sheet.png`:** broken-image contact sheets. These can be remade.

For `~/.secrets` I listed only file names and the four field names in `key.properties`
(storePassword, keyPassword, keyAlias, storeFile). I read no values. Not Spiritpedia's:
`~/Documents/elite-artists-android.jks`.

## 6. Scheduled jobs on the server

I checked these read-only on live:

| Job | Last trace | Verdict |
|---|---|---|
| Image audit (07:00) | Ran 07:01 today (shard 4 of 7, 360 checked, no error); also ran on each of the three days before | Running |
| Journey emails (08:00) | Nothing is due yet: all 52 journeys started 17–18 Nov, and the first email 2s fall due 8 Dec. No journey is overdue | Can't be proved by a send until 8 Dec; check Vercel's cron log (below) |
| Account emails (09:00) | Last sends 09:00 on 17 Nov and 14 Nov (Day 4) | Running |
| Push (hourly, Supabase pg_cron) | Last send 10:05 on 17 Nov (five past the hour, so the hourly run). Earlier sends 9 Nov and 5 Nov at 19:05 | Ran then, which means Supabase's copy of the secret matches Vercel's. Few pushes are due, so it's quiet |
| Resend webhook | All 51 outreach emails have a delivered event; 6 also bounced | Working |

**I couldn't read the run logs themselves.** Vercel's cron logs and Supabase's cron
history need your logins. I also tried a dry run of the push job (it sends nothing), but
the website refused it (401): the `CRON_SECRET` in `web/.env.local` is out of date. I
didn't try another way in. To see each job's last run:

- **Vercel:** `spiritpedia-e58y` → Settings → Cron Jobs → each job → View logs. Expect a
  200 at each job's time.
- **Supabase (live):** in the SQL editor, run
  `select status_code, created from net._http_response order by created desc limit 5;`.
  Expect 200s at :05 each hour.

## 7. Restore kit

| Needed to rebuild | Status |
|---|---|
| Website env files (`web/.env.local`, `web/.env.development.local`) | **Backed up by you** (Apple Passwords). The live file's `CRON_SECRET` is stale: copy Vercel's value into it and into the backup |
| `app/config/prod.json` | **In git**, and backed up by you |
| `app/config/dev.json` | **STILL MISSING**. Low stakes: public dev values, can be rebuilt from `dev.example.json` |
| Android upload keystore (`upload-keystore.jks`) | **Backed up by you** (Google Drive) |
| Its passwords (`key.properties`) | **STILL MISSING**, unless your Drive copy included this file. Without the passwords the `.jks` can't sign anything |
| Firebase service account, live (`live-spiritpedia-ad62b.json`) | **STILL MISSING** as a file. Its three values are on Vercel, and Firebase can make a new key, so it's recoverable |
| Firebase service account, dev | Covered: its values are in `web/.env.development.local` |
| Firebase app config (iOS and Android) | **In git** (`app/lib/core/firebase/options_*.dart`); the app uses no `google-services.json` or `GoogleService-Info.plist` |
| Apple signing | Nothing to back up. Xcode's automatic signing (team KT2XV84345) makes the certificates on a new Mac after you sign in |
| APNs key | In the Firebase console (both projects); not needed for a rebuild |
| Store builds (.ipa, .aab) | **Backed up by you** (Google Drive) |
| Xcode archives (with crash symbols) | **STILL MISSING**. Optional: only needed to read crash reports for those builds |
| Claude Code memory | **STILL MISSING**. Optional: the README holds the rules |
| GitHub access | Make a new SSH key on the new Mac |

**I haven't printed the missing files here.** Two rules from earlier say never print
env or key values, and leave `~/.secrets` alone. Anything shown in this terminal is also
saved in the session log, which is the wrong place for passwords and private keys.

Instead, run each line below in your own **Terminal** app, not with `!` in Claude Code.
Each one copies a file to the clipboard without showing it. Then paste into a new Apple
Passwords note:

```
pbcopy < ~/.secrets/spiritpedia/android/key.properties
pbcopy < ~/.secrets/spiritpedia/firebase/live-spiritpedia-ad62b.json
pbcopy < ~/Sites/spiritpedia/app/config/dev.json
```

For the optional archives, copy `~/Library/Developer/Xcode/Archives/2026-11-17` (and
`2026-11-03`, `2026-10-28`) to Google Drive. The **Restore on a new Mac** checklist is
README §22.
