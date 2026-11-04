# Hubs sprint 2: Hollyhock, Findhorn, Evolving Wisdom and The Shift Network (4 Nov 2026)

**14 new teachers and 2 new hubs are on dev, well short of the 100 you aimed for.** Nothing is live yet.
- **New hubs:** Hollyhock and the Findhorn Foundation, with 4 teachers already on Spiritpedia linked to them.
- **New teachers:**
  - 5 from Hollyhock;
  - 1 from Findhorn;
  - 8 from The Shift Network's pipeline.

The shortfall has three causes, set out under "Why so few" below. The ways to get closer to 100 are at the end.

## Your steps

1. **Run `supabase/migrations/0037_place_aliases_hubs_sprint_2.sql` on dev** (SQL editor, whole file).
   - It adds three aliases for bases of under 5,000 people:
     - Mansons Landing, Cortes Island (Hollyhock) → Campbell River (20 km);
     - Nellysford, Virginia (Scott M. Taylor) → Waynesboro (20 km);
     - New Hope, Pennsylvania (Valerie Brown) → Doylestown (16 km).
   - The check row (aliases; listings with a town; of those, still without a place) should read **58, 438, 2**. The two without a place are Salmon, Idaho and "Sussex County", as before.
2. **Look at the pages on localhost** (list below) and answer the decisions in one message.
3. **After your OK:**
   - you run 0037 on **live** (check row **58, 424, 2**);
   - then I insert on live (the check row then reads 58, 440, 2).
4. **Still waiting from the last round:** the two photos you saved for Danielle Van de Velde and Ani Rinchen Khandro.
   - My terminal can't open your Desktop (macOS refuses it).
   - Please move both files into `docs/content-audits/owner-photos/` and tell me which photo is whose. I'll then check them, host them and add both on dev and live.

## The hubs (dev)

| Hub | Base | Offerings · free | Tier | Linked teachers | Page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Hollyhock | Mansons Landing, Cortes Island, BC (→ Campbell River after 0037) | 9 · 1 | Luminary (editorial; count about 6.9k) | Jeff Warren, plus the 5 new teachers | http://localhost:3000/healers/hollyhock |
| Findhorn Foundation | Findhorn, Scotland | 7 · 5 | Luminary (editorial; count about 22.8k) | John Philip Newell, Jilani Cordelia, Lisette Schuitemaker, plus Barbara Swetina | http://localhost:3000/healers/findhorn-foundation |

## The 14 new teachers (dev)

**Totals:** 83 videos, 6 books, 53 offerings and 15 free resources. All 14 are Local Hero by readable count. Email: 10 published, 4 contact form only.

| From | Teacher | Base as published | Videos · books · offerings · free | Page |
| :--- | :--- | :--- | :--- | :--- |
| Hollyhock | Celeste Young (Insight meditation, InsightLA) | Los Angeles | 0 · 0 · 10 · 1 | http://localhost:3000/healers/celeste-young |
| Hollyhock | Valerie Brown (Buddhist-Quaker mindfulness) | New Hope, Pennsylvania (→ Doylestown) | 8 · 3 · 4 · 1 | http://localhost:3000/healers/valerie-brown |
| Hollyhock | Jay Vidyarthi (meditation) | Kingston, Ontario | 0 · 0 · 1 · 4 | http://localhost:3000/healers/jay-vidyarthi |
| Hollyhock | Andrea Menard (Métis singer, ceremony) | Vancouver | 9 · 0 · 3 · 1 | http://localhost:3000/healers/andrea-menard |
| Hollyhock | Jhaimy Alvarez Acosta (Children of the 7 Rays) | North Vancouver | 10 · 0 · 4 · 1 | http://localhost:3000/healers/jhaimy-alvarez-acosta |
| Findhorn | Barbara Swetina (sacred dance, music) | Findhorn | 1 · 0 · 2 · 1 | http://localhost:3000/healers/barbara-swetina |
| Shift | Charleene Closshey | Plant City, Florida (Tampa area) | 8 · 0 · 3 · 3 | http://localhost:3000/healers/charleene-closshey |
| Shift | Dr. Martha Jo Atkins (end of life) | San Antonio, Texas (fills a Sprint B gap) | 6 · 0 · 2 · 0 | http://localhost:3000/healers/martha-jo-atkins |
| Shift | Mary-Anne Kennedy (medium) | Canada (country only) | 6 · 2 · 6 · 0 | http://localhost:3000/healers/mary-anne-kennedy |
| Shift | Jeralyn Glass (crystal sound) | Los Angeles | 6 · 1 · 4 · 1 | http://localhost:3000/healers/jeralyn-glass |
| Shift | Scott M. Taylor (near-death studies) | Nellysford, Virginia (→ Waynesboro) | 3 · 0 · 4 · 0 | http://localhost:3000/healers/scott-m-taylor |
| Shift | Laura Inserra (sound, ritual) | no base published | 8 · 0 · 6 · 1 | http://localhost:3000/healers/laura-inserra |
| Shift | Rose Cole (ritual) | no base published | 8 · 0 · 2 · 1 | http://localhost:3000/healers/rose-cole |
| Shift | Jamie Butler (medium) | Atlanta, Georgia | 10 · 0 · 2 · 0 | http://localhost:3000/healers/jamie-butler |

The bases above are short forms; each plan has the exact published wording and its source. The tier evidence, contact source and every research flag for each teacher are in `docs/content-audits/hubs-sprint-2/REPORT.md` and in each plan.

## For you to decide

1. **Hub tiers.** Hollyhock (about 6.9k readable) and Findhorn (about 22.8k) are raised to **Luminary by editorial stature**:
   - Hollyhock has been a retreat centre since 1982;
   - Findhorn is a world-known spiritual community, founded in 1962.

   OK, or Local Hero by count?
2. **Evolving Wisdom and Craig Hamilton are planned but not inserted.**
   - Evolving Wisdom's terms forbid copying, so we use none of its images. It has no other photo.
   - Craig Hamilton's plan links him to that hub as founder; his founder role isn't confirmed from a page we may read.
   - Options:
     - insert Craig Hamilton without the hub link;
     - list Evolving Wisdom with a photo it sends us;
     - or leave both out.
3. **Left out on purpose:**
   - Hollyhock's "Erotic Ecology" programme (13–18 Aug 2027) is left off the hub's page as borderline in theme.
   - Rose Cole's "Teaches on The Shift Network" link is removed: her own site names no current Shift course.
4. **Fit and health framing:**
   - **Jeralyn Glass** (crystal singing bowls): her pages use some wellbeing language. No condition is named, so she is kept.
   - **Jamie Butler:** her "21 Days Quantum Reiki" series speaks of supporting the body at cellular level. No condition is named, so it is kept, but it is borderline.
   - **Dr. Martha Jo Atkins** is also a licensed counsellor. Only her end-of-life spiritual work is listed.
   - **Laura Inserra:** she publishes no base, and one of her offerings (private sessions) is borderline.
5. **Thin or weak pages:**
   - **Jay Vidyarthi:** 1 offering and 4 free resources.
   - **Barbara Swetina:** 4 items in all.
   - **Valerie Brown's** only photo is her YouTube avatar.
   - **Jamie Butler's** only photo is also her YouTube avatar.
6. **Jean Houston** (Evolving Wisdom still sells her recorded courses) died on 16 May 2026, per Wikipedia citing The New York Times. She was skipped as a teacher. Should she be added as an Ascended Master?

## Why so few

1. **Mindvalley and Humanity's Team are on hold.** Their terms forbid commercial use without written permission, and Mindvalley also allows links only to its landing pages. These were meant to be two of the larger sources.
   - If you'd like them, they need a permission email from you. Nothing was fetched from either beyond their terms.
2. **The Shift Network now refuses all our fetches (403).** The rule is current faculty only, so each Shift lead needed its current course confirmed some other way.
   - Helpers used the teachers' own sites.
   - 69 of the 77 Shift leads were skipped, almost all because their own site names no current Shift course (or the site is gone).
   - 8 made it.
3. **The three open hubs are small.**
   - Hollyhock gave 7 leads.
   - Findhorn gave 3, two without a contact route of their own.
   - Evolving Wisdom gave 3. Claire Zammit's site is down, and Neale Donald Walsch was already on Spiritpedia (now linked).

Each skip has a file with its reason in `docs/content-audits/hubs-sprint-2/skipped/`. **Regional gaps:** Martha Jo Atkins fills San Antonio and Charleene Closshey (Plant City) sits in the Tampa area, both of which Sprint B's top-up left empty.

## Ways to get closer to 100 (your choice)

1. **Insight Timer's faculty extension:** 83 teachers already identified there who aren't on Spiritpedia. Insight Timer profiles often come back empty to us, so expect perhaps a third to make it.
2. **The ranked Kripalu and Omega faculty lists** from the retreat-hubs run (README §18.7), past the ranks already used. These hubs answer us and list current programmes.
3. **Permission emails to Mindvalley and Humanity's Team.** These would be from you. If they say yes, those two hubs could give many more teachers.
4. **Regional gaps:**
   - Johannesburg, Pretoria, Mysuru and Pune;
   - Brisbane/Gold Coast and Adelaide.

   These need different sources, because web search there returns mostly directories.

My suggestion is 1 and 2 together: a run aiming for about 50 more.

## Research slips (reported; nothing from them used)

- **After theshiftnetwork.com first returned 403,** some helpers kept requesting individual Shift teacher pages on it before being told to stop. That broke the "never retry a blocked site" rule.
  - They were redirected to the teachers' own sites.
  - The fetches were all refused, so nothing from them was used.
  - Every brief now says not to fetch theshiftnetwork.com, mindvalley.com or humanitysteam.org.
- **Claire Zammit's robots.txt** was requested twice. It was a server fault (522), not a refusal, and her page wasn't fetched.
- **Rules kept:** no fake user agents, mirrors or logins, and nothing from Amazon, Instagram, Facebook or YouTube search.

## Also done

- **Migration `0037`** (above).
- **Sprint C is marked Live in the README:**
  - Gen Kelsang Wangpo (Dallas) is added on dev and live under the new resident-teacher rule;
  - the rule is in README §18.4 and every brief.
- **README:**
  - §8.1 covers 0037;
  - §18.6 has this sprint's row;
  - §18.7 has the hub queue changes (Mindvalley and Humanity's Team on hold; Evolving Wisdom used with nothing copied).
- **Sprint folder** `docs/content-audits/hubs-sprint-2/`: brief, runner, queue (90 leads), 75 skips and REPORT.md.

## Update, 4 Nov 2026 (night): live

- **0037** was run by the owner on dev (58, 438, 2) and live (58, 425, 2).
  - Live read 425 rather than the 424 I predicted. My mistake: I read the count from a range header ("0-424/425") and took 424, when the total was 425.
  - After the insert, live reads 58, **439**, 2: the 2 hubs plus the 12 new teachers that publish a town.
- **Owner decisions:**
  - Hollyhock and Findhorn are Luminary by editorial stature (confirmed).
  - **Craig Hamilton** is added without the Evolving Wisdom link, on dev and live. Evolving Wisdom is left out.
  - The left-out items stay out, and Jeralyn Glass, Jamie Butler, Martha Jo Atkins, Laura Inserra and all thin pages are kept.
  - **Jean Houston** is to be added as an Ascended Master (research under way).
  - Danielle Van de Velde and Ani Rinchen Khandro are left out for now.
- **On live:**
  - both hubs, with their 4 existing teachers linked;
  - the 15 new teachers: 93 videos, 6 books, 55 offerings and 17 free resources.
- **Next:** pipelines sprint 1, under the owner's rule change for The Shift Network and Insight Timer lists (README §18.7).
