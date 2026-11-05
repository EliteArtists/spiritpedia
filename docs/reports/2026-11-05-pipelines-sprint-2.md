# Pipelines sprint 2: The Shift Network and Insight Timer lists (5 Nov 2026)

**80 new teachers are on dev, short of the target of 100.** Both saved lists are now used up: all 431 leads were researched. Nothing from this sprint is live yet.
- **Held:** 7 more plans, for your decision (below).
- **Left as they are, as you asked:** Cirak, Giovanni Dienstmann and Grace Bryant.
- **Skipped:** none from the do-not-revive list (Nandhiji, Devon Kerns, Ipek Williamson).

## Your steps

1. **Run `supabase/migrations/0040_place_aliases_pipelines_sprint_2.sql` on dev** (SQL editor, whole file).
   - It adds 16 aliases for bases that are villages, islands or a region, for example Beatenberg → Unterseen, Malmsbury → Kyneton, Kauai → Lihue and "Bay Area" → San Francisco.
   - The dev check row (aliases; listings with a town; of those, still without a place) should read **85, 540, 2**. The 2 are older listings (Beth Bradford's "Sussex County" and Marybeth Hyland's "Salmon").
2. **Look at the pages on localhost** (5 random ones are below, and every page is in the table) and answer the decisions in one message.
3. **After your OK:**
   - you run 0040 on **live** (check row **85, 494, 2**);
   - then I insert the 80 on live, leaving out the held ones.

**5 random pages** (each loads with HTTP 200 on localhost):
- http://localhost:3000/healers/joseph-selbie
- http://localhost:3000/healers/amit-goswami
- http://localhost:3000/healers/john-weddepohl
- http://localhost:3000/healers/charlie-morley
- http://localhost:3000/healers/stephanie-red-feather

## The 80 (dev)

**Totals:** 479 videos, 109 books, 291 offerings and 114 free resources.

**Where they came from:** 46 from the Shift faculty list and 34 from our Insight Timer names. The two lists were taken in turn until Shift ran out at rank 234.

**Links:**
- 34 are linked "Teaches on Insight Timer".
- 13 are linked "Teaches on The Shift Network", each because their own site names Shift. On Cynthia James's site, Shift appears only as a logo.
- 1 is linked to Omega (Suzi Tucker).
- No page on theshiftnetwork.com was fetched.

**Tiers:** 6 Luminary, 74 Local Hero.
- **By count:** Steve Nobel (YouTube 198k + Insight Timer 55.6k) and Jason McGrice (Insight Timer 176.6k).
- **Raised for editorial stature (please confirm):**
  - Dan Siegel (Mindsight; YouTube only 35k);
  - Amit Goswami (The Self-Aware Universe; no readable counts);
  - Michael Berg (Kabbalah Centre co-director);
  - Ken Wilber (integral theory).

**Email:** 63 published, 17 contact form only. Each plan saves its source page, and the ingest wrote it to `contact_email_source` and `contact_form_url`.

**Base:** 31 publish no town, so they show worldwide only.

The tier evidence and every research flag for each teacher are in `docs/content-audits/pipelines-sprint-2/REPORT.md` and in each plan.

| # | From | Teacher | Tier | Base as published | Videos · books · offerings · free | Email | Hub link | Page |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 9 | Shift | Dr. Katie Hendricks | Local Hero | Ojai, California, United States | 7 · 1 · 3 · 3 | published | no | http://localhost:3000/healers/katie-hendricks |
| 11 | Shift | Dr. Dan Siegel | **Luminary** | Santa Monica, California, United States | 8 · 5 · 1 · 2 | published | no | http://localhost:3000/healers/dan-siegel |
| 13 | Shift | Michelle Masters | Local Hero | no base published | 8 · 1 · 3 · 2 | published | Shift | http://localhost:3000/healers/michelle-masters |
| 19 | Shift | Tom Condon | Local Hero | Bend, Oregon, United States | 9 · 0 · 3 · 0 | published | Shift | http://localhost:3000/healers/tom-condon |
| 23 | Shift | Flora Bowley | Local Hero | Portland, Oregon, United States | 0 · 4 · 8 · 0 | published | no | http://localhost:3000/healers/flora-bowley |
| 27 | Shift | Kim Chestney | Local Hero | no base published | 10 · 3 · 6 · 3 | form only | Shift | http://localhost:3000/healers/kim-chestney |
| 38 | Insight Timer | Burgs | Local Hero | no base published | 10 · 0 · 6 · 3 | published | Insight Timer | http://localhost:3000/healers/burgs |
| 41 | Shift | Suzi Tucker | Local Hero | Redding Ridge, Connecticut, United States | 9 · 2 · 5 · 0 | published | Omega | http://localhost:3000/healers/suzi-tucker |
| 47 | Shift | Lisa Williams | Local Hero | Beverly Hills, California, United States | 8 · 1 · 6 · 0 | published | no | http://localhost:3000/healers/lisa-williams |
| 49 | Shift | Dr. Deborah Ooten | Local Hero | Cincinnati, Ohio, United States | 3 · 0 · 5 · 1 | form only | no | http://localhost:3000/healers/deborah-ooten |
| 58 | Insight Timer | Jason McGrice | **Luminary** | Adelaide, South Australia, Australia | 0 · 0 · 2 · 1 | form only | Insight Timer | http://localhost:3000/healers/jason-mcgrice |
| 63 | Shift | Ashanna Solaris | Local Hero | Maui, Hawaii, United States | 8 · 0 · 7 · 0 | published | no | http://localhost:3000/healers/ashanna-solaris |
| 69 | Shift | Charlie Morley | Local Hero | London, United Kingdom | 5 · 3 · 7 · 1 | published | no | http://localhost:3000/healers/charlie-morley |
| 71 | Shift | Lottie Moore | Local Hero | no base published | 0 · 0 · 8 · 0 | form only | no | http://localhost:3000/healers/lottie-moore |
| 72 | Insight Timer | Ajahn Achalo | Local Hero | Thailand | 10 · 0 · 0 · 5 | published | Insight Timer | http://localhost:3000/healers/ajahn-achalo |
| 78 | Insight Timer | Steve Nobel | **Luminary** | no base published | 10 · 6 · 8 · 2 | published | Insight Timer | http://localhost:3000/healers/steve-nobel |
| 79 | Shift | Joseph Selbie | Local Hero | no base published | 10 · 3 · 0 · 1 | published | no | http://localhost:3000/healers/joseph-selbie |
| 81 | Shift | Darren Austin Hall | Local Hero | no base published | 8 · 0 · 4 · 1 | published | no | http://localhost:3000/healers/darren-austin-hall |
| 82 | Insight Timer | Michael Mackintosh | Local Hero | Kauai, Hawaii, United States | 9 · 1 · 3 · 3 | published | Insight Timer | http://localhost:3000/healers/michael-mackintosh |
| 87 | Shift | Dr. Amit Goswami | **Luminary** | no base published | 0 · 9 · 2 · 0 | published | no | http://localhost:3000/healers/amit-goswami |
| 93 | Shift | Michelle Clare | Local Hero | Phoenix, Arizona, United States | 7 · 2 · 4 · 1 | published | Shift | http://localhost:3000/healers/michelle-clare |
| 95 | Shift | Mellissa Seaman | Local Hero | Nevada City, California, United States | 8 · 0 · 4 · 2 | form only | no | http://localhost:3000/healers/mellissa-seaman |
| 96 | Insight Timer | Jay Chodagam | Local Hero | San Francisco, California, United States | 11 · 0 · 0 · 2 | form only | Insight Timer | http://localhost:3000/healers/jay-chodagam |
| 101 | Shift | Julie Reisler | Local Hero | United States | 5 · 1 · 4 · 2 | published | Shift | http://localhost:3000/healers/julie-reisler |
| 107 | Shift | Arthur Samuel Joseph | Local Hero | no base published | 2 · 4 · 4 · 1 | published | no | http://localhost:3000/healers/arthur-samuel-joseph |
| 109 | Shift | Corin Grillo | Local Hero | Mount Shasta, California, United States | 0 · 2 · 2 · 2 | published | no | http://localhost:3000/healers/corin-grillo |
| 110 | Insight Timer | Hilary Jackendoff | Local Hero | Los Angeles, California, United States | 0 · 0 · 5 · 1 | published | Insight Timer | http://localhost:3000/healers/hilary-jackendoff |
| 111 | Shift | Susan Grau | Local Hero | Tustin, California, United States | 10 · 1 · 4 · 1 | published | no | http://localhost:3000/healers/susan-grau |
| 113 | Shift | Dr. Amber Mele’ha Wolf | Local Hero | United States | 0 · 0 · 4 · 2 | published | no | http://localhost:3000/healers/amber-meleha-wolf |
| 121 | Shift | Suzanne Dion | Local Hero | no base published | 0 · 1 · 5 · 0 | published | Shift | http://localhost:3000/healers/suzanne-dion |
| 125 | Shift | Rev. Dr. Hillary Raining | Local Hero | Washington, DC, United States | 6 · 0 · 3 · 1 | form only | Shift | http://localhost:3000/healers/hillary-raining |
| 145 | Shift | Sarah Janes | Local Hero | Ancient Epidavros, Greece | 6 · 1 · 6 · 0 | published | Shift | http://localhost:3000/healers/sarah-janes |
| 149 | Shift | Fay Johnstone | Local Hero | Culross, United Kingdom | 9 · 3 · 5 · 0 | published | no | http://localhost:3000/healers/fay-johnstone |
| 153 | Shift | Sister Jenna | Local Hero | Washington, DC, United States | 6 · 1 · 1 · 1 | published | Shift | http://localhost:3000/healers/sister-jenna |
| 155 | Shift | Shelly Reef | Local Hero | no base published | 7 · 0 · 0 · 0 | form only | Shift | http://localhost:3000/healers/shelly-reef |
| 161 | Shift | Sue Brayne | Local Hero | no base published | 11 · 3 · 1 · 1 | form only | no | http://localhost:3000/healers/sue-brayne |
| 163 | Shift | Dr. Carmen Acevedo Butcher | Local Hero | Bay Area, California, United States | 10 · 7 · 0 · 0 | form only | Shift | http://localhost:3000/healers/carmen-acevedo-butcher |
| 171 | Shift | Chetan Parkyn | Local Hero | Escondido, California, United States | 8 · 4 · 6 · 2 | published | no | http://localhost:3000/healers/chetan-parkyn |
| 173 | Shift | Russill Paul | Local Hero | no base published | 2 · 1 · 7 · 0 | form only | no | http://localhost:3000/healers/russill-paul |
| 174 | Insight Timer | Gordon Burnham | Local Hero | La Crescenta, California, United States | 0 · 6 · 2 · 1 | published | Insight Timer | http://localhost:3000/healers/gordon-burnham |
| 175 | Shift | Fleet Maull | Local Hero | Hatfield, Massachusetts, United States | 11 · 1 · 0 · 0 | published | no | http://localhost:3000/healers/fleet-maull |
| 177 | Shift | Jonathan Hammond | Local Hero | Kihei, Hawaii, United States | 8 · 1 · 4 · 0 | form only | Shift | http://localhost:3000/healers/jonathan-hammond |
| 181 | Shift | Laura Hollick | Local Hero | no base published | 1 · 0 · 2 · 2 | form only | no | http://localhost:3000/healers/laura-hollick |
| 183 | Shift | Tanya Carroll Richardson | Local Hero | no base published | 0 · 8 · 2 · 0 | published | no | http://localhost:3000/healers/tanya-carroll-richardson |
| 185 | Shift | Chris Niebauer | Local Hero | Slippery Rock, Pennsylvania, United States | 10 · 3 · 0 · 0 | form only | no | http://localhost:3000/healers/chris-niebauer |
| 186 | Insight Timer | Josephine Sorciere | Local Hero | Adelaide, South Australia, Australia | 0 · 0 · 3 · 1 | published | Insight Timer | http://localhost:3000/healers/josephine-sorciere |
| 187 | Shift | Dr. Jennifer Freed | Local Hero | Santa Barbara, California, United States | 0 · 3 · 2 · 0 | published | no | http://localhost:3000/healers/jennifer-freed |
| 195 | Shift | Jeddah Mali | Local Hero | no base published | 5 · 0 · 0 · 0 | published | no | http://localhost:3000/healers/jeddah-mali |
| 202 | Insight Timer | Carmen Warrington | Local Hero | Malmsbury, Victoria, Australia | 12 · 2 · 1 · 3 | published | Insight Timer | http://localhost:3000/healers/carmen-warrington |
| 204 | Insight Timer | Johnson Chong | Local Hero | Sydney, New South Wales, Australia | 2 · 0 · 6 · 2 | form only | Insight Timer | http://localhost:3000/healers/johnson-chong |
| 207 | Shift | Cynthia James | Local Hero | no base published | 4 · 2 · 4 · 1 | published | Shift | http://localhost:3000/healers/cynthia-james |
| 209 | Shift | Deb Sheppard | Local Hero | no base published | 10 · 0 · 3 · 1 | published | no | http://localhost:3000/healers/deb-sheppard |
| 213 | Shift | Rev. Dr. Stephanie Red Feather | Local Hero | no base published | 10 · 2 · 3 · 1 | published | no | http://localhost:3000/healers/stephanie-red-feather |
| 215 | Shift | Karina Schelde | Local Hero | no base published | 8 · 0 · 5 · 2 | published | no | http://localhost:3000/healers/karina-schelde |
| 221 | Shift | Dr. Lise Janelle | Local Hero | Toronto, Ontario, Canada | 11 · 1 · 8 · 3 | published | no | http://localhost:3000/healers/lise-janelle |
| 223 | Shift | Giovanni Bartolomeo | Local Hero | Bolton, Ontario, Canada | 9 · 0 · 3 · 2 | published | no | http://localhost:3000/healers/giovanni-bartolomeo |
| 226 | Insight Timer | Buddha-Haus | Local Hero | Oy-Mittelberg, Germany | 8 · 0 · 4 · 1 | published | Insight Timer | http://localhost:3000/healers/buddha-haus |
| 231 | Shift | Alison Armstrong | Local Hero | no base published | 11 · 0 · 7 · 2 | published | no | http://localhost:3000/healers/alison-armstrong |
| 235 | Insight Timer | Mindfulness Northwest | Local Hero | Bellingham, Washington, United States | 1 · 0 · 8 · 4 | published | Insight Timer | http://localhost:3000/healers/mindfulness-northwest |
| 242 | Insight Timer | Clive Freeman | Local Hero | no base published | 0 · 0 · 1 · 5 | published | Insight Timer | http://localhost:3000/healers/clive-freeman |
| 255 | Insight Timer | Amrit Yoga Institute | Local Hero | Salt Springs, Florida, United States | 10 · 0 · 5 · 2 | published | Insight Timer | http://localhost:3000/healers/amrit-yoga-institute |
| 279 | Insight Timer | Scott Snibbe | Local Hero | Berkeley, California, United States | 2 · 1 · 5 · 3 | form only | Insight Timer | http://localhost:3000/healers/scott-snibbe |
| 282 | Insight Timer | Victoria Ucele | Local Hero | Swansea, United Kingdom | 12 · 0 · 2 · 1 | published | Insight Timer | http://localhost:3000/healers/victoria-ucele |
| 295 | Insight Timer | Michael Berg | **Luminary** | New York, New York, United States | 0 · 0 · 1 · 2 | published | Insight Timer | http://localhost:3000/healers/michael-berg |
| 296 | Insight Timer | Michael Drake | Local Hero | no base published | 0 · 2 · 0 · 3 | published | Insight Timer | http://localhost:3000/healers/michael-drake |
| 301 | Insight Timer | Ronan Rooney | Local Hero | no base published | 10 · 0 · 4 · 2 | published | Insight Timer | http://localhost:3000/healers/ronan-rooney |
| 307 | Insight Timer | Sarah Noble | Local Hero | no base published | 10 · 0 · 5 · 2 | published | Insight Timer | http://localhost:3000/healers/sarah-noble |
| 333 | Insight Timer | Ken Wilber | **Luminary** | Denver, Colorado, United States | 12 · 7 · 5 · 2 | published | Insight Timer | http://localhost:3000/healers/ken-wilber |
| 336 | Insight Timer | Deb Poole | Local Hero | no base published | 0 · 0 · 2 · 1 | published | Insight Timer | http://localhost:3000/healers/deb-poole |
| 347 | Insight Timer | Swami Viditatmananda | Local Hero | Saylorsburg, Pennsylvania, United States | 5 · 0 · 2 · 1 | published | Insight Timer | http://localhost:3000/healers/swami-viditatmananda |
| 366 | Insight Timer | Lama Dvora | Local Hero | Tzofar, Israel | 5 · 0 · 0 · 1 | published | Insight Timer | http://localhost:3000/healers/lama-dvora |
| 370 | Insight Timer | Yogi Charu | Local Hero | no base published | 10 · 0 · 7 · 3 | form only | Insight Timer | http://localhost:3000/healers/yogi-charu |
| 377 | Insight Timer | Shannon Murphy | Local Hero | no base published | 0 · 0 · 6 · 3 | published | Insight Timer | http://localhost:3000/healers/shannon-murphy |
| 380 | Insight Timer | Sacha Heath | Local Hero | no base published | 8 · 0 · 3 · 2 | published | Insight Timer | http://localhost:3000/healers/sacha-heath |
| 388 | Insight Timer | Nathan Maingard | Local Hero | Cape Town, Western Cape, South Africa | 5 · 0 · 2 · 1 | published | Insight Timer | http://localhost:3000/healers/nathan-maingard |
| 391 | Insight Timer | Astrid Blankenburg | Local Hero | no base published | 0 · 0 · 5 · 1 | published | Insight Timer | http://localhost:3000/healers/astrid-blankenburg |
| 394 | Insight Timer | Mahip Rathore | Local Hero | Amherst, Massachusetts, United States | 12 · 0 · 2 · 3 | published | Insight Timer | http://localhost:3000/healers/mahip-rathore |
| 401 | Insight Timer | John Weddepohl | Local Hero | Byron Bay, New South Wales, Australia | 3 · 0 · 2 · 1 | published | Insight Timer | http://localhost:3000/healers/john-weddepohl |
| 423 | Insight Timer | Fred von Allmen | Local Hero | Beatenberg, Switzerland | 12 · 0 · 9 · 1 | published | Insight Timer | http://localhost:3000/healers/fred-von-allmen |
| 428 | Insight Timer | Marta Metrass | Local Hero | no base published | 2 · 0 · 4 · 1 | published | Insight Timer | http://localhost:3000/healers/marta-metrass |

## FLAGGED: for you to decide

1. **Tiers:**
   - **The four editorial raises above:** confirm them, or put them back to Local Hero.
   - **Possible raises:**
     - Lisa Williams (YouTube 13.8k; a long-running TV medium);
     - Chetan Parkyn (co-founder of Human Design America);
     - Fleet Maull (Prison Mindfulness Institute founder; no readable counts).
2. **Held (7, not inserted):**
   - **Ken Page, Dr. John Ryan and Sharon Smith:** their photo hosts drop the ingest's connection. As before, I didn't look for a workaround. Options: photos you save by hand and we host, or leave them out.
   - **Catherine Andrews:** her About page is heavy on conditions, and she offers psilocybin microdosing mentoring.
   - **Natasja Pelgrom:** her work is psilocybin and 5-MeO-DMT retreats. Her Shift link rests on a logo only.
   - **Jamie Wozny:** her flagship programme is framed around chronic symptoms (health rule).
   - **Ihsan Alexander:** political podcast episodes, and an Andrew Tate image on his site.
3. **Health, fit or content (listed, borderline items left out, your call):**
   - **Johnson Chong:** the Peru ayahuasca retreat was removed from his plan, in line with the Stephen Gray decision.
   - **Lisa Williams:** her testimonials include cancer claims. They aren't used.
   - **Sarah Janes:** her channel has a "PSYOP" video. It isn't in her plan.
   - **Alison Armstrong:** her site's menu links to Dennis Prager shows. Is that political content?
   - **Corin Grillo:** her Substack offers "cultural commentary" (not opened).
   - **Amrit Yoga Institute:** Amrit Desai left Kripalu in 1994 after misconduct allegations. Nothing about it is on the page.
   - **Lama Dvora:**
     - her centre holds Jewish–Arab "One Heart" peace gatherings, which the bio calls dialogue work (no news reports used);
     - she names Geshe Michael Roach among her teachers;
     - her two current courses start before 9 Nov, so the page rests on 5 videos.
   - **Fit:**
     - Flora Bowley (intuitive painting);
     - Nathan Maingard (as much musician as teacher);
     - Shannon Murphy (mostly money-mindset coaching; her Reiki and past-life health claims are not repeated);
     - Sacha Heath (much of her site is music and voice coaching);
     - Mahip Rathore (also a psychotherapist; only his yoga and meditation work is listed).
4. **Contact sources to check:**
   - **Burgs:** his email appears only in his Patreon text.
   - **John Weddepohl:** his email, base and offerings come from rachelzinmanyoga.com, the site he runs jointly with his wife, which his own site links to. His own site has no contact route.
   - **Fred von Allmen:** info@karuna.ch, the office of Meditationszentrum Beatenberg, which he co-founded. His own site loads only by script.
   - **Sacha Heath:** her email is printed on her site but uses her older domain, yogawithsacha.com.
   - **Marta Metrass:** her email comes from a mail button, with the Cloudflare-protected address decoded.
5. **Possible miscredited books already on dev** (older listings, not from this sprint):
   - "Human Design" sits under jenna-zoe, but it is Chetan Parkyn's book;
   - a book titled "Mind" sits under book id 117;
   - Sister Jenna's book has the same title as one listed under jack-kornfield.

   Say if you'd like me to check and fix them.
6. **Small things:**
   - **Yogi Charu:** the retreat year (Dec 2026 to Jan 2027) is inferred from the upload dates.
   - **Sacha Heath:** her Corfu retreat dates conflict between two pages, so they are left empty.
   - **Fred von Allmen:** his only photo is 232 px wide.
   - **Books:** books whose ISBN came from the teacher's or publisher's own page are flagged "not confirmed on Open Library", as you agreed in sprint 1. Fred von Allmen's German books, which have no ISBN on a publisher page, are left out.

## Skips (344)

Each skip file has its reason, in `docs/content-audits/pipelines-sprint-2/skipped/`. Grouped roughly:

| Reason | About |
| :--- | :--- |
| No own site or contact route (parked, dead, Linktree or Instagram only) | 147 |
| Health rule (therapy, medical, condition-framed) | 78 |
| Site blocks us (robots.txt, including Claude-named blocks, or a 403 or bot check) | 69 |
| Already on Spiritpedia | 24 |
| Other (not a teacher, a music project, no usable photo, no longer teaching) | 23 |
| Political or conspiracy-centred | 3 |

**Skips you may want to overrule:**
- **Their own sites block us:**
  - Thubten Chodron, Reggie Ray, RamDev Dale Borglum, Jane Hardwicke Collings, Namrata (Sati Yoga);
  - by naming Claude's agents: Nancy Rebecca, Katherine Fauvre and Matt Kahn.
- **Eli Jaxon-Bear:**
  - leelaschool.org (his school's site, with his events) blocks ClaudeBot;
  - leela.org allows us and publishes an office email (leigh@leela.org).

  Is leela.org alone enough?
- **Ruth King:**
  - She is an insight meditation teacher. Her site is now the Mindful of Race Institute, centred on racism, so the helper skipped her as political-centred.
  - Her site allows us, and it has a contact form.

  Say if this isn't political, and I'll research her in full.
- **J.J. Hurtak and Desiree Hurtak.**
- **Reya Manna:** sovereign-citizen wording on her site.
- **Lama Yeshe Rabgye:** his site is a Substack on his own domain.
- **Michael Sapiro, Cheryl Brown, Julie Smith and Salimah Kassim-Lakha:** borderline health or fit.
- **Charlotte Duerr James:** psychedelic-medicine trainings (Kambo, Bwiti, microdosing) and no contact route.

## Why 80, not 100

- **Both saved lists are used up.** The Shift list ran out at rank 234, and after that the queue was Insight Timer only.
- **The Insight Timer names were mostly parked entries**: names set aside in earlier sprints because no contact route was found. Only about 1 in 10 of those yielded a teacher, against about 1 in 4 on the mixed ranks. Most still have no site of their own, or only a Linktree or Instagram page.
- **More sites block us now.** Your 5 Nov rule on Claude-named robots.txt blocks adds to the usual robots.txt and 403 skips.

**Other sources that could close the gap** (each would need your OK as a new list under §18.7 or as a hub sprint):
- Insight Timer names not yet saved (new, larger-following teachers, read from the public pages we may use);
- faculty lists from hubs we may read (Omega, Kripalu, Esalen, Hollyhock, Findhorn, IMS) beyond the ones already done;
- Sounds True and Hay House author pages, for teachers with books;
- regional sprints for countries still thin on Near You.

## Research slips (reported; nothing from them used)

- **Redirects followed before reading the new host's robots.txt:**
  - pauline.life → fiorediloto.jimdofree.com (allows us; its 5-second crawl delay was kept from then on);
  - billbelanger.com → healbright.com (nothing more fetched).
  - In the first wave, a few www/bare-domain hops did the same; all allowed us.
- **One HEAD request** to a site that blocks us went out in the same command as its robots.txt. Nothing from it was used.
- **One retry over plain HTTP** after an HTTPS handshake failure (sennazen.com, 409). That was a connection failure, not a refusal, and the user agent was the same.
- **Pages read before finding a block on a second domain:** leela.org pages were read before the ClaudeBot block on leelaschool.org was found. Nothing was taken from leelaschool.org.
- **Other slips:**
  - **Fetches:**
    - a few guessed page URLs (no guessed addresses);
    - crawl delays missed in a few places;
    - static.wixstatic.com images fetched before reading its robots.txt;
    - Alex Hickman's site script bundle and sitemap were read (his site allows us).
  - **Searches:** a third web search for a couple of names.
  - **Selection:** Sacha Heath's videos were chosen by title, not views (YouTube hid the counts).
- **The ingest's dry-run** fetches item pages, which can include Insight Timer and other third-party pages, to look for images. It never fetched theshiftnetwork.com or any other off-limits host, which it refuses.
- **The Mac's disk filled up mid-sprint**, which stopped two helpers and one insert. Nothing was deleted from the project. I compressed my own finished work folders in the scratchpad to free space, the helpers finished, and the stopped insert went through on the retry.
- **Rules kept:** no fake user agents, proxies, archives, logins or internal APIs (Sacha Heath's Udemy courses were left out for that reason). Nothing from any blocked page was used, and no site was retried after a refusal.

## Files

- **`docs/content-audits/pipelines-sprint-2/`:**
  - `BRIEF.md`;
  - `sprint.mjs` (status, check, insert, summary);
  - `progress.json`;
  - `leads/`;
  - `skipped/` (344);
  - `REPORT.md` (full tier evidence, flags and every skip reason).
- **87 plans** in `docs/content-audits/` (80 inserted on dev with `.dev.inserted.json` logs, 7 held).
- **Migration `0040_place_aliases_pipelines_sprint_2.sql`.**
