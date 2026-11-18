# Owner requests and admin editing — 18 Nov 2026

## Andrea Kennedy (Mainstream Reiki), not claiming: done on dev and live

- **Removed:** all 6 offerings with their prices and pages (Reiki I & II, Reiki Master,
  Karuna Reiki® Master, Reiki Business Success Course, Mainstream Reiki Community
  Membership, Heavenly Banquet Hall Experience), and her 3 free resources (channelled audio
  posts). Their pages now return 404. The broken-image row for the membership is cleared.
- **Bio:** cut to its first paragraph plus "She is best known for her library of free
  distance Reiki sessions on YouTube." (91 words, was 220). The part that went described
  her paid training and membership.
- **Links:** website set to https://www.mainstreamreiki.com; the booking link, Instagram
  and Facebook removed.
- **Kept:** her photo, her 21 videos (none priced), the YouTube channel link, her contact
  email and "Teaches on Omega Institute". She has no books.
- **Journey:** marked replied on live (no email 2 was sent).
- **Lock:** "owner request — keep minimal (18 Nov 2026)", set by migration 0053 when it
  runs.
- **Backups** of every row changed or removed: `docs/owner-requests/2026-11-18-andrea-kennedy.{dev,live}.backup.json`.
  Logged in `docs/owner-requests/README.md`.

## Mike Maher (Take a Deep Breath)

He claimed at 13:26 today. **His journey had not stopped:** it was still "running", because
a claim was only noticed by the daily email run, which checks just before each email. He
would not have received email 2, but the journey sat open. It is now **stopped, "claimed"**
on live, with only email 1 sent.

**From now on every claim stops its journey at once:** the instant claim, a claim request
approved, and an application approved for an existing listing or publisher
(`utils/journey.js` → `stopJourneyOnClaim`). Migration 0053 adds a database trigger that
does the same, whatever links the account, and stops any claimed journey still running
when it is run.

## Standing rule

README §20.1, with a line in §18.4, the night-sprint brief and the skill: owner change and
removal requests are done within a day, the listing is locked, the journey stopped and the
request logged.

## Admin → Content → listing → Content (website)

- **Edit** any video, book, offering or free resource: title, description, price, link and
  image, as the item has them. Links must start https://.
- **×** removes one item, after a confirm. **Remove all** removes every item of one type
  (videos, books, offerings, free resources), after a confirm with the count.
- **Lock** on and off with a note. While locked, the database refuses any new item
  (whatever sends it), and `ingest.mjs`, `link-hub.mjs` and `fix-images.mjs` stop or skip the
  listing. A **Keep minimal** badge shows by the name, and Ops has a **Locked listings**
  list. Lock notes live in an admin-only table, not on the public listing.
- **Change log** of every change made there, with the rows as they were before.
- Every change goes through `/api/admin/listing-edit`, which checks the item belongs to
  that listing.

**Tested on dev** (local server, a throwaway listing with one of each item type, deleted
afterwards). These worked: an offering edit (title changed, price cleared), a link without
https refused, a book's description and image changed, one free resource removed, all 3
offerings removed in one go, both confirms, and phone width with no sideways scroll.
Before 0053 the tab says the lock and the log need it, and the lock answers "needs
migration 0053". **Not yet tested:** the lock and the change log themselves, which need
0053 on dev. 249 tests pass, and the build passes.

## For you

1. **Run migration 0053** (`supabase/migrations/0053_listing_locks_and_edit_log.sql`) on
   dev and tell me. I'll test the lock, the refusal and the change log on dev. Then run it
   on live, which locks Andrea. Expected check row: true, 4, true, 1, 1, 0.
2. **Andrea's contact email and YouTube link are still on her listing.** You said to keep
   "only her short bio, her photo and her website link". I left these two because the
   videos come from that channel and the email is how visitors reach her. Say if they
   should go too.

## Migration 0053 tested on dev (18 Nov 2026, after the owner ran it: true, 4, true, 1, 1, 0)

All of these ran on a throwaway dev listing and account, deleted afterwards. Dev now holds only Andrea's lock and its log line.
- **Lock:** Switch lock on and off in the Content tab both work. Each writes a `listing_locks` row (or removes it) and a log line; the Keep minimal badge and the panel show.
- **Refusal:** with the lock on, adding a video, a book, an offering or a free resource was refused by the database, both for the test listing and for Andrea. The Ingestion form's route gives the reason in words. `ingest.mjs` stopped with "is locked … Nothing inserted" and didn't apply its profile update, and `link-hub.mjs` refused to link. `fix-images.mjs` reads both locks. With the lock off, all four inserts went in again.
- **Edits while locked:** editing, removing one and removing all still work.
- **Change log:** 8 entries in order (lock, remove, unlock, edit, lock, edit, remove all, unlock). Edits keep the changed fields before and after; removals keep full copies of the rows (remove all: all 3).
- **Ops:** Locked listings shows Andrea Kennedy, linked to her Content tab.
- **Claim trigger:** an unrelated profile change left a running journey alone. Linking the account to the listing stopped it as "claimed", and the same happened for a paused journey and for a publisher journey.
- **Live (read-only):** of 27 open journeys, none is to a claimed listing, so the migration's one-off "stop claimed journeys" step will change nothing there.

**Safe to run 0053 on live.** Expected check row: true, 4, true, 1, 1, 0.

## 0053 on live (18 Nov 2026)

The owner ran it: true, 4, true, 1, 1, 0. Checked read-only: Andrea Kennedy is locked ("owner request — keep minimal (18 Nov 2026)"), with one log line. She has no offerings or free resources, and her journey is stopped (replied). Mike Maher's journey is stopped (claimed).
