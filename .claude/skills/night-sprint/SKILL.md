---
name: night-sprint
description: Start Spiritpedia's overnight content sprint from the README queue. Use when the owner says "Start the night sprint" (or "night sprint", "/night-sprint"). Runs the whole night with no questions, inserts clean listings on dev then live, and writes the report.
---

# The night sprint (owner, 11 Nov 2026)

The owner's standing routine is README §20; this is its NIGHT part. The owner's
words "Start the night sprint" are the whole instruction: everything below is
already approved. Read README §20, §18.4, §18.7 and
`docs/content-audits/night-sprint-2026-11-09/BRIEF.md` first, and the memory
index. All standing rules apply (robots.txt in its own command, blocked means
skip, never decode emails, never fetch the never-fetch list, original bios,
health rule, no questions overnight).

1. **Target:** 100+ new listings. **Sources, in order** (README §18.7 queue):
   YouTube channels read through the Data API (`node scripts/yt.mjs`), then
   lineage and association centre lists (yoga, Buddhist, Vedanta, Sufi
   networks), then anything else the queue names. Parked queues stay parked.
2. **Before helpers start:** refresh the names list for duplicate checks:
   `node scripts/dev-names.mjs <scratchpad>/dev-names.json`. Check disk space
   (`df -h /`); below 2 GB, clear work folders first (README §13).
3. **Leads:** write each batch to
   `docs/content-audits/night-sprint-2026-11-09/leads/<first rank>.json`,
   continuing the ranks from the highest file there. Check every lead against
   the names list, `skipped/`, `dropped/` and existing plans.
4. **Helpers:** at most 3 research helpers at once (general-purpose agents in
   the background). Each gets `HELPER-PROMPT.md` from the same folder with
   {A}, {B}, {FILE}, {SCRATCH} and {WORK} filled in, plus any batch notes.
   Helpers research only; they never insert.
5. **Each report back:** check it (rule slips, health, politics, guests not
   linked, no made-up #fragments, dated items start after tomorrow), set
   `sprint.held` with a reason on anything that needs the owner, then insert
   the clean plans on **dev** with `scripts/ingest.mjs <plan> --env dev
   --insert` and `scripts/link-hub.mjs <slug>-teachers.json --env dev
   --insert` when it has links. Delete work folders and inserted photo
   folders. Keep a running log in the scratchpad for the report.
6. **End of the night:** insert every clean dev plan on **live** the same way
   (`--env live`), after removing any dated item that has started. Held plans
   wait for the owner and are never inserted. Write any place-alias migration
   needed (the next number in `supabase/migrations/`, as 0043); the owner runs
   it, dev first, then live. Then refresh Admin → Ops with
   `node scripts/ops-sync.mjs --env live` (held plans, dev-only listings, the retry
   list and the reports; it says so if migration 0045 isn't on live yet).
7. **Report:** `docs/reports/YYYY-MM-DD-night-sprint.md` and the same text in
   `docs/reports/latest.md`: totals by source, every listing, held plans and
   why, skips, rule slips (helpers' and your own), and "For you to decide".
   Add the row to README §18.6, commit and push (docs and scripts don't
   deploy; never commit `web/AGENTS.md`).
8. **Don't stop.** Anything that needs the owner goes under "For you to
   decide"; a blocked or failing source is skipped and noted.
