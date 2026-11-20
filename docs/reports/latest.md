# Claimed wins: Cambridge Zen Center — 20 Nov 2026

## The cause

Two things combined:

1. **The claim only stopped running or paused journeys.** Migration 0053's trigger and
   the website helper (`stopJourneyOnClaim`) both used `status in (running, paused)`.
   Cambridge Zen Center's journey was already stopped as "replied" (19 Nov), so the
   claim on 20 Nov left it as it was.
2. **Outreach checked "replied" before "claimed".** `journeyState` put a reply date
   ahead of the claim. Even though the list knew the listing was claimed, it showed
   Replied.

## The fix

- **Outreach** (deployed): Claimed comes first. A listing that is claimed today counts
  as Claimed whatever its journey said: replied, contacted via form, complete or
  stopped. The filter and count go by the account link, as Claims and People do. A
  claimed row that had replied shows **"Replied 19 Nov"** under the Claimed label, and
  the listing's own Outreach tab shows "Claimed · replied 19 Nov".
- **The website helper** (deployed): a claim marks every journey to that listing
  stopped, "claimed", whatever its state. It doesn't touch `replied_at`.
- **Migration 0054** (`supabase/migrations/0054_claimed_wins.sql`, for you to run):
  does the same in the database trigger, plus the backfill.
- **One exception, deliberately:** the never-again reasons (asked to stop, removal
  requested, bounced or marked as spam) keep their stored reason. That way the "never
  email again" block survives if a claim is ever revoked. Outreach still shows them as
  Claimed while the listing is claimed.

251 tests pass, including claimed after a reply, a form contact, a complete or a
stopped journey; never-again reasons kept; and the replied date kept. The build passes.

## Backfill: claimed listings whose journey isn't marked Claimed

| Listing | Journey now | After 0054 |
|---|---|---|
| **Cambridge Zen Center** | stopped, "replied" (replied 19 Nov) | stopped, "claimed", replied date kept |

That's the only one on live. Mike Maher is already "claimed". The third linked account
is Spiritpedia's own listing, which has no journey, so Claims and People show 3 while
Outreach shows 2. Dev has no journeys.

Live Outreach counts once this deploy is up: 113 running, 3 replied, **2 claimed**,
2 do not contact, 1 form.

## For you

Run **0054** on dev, then live. Expected check row:

- **dev:** `1, 0, 0, 0`
- **live:** `1, 0, 2, 1` (the trigger; none left unmarked; Mike Maher and Cambridge Zen
  Center claimed; Cambridge Zen Center's reply date kept)

If anyone else claims a replied or form-contacted listing before you run it, live's
third number is higher; the second must still be 0.
