# Night sprint decisions applied, gap-check fixes live (10 Nov 2026)

Your decisions of 10 Nov are done on dev and live. The website fixes are deployed.
**Live now has 1,115 listings** (1,013 + 103 new − Lama Dvora).

## First: a safety gap found along the way (needs your decision)

While changing the search, the helper found that **hyphenated crisis phrases are not caught as crisis**, on the website and in the app alike. "self-harm", "kill-myself", "end-it-all" and "i want to self-harm" pass the crisis check. The same words with spaces are caught. The shared test cases (`web/shared/emotion-safety.cases.json`) even pin "self-harm" as "not crisis", so the tests can't flag it. I confirmed the case in the file.
- **Not changed.** Treating a hyphen as a space in the feelings normaliser would fix it. But it changes pinned safety cases on both platforms, and the website would then behave differently from the app (1.0.1 is in review).
- **Proposal:** in 1.0.2, make both platforms treat hyphens as spaces before the crisis check, and regenerate the cases with your review. If you want the website protected sooner, I can change the website alone and re-pin its cases with your OK.

## Gap-check fixes

| Fix | What | Where | Status |
| :-- | :-- | :-- | :-- |
| 1 | Near You sorts by distance and never filters. With an area set, everyone stays: people with a town nearest first ("x miles away"), then everyone without a base. "Closest to you" is the same full list, not 10. | Website | **Live** (0eee8eb) |
| 1b | The same in the app | App | Queued for **1.0.2** (README §18.7); 1.0.1 untouched |
| 2 | The home page's healer query and `getHealerNames` are paged by id, so all 1,115 load. The subject pages' healer query is paged too. | Website | **Live** |
| 3 | 32 search spellings added on dev and live: quantum-touch, quantumtouch, tai-chi, taichi, qigong, breath work, soundbath, yoga nidra (→ Yoga). Each copies the rows of its spaced form, with the matching subject on top. Quantum Touch is raised to 4 for "quantum touch", and Reiki to 4 for "reiki", so Enter opens the right page. | Data (both platforms read it) | **Done, dev and live** |
| 4 | Subject-name search ignores spaces, hyphens and capitals: "Quantum-Touch", "quantumtouch", "breath work", "tai-chi", "qigong" all find their subject. Only the subject lookup changed (`web/utils/subjectSearch.js`); the safety-checked feelings normaliser is untouched (see above). | Website now; app 1.0.2 | **Live** |
| 5 | Profile subjects backfilled where 3+ of a listing's own items carry the subject (official listings left alone) | Data | **Done**, counts below |
| 6 | Subject pages in tier order (superhero, ascended master, luminary, then the rest), then by name. Once the visitor has an area, it's nearest first within each tier, with no-base people last in their tier. | Website now; app 1.0.2 | **Live** |

**Checks:**
- Website tests 183 of 183 pass (177 before, plus 6 new). The safety suite passes 5 of 5 before and after (1,401 function cases, 287 full-search cases, 69 medical cases). Lint has no new errors.
- On the live site after the deploy: the home page now includes Henry Shukman and Cynthia Bourgeault (past the old 1,000-row cap) and Richard Gordon, and /subject/quantum-touch lists both Karina Grant and Richard Gordon.
- Near You's distance sort can't be checked with curl, because the area lives in the browser. It's covered by new unit tests: someone 5,000 km away and someone with no base both stay, and "Closest to you" returns all 14 test people instead of 10.

**Fix 5 counts:**
- **Live:** 443 listings gained 945 subjects.
- **Dev:** 453 listings gained 955 subjects.
- **By subject (live):** spirituality 176, meditation 89, mindfulness 59, ancient-wisdom 56, spiritual-awakening 54, self-healing 52, soul-purpose 50, shadow-work 48, consciousness 46, manifestation 28, mysticism 27, conscious-relationships 26, energy-medicine 26, life-coaching 24, conscious-science 23, breathwork 18, non-duality 16, death-the-afterlife 15, chakra-healing 14, sound-healing 12, law-of-attraction 11, mediumship-spirits 10, channelled-teachings 9, yoga 8, hermeticism 8, astrology 7, shamanism 7, plant-medicine 5, dreamwork 5, sacred-geometry 4, eft-tapping 2, polarity 2, quantum-healing 2, nde 2, qi-gong 1, akashic-records 1, tai-chi 1, ayurveda 1.
- Richard Gordon, for example, now also carries conscious-science.
- A rollback restores every listing's earlier subjects: `node scripts/backfill-subjects.mjs --env live --rollback`. The log, with before and after for each listing, is `docs/content-audits/subject-backfill.<env>.json`.

**Found while fixing (not changed):**
- The admin author picker (`web/app/api/admin/submissions/route.js:138`) loads healers unpaged, so it stops at 1,000.
- `web/utils/discoveryData.js` and `pushRun.js` page without ordering by id, so the weekly discovery email's pages can overlap or skip rows.
- Subject pages' books, courses and free resources are still unpaged. This is an existing TODO, and no subject has passed 1,000 yet.

## Listings

**Live: 103 new listings and 105 teacher links.**
- The 102 kept from the night sprint, with these changes:
  - **Tergar** is relisted as an organisation, "Tergar Meditation Community" (`tergar`). The app is now part of its bio, and the app listing was removed on dev.
  - **Dalai Lama added** (`dalai-lama`), teachings only. Contact is through the Office of His Holiness's published contact page. "Exile" is taken out of the bio, and no Tibet-politics items are included.
- **Merged:**
  - The Way's 3 remaining offerings (subscription, practice support, the UK residential retreat in Jan 2027) are on Henry Shukman's listing. The other 2 were already there.
  - Isha Kriya is added to Sadhguru's listing. Sadhguru Exclusive was already there.
- **Links:**
  - 105 teacher links are on live, the same as on dev. That includes Sangha Live's 34, Hugh Byrne to IMCW, Kino MacGregor to Miami Life Center, and Camille Maurine to The Shift Network.
  - The 3 Mountain Stream guest-talk links (Devin Berry, Dawn Mauricio, Tuere Sala) are removed on dev and never went to live.
  - Swami Sarvapriyananda was already linked to the Vedanta Society of New York, whose Resident Minister page names him.
- **Dropped:** Arava, East Bay Meditation Center, Itzhak Beery, Buddhify, Mindfulness.com, The Pattern, Meditation Studio, Waking Up, Karma Teachers, The Yoga Flat, Jodie Cruz. None had been inserted. Each plan is marked `sprint.dropped`, so it can't go in by accident. Shi Heng Yi and Maya Tiwari stay skipped, and so do all the overrule-able skips.
- **Lama Dvora is unpublished.** Her live insert is rolled back: 7 rows (5 videos, 1 free resource, her Arava hub link) and the listing. Her page now returns 404. No member had saved or reviewed her. Her live row is kept in `docs/content-audits/lama-dvora.live-row-2026-11-10.json`, so she can go back in.
  - **A correction:** Adam Apollo was never on live. He was skipped in pipelines sprint 1, so there was no takedown to copy. My "as with Adam Apollo" wording in last night's report was wrong.
  - Listings have no "unpublished" switch, so a rollback was the way to take her down.
- **Kathie and Paul Scott:** the plan is written as one couple listing (`kathie-and-paul-scott.json`), but it's held.
  - The ingest's robots.txt request to their site failed with a connection error today. Under the no-retry rule it goes on the retry-another-day list.
  - Their site has no real photo of Kathie, or of both of them. The plan uses Paul's headshot, which you may not want for a couple listing.
  - The stylised banner (it looks AI-generated) is left out, and so are the PEMF mats and the pain-framed distance healing.
- **Held as you asked:** Yongey Mingyur Rinpoche (until a clean contact route) and Aaravindha Himadra (until a certain photo; his contact form is used). Bodhi Be and Ally Bogard wait for YouTube avatars through the API. Sivananda Bahamas goes in once a usable photo loads.
- **Retry on another day:** San Francisco Zen Center, the Sati Center, Centre Sivananda Paris, the Buddhist Society of Western Australia, Krishna Kaur, and now Kathie and Paul Scott.
- **Tiers:** all 103 are Local Hero until the YouTube API key arrives. Then every tier from the night sprint gets redone.

## Rules and queue (saved)

- **Never decode protected emails, ever. Find real domains directly, never through Squarespace previews.** Added to both sprint briefs, the helper prompts and my memory.
- **Queue (README §18.7, "Queue after the night sprint"):**
  1. Tiers, then channels, once the API key is in.
  2. Sounds True: the 4 names left (Clarissa Pinkola Estés, Cheryl Richardson, Christina Baldwin, Carole Hyder), then confident chunks only.
  3. Quantum-Touch from rank 141.
  4. Yoga schools from lineage centre lists, robots.txt first.
  5. Omega's 948, each from the teacher's own site.
  6. Judith Hanson Lasater.
- **App 1.0.2 list** (README §18.7): fixes 1b, 4 and 6.
