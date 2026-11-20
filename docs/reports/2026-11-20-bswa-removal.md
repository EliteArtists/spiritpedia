# BSWA removal and the never-again buttons — 20 Nov 2026

You deleted BSWA's listing and content in the admin and asked BSWA whether the three
monks' listings should go too. This covers the rest.

## 1. admin@bswa.org: do not contact

**Done now, on live and dev** (service role, each change in the listing's edit log):

- **Ajahn Brahm** and **Ajahn Brahmali**: `admin@bswa.org` removed, with its "where
  published" and inbox type. No listing or publisher on live shows a bswa.org address
  now.
- **Ajahn Canda**: had no email (website anukampaproject.org), so nothing to change.
- **No journey** has ever gone to BSWA or any of the three, so nothing needed stopping.
- **Up next** can't offer them: none of the three has an address now. Once 0055 has
  run, Up next also leaves out any address on the do-not-contact list, whichever
  listing shows it.

**Permanent, once you run 0055:** `admin@bswa.org` is on the do-not-contact list. The
website then checks that list before **every** email it sends, of any kind (outreach,
welcome, claim and review emails). A failed check sends nothing. Start and the daily
job refuse it, and the database clears it from any listing it's written to.

**On dev only:** BSWA's own listing is still there (you deleted it on live). 0055 clears
its address. Say if you want the dev copy deleted too.

## 2. BSWA on the do-not-revive list

The do-not-revive list was text in README §18.7 and the briefs. It's now a database
table (`do_not_revive`, 0055), seeded with **BSWA** (name, slug, bswa.org) and the
three from 5 Nov (Nandhiji, Devon Kerns, Ipek Williamson). Three things stop a revival:

- **The helpers:** `scripts/dev-names.mjs` writes the list beside the names list, and
  the night-sprint brief, helper prompt and skill tell helpers to skip a match by name,
  slug or website.
- **The ingest:** `scripts/ingest.mjs` refuses a plan that matches, or one that carries
  a do-not-contact address.
- **The database:** it refuses a new healer with the same slug, name or website.

The website match is the whole address, so `bswa.org/teachers/ajahn-brahm` (the monks'
pages) is **not** caught. Their listings stay separate until BSWA answers.

## 3. Two buttons in the admin

- **Do not contact this email address.** It's on each Up next row ("Do not contact"),
  on each journey in Admin → Outreach (open the row), and at the bottom of a listing's
  **Outreach** tab. It asks first and takes an optional reason. Then the address is:
  - never sent anything again;
  - taken off every listing that shows it (logged);
  - stopped on any running or paused journey ("Address marked do not contact");
  - left out of Up next.
- **Removed at owner's request — never re-add.** This is a tick box in the listing's
  **Delete healer** dialog. Beside it is a second box, "Do not contact" for the
  listing's address. Both are done before the delete; if either fails, nothing is
  deleted and the dialog says why.

**Never again**, at the bottom of Admin → Outreach, shows both lists. It has a box to
block an address no listing shows any more, and **Take off the list** (press twice)
undoes a mistake.

Both are in the admin guide (Outreach, and Content → "Deleting a listing at the owner's
request"), README §18.7 and §20.1, and the README's Start here.

## Checks

- Web tests: **260 pass** (9 new: the address and website rules, do-not-revive matching,
  the do-not-contact lookup including a failed one and the time before 0055, Up next
  leaving a listed address out, the new stop reason).
- Lint: no new problems. The build passes.
- Looked at on a local server against dev, at 1024×768 and 768×1024:
  - the Up next buttons and the dialog;
  - confirming on dev, which correctly refuses with "needs migration 0055";
  - the Never again panel;
  - the Delete dialog's tick box;
  - the listing Outreach button.

  Nothing was sent: no email key locally.

## For you: run 0055, dev then live

`supabase/migrations/0055_do_not_contact_and_do_not_revive.sql`. **Check row on both:
1, 4, 0, 3.** The four numbers are:

- 1 do-not-contact address;
- 4 do-not-revive listings;
- 0 listings still showing a blocked address;
- 3 triggers.

Until it runs, the buttons say "needs migration 0055", and nothing breaks. Until then,
email and outreach work as before. BSWA is still safe meanwhile: the address is on no
listing, and no journey exists.

**Still open:** BSWA's answer about Ajahn Brahm, Ajahn Brahmali and Ajahn Canda. If they
should go, use **Delete healer** with "never re-add" ticked on each.
