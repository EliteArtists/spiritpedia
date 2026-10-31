# Insight Timer sprint 1: live (31 Oct 2026)

The owner's decisions on the sprint 1 report (`2026-10-31-insight-timer-sprint-1.md`) are done, and the sprint is live.

## Owner decisions, done

- **Dropped:** Lisa Whatley, KC Gonzalez and Barbara Deyo. They were rolled back from dev and never went live. Their plans are in `docs/content-audits/insight-timer-sprint-1/dropped/`, with skip records saying why. Everyone else who was flagged stays.
- **Katherine Woodward Thomas:** moved from luminary to Ascended Master on dev and live. Her lifespan, 1957–2026, stays.
- **Two live items naming conditions removed** from dev and live: Iyanla Vanzant's "Working Through Anxiety" and Healing Vibrations' "Guided Bedtime Body Scan Meditation For Sleep And Anxiety". The script is `docs/content-audits/owner-fixes-2026-10-31.mjs`. The old rows and the old tier are saved in `owner-fixes-2026-10-31.<env>.log.json`, and `--rollback` puts them back.

## Tier rule

- **README §17.1** now spells out the rule: followers on all the listing's own accounts, added together.
  - 1,000,000 or more: Superhero / Superstar.
  - 100,000 to 999,999: Luminary / Shining Star.
  - Under 100,000: Local Hero / Rising Star.
- **Counting:**
  - Insight Timer and other hub followers count.
  - Company or shared accounts and podcast audiences don't.
  - YouTube is read from the channel's own header row.
- **Evidence:** each count, its source, its date and the total go in `tier_evidence`. Totals of 80k–150k and 0.8M–1.5M are flagged as borderline.
- **Raising a tier above the total:** only for editorial stature or published student counts, with the reason recorded in `sprint.tier_override`.
- **Updated to the same wording:**
  - Both research briefs: `insight-timer-sprint-1/BRIEF.md`, and `shift-sprint-1/BRIEF.md`, which is the template for new hubs.
  - `docs/admin-guide.md`.
- **Old wording:** the only "single platform" wording found was in the old White Tiger Qigong report ("50K+ on one platform"). It now carries an out-of-date note.
- **Badge tips not changed:** the star's tips in the app and website already say "1M+ followers across social media / hundreds of thousands / under 100k", which matches the rule.

## Live now

- **Hub:** Insight Timer, an Organisation at Superhero tier (editorial stature), with 2 offerings and 4 free resources: https://www.spiritpedia.co/healers/insight-timer. Organisations stay in Explore These Channels until there are 5.
- **38 existing teachers** are linked "Teaches on Insight Timer".
- **Profile links:** 39 new "<Name> on Insight Timer" profile links went live, including Thich Nhat Hanh and Ram Dass as legacy links. Frans Stiene's was already live, which makes 40 in all.
- **97 new teachers** from ranks 1–116.
  - Tiers: 1 Superhero (Alex Elle), 20 Luminary, 76 Local Hero.
  - Items: 757 videos, 84 books, 432 offerings, 195 free resources.
  - Email: 75 published, 22 contact form.
- **Spot checks:** the live pages for the hub, Alex Elle, Kerrie Womersley and Katherine Woodward Thomas load; Lisa Whatley is a 404, as she should be.

## Not listed (22)

- **19 skipped** by research or by me. The reasons are in the sprint 1 report and in `insight-timer-sprint-1/skipped/`. Meredith Rom (#123) was added after that report: German New Medicine on her YouTube channel, and claims about birth outcomes.
- **3 dropped** by the owner (above).

## Next

- **Insight Timer sprint 2** starts from rank 117. Six plans are already researched and waiting: Catherine Wilde, Joshua Canter, Michael and Jahna, Marisa La Fata, Sara Clark and Keith Parker.
- **Awaiting confirmation:** Rupert Spira, Wim Hof and Elizabeth Gilbert.
- **Parked:** Rod Stryker and Jason McGrice.
- **README:** the §18.6 log row and job #13 are updated.
