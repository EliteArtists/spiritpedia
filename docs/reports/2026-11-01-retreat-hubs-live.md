# Kripalu, Esalen and 1440 Multiversity: live (1 Nov 2026)

I've carried out the owner's decisions on the sprint report (`2026-11-01-retreat-hubs-sprint.md`), and everything is now live.

## Owner decisions, done

- **Hub tiers:**
  - Kripalu and Esalen are Superhero by editorial stature. The reasons are in each hub plan's `sprint.tier_override`, now marked "Owner confirmed".
  - 1440 Multiversity is Luminary.
- **Overrides confirmed:** Chungliang Al Huang, Tenzin Wangyal Rinpoche and Mirabai Starr are Luminary by editorial stature.
- **James Baraz → Luminary by student count.** He states that more than 24,000 people have taken Awakening Joy. No other raises.
- **Left out by the owner:** Masood Ali Khan, Marysia Miernowska, Leah Diamond and Stacia Butterfield.
  - Their plans are in `retreat-hubs-sprint-1/dropped/`, each with a skip record.
  - None was ever on dev or live; their live pages return 404.
- **Kept for the next sprint:** Russ Hudson and Dr. Raj Balkaran (plans ready, not inserted).
- **All other flagged teachers kept.** The health items removed in review stay out.
- **Decoded emails count as published.**
- **"The Subtle Body: A Genealogy": nothing to move.**
  - Book 1180 on dev is Cyndi Dale's own *The Subtle Body: An Encyclopedia of Your Energetic Anatomy*.
  - The import's same-title note compares only the words before the colon, so it matched it to Simon Cox's book. This is the same false match as in the Omega report.
  - Simon Cox's *Genealogy* is a separate book under him (dev id 1692, and on live). Nothing was changed on Cyndi Dale.
- **Tao: The Watercourse Way:** Chungliang Al Huang is now a co-author, alongside Alan Watts as the main author, on dev and live.
- **Esalen's Highway 1 notice: nothing to remove.**
  - The notice appears only on esalen.org. Our bio, offerings and free resources never carried it; I checked the dev page.
  - The research flag in the hub plan now says so.
- **Lorelei Chang's photo.** A face can't tell identical twins apart, so I dropped her YouTube avatar. Only her Kripalu presenter headshot is used, which Kripalu names as her.
- **Dated items.** I checked all 100 teachers' plans and the three hub plans on 1 Nov with a 3-day margin. None has passed, so nothing was dropped.
  - Soonest to expire: The Rewilding Summit (5 Nov; Mark Coleman, Shawn Stevens, Zelda Hotaling) and three Kripalu programmes on 6 Nov.
  - The monthly expired-offerings check (job #24) will catch them.
- **Script:** `owner-fixes-retreat-hubs-2026-11-01.mjs` applied the James Baraz tier, the Lorelei Chang photo and the co-author on dev, logged for rollback.
  - Live got the tier and photo straight from the updated plans.
  - The co-author was added on live by the same script once Huang was in. A dry run can't check a co-author whose listing doesn't exist yet.

## Live now

- **Kripalu Center for Yoga & Health** (Superhero): https://www.spiritpedia.co/healers/kripalu
  - 10 offerings, 2 free resources.
  - **90 teachers linked:** 79 new, 11 existing.
- **Esalen Institute** (Superhero): https://www.spiritpedia.co/healers/esalen
  - 8 offerings, 3 free resources.
  - **33 teachers linked:** 21 new, 8 existing, and 4 from Kripalu (Erika Gagnon, Mark Coleman, Jovinna Chan, Hawah Kasat).
- **1440 Multiversity** (Luminary): https://www.spiritpedia.co/healers/1440-multiversity
  - 4 offerings, 3 free resources.
  - No teachers: its faculty is staff only.
- **100 new teachers:**
  - Tiers: 1 Superhero (Dr. Amanda Hanson), 12 Luminary, 87 Local Hero.
  - Items: 622 videos, 130 books, 423 offerings, 79 free resources. Six offerings in the plans were shared hub programmes already listed under another teacher, so they were skipped, the same way on dev and live.
  - Email: 85 published, 15 contact form.
- **Live matches dev row for row** (the `.live.inserted.json` and `.dev.inserted.json` logs).
- **Spot checks:** these live pages load:
  - the three hubs
  - James Baraz (Luminary)
  - Chungliang Al Huang (Luminary)
  - Lorelei Chang (one photo)
  - Mirabai Starr
  - the five random teachers from the sprint report: Lihi Benisty, Girish, Kamini Desai, Faith Hunter, Kim Chandler

  Masood Ali Khan and Leah Diamond return 404, as they should.

## Not listed (51)

- 47 skipped by research or review. The reasons are in the sprint report and in `retreat-hubs-sprint-1/skipped/`.
- 4 left out by the owner (above).

## Still open

- **Organisations shelf:** live now has 7 organisation hubs (The Shift Network, Insight Timer, Omega, Commune, Kripalu, Esalen, 1440), so the 5-or-more rule is met. The plan is with the owner; nothing is built yet.
- **Next sprint:** Esalen ranks 236–254 of `esalen-faculty.json`, starting with Russ Hudson and Dr. Raj Balkaran (already researched). Kripalu's ranked queue is done. Then the §18.7 queue goes on to Spirit Rock and Insight Meditation Society, rotated with The Shift Network sprint 2, Insight Timer sprint 2 and Commune ranks 26–34.
- **Past faculty** stay unlinked: Kripalu 27, Esalen 22, 1440 17.
- **README:** the §18.6 log row, job #13 (with the Organisations note) and §18.7 item 4 are updated.
