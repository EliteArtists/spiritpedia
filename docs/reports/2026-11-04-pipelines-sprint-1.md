# Pipelines sprint 1: The Shift Network and Insight Timer lists (4 Nov 2026)

**106 new teachers are on dev**, past the target of 100. Nothing from this sprint is live yet.
- **Rule change:** your new rule for these two lists is in README §18.7. A saved list is enough, each teacher is researched from their own site, and the Shift link goes on only where their own site names Shift.
- **Held:** 5 more plans, for your decision (below).
- **Also done:** hubs sprint 2 is live (see `2026-11-04-hubs-sprint-2.md`).

## Your steps

1. **Run `supabase/migrations/0038_place_aliases_pipelines_sprint_1.sql` on dev** (SQL editor, whole file).
   - It adds 11 aliases for bases that are villages, suburbs or municipalities not in places. Each maps to the nearest town of 5,000+, for example Nevada City → Grass Valley, Clonakilty → Bandon and Laakdal → Vorst.
   - The dev check row (aliases; listings with a town; of those, still without a place) should read **69, 497, 2**.
2. **Look at the pages on localhost** (list below) and answer the decisions in one message.
3. **After your OK:**
   - you run 0038 on **live** (check row **69, 439, 2**);
   - then I insert the 106 on live (the check row then reads 69, 497, 2).

## The 106 (dev)

**Totals:** 544 videos, 100 books, 449 offerings and 142 free resources.

**Where they came from:**
- 23 of the 67 Shift re-runs;
- 30 of the 68 Insight Timer extension names;
- 53 from further down the Shift list (ranks 301–454).

**Links:** 24 are linked "Teaches on The Shift Network", each because their own site names Shift. 30 are linked "Teaches on Insight Timer". One is linked to Omega (Nubia Teixeira).

**Tiers:**
- 2 Superhero by count: Krishna Das (YouTube 1.11M) and Nandhiji (YouTube 3.78M).
- 5 Luminary:
  - 2 by count: Sonia Choquette (362k) and Ken Honda (103k);
  - 3 raised by the helpers: Marie Diamond (published student counts), Robert Holden and Jean Shinoda Bolen (editorial stature). You need to confirm these three.
- 99 Local Hero.

**Email:** 77 published, 29 contact form only.

**Base:** 48 publish no town, so they show worldwide only. That's higher than in the regional sprints, because many of these teachers work online.

| From | Teacher | Base as published | Videos · books · offerings · free | Hub link | Page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Shift | Sarah McCrum | no base published | 9 · 1 · 4 · 2 | no | http://localhost:3000/healers/sarah-mccrum |
| Shift | Paul Levy | Portland, Oregon | 10 · 3 · 2 · 0 | yes | http://localhost:3000/healers/paul-levy |
| Shift | Michael Mayo | no base published | 12 · 1 · 6 · 0 | no | http://localhost:3000/healers/michael-mayo |
| Shift | Isis Indriya | Nevada City, California | 8 · 0 · 5 · 0 | no | http://localhost:3000/healers/isis-indriya |
| Shift | Danielle MacKinnon | Auburn, Maine | 12 · 2 · 5 · 1 | yes | http://localhost:3000/healers/danielle-mackinnon |
| Shift | Pea Horsley | London | 8 · 3 · 5 · 1 | yes | http://localhost:3000/healers/pea-horsley |
| Shift | Jocelyn Star Feather | Asheville, North Carolina | 8 · 0 · 7 · 3 | no | http://localhost:3000/healers/jocelyn-star-feather |
| Shift | Lisa Barnett | no base published | 9 · 3 · 5 · 1 | no | http://localhost:3000/healers/lisa-barnett |
| Shift | Monique Brignoni | no base published | 0 · 0 · 8 · 1 | yes | http://localhost:3000/healers/monique-brignoni |
| Shift | John Holland | no base published | 6 · 0 · 9 · 1 | no | http://localhost:3000/healers/john-holland |
| Shift | Maureen J. St. Germain | no base published | 8 · 5 · 9 · 0 | no | http://localhost:3000/healers/maureen-j-st-germain |
| Shift | Chitra Sukhu | Atlanta, Georgia | 9 · 0 · 4 · 1 | no | http://localhost:3000/healers/chitra-sukhu |
| Shift | Vincent Genna | no base published | 8 · 1 · 6 · 1 | yes | http://localhost:3000/healers/vincent-genna |
| Shift | Cheryl A. Page | Clifton, Colorado | 8 · 0 · 4 · 1 | no | http://localhost:3000/healers/cheryl-a-page |
| Shift | Jamye Price | Sedona, Arizona | 12 · 1 · 3 · 1 | no | http://localhost:3000/healers/jamye-price |
| Shift | Dr. Lotte Valentin | no base published | 3 · 0 · 8 · 0 | yes | http://localhost:3000/healers/lotte-valentin |
| Shift | Dr. Jacob Israel Liberman | no base published | 8 · 1 · 3 · 1 | yes | http://localhost:3000/healers/jacob-israel-liberman |
| Shift | William Peters | Santa Barbara, California | 3 · 1 · 3 · 1 | yes | http://localhost:3000/healers/william-peters |
| Shift | Jeffery C. Olsen | no base published | 3 · 3 · 0 · 0 | no | http://localhost:3000/healers/jeffery-c-olsen |
| Shift | Anandra George | Kilauea, Hawaii | 7 · 0 · 4 · 1 | yes | http://localhost:3000/healers/anandra-george |
| Shift | Miriam Peretz | no base published | 0 · 0 · 3 · 0 | no | http://localhost:3000/healers/miriam-peretz |
| Shift | Stephen Gray | no base published | 2 · 3 · 0 · 0 | no | http://localhost:3000/healers/stephen-gray |
| Shift | Shakti Durga | Cooranbong, New South Wales | 0 · 2 · 2 · 0 | no | http://localhost:3000/healers/shakti-durga |
| Insight Timer | Eileen Rose Miles | no base published | 12 · 0 · 5 · 2 | yes | http://localhost:3000/healers/eileen-rose-miles |
| Insight Timer | Elizabeth Pyjov | no base published | 9 · 0 · 5 · 3 | yes | http://localhost:3000/healers/elizabeth-pyjov |
| Insight Timer | Kylee O'Donnell | Austin, Texas | 0 · 0 · 3 · 1 | yes | http://localhost:3000/healers/kylee-odonnell |
| Insight Timer | Heceliza Perez | Long Beach, California | 0 · 0 · 4 · 2 | yes | http://localhost:3000/healers/heceliza-perez |
| Insight Timer | Lisa Venable | Minneapolis, Minnesota | 0 · 1 · 1 · 2 | yes | http://localhost:3000/healers/lisa-venable |
| Insight Timer | Nandhiji | Santa Monica, California | 12 · 0 · 5 · 1 | yes | http://localhost:3000/healers/nandhiji |
| Insight Timer | Adele Satori | no base published | 1 · 0 · 2 · 2 | yes | http://localhost:3000/healers/adele-satori |
| Insight Timer | Kelly Smith | no base published | 12 · 3 · 3 · 3 | yes | http://localhost:3000/healers/kelly-smith |
| Insight Timer | Grace Bryant | Port Townsend, Washington | 12 · 0 · 8 · 3 | yes | http://localhost:3000/healers/grace-bryant |
| Insight Timer | Athena Monet | Lewes, Delaware | 6 · 0 · 6 · 1 | yes | http://localhost:3000/healers/athena-monet |
| Insight Timer | Tanya Murphy | no base published | 0 · 0 · 2 · 2 | yes | http://localhost:3000/healers/tanya-murphy |
| Insight Timer | Shannon Shine | no base published | 0 · 0 · 4 · 1 | yes | http://localhost:3000/healers/shannon-shine |
| Insight Timer | Chad Foreman | Sunshine Coast, Queensland | 4 · 1 · 4 · 3 | yes | http://localhost:3000/healers/chad-foreman |
| Insight Timer | Sierra Wagner | Forestville, California | 0 · 0 · 4 · 2 | yes | http://localhost:3000/healers/sierra-wagner |
| Insight Timer | Swami Chidananda | no base published | 0 · 0 · 2 · 2 | yes | http://localhost:3000/healers/swami-chidananda |
| Insight Timer | Stephen Procter | Coffs Harbour, New South Wales | 12 · 0 · 3 · 5 | yes | http://localhost:3000/healers/stephen-procter |
| Insight Timer | Michelle Coutinho | no base published | 5 · 0 · 1 · 1 | yes | http://localhost:3000/healers/michelle-coutinho |
| Insight Timer | Suzi von Mensenkampff | Clonakilty | 8 · 0 · 4 · 2 | yes | http://localhost:3000/healers/suzi-von-mensenkampff |
| Insight Timer | Maura Cunningham | no base published | 0 · 0 · 1 · 2 | yes | http://localhost:3000/healers/maura-cunningham |
| Insight Timer | Samantha Cooper | San Diego, California | 12 · 0 · 5 · 1 | yes | http://localhost:3000/healers/samantha-cooper |
| Insight Timer | Mahasukha | Brighton | 0 · 0 · 5 · 1 | yes | http://localhost:3000/healers/mahasukha |
| Insight Timer | Matthew Sockolov | Playa del Carmen | 10 · 1 · 4 · 5 | yes | http://localhost:3000/healers/matthew-sockolov |
| Insight Timer | Will Caminada | no base published | 6 · 1 · 4 · 3 | yes | http://localhost:3000/healers/will-caminada |
| Insight Timer | Amy Robeson | North Charleston, South Carolina | 10 · 0 · 5 · 3 | yes | http://localhost:3000/healers/amy-robeson |
| Insight Timer | Cindy Glennon | Marblehead, Massachusetts | 0 · 0 · 3 · 1 | yes | http://localhost:3000/healers/cindy-glennon |
| Insight Timer | Dr. Richard Miller | no base published | 5 · 3 · 0 · 1 | yes | http://localhost:3000/healers/richard-miller |
| Insight Timer | Krishna Das | Nanuet, New York | 7 · 2 · 6 · 3 | yes | http://localhost:3000/healers/krishna-das |
| Insight Timer | Peter Bolland | San Diego, California | 0 · 0 · 2 · 2 | yes | http://localhost:3000/healers/peter-bolland |
| Insight Timer | Teresa Blythe | Phoenix, Arizona | 3 · 0 · 5 · 3 | yes | http://localhost:3000/healers/teresa-blythe |
| Insight Timer | Rabbi Daniel Raphael Silverstein | Tzur Hadassa | 4 · 0 · 6 · 4 | yes | http://localhost:3000/healers/daniel-raphael-silverstein |
| Shift | Andrew Harvey | no base published | 10 · 1 · 5 · 0 | yes | http://localhost:3000/healers/andrew-harvey |
| Shift | Dr. Sue Morter | Carmel, Indiana | 10 · 0 · 4 · 2 | no | http://localhost:3000/healers/sue-morter |
| Shift | Jessica Dibb | Owings Mills, Maryland | 0 · 0 · 4 · 0 | no | http://localhost:3000/healers/jessica-dibb |
| Shift | Mark Matousek | no base published | 7 · 0 · 5 · 0 | no | http://localhost:3000/healers/mark-matousek |
| Shift | Brian Thomas Swimme | San Francisco, California | 0 · 1 · 0 · 4 | no | http://localhost:3000/healers/brian-thomas-swimme |
| Shift | Stewart Pearce | London | 6 · 4 · 5 · 1 | no | http://localhost:3000/healers/stewart-pearce |
| Shift | Anthony Abbagnano | Castell'Azzara | 0 · 1 · 4 · 2 | yes | http://localhost:3000/healers/anthony-abbagnano |
| Shift | Robin Rose Bennett | Hewitt, New Jersey | 2 · 3 · 3 · 0 | no | http://localhost:3000/healers/robin-rose-bennett |
| Shift | Roel Crabbé | Laakdal | 7 · 0 · 7 · 3 | no | http://localhost:3000/healers/roel-crabbe |
| Shift | Matthew Cohen | Santa Barbara, California | 0 · 0 · 5 · 0 | yes | http://localhost:3000/healers/matthew-cohen |
| Shift | Natalie Southgate | Noosa Heads, Queensland | 10 · 1 · 5 · 3 | no | http://localhost:3000/healers/natalie-southgate |
| Shift | Anja Steensig | no base published | 2 · 1 · 3 · 0 | yes | http://localhost:3000/healers/anja-steensig |
| Shift | Laura Plumb | no base published | 6 · 0 · 8 · 2 | no | http://localhost:3000/healers/laura-plumb |
| Shift | Jennifer Hadley | no base published | 8 · 0 · 4 · 1 | no | http://localhost:3000/healers/jennifer-hadley |
| Shift | Jane Burns | Southbury, Connecticut | 0 · 0 · 5 · 0 | yes | http://localhost:3000/healers/jane-burns |
| Shift | Dr. Jean Shinoda Bolen | Mill Valley, California | 1 · 0 · 3 · 0 | yes | http://localhost:3000/healers/jean-shinoda-bolen |
| Shift | Alana Fairchild | Avalon Beach, New South Wales | 10 · 0 · 6 · 1 | no | http://localhost:3000/healers/alana-fairchild |
| Shift | Marie Diamond | Los Angeles, California | 10 · 0 · 10 · 1 | no | http://localhost:3000/healers/marie-diamond |
| Shift | Mark Bentley | no base published | 7 · 0 · 1 · 0 | yes | http://localhost:3000/healers/mark-bentley |
| Shift | Simon Borg-Olivier | Byron Bay, New South Wales | 11 · 0 · 9 · 1 | no | http://localhost:3000/healers/simon-borg-olivier |
| Shift | Marcela Lobos | no base published | 8 · 0 · 0 · 0 | no | http://localhost:3000/healers/marcela-lobos |
| Shift | Steph Magenta | Glastonbury | 3 · 0 · 7 · 0 | yes | http://localhost:3000/healers/steph-magenta |
| Shift | Dr. Christena Cleveland | Minneapolis, Minnesota | 0 · 1 · 5 · 0 | no | http://localhost:3000/healers/christena-cleveland |
| Shift | Dr. Ginger Lapid-Bogda | Albany, California | 3 · 5 · 5 · 2 | no | http://localhost:3000/healers/ginger-lapid-bogda |
| Shift | Kenlyn Kolleen | no base published | 2 · 0 · 2 · 1 | no | http://localhost:3000/healers/kenlyn-kolleen |
| Shift | don Oscar Miro-Quesada | no base published | 2 · 1 · 6 · 0 | yes | http://localhost:3000/healers/oscar-miro-quesada |
| Shift | Alexander John Shaia | Santa Fe, New Mexico | 5 · 2 · 3 · 3 | yes | http://localhost:3000/healers/alexander-john-shaia |
| Shift | Christina Lee Pratt | Portland, Oregon | 6 · 1 · 2 · 1 | yes | http://localhost:3000/healers/christina-lee-pratt |
| Shift | Shiva Rea | no base published | 0 · 0 · 3 · 0 | no | http://localhost:3000/healers/shiva-rea |
| Shift | Cissi Williams | no base published | 0 · 0 · 6 · 2 | no | http://localhost:3000/healers/cissi-williams |
| Shift | Dr. Clare Johnson | no base published | 7 · 3 · 7 · 2 | no | http://localhost:3000/healers/clare-johnson |
| Shift | Dee Wallace | Woodland Hills, California | 4 · 0 · 7 · 1 | no | http://localhost:3000/healers/dee-wallace |
| Shift | Judy Wilkins-Smith | Tyler, Texas | 6 · 1 · 3 · 0 | no | http://localhost:3000/healers/judy-wilkins-smith |
| Shift | Dr. Christine Page | no base published | 9 · 0 · 7 · 1 | no | http://localhost:3000/healers/christine-page |
| Shift | Philip Shepherd | no base published | 10 · 2 · 3 · 1 | no | http://localhost:3000/healers/philip-shepherd |
| Shift | Kelly Sullivan Walden | no base published | 7 · 0 · 4 · 0 | no | http://localhost:3000/healers/kelly-sullivan-walden |
| Shift | Langston Kahn | New York, New York | 0 · 0 · 3 · 2 | no | http://localhost:3000/healers/langston-kahn |
| Shift | Ariel Spilsbury | no base published | 0 · 0 · 4 · 2 | no | http://localhost:3000/healers/ariel-spilsbury |
| Shift | Bernadette Pleasant | no base published | 0 · 0 · 5 · 1 | yes | http://localhost:3000/healers/bernadette-pleasant |
| Shift | Nubia Teixeira | no base published | 0 · 0 · 2 · 2 | no | http://localhost:3000/healers/nubia-teixeira |
| Shift | Katie Silcox | no base published | 0 · 1 · 3 · 1 | no | http://localhost:3000/healers/katie-silcox |
| Shift | Kathleen Booker | no base published | 3 · 0 · 7 · 1 | yes | http://localhost:3000/healers/kathleen-booker |
| Shift | Chamgon Kenting Tai Situpa | Upper Bhattu, Himachal Pradesh | 4 · 6 · 2 · 0 | no | http://localhost:3000/healers/chamgon-kenting-tai-situpa |
| Shift | HeatherAsh Amara | no base published | 9 · 7 · 7 · 2 | no | http://localhost:3000/healers/heatherash-amara |
| Shift | Pir Shabda Kahn | San Rafael, California | 3 · 0 · 5 · 2 | no | http://localhost:3000/healers/pir-shabda-kahn |
| Shift | Robert Holden | Findhorn | 10 · 1 · 5 · 1 | no | http://localhost:3000/healers/robert-holden |
| Shift | Dr. Steven Farmer | Ashland, Oregon | 0 · 0 · 5 · 3 | no | http://localhost:3000/healers/steven-farmer |
| Shift | Sonia Choquette | no base published | 5 · 10 · 8 · 1 | no | http://localhost:3000/healers/sonia-choquette |
| Shift | Ken Honda | no base published | 10 · 2 · 1 · 1 | yes | http://localhost:3000/healers/ken-honda |
| Shift | Rodger Kamenetz | New Orleans, Louisiana | 5 · 2 · 1 · 0 | yes | http://localhost:3000/healers/rodger-kamenetz |
| Shift | Gemma B. Benton | Sacramento, California | 4 · 0 · 3 · 0 | no | http://localhost:3000/healers/gemma-benton |
| Shift | Tim Freke | no base published | 9 · 1 · 2 · 2 | no | http://localhost:3000/healers/tim-freke |
| Shift | Tim Kelley | no base published | 0 · 0 · 3 · 2 | no | http://localhost:3000/healers/tim-kelley |

The tier evidence, contact source and every research flag for each teacher are in `docs/content-audits/pipelines-sprint-1/REPORT.md` and in each plan.

## For you to decide

1. **Tiers:**
   - **Raised by the helpers:**
     - Marie Diamond: her About page says over ten million students;
     - Robert Holden: a Hay House author of 14 books (his YouTube is only 1.3k);
     - Jean Shinoda Bolen: Goddesses in Everywoman.
   - **Krishna Das (1.11M):** in the borderline band.
   - **Nandhiji (3.78M):** his views are modest for that count, so it may be ad-driven.
   - **Others the helpers suggest raising for editorial stature:** Andrew Harvey, Shiva Rea, Richard Miller (iRest), Maureen St Germain and Christena Cleveland.
   - **Possibly over 100k if their unreadable accounts were counted:** Sue Morter (87.8k on YouTube alone) and Danielle MacKinnon (85k).
2. **Held (5):**
   - **Catherine Ingram:** her Facing Extinction page now calls climate concern "climate hysteria". Is that conspiracy content? She co-founded IMS, so the helper also proposed Luminary.
   - **Doniel Katz:** a short on his channel is titled "The Jewish conspiracy no one talks about" (not opened). His only usable photo also has two inset pictures.
   - **Bodhipaksa, Deng Ming-Dao and Theresa Cheung:** each has one usable photo, but the ingest can't load it (their sites refuse its honest user agent). As before, I didn't look for a workaround. Options: photos you save by hand and we host, or leave them out.
3. **Health or fit (listed, borderline items left out, your call):**
   - **Lotte Valentin:** a naturopathic doctor who also sells medical intuition. Only her mediumship and ancestral work is listed.
   - **Jacob Liberman:** his About page is built on eyesight recovery and "light medicine". Only his presence and consciousness work is listed.
   - **Simon Borg-Olivier:** a physiotherapist. Only his yoga and breath courses are listed.
   - **Paul Levy:** his site sells "The Madness of George W. Bush". His COVID-era videos are left out. Is this political content?
   - **Stephen Gray:** writes on psychedelics and cannabis as spiritual tools, with no events since 2023.
   - **Kylee O'Donnell:** her most-watched video is a testimony about leaving the New Age for Christianity, and her work is mostly music.
   - **Dee Wallace:** her shop has a Health category and a COVID webinar, neither used.
   - **Christina Lee Pratt, Robin Rose Bennett and Anthony Abbagnano:** their healing and herbal items are left out.
   - **Thin pages:** Maura Cunningham, Lisa Venable, Peter Bolland, Adele Satori and Shiva Rea (3 or 4 items each).
4. **Identity or photo checks:**
   - **Miriam Peretz:** a sacred-dance teacher, not the Israeli educator of the same name.
   - **Mahasukha:** two uncaptioned photos, not confirmed as him.
   - **Gemma Benton:** her only photos are artistic double exposures.
   - **Monique Brignoni:** her face is partly shaded by a hat.
5. **Books are not confirmed on Open Library.** Open Library started showing us a human-verification page today, so it's now blocked for us. Books whose ISBN comes from the teacher's or publisher's own page went in, each flagged "not confirmed on Open Library". Keep them, or take them out until Open Library answers again?
6. **Skips you may want to overrule** (reasons are in each skip file):
   - **Adam Apollo:** his home page answers public accusations about a 2022 encounter.
   - **Mantak Chia:** his About page advertises a "natural cancer cure" at his spa.
   - **Thomas Hübl:** nearly all his work is framed as trauma healing; a few items would pass.
   - **Political or conspiracy content:**
     - Rachel Lang: political astrology;
     - Michael Sandler: UFO cover-up guests;
     - Jeff Brown: his "In Trudeau's Kitchen" series;
     - Anoop Kumar: a vaccine section.
   - **Borderline health:** Mario Martinez, Hilary Crowley and Deanne Bennett.
   - **Dropped by you in Insight Timer sprint 1, not revived:** Devon Kerns and Ipek Williamson.
7. **Three Shift images on live:**
   - **What happened:** the ingest's image lookup fetched Shift course pages for Martha Jo Atkins, Jamie Butler and Laura Inserra after Shift began refusing us, and copied their course images.
   - **Fixed on dev and in the plans:** each image is replaced with the teacher's own photo (`lead-fixes-shift-images-2026-11-04.mjs`, logged).
   - **Your call:** may I apply the same fix on live?
8. **Jean Houston (Ascended Master)** has a plan (11 videos, 10 books), but **no photo we may use**:
   - Wikimedia Commons has no free image of her.
   - Wikipedia's photo isn't free to reuse.
   - Her site's robots.txt blocks its image folder.

   Options: a photo you supply (for example from Meridian University or her publisher with permission), or wait.

## Worth another try later

- **Felicity Warner:** her new site launches on 5 Nov.
- **Orna Triguboff:** her site is showing database errors.
- **Tirzah Firestone, Jean Haner and Beatrice Chestnut:** thin only because their books couldn't be confirmed.
- **Evelyn Rysdyk:** only small photos were available.

## Why the yield is about 1 in 3

- **Of the 67 Shift re-runs,** most failed on rules that still stand: the health rule (medical intuition, trauma healing, herbal clinics), no site of their own, or a dead site.
- **Of the 68 Insight Timer extension names,** 46 were repeats of Insight Timer sprint 1's queue, already researched or skipped. That queue's remaining 46 turned out to be the same people, so it added nobody new.
- **Skips:** 178 in all, each with its reason in `docs/content-audits/pipelines-sprint-1/skipped/`.

## Research slips (reported; nothing from them used)

- **The ingest itself fetched theshiftnetwork.com.** Its image lookup opened Shift course URLs copied from teachers' sites, including the shiftnetwork.isrefer.com affiliate links that redirect there.
  - Fixed: `scripts/lib/images.mjs` now refuses off-limits hosts (Shift and its affiliate redirects, Mindvalley, Humanity's Team, Evolving Wisdom, Spirit Rock, Open Library, Linktree, Amazon, Instagram, Facebook, Substack), including after a redirect.
  - The images it took were replaced (point 7).
- **A different user agent, once.** To find out why Bodhipaksa's photo failed, one helper sent a request with the ingest's own user-agent string. That counts as a retry under another identity. It got no response and he is held.
- **Linktree:** one helper opened two Linktree profiles, whose robots.txt blocks the `*` group our curl fetches fall under. The one photo taken from it (Adele Satori) was removed.
- **Open Library:** several helpers sent a second or third request after a refused connection, before it was recognised as blocked. One helper used its `/search` (disallowed). The ingest no longer calls Open Library.
- **Rate limits:**
  - shantishop.org: one more request after a 429;
  - psycheand.co: four more requests after a 429;
  - kenhonda.com: one more after a 406.
- **Crawl delays:** the ingest's image checks don't keep a site's crawl delay (Sue Morter, Steven Farmer and others). The helpers' own fetches did.
- **Other:**
  - one HEAD request to amzn.to (only a redirect header was read);
  - one Shopify product feed request;
  - two writes to /tmp, deleted;
  - a few guessed URLs and domains;
  - YouTube's `?hl=en` language parameter;
  - one accidental Substack page via a redirect (not used);
  - one Barnes & Noble page.
- **Rules kept:** no fake user agents beyond the one above, no logins, nothing from Instagram, Facebook or YouTube search, and nothing used from any blocked page.

## Also done

- **Hubs sprint 2 is live:** 2 hubs, 15 teachers. Craig Hamilton is in without the hub link.
- **README:**
  - §18.7 has the rule change;
  - §18.6 has this sprint's row;
  - §8.1 covers 0038.
- **Sprint folder** `docs/content-audits/pipelines-sprint-1/`: brief, runner, leads, 178 skips and REPORT.md.

## Update, 5 Nov 2026: live

- **0038** was run by the owner on dev (69, 497, 2) and live (69, 439, 2).
  - After the changes below, both read **69, 494, 2**. That is the 55 new live teachers that publish a town; dev lost the 3 dropped or held teachers that had one.
- **Owner decisions, applied:**
  - **Tiers:** Marie Diamond, Robert Holden and Jean Shinoda Bolen are confirmed as Luminary. Andrew Harvey is raised to Luminary by editorial stature (on dev too). Krishna Das stays Superhero. No other raises.
  - **Dropped, rolled back on dev:** Nandhiji, Jacob Liberman, Stephen Gray and Kylee O'Donnell. Their plans are in `docs/content-audits/pipelines-sprint-1/dropped/`, and each has a skip file with the reason.
  - **Do not revive:** Nandhiji was dropped on 1 Nov and should never have come back. A new list in README §18.7 and the brief now names Nandhiji, Devon Kerns and Ipek Williamson, so they are skipped on sight.
  - **Held, not on live:**
    - Catherine Ingram and Doniel Katz stay out.
    - Bodhipaksa, Deng Ming-Dao and Theresa Cheung are left out for now.
    - Mahasukha is held because his photos are unconfirmed (now rolled back on dev too).
  - **Paul Levy** is kept. The Madness of George W. Bush was never in his plan.
  - **Kept:** all other teachers, including the thin pages; the books with ISBNs from the teacher's or publisher's own page; and all skips.
  - **Shift images on live:** the fix is applied to Martha Jo Atkins, Jamie Butler and Laura Inserra (3 rows; log `docs/content-audits/lead-fixes-shift-images-2026-11-04.live.log.json`).
  - **Jean Houston** waits for a usable photo.
- **On live: 101 new teachers.**
  - 522 videos, 96 books, 433 offerings and 138 free resources.
  - Tiers: 1 Superhero, 6 Luminary and 94 Local Hero.
  - Email: 73 published, 28 contact form.
  - Links: 23 Shift, 27 Insight Timer and 1 Omega.
  - All 101 inserted cleanly; a spot check confirms the tiers and that none of the left-out teachers is on live.
