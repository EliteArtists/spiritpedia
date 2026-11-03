# Latest report (3 Nov 2026)

Sprint A, also saved as `2026-11-03-uk-europe-sprint-1.md`. The location job's reports from earlier today are `2026-11-03-location-audit.md` and `2026-11-03-regional-coverage.md`.

---

# Sprint A: UK, Ireland and Western Europe (3 Nov 2026)

**25 new teachers on dev**, each with a published base in the UK, Ireland or Western Europe. **Nothing is live yet.** The target was about 30; see "Why 25" below.

Everything about the location job is on live (149 bases and Michael Harner, done earlier today; `0033` run by the owner).

## Your steps

1. **Run `supabase/migrations/0034_place_aliases_uk_europe.sql` on dev** (SQL editor, whole file).
   - It adds 8 town aliases for this sprint's villages and spellings, and gives those 8 listings their place.
   - The check row should read **53, 366, 2**: aliases; dev listings with a town; of those, still without a place. The two are Salmon, Idaho and "Sussex County" (as after 0033).
2. **Look at the pages on localhost** (list below). The decisions under "For you to decide" can be answered in one message.
3. **After your OK:** you run 0034 on **live** (check row **53, 342, 2**). Then I insert the 25 on live (`sprint.mjs insert 1 199 --env live`).

## The 25 (dev)

On dev: **138 videos, 37 books, 68 offerings, 60 free resources**, and 10 hub links (Insight Meditation Society and Insight Timer, where they teach). Tiers: **2 Luminary** (both by editorial override, see below) and **23 Local Hero**. Email: **18 published, 7 contact form only**.

| Teacher | Base | Videos · books · offerings · free | Page |
| :--- | :--- | :--- | :--- |
| Bernat Font | Barcelona | 0 · 1 · 4 · 4 | http://localhost:3000/healers/bernat-font |
| Lisette Schuitemaker | Amsterdam | 0 · 3 · 2 · 1 | http://localhost:3000/healers/lisette-schuitemaker |
| Ngakma Nor'dzin Pamo | Cardiff | 10 · 3 · 1 · 2 | http://localhost:3000/healers/ngakma-nordzin-pamo |
| Bridgeen Rea-Kaya | Belfast | 10 · 0 · 6 · 2 | http://localhost:3000/healers/bridgeen-rea-kaya |
| Orlaith O'Sullivan | Dublin | 10 · 0 · 5 · 4 | http://localhost:3000/healers/orlaith-osullivan |
| Mike Sheehy | Dublin | 0 · 0 · 3 · 3 | http://localhost:3000/healers/mike-sheehy |
| Keith Horan | Galway | 7 · 0 · 2 · 4 | http://localhost:3000/healers/keith-horan |
| Gordon Smith | United Kingdom (no town published) | 10 · 7 · 0 · 1 | http://localhost:3000/healers/gordon-smith |
| John Philip Newell | Findhorn (→ Forres) | 9 · 7 · 5 · 2 | http://localhost:3000/healers/john-philip-newell |
| Bhante Bodhidhamma | Minsterley (→ Bayston Hill) | 11 · 0 · 2 · 4 | http://localhost:3000/healers/bhante-bodhidhamma |
| Noirin Sheahan | Minsterley (→ Bayston Hill) | 0 · 0 · 2 · 3 | http://localhost:3000/healers/noirin-sheahan |
| Jilani Cordelia | Hebden Bridge (→ Todmorden) | 7 · 0 · 5 · 2 | http://localhost:3000/healers/jilani-cordelia |
| Sophie Bashford | Brighton | 10 · 2 · 1 · 1 | http://localhost:3000/healers/sophie-bashford |
| Gunaketu | Oslo | 0 · 0 · 2 · 2 | http://localhost:3000/healers/gunaketu |
| Jenny Berglund Castro | Stockholm | 0 · 0 · 3 · 3 | http://localhost:3000/healers/jenny-berglund-castro |
| Juha Penttilä | Helsinki | 6 · 0 · 4 · 2 | http://localhost:3000/healers/juha-penttila |
| Michael Anderson | Vienna | 0 · 0 · 5 · 0 | http://localhost:3000/healers/michael-anderson |
| Anne Eberhardt | St. Gallen | 0 · 0 · 2 · 2 | http://localhost:3000/healers/anne-eberhardt |
| Eva Bruha | Nidau | 0 · 0 · 3 · 2 | http://localhost:3000/healers/eva-bruha |
| Akincano Marc Weber | Cologne | 0 · 0 · 4 · 3 | http://localhost:3000/healers/akincano-marc-weber |
| Martine Batchelor | Bordeaux (see below) | 11 · 5 · 1 · 3 | http://localhost:3000/healers/martine-batchelor |
| Stephen Batchelor (Luminary) | Bordeaux (see below) | 8 · 8 · 0 · 2 | http://localhost:3000/healers/stephen-batchelor |
| Martin Aylward | Cubjac (→ Trélissac) | 10 · 1 · 6 · 2 | http://localhost:3000/healers/martin-aylward |
| Brother Phap Huu | Thénac (→ Bergerac) | 10 · 0 · 0 · 2 | http://localhost:3000/healers/brother-phap-huu |
| Brother Phap Linh | Thénac (→ Bergerac) | 9 · 0 · 0 · 4 | http://localhost:3000/healers/brother-phap-linh |

John Philip Newell is also Luminary, by editorial override. Each listing shows the town it publishes. "→" shows the town used for Near You distances, which comes from 0034. Until you run 0034, those 8 have no place on dev.

The tier evidence, contact source and every research flag for each teacher are in `docs/content-audits/uk-europe-sprint-1/REPORT.md`.

## Coverage effect

Gap cities from the regional report that now have someone:
- **UK and Ireland:** Cardiff, Belfast and Brighton. Galway and Dublin go from 1 and 2 on live to 2 and 4.
- **Western Europe:** Barcelona, Amsterdam, Stockholm, Oslo, Helsinki and Vienna, plus Cologne, St. Gallen and the Bordeaux/Dordogne area.

**Still empty from the Sprint A target list:** Birmingham, Manchester, Leeds, Liverpool, Sheffield, Nottingham, Glasgow, Edinburgh, Cork, Berlin, Paris, Lisbon and Copenhagen.

## Why 25, and the big English cities still empty

- **Most UK centre teachers publish no base.** Gaia House and Bodhi College teachers say where retreats are held, never where they live. River Wolton (Sheffield Insight Meditation's founder), Nathan Glyde and Mark Ovland were skipped for this reason, as were Johnny Glover and Uz Afzal.
- **Many have no contact route.** Christina Feldman (Totnes), Ajahn Sucitto, Jake Dartington, Laura Bridgman, Gerit Stöcklmair, Riet Aarsse, Leela Sarti, Helena Petersen, Ishvari Akibaya, Julie Alexandra, Laia Bové, Sina Weber, Yuka Nakamura (her site returned 403, not retried) and Stephen Downey (a cookie loop, treated as blocked) publish no email or form.
- **The two directories in the plan can't be used.** The British Wheel of Yoga and UK Reiki Federation terms forbid reusing their listings, so nothing was taken from either.
- **Next time:** the big English and Scottish cities need a city-first search (Insight Timer by city, the teachers' own sites) rather than centre faculty lists. The 21 queue entries not yet researched are mostly centre teachers too (Gaia House, Samye Ling, Plum Village). I'd start Sprint A2 city-first unless you'd rather finish the queue.

## Skipped (32) and dropped (1)

Each has a file with the full reason in `docs/content-audits/uk-europe-sprint-1/skipped/`.

- **No published base (5):** River Wolton, Nathan Glyde, Mark Ovland, Johnny Glover, Uz Afzal.
- **No email or contact form (14):** the names under "Why 25" above, plus Jaya Rudgard (her own site's robots.txt blocks us, so it was not opened).
- **Health rule (5):** Camilla Strandmark (Yoga for Cancer), Elspeth Lewis, Nigel Meadows, Tim van der Vliet (TT Breathing claims), Sina Weber (EFT framed on conditions; she also has no contact).
- **Too thin, or not mainly spiritual teaching (6):** Alan Lewis, John Darwin, Valerie Fabris, Lynn Yap, Sophy Banks, plus Leela Sarti (mostly psychotherapy; she also has no contact).
- **No usable photo:** Ingen Breen (the only headshots are 212 px and 100 px).
- **Already on Spiritpedia:** Stephan Pende Wormland (from the 1 Nov Insight Timer run).
- **Dropped after a plan was written:** Sarah Gregg (health rule: her clinic's pages on cancer, infertility and dementia). The plan is in `dropped/`.

**Worth another look if they publish more:** Christina Feldman (a contact route), and River Wolton, Nathan Glyde and Mark Ovland (a base).

**Left out because the site blocks us:** Patrick Arundell (Rochdale astrologer, about 129k YouTube subscribers). patrickarundell.com's robots.txt blocks Claude agents.

## For you to decide

1. **Tiers by editorial override:**
   - John Philip Newell (about 538 readable followers) and Stephen Batchelor (no accounts of his own) are set to **Luminary**. Keep, or drop to Local Hero?
   - Others the research suggested but **I didn't raise**:
     - Gordon Smith: 23 books, over a million sold; only YouTube readable at 7.7k.
     - Martine Batchelor.
     - Akincano Marc Weber: co-founder of Bodhi College.
     - Martin Aylward: founder of Moulin de Chaves and Sangha Live.
     - Brother Phap Huu: abbot of Upper Hamlet; all his channels belong to Plum Village.
     - Brother Phap Linh.
2. **Stephen Batchelor retired from teaching courses at the end of 2024.** He still gives occasional talks, so he's listed with no offerings. Keep, or treat as no longer teaching?
3. **Lisette Schuitemaker's fit.** Her site calls her an author, impact investor and board director. Her teaching now is an annual Findhorn retreat, a Dutch e-learning course and her books. Keep or drop?
4. **The Batchelors' base.** Their site says "a small village near Bordeaux" and doesn't name it, so **Bordeaux** is used. Fine for Near You?
5. **Gordon Smith's base.** He publishes only the UK, so he has a country and no town. Glasgow is his birthplace and an event venue, not a published base, so it wasn't used.
6. **Contact addresses** that needed decoding or aren't personal (all published on their own pages):
   - Akincano Marc Weber: the address on his site is written "webmaster[-at-]akincano.net". It's his only published address, so it's used.
   - Bhante Bodhidhamma and Noirin Sheahan: Cloudflare-hidden addresses on Satipanya's pages, decoded (your rule from 1 Nov).
   - Jenny Berglund Castro: her studio's info@ inbox.
   - Jilani Cordelia: jilanicordelia@gmail.com, a mailto link on her retreat pages. Her contact page hides its address.
7. **Small checks while you look:**
   - Ngakma Nor'dzin Pamo's name: the Aro encyclopaedia now says "Ngala". Her Cardiff blog, publisher and YouTube still say Ngakma, so Ngakma is used.
   - Orlaith O'Sullivan's third photo is older. Keep or drop?
   - Bernat Font's base: he founded and presides over Espai Sati in Barcelona, but no page says outright that he lives there.
   - Eva Bruha's site hasn't been updated since spring 2026. Her weekly drop-in is listed as current.
   - Anne Eberhardt's base is **St. Gallen** (her studio), not Zürich as the queue had it.

## Books and Amazon

- **amazon.com's robots.txt blocks Claude agents, so no Amazon page was opened.**
- Every book's ISBN-10 or ASIN comes from the teacher's or publisher's own page and is confirmed on Open Library. Covers come by ASIN from Amazon's image server, else from Open Library.
- Worth a click on localhost: the Buy links for Newell, the Batchelors, Gordon Smith and Sophie Bashford. Bernat Font's book (Bloomsbury, 2026) uses the draft cover from his own site.
- **I added Sophie Bashford's 2 books** (You Are a Goddess; Goddesses, Gods and Guardians Oracle Cards) from her own site.
- **Left out:** Brother Phap Huu's books, as borderline under the health rule.
- **I removed one sentence from Noirin Sheahan's bio** before the insert: her laryngectomy, her own history, not a claim.

## The ingest scripts: fixed to follow your standing rule

While checking this sprint, I found two places where the scripts broke the rule "never another browser identity or user agent":
- `scripts/lib/images.mjs` fetched pages with a **Chrome user agent**.
- `scripts/ingest.mjs` and `scripts/fix-images.mjs` **opened Amazon product pages**, which amazon.com's robots.txt blocks.

Both are fixed:
- The scripts now name themselves (`SpiritpediaIngest/1.0`, with the site's address).
- They never open an Amazon page. A book's ASIN is checked on Open Library instead, and a Kindle `B0…` ASIN is listed for a human to confirm.
- The cover still comes by ASIN from Amazon's image server, which isn't a product page.
- README §18.2 and §19 are updated.

## Research slips (reported, nothing used)

- **YouTube search:** one research helper requested a YouTube search page (`/results`, blocked by YouTube's robots.txt). It was refused and not retried.
- **A blocked blog:** one helper fetched readingroomatingenji.wordpress.com in the same command as its robots.txt, which says `Disallow: /`. The page was deleted and nothing from it was used.
- **A sprint file overwritten:** a helper overwrote `stephan-pende-wormland.json`. I restored it from git, and it's unchanged.

## Also done

- **README:**
  - §8.1 covers 0034.
  - §18.2 and §19 cover the honest user agent and Open Library.
  - §18.6 has the sprint's row.
  - §18.7 has the regional sprints.
- **The sprint folder,** `docs/content-audits/uk-europe-sprint-1/`, has the brief, the queue (`progress.json`), the skips and REPORT.md.
