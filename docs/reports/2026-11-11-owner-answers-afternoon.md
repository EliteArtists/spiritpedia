# Your afternoon answers, done (11 Nov 2026)

Follows `2026-11-11-admin-build.md`. Migrations 0044–0047 are on dev and live with the expected check rows (your message).

## 1. Next.js security upgrade: live

- **Upgrade:** merged and pushed (7f35c5f): Next.js 16.4.0 → 16.4.1, the lowest version with the fixes.
- **Fixed:**
  - two critical flaws (running code on the server without logging in, through the image optimiser or cached functions);
  - one high (a way to knock the site over).
- **Tested before pushing,** on the merged code (it now includes the afternoon's wording): 219 of 219 tests pass, and the full build runs with no security stop.
- **Checked on live:**
  - The live pages' own code reports **16.4.1**.
  - These all return 200: home, Plum Village, Hay House, the meditation subject page, the sitemap and the image optimiser.
  - /admin redirects to login, and the admin routes answer 401 when signed out.
- **Redeployed again (ae639e0)** after you added `YOUTUBE_API_KEY` to Vercel Production.

## 2. Ops and item links: done on live

- **Ops-sync on live:** 95 items (64 held plans, 0 on dev only, 10 to retry, 21 sprint reports), synced 14:42 UTC. It runs after every live insert and after your morning decisions (README §20).
- **Item links:** **16 stripped, 0 failed.** These were the 14 made up plus Adyashanti's 2. Jon Kabat-Zinn's 3 are kept, as you said.
  - Live now has exactly **24** links with a #: 15 offerings and 9 free resources. That's the 21 real anchors plus Jon Kabat-Zinn's 3.
  - The before-and-after log is `docs/reports/2026-11-11-item-link-fragments-applied.md`. Each row can be undone from it.

## 3. Claim card: live (2b94c2e)

- **Wording:** a school, organisation, channel, app or publisher now reads "We found your Spiritpedia **listing**", "Would you like to claim this listing?" and "Yes, **this is us**". A person keeps "profile" and "this is me". The mismatch message follows the same rule.
- **Not seen on live by me:** the card only shows to someone signed in with a matching email.

## 4. Publisher "Start journey" and whose inbox it is (needs migration 0048)

**Start a journey for a publisher (Outreach page):**
- Search a publisher by name to see its email, inbox type and email source.
- **Start is greyed out** with the reason "Switched off …" while publishers are off, and the server refuses it too.
- When you switch journeys on, it works the same as for listings.

**Recipient type and email source:**
- **Migration `0048_contact_recipient_type.sql`** adds `contact_recipient_type` to listings, publishers and journeys. A journey records the type and source it started with.

  | Value | What it means |
  | :-- | :-- |
  | `business` | info@, hello@ |
  | `organisation` | a charity, religious body, community or school inbox |
  | `personal_business` | a named person's address published by the business |
  | `personal` | a private individual's own address |
  | `unknown` | not decided yet |

  Publishers also get `contact_email_source`.
- **Where you set them:**
  - the Add Listing form ("Where the email is published", now for publishers too, and "Whose inbox is it?");
  - a listing's Profile tab;
  - the Publisher edit workspace, which now has contact fields at all.
- **The Outreach page** shows each journey's inbox type and source, with missing ones in amber.
- **The sprint ingest** accepts `sprint.contact_recipient_type` (and the publisher source and type) and writes them once 0048 has run.
- README §18.4 has the rule.

**The sending rule, as built:**
- No email source: **refused, for every kind.** README §18.4 already requires every published email to carry its source.
- Channels, apps, organisations, schools and publishers also need a `business`, `organisation` or `personal_business` inbox, from your doc's "published business or organisation inboxes". Whether a named person's address counts is one of the solicitor's questions.
- For individuals, a missing or unknown type is a warning only.

**Run 0048 on dev, then live. Check row:**

| Database | new columns, listing emails with no type, listing emails with no source, publisher emails with no source |
| :-- | :-- |
| Dev | **5, 987, 584, 0** |
| Live | **5, 988, 585, 0** |

The counts move if a sprint inserts listings before you run it. Everything works before 0048 runs: the type fields say "Needs migration 0048", and nothing is written to them.

## 5. Disk

**12 GB free** (it was 1.2 GB at the low point and 6.1 GB before the cleanup).

**Cleared** (each rebuilds itself when next needed):
- Xcode DerivedData (3.3 GB)
- the npm cache (1.5 GB)
- VS Code update leftovers (1.6 GB)
- the Swift package cache
- Homebrew's cache
- node-gyp
- the website's build output

**Not touched:**
- release builds (Xcode Archives, `app/build`)
- `~/.secrets`
- the Flutter package cache
- Chrome's cache (Chrome was open)

About 950 MB of the npm cache belongs to an administrator account from an old `sudo npm`. Clear it with `! sudo rm -rf ~/.npm/_cacache` if you want it.

## 6. Checks

- **Web tests:** 222 of 222. **Script tests:** 13 of 13. `scripts/ingest.mjs` passes a syntax check.
- **Lint:** no errors in changed files.
- **Build:** passes on 16.4.1.
- **Not tried yet, needing you logged in to live /admin in Chrome:**
  - the publisher Start panel
  - the inbox-type selects
  - the publisher contact fields
  - "Read channel" with the new YouTube key
  - the morning list: Inbox refresh, Activity totals, Pending items, Add Listing

## 7. For you

1. **Run 0048** on dev, then live, and send the check row.
2. **Older listings without an email source: 566 of the 827 individuals with an email**, plus 9 organisations, 7 channels, 2 schools and 1 app. As built, none of them can start a journey. Nothing has started yet, so nothing running is affected. Should individuals only get a warning instead (a one-line change), or should the sources be filled in? A source backfill could be a morning job: each listing's own page, robots.txt first.
3. **Log in to live /admin in Chrome** so I can prove the admin fixes on live.
4. Megan Riley's photo (you're checking).

## 8. Rule slips

None this afternoon.
