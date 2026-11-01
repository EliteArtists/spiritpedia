# Content run: owner decisions applied, going live (1 Nov 2026)

This follows `2026-11-01-content-run.md` and applies the owner's decisions from the same day. Dev is final at **98 new teachers**.

**What's live so far:**
- **Already live:** the Insight Meditation Society (IMS) hub and Sharon Salzberg's founder link.
- **Not yet live:** the 98 teachers. The permission check stopped the bulk insert on live. They go live with one command (below). Every one of them dry-ran clean on live, and each is a new listing.

## Decisions applied (dev)

- **Tiers:**
  - IMS hub: Luminary by editorial stature.
  - Russ Hudson and Joseph Goldstein: Luminary, confirmed.
  - Sah D'Simone stays Superhero.
  - No other raises.
- **Left out:**
  - Nandhiji (probable bought growth plus healing claims), rolled back on dev.
  - Whitney Durrant (inactive), rolled back on dev.
  - Rachel Lewis (thin and inactive), rolled back on dev.
  - Kerri Kelly and Rachel Ricketts (activism-centred work).
  - Catherine Ingram (climate-conspiracy page).
  - Their plans are kept in each sprint's `dropped/` folder, with a skip record.
- **Added:** Steven Webb (Insight Timer 195). His teaching isn't political.
- **Kept:** Josh Korda, Cuong Lu, all the borderline health calls, and the other thin listings.
- **Fred Haas:** the recovery-coaching sentence is out of his bio.
- **Devon & nico Hase:** now a couple listing (slug `devon-and-nico-hase`), with a couple bio. The bio check passed against 20 saved sources. The photos still show Devon only.
- **Renée Rotkopf:** the Stellarmuse AI chatbot is out (recorded in `left_out`).
- **Contact rule:** a centre's general inbox counts if the teacher founded or co-leads that centre. It's written into README §18.4.
  - Under it, Shelly Graf (who co-leads Common Ground) now qualifies.
  - So may Narayan Helen Liebenson and Matthew Hepburn (Cambridge Insight).
  - They're noted in README §18.7 for a later sprint, not added now.
- **Dated items:** none in the run had passed on 1 Nov 2026. The review was run on every plan with a 3-day margin. The earliest dated item left is Yehuda Ashkenazi's 5 Nov evening.

## Shared offering links

**What changed:**
- `scripts/ingest.mjs` now skips an offering only if *this* teacher already has its link.
- It also skips a link that appears twice in the same plan.

**The database also has to change.** It had a unique constraint on the offering URL across the whole table (`courses_url_unique`). That needs a migration:
- **`supabase/migrations/0031_shared_offering_links.sql`** swaps it for one link per listing (`course_url, healer_id`). No rows, grants or policies change. **The owner runs it on dev first, then live.**
- Until 0031 runs, ingest leaves a shared offering out with the note "shared link, needs 0031" rather than failing. Running the same plan again after 0031 adds it.

**Waiting for 0031 on dev:** 16 teachers have a shared offering to come back.
- The 9 IMS teachers you named, minus Rachel Lewis (dropped): Devin Berry (3), Tara Mulay, Jill Shepherd, Mark Nunberg, Bart van Melik, Bhante Buddharakkhita, Ajahn Canda and Kristina Baré.
- Five more from IMS: Éowyn Ahlstrom, Cara Lai, Roxanne Dault, Tuere Sala and Yong Oh.
- Three from other hubs: Jeffrey S. Reid, Lori Sheridan and Nina Rao.
- After 0031, rerunning those 16 plans on dev adds them. The live script adds them on live.

**The admin's manual offering form** (`ContentIngestion.jsx`) still blocks any URL that's already in. It was left as it is; say if it should match.

## Standing rule, firmer

**Blocked means skip.** A page or site that refuses is never retried under a different browser identity, user agent, header set, proxy or tool. Anything robots.txt blocks is skipped. It's now in:
- **every research brief:** retreat-hubs, commune, insight-timer, meditation-hubs, omega and shift sprints;
- **the Amazon fallback in the briefs:** a refused or failing /dp/ page now means leave the book out, with no second try in another tool;
- **README §18.4;**
- **the assistant's memory, for every future agent prompt.**

## To finish going live

1. **The 98 teachers and the Goldstein co-author fix:**
   `python3 docs/content-audits/content-run-2026-11-01-live.py`
   - It inserts in run order and logs each teacher for rollback.
   - Then it runs `content-run-fixes-2026-11-01.mjs --env live --apply`.
   - It's safe to run again.
2. **Migration 0031,** dev then live. Then run the same script again: it adds the shared offerings on live. On dev, rerun the 16 plans listed above.

**For a short while** IMS shows on live's Retreat Centres & Platforms shelf with one linked teacher (Sharon Salzberg), until step 1 runs.

## Numbers (dev, final)

- **98 new teachers:**
  - 2 leftovers;
  - 10 from Esalen;
  - 3 from Commune;
  - 19 from IMS (18 instructors and Goldstein as founder);
  - 64 from Insight Timer.
- **Tiers:** 1 Superhero, 9 Luminary, 88 Local Hero.
- **Not listed: 116 skipped or dropped:**
  - the 110 in the first report;
  - the 3 left out after the political and conspiracy checks (Kerri Kelly, Rachel Ricketts, Catherine Ingram);
  - the 3 rolled back (Nandhiji, Whitney Durrant, Rachel Lewis).
- **Held:** Dennis & Kathy Lang. They passed every check and are first in for the next sprint.
