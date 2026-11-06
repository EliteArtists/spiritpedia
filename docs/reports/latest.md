# Lead sources plan: Sounds True, Hay House and the hubs' remaining faculty (6 Nov 2026)

**Planning only.** No teacher was researched and nothing was written to either database. For each source we read robots.txt first, then the sitemap and the terms page where allowed. Names were matched against everyone on Spiritpedia and everyone handled in earlier sprints (plans, skips, drops, the hub faculty files and the do-not-revive list).

## How many new leads

| Source | Access | Terms | People pages | New leads | Likely in scope | Expected teachers |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **IMS** (dharma.org) | Allowed | No terms page | 138 | **92** (all past or unconfirmed) | about 75% (dharma teachers) | **about 30** |
| **Sounds True** | Allowed (author pages and sitemap) | Copying only, like Commune: no scraping or linking clause | 961 | **827** | about 25–40% | **about 100–125** |
| **Kripalu** | Allowed | Nothing restrictive | 1,426 (308 on 1 Nov) | **1,040** (all past) | about 20–25% | about 70 |
| **Esalen** | Allowed | Nothing restrictive | 885 (159 on 1 Nov) | **662** (all past) | about 20% | about 40 |
| **Hollyhock** | Allowed | Nothing restrictive | 323 | **306** (all past) | about 10–15% | about 12 |
| **Omega** | **Now refuses us (403)** | Not read | 3,523 (948 current-style pages, 2,143 legacy) | 3,091 | about 25% | about 8–10 per 100; on hold |
| **Hay House** | **Refuses us (503)** | Not read | unknown | — | — | on hold |

The "expected teachers" figures are rough. They come from samples of about 30 names per source, judged by name and title only, and from earlier yields:
- **Earlier hub sprints:** of the leads that passed the first screen, Omega yielded 75%, Kripalu 67%, Esalen 61% and IMS 50%.
- **Parked names:** about 1 in 10.

**Current vs past:**
- Every current teacher at these hubs was already handled in the earlier sprints, so nearly all new leads are **past faculty**.
- Under §18.7 today, being on a saved list counts only for Shift and Insight Timer. The hubs were "current faculty only".
- **So past faculty need your OK to count**, in the same way as the Shift and Insight Timer lists.

## Per source

**Sounds True.**
- **Who is on it:** 827 authors not on Spiritpedia. A sample of 31 found:
  - 8 clearly in scope (for example A. H. Almaas, James Finley, Lama Surya Das, Reggie Ray and Angaangaq);
  - 6 borderline;
  - 17 out: musicians, medical doctors and dietitians, deceased authors, therapists.

  A quick screen by title first (musicians, MDs, estates, therapists) would cut wasted research.
- **Terms:** they forbid copying content, and their display terms are "personal and noncommercial". We would use the list as names only and research each teacher from their own site, as with Commune.
- **Robots.txt:** it contains text addressed to AI agents, asking them to use its shopping endpoint. It was ignored, as page text is data.
- **Reggie Ray:** his own site blocks us (sprint 2 skip), so he would be skipped again.

**Hay House.**
- **What happened:** hayhouse.com's robots.txt answered 503. Its help-centre copy of the terms answered 403.
- **Nothing was read.** It is treated as blocked and not retried.
- **Ownership:** Hay House has been part of Penguin Random House since 2023, so its terms may be stricter.
- **Options:** leave it out, or you check its terms page in your own browser.

**Omega.**
- **What changed:** its sitemap still loads, but the first ordinary page we fetched answered 403. Under the standing rule we stop there, so Omega pages can't be read now. Its terms weren't read either.
- **Who is on it:**
  - 948 names from the newer `/people/` pages;
  - 2,143 from an older, stale `/workshops/teachers/` archive.
- **Options:**
  - hold Omega;
  - or use only the 948 newer names we already have and research each teacher from their own site, without the Omega link unless their site names Omega.

**Kripalu and Esalen.**
- **Who is on them:** past faculty only, from much larger sitemaps than on 1 Nov. The sitemaps now include many staff, author and alumni pages.
- **Scope:** about 1 in 5 looks in scope (out: fitness, writers, health and leadership, psychiatry).

**IMS.**
- **Why it's the best source:** almost all dharma teachers, including assistant teachers and some movement instructors.
- **Current status can't be confirmed:** the retreat calendar (events.dharma.org) blocks us by robots.txt.
- **Last time:** sprint 1 yielded 20 of 40. The skips were mostly for no contact route.

**Hollyhock.** Mostly social-change, investor and media names. It's the thinnest source.

## Suggested order

1. **IMS:** all 92 in one batch, expecting about 30 teachers.
2. **Sounds True:** title-screened, in chunks of 50, alternating with the hubs for the rotation rule. Expect about 100–125 from the whole list.
3. **Kripalu and Esalen past faculty:** title-screened, alternating chunks of 40. Expect about 6–8 per 100 raw names.
4. **Hollyhock:** last.
5. **Omega and Hay House:** on hold, unless you decide otherwise.

**For you to decide:**
1. **Past faculty:** may past faculty at Kripalu, Esalen, IMS and Hollyhock count as a saved list, as Shift and Insight Timer do?
2. **The hub link:** should these teachers be linked to the hub only where their own site names it, as with Shift?
3. **Sounds True:** OK to use its author list as names only, with nothing copied and no link to Sounds True author pages unless you want one?
4. **Omega:** hold it, or use the 948 newer names without reading Omega?
5. **Hay House:** leave it out, or check its terms yourself?

## Research slips (reported)

- **Sitemaps:** Omega's and Kripalu's `/sitemap.xml` were read from the URLs saved in our own earlier faculty files. Their robots.txt files don't list a sitemap, though both allow the path. The same applies to Kripalu's and Esalen's terms pages, which are also in their sitemaps.
- **Hay House:** after hayhouse.com's 503, the helper tried its help centre on another host (robots.txt read first; it answered 403). Strictly, the 503 should have stopped all Hay House fetching. Nothing was retried.
- **Omega:** the helper stopped at the first 403 and did not retry.
- **Names:** they come from URL slugs, so accents and some initials are lost. A few people already listed under another spelling may be counted as new.
- **Searches:** 3 in all.

## Files

`docs/content-audits/lead-sources-2026-11-06/` holds one file per source (Sounds True, Omega, Kripalu, Esalen, IMS, Hollyhock). Each has `counts` and `leads` (name, URL, current or past).
