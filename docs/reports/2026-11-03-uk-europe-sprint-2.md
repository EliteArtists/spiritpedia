# Sprint A2: city first, UK, Ireland and Western Europe (3 Nov 2026)

**22 new teachers are on dev, and every one of the 13 target cities now has someone.** Nothing is live yet. One more plan (Ani Rinchen Khandro) is waiting for a photo.

## Your steps

1. **Run `supabase/migrations/0035_place_aliases_bakewell.sql` on dev** (SQL editor, whole file).
   - It adds one alias: John Butler publishes Bakewell, a town of under 5,000 people, and it points at Matlock (12 km).
   - The check row should read **54, 388, 2**: aliases; dev listings with a town; of those, still without a place. The two without a place are Salmon, Idaho and "Sussex County", as before.
2. **Look at the pages on localhost** (list below) and answer the decisions in one message.
3. **After your OK:** you run 0035 on **live** (check row **54, 342, 2**). Then I insert on live.

## The 22 (dev)

**On dev:**
- **Content:** 103 videos, 14 books, 80 offerings and 38 free resources, plus 11 hub links (Insight Timer).
- **Tiers:** 2 Luminary and 20 Local Hero. Both Luminary are by readable count: Shai Tubali (YouTube 237k) and John Butler (YouTube 239k).
- **Email:** 20 published, 2 contact form only (Adam Dacey, Steve Taylor).

| City | Teacher | Base as published | Videos · books · offerings · free | Page |
| :--- | :--- | :--- | :--- | :--- |
| Birmingham | Adam Dacey (Mindspace) | Birmingham | 7 · 0 · 8 · 3 | http://localhost:3000/healers/adam-dacey |
| Nottingham | Detzi Simpson | Nottingham | 0 · 0 · 6 · 0 | http://localhost:3000/healers/detzi-simpson |
| Nottingham | Claudia Silas | Nottingham | 4 · 0 · 3 · 4 | http://localhost:3000/healers/claudia-silas |
| Sheffield | Sara Teal | Sheffield | 0 · 0 · 3 · 2 | http://localhost:3000/healers/sara-teal |
| Sheffield area | John Butler (Luminary) | Bakewell (→ Matlock, after 0035) | 10 · 2 · 1 · 2 | http://localhost:3000/healers/john-butler |
| Manchester | Steve Taylor | Manchester | 12 · 8 · 1 · 2 | http://localhost:3000/healers/steve-taylor |
| Leeds | Felicity Weston | Leeds | 0 · 0 · 4 · 0 | http://localhost:3000/healers/felicity-weston |
| Liverpool | Keizan Scott Roshi | Liverpool | 10 · 3 · 3 · 1 | http://localhost:3000/healers/keizan-scott |
| Liverpool | Wendy Moran | Liverpool | 0 · 0 · 4 · 0 | http://localhost:3000/healers/wendy-moran |
| Glasgow | Cam Cooney | Glasgow | 0 · 0 · 3 · 1 | http://localhost:3000/healers/cam-cooney |
| Edinburgh area | Marc Stuart | Penicuik (16 km south) | 7 · 0 · 5 · 1 | http://localhost:3000/healers/marc-stuart |
| Cork | Joan Buckley | Cork | 2 · 0 · 5 · 3 | http://localhost:3000/healers/joan-buckley |
| Berlin | Shai Tubali (Luminary) | Berlin | 11 · 1 · 1 · 4 | http://localhost:3000/healers/shai-tubali |
| Berlin | Kimi Recor | Berlin | 10 · 0 · 5 · 0 | http://localhost:3000/healers/kimi-recor |
| Berlin | Alexandra Kreis | Berlin | 0 · 0 · 2 · 3 | http://localhost:3000/healers/alexandra-kreis |
| Berlin | Anya Kinneavy | Berlin | 0 · 0 · 9 · 3 | http://localhost:3000/healers/anya-kinneavy |
| Copenhagen | Bella Miles | Copenhagen | 6 · 0 · 3 · 2 | http://localhost:3000/healers/bella-miles |
| Paris | Joa Scetbon | Paris | 1 · 0 · 2 · 1 | http://localhost:3000/healers/joa-scetbon |
| Paris area | Amy Hollowell | Montreuil | 12 · 0 · 3 · 3 | http://localhost:3000/healers/amy-hollowell |
| Paris area | Catherine Genno Pagès | Montreuil | 0 · 0 · 2 · 1 | http://localhost:3000/healers/catherine-genno-pages |
| Lisbon | Sam Wysock-Wright | Lisbon | 11 · 0 · 3 · 2 | http://localhost:3000/healers/sam-wysock-wright |
| Lisbon area | João Palma | Almada | 0 · 0 · 4 · 0 | http://localhost:3000/healers/joao-palma |

The tier evidence, contact source and every research flag for each teacher are in `docs/content-audits/uk-europe-sprint-2/REPORT.md`.

## For you to decide

1. **Adam Dacey's website looks hacked.** Every page on mindspace.org.uk has injected casino links in its menu, and his listing links there. The teaching itself is fine.
   - Keep him and tell him?
   - Or hold him until the site is clean?
2. **Tiers:**
   - **John Butler** is Luminary by count (239k on YouTube). He is 89; his channel and bookshop were active in August 2026, so he's listed as still teaching.
   - **Sam Wysock-Wright:** only YouTube was readable, at 47.7k. His site claims over 650k followers across platforms, which would make him Luminary. Raise him?
   - **Suggested, not raised:**
     - Steve Taylor: a widely translated author, with two books in Eckhart Tolle Editions.
     - Catherine Genno Pagès: founded Dana Sangha, with seven dharma successors.
3. **Bases worth a glance:**
   - **John Butler:** Bakewell comes from his Insight Timer profile. His Trust's address is in Sheffield.
   - **Felicity Weston:** her base is her Leeds studio, but her mentoring offers sessions in Dorset, so she may now live there.
   - **João Palma:** his family lives near Monte da Caparica, which isn't in our places table, so Almada (the municipality) is used.
4. **One lineage in Paris.** Amy Hollowell, her successor Joa Scetbon and his teacher Catherine Genno Pagès share sangha inboxes and channels. Three listings, or fold Genno Pagès and Scetbon into Amy's?
   - Genno Pagès has 3 items and Scetbon 4, so both pages are thin.
5. **Fit:**
   - **Wendy Moran** leans towards wellness rather than spiritual teaching. Her weekly classes are left out because their page lists anxiety, sleep and hormone benefits.
   - **João Palma** teaches mostly in Portuguese. His MBSR work is left out under the health rule.
   - **Keizan Scott:** his email and videos are the sangha's.
   - **Alexandra Kreis** teaches with her partner, Richard Fuhrmann. One offering is a €2,800 year-long membership.

## Waiting: Ani Rinchen Khandro (Edinburgh)

She's a Tibetan Buddhist nun at Samye Dzong Edinburgh. Her plan is ready: 12 videos, 3 offerings, 3 free resources.

Her only photos are two portraits on edinburgh.samye.org. They load in a browser and with curl. The ingest script can't fetch them, though, because the site closes the connection, so the ingest refuses her for having no photo.

I didn't try any workaround. If you're happy with the photos, I'll look into why the script can't load them, or you could send a photo.

## Skipped (59) and not researched (1)

Each skip has a file with its reason in `docs/content-audits/uk-europe-sprint-2/skipped/`. The main reasons:
- **No website of their own, or no email or contact form:** the largest group, mainly Insight Timer-only teachers.
- **Mainly therapy, coaching or fitness.**
- **The health rule:**
  - Sandy C. Newbigging (Calm Cure, Mind Detox)
  - Vidyamala Burch (Breathworks, "for pain, illness and stress")
  - Ryan Jones, Huda Arnaout, Paula Radziszewska, Bé Barata
- **No base in the city:**
  - Karl Renz: Bad Pyrmont
  - Lama Jampa Thaye: London
  - Daniel Odier: no base
  - Tony Samara: sources disagree
  - Diana Kasperska: Kinnegad
  - Louise Luiggi: Lincolnshire
- **Sites that block us** (robots.txt), not fetched: Amy Davies, Dani (danisflowing), Trine Hedegaard, Allison Michaela. Awen Clement's site redirects to Substack.

Not researched: Paulina Perez Gonzalez (Berlin), still in the queue.

## Research slips (reported; nothing from them used)

**Open Library search.** Three helpers each called Open Library's `/search.json` once. Its robots.txt disallows `/search`.
- Our own ingest and fix-images scripts did the same as a last fallback for book covers. **That fallback is now removed** (`ac49be4`), and README §18.2 is updated.
- Books are now checked by ISBN only (`/isbn/`, which is allowed).

**Requests made before reading robots.txt:**
- One status check on anchor.fm redirected to creators.spotify.com, onto a path its robots.txt disallows.
- A curl on awenclement.co.uk's robots.txt followed a redirect onto Substack once. She was then skipped.
- An mp3 on we.activespirits.net was fetched before its robots.txt was read. The robots.txt allows it.

**Other:**
- One helper tried three guessed ISBNs on Open Library (all 404, none used).
- One wrote a temporary file to /tmp and deleted it.
- No blocked page was retried, no fake user agent was used, and nothing was fetched from Amazon, Instagram, Facebook or YouTube search.

**Search limit.** The helpers' shared web-search limit (200 calls) ran out partway through. That is part of why yield is about 4–5 per city group and not 6.

## Also done

- `0035` (above).
- README:
  - §8.1 covers 0035.
  - §18.6 has the sprint's row.
- The sprint folder `docs/content-audits/uk-europe-sprint-2/` has the brief, the runner, the queue (`progress.json`, 83 leads), the skips and REPORT.md.


## Update, 3 Nov 2026 (night): live

- **0035** was run by the owner on dev (54, 388, 2) and live (54, 366, 2).
- **Owner decisions,** applied on dev by `docs/content-audits/owner-fixes-uk-europe-2-2026-11-03.mjs` (logged for rollback) and on live from the updated plans:
  - **Steve Taylor is Luminary** by editorial stature: a widely translated author, with two books in Eckhart Tolle Editions.
  - **Adam Dacey** is kept, with **website_url and booking_url empty** while mindspace.org.uk is hacked, as with Laura Lynne Jackson. Someone should tell him.
    - His 8 offerings and 1 free resource still link to pages on that site, because that's where they're sold.
  - **Wendy Moran is dropped.** She was rolled back on dev; her plan is in `uk-europe-sprint-2/dropped/`.
  - Everything else is kept as it was: Sam Wysock-Wright stays Local Hero, the bases stay, all three Paris listings stay, and so do João Palma, Keizan Scott and Alexandra Kreis.
- **The 21 are on live:** 103 videos, 14 books, 76 offerings, 38 free resources and 11 Insight Timer links. That's 3 Luminary and 18 Local Hero, and every one of them has a place for Near You.
- **Ani Rinchen Khandro is still waiting.**
  - The cause: edinburgh.samye.org's robots.txt allows the photos, but its firewall closes the connection whenever a request carries our ingest's honest name (`SpiritpediaIngest/1.0`). This happens over HTTP/2 and HTTP/1.1 alike, while curl's default identity is served.
  - Getting the photos would mean sending another user agent, which the standing rule forbids, so I didn't.
  - Options:
    - a photo she or the centre sends, hosted by us;
    - the centre allowing our user agent;
    - or leaving her out.
