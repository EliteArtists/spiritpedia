# Location audit: why listings had no location, and the fix (3 Nov 2026)

**Applied on dev only. Nothing on live yet.** Your step comes first: run migration `0033` on dev.

## Your step

**Run `supabase/migrations/0033_place_aliases.sql` on dev** (SQL editor, whole file).
- The check row should read **45, 336, 334**: aliases; dev listings with a town; of those, with a place. The two without a place are Salmon, Idaho and "Sussex County" (see 2).

Then look at dev on localhost: **Near You** with your area set to San Francisco, Austin, Calgary or Byron Bay should now find many more people. Then, after your OK, live (order at the end).

## 1. Why locations were missed

There are 594 living people, schools and organisations on live. Before the audit:
- **186** had a place Near You can use;
- **44** had a town that didn't match;
- **364** had no town or country at all.

Channels, apps and Ascended Masters aren't counted.

**Cause 1: the "worldwide" rule (all 364 blanks).**
- The research briefs said `city` and `country` were only for `local` or `local_online` teachers. For `worldwide` they said "online only or international without a base", so researchers never looked for a base.
- On top of that, `scripts/ingest.mjs` threw city and country away whenever availability was `worldwide`. That's the default, and it was forced for every school and organisation. So even the 9 plans that did have a base lost it: Fred Haas, Tom Evans, Renee Sills, Zoe Kanat, Gaia Hope Good and others.
- The older listings from before the sprints were all "Worldwide (Famous Names)" with no location.

**Cause 2: the town wasn't matched (44 listings).** Near You doesn't read the city text. It reads `place_id`, which is set by matching the city against `places` (GeoNames towns of **5,000+ people**).
- **Villages never matched.** Shaka's Puerto Viejo (Costa Rica), Woodacre (Jack Kornfield), Big Sur, Barre in Massachusetts (Sharon Salzberg), Chinchero, Rhinebeck.
- **Other spellings didn't match.** "New York" (places: "New York City"; 15 listings), "St. George" (Saint George), "Tunbridge Wells" (Royal Tunbridge Wells), "Koh Phangan" (Ko Pha Ngan), and "Netherlands" (places: "The Netherlands").

**Your two examples:**
- **Shaka** had Puerto Viejo, Costa Rica, but the village isn't in `places` (cause 2). **Skies and Flora** had no location at all (cause 1). Both now resolve (Puerto Viejo → Limón, 48 km).
- **Eva Dalak** was cause 1. Her own About page says she was born in Israel and is **now based in Costa Rica** (I checked it myself), not Brazil. No town is named, so she has the country only. If you know of a Brazil page, send it and I'll change it.

## 2. The audit (364 listings with no location)

Six research agents checked each listing's own site, hub profile (Insight Timer, Omega, Shift, 1440 and others) and official socials. They worked **city level only** and recorded the page each base came from.
- All followed the site rules: robots.txt first; a refused, rate-limited or bot-checked page was skipped and never retried another way; no logins.
- YouTube About pages sit behind a consent page, so they were treated as unavailable.
- Every finding, with its source and a short note, is in `docs/content-audits/location-audit-2026-11-03/audit.json`.

| Result | Listings | What happened on dev |
| :--- | ---: | :--- |
| Found, own site / hub / official social, clear | **143** | **Applied** |
| … with a town | 106 | city + country; all 106 get a place after 0033 |
| … region or country only | 37 | country only (no town, so not in Near You yet) |
| Found but **doubtful** | **93** | **Not applied**; listed below for your decision |
| Nothing published | **119** | Left blank |
| Site blocked or unreachable | **9** | Left blank, not retried |

By tier: **Superhero** 17 clear, 22 doubtful, 16 none, 3 blocked. **Luminary** 36 / 26 / 36 / 5. **Local Hero** 90 / 45 / 67 / 1.
- The famous names mostly don't publish where they live. Their bases come from publishers and the press, which is why most of their findings are "doubtful".

**Where the clear ones come from:** many of the Insight Timer teachers' bases come from the location shown under their name on their Insight Timer profile. It's the teacher's own setting on a hub profile, so I counted it as published.

**The 44 that didn't match** are fixed by `0033` (no research needed):
- 42 get a place.
- Two are left without one:
  - **Marybeth Hyland** (Salmon, Idaho): the nearest town of 5,000+ is 129 km away, over the 110 km limit.
  - **Beth Bradford** ("Sussex County"): no state is given, and there's one in New Jersey and one in Delaware.

**After 0033, on dev:** **334** of 594 have a place for Near You (was 186). 39 more have a country only, and 221 stay blank.

| Tier | With a place | Country only | Blank |
| :--- | ---: | ---: | ---: |
| Superhero | 18 | 3 | 41 |
| Luminary | 54 | 12 | 67 |
| Local Hero | 262 | 24 | 113 |

## 3. Flagged for you

**Needs a decision (not location):**
- **Michael Harner died in 2018** but is listed as a living teacher. Under §18.4 he should move to Ascended Master. Say yes and I'll do it on dev, then live.
- **Richard Rudd:** the Omega profile in his plan seems to be a different Richard Rudd (a wine merchant). His listing's links are worth a look.
- **Pat Divilly:** his Insight Timer location says Galway, but his bio on the same page says he's based in Bali. Held as doubtful.

**Doubtful findings (93), not applied.** Most rest on a publisher page, the press or a company address rather than the person's own words, or the page is old. Say "apply all doubtful", "apply these", or "none". You might want the well-known ones (Eckhart Tolle in Vancouver, Rupert Spira near Oxford) even on that evidence.

| Listing | Probable base | Why it's doubtful |
| :--- | :--- | :--- |
| Eckhart Tolle | Vancouver, British Columbia, Canada | Official About page gives no location; Vancouver comes from an older undated page on his own domain. Wikipedia also says Vancouver since 1995. |
| Abraham Hicks | San Antonio, Texas, United States | Own site pages would not load in full; San Antonio comes from publisher bios on retailer sites (third-party). Esther Hicks travels widely for workshop |
| Michael Sealey | London, United Kingdom | Third-party directory (appears to quote his YouTube description); YouTube About itself is behind a consent wall. |
| Jason Stephenson | South Australia, Australia | Region only. Other bios say he splits time between a seaside town in coastal NSW and a country home in South Australia. |
| Wim Hof | Netherlands | Own site only calls him a Dutch athlete; footer names a Portuguese LDA and a Dutch BV. Stroe is from third-party press, not recorded as city. |
| Dr Joe Dispenza | Washington, United States | Own site About page 404; state from publisher/author bio pages (third-party). Company address in Rainier, near Olympia. |
| Mike Maher | United Kingdom | No city published; country inferred from podcast bios and domain. |
| Gregg Braden | North Palm Beach, Florida, United States | Office location only; page does not say where he lives (long associated with northern New Mexico). |
| Rupert Spira | Oxford, Oxfordshire, United Kingdom | Inferred from company registered office (Horspath, near Oxford); page does not say he lives there. |
| Sandra Ingerman | Santa Fe, New Mexico, United States | Own site does not state location; from publisher author page (third-party, reputable). Also licensed therapist in New Mexico. |
| David Palmer | Irvine, California, United States | Third-party profile only; highvibetv.com did not load. |
| The Shift Network | Petaluma, California, United States | Own site gives no address (About only says founder lives in Northern California). Petaluma from press releases/business directories. |
| The Tapping Solution | Brookfield, Connecticut, United States | PO Box mailing address only; Nick Ortner's own home not stated. |
| Deepak Chopra | New York City, New York, United States | Older article; two bases (New York City and Carlsbad/La Jolla, California). deepakchopra.com About redirect loop. |
| Darryl Anka (Bashar) | Los Angeles, California, United States | Company mailing address (box number) in Woodland Hills, Los Angeles; not stated as his home. |
| Tony Robbins | San Diego, California, United States | Company address only. Press widely reports his home in Palm Beach County, Florida (third-party, not recorded). |
| Joe Vitale | Wimberley, Texas, United States | Another own-site page is signed Austin, TX; sources disagree. Business address Wimberley. |
| Lynne McTaggart | London, United Kingdom | Own About page only mentions moving to London earlier in career; residence from third-party bios. |
| Rupert Sheldrake | London, United Kingdom | Own site About gives no location; from third-party bios (Edge, Psi Encyclopedia). |
| Dean Radin | California, United States | Inferred from employer (IONS, Petaluma/Novato area; CIIS, San Francisco); no city or home stated. |
| Jon Kabat-Zinn | Massachusetts, United States | State only, from publisher page; own site gives no location. |
| Dawson Church | Petaluma, California, United States | Third-party publisher bio, may be old; a podcast says he lives across Nevada, Hawaii and California. |
| Pema Chödrön | Nova Scotia, Canada | Home monastery, not stated as current residence; she has also spent long retreats in Colorado. |
| Baron Baptiste | Boston, Massachusetts, United States | Studio location only; page does not say where he lives now. |
| James Nestor | San Francisco, California, United States | Own site only says he travels the world; from publisher page. |
| Seane Corn | Topanga, California, United States | From her retreat booking page on WeTravel, not her own site (About gives no location). |
| Graham Hancock | Bath, Somerset, United Kingdom | Info dates from around 2003 onward; a 2019 bookshop event also called him a Bath resident. |
| Paul Stamets | Washington, United States | Third-party/older bio; Fungi Perfecti is near Olympia, WA. fungi.com returned 429 (not retried). |
| Caroline Myss | Oak Park, Illinois, United States | Own site gives no location; publisher page (Penguin says Chicago). |
| Anita Moorjani | California, United States | Only a publisher author page (Penguin Australia) states it, region only; own site and Omega profile say nothing. |
| Dr Eben Alexander | Charlottesville, Virginia, United States | CV may be old; some third-party sources say Lynchburg, Virginia. |
| Michael Harner | Pacifica, California, United States | Michael Harner died in 2018; this is his Foundation's office. A 2022 FSS document on the same site gives a Mill Valley, California mailing address ins |
| Dr. Raymond Moody | Birmingham, Alabama, United States | Only his publisher (Monkfish) states it; lifeafterlife.com names no location. Other sources say rural Alabama. |
| James Van Praagh | Los Angeles, California, United States | Own site About names no location; only publisher author page (Hachette NZ) states it. |
| Drs. John & Julie Gottman | Washington, United States | Orcas Island (San Juan County, WA) is where their practices are, per bio; the Gottman Institute itself is in Seattle per third-party directories. Poss |
| Jonathan Goldman | Boulder, Colorado, United States | Only the business mailing address is given; does not say where he lives. |
| Esther Perel | New York City, New York, United States | Inferred from her About text; not an explicit 'based in' line. |
| Nick Ortner | Brookfield, Connecticut, United States | Company mailing address; does not say where he lives. |
| Neale Donald Walsch | Ashland, Oregon, United States | Only a publisher page states it; own About page says nothing. |
| Phil Williams | Puerto Viejo, Costa Rica | Text says Costa Rica only; town from image captions. |
| Ariel Tang | Bali, Indonesia | Info dates from ~2020 and she calls herself globe-trotting; may have moved. |
| Mary Sise | New York, United States | Inferred from her NY State licence; no city or explicit base given. |
| Jai Uttal | San Anselmo, California, United States | Only statement is from 2009; current home not stated elsewhere on his site. |
| Banafsheh Sayyad | Topanga, California, United States | Third-party interview (her own words); her own site and Shift bio give no location. |
| Dr. Ibrahim Jaffe | Marathon, Florida, United States | Business address only; residence not stated. |
| Tina Zion | Leo, Indiana, United States | Mailing address only; residence not stated. |
| Marion Gilbert | Grass Valley, California, United States | Practice location; where she lives is not stated. |
| Annie B. Bond | Rhinebeck, New York, United States | Same page also says she lives on a lake in Amesbury, Massachusetts; unclear which is current. |
| Grandmother Flordemayo | Estancia, New Mexico, United States | Project location, not stated as her home; born in Nicaragua. |
| Christabel Zamor | Bali, Indonesia | Inferred from a sign-off only; About page gives no location. |
| Trisha McCagh | Perth, Western Australia, Australia | Quinns Rocks is a Perth suburb; P.O. Box, residence not stated directly. |
| John Stuart Reid | United Kingdom | Company country only; his own residence and lab town not stated. |
| Dr. Jennifer Lisa Vest | Berkeley, California, United States | Practice location in footer; residence not stated. |
| Daisy Lee | Puerto Rico, United States | From a photo caption; no town named. Puerto Rico is a US territory - display as 'Puerto Rico' if preferred. |
| Renee Baribeau | California, United States | Two bases: California desert and Whidbey Island, Washington; no towns named. |
| John Lockley | South Africa | No single base; South African origin, splits time across three regions. |
| Dr. Karen Frances McCarthy | New York, New York, United States | Two bases: New York and Dublin, Ireland; residence not stated. |
| Cassandra Vieten | San Diego, California, United States | Inferred from employer only. Also says she spends much time in Northern New Mexico. |
| Dr. Lydia de León | Greece | Inferred; no city, and the venture spans Greece, Mexico and Spain. |
| Helen Hamilton | West Yorkshire, United Kingdom | Only on third-party conference/podcast speaker pages; own site and Shift bio silent. |
| Giovanni Dienstmann | Kollam, Kerala, India | Own site highermind.com refused access (403), so could not confirm; Kollam may be an ashram stay rather than home. |
| Jim Rajan | Madrid, Spain | Location label only, not stated as home. |
| Frits Evelein | Sommières-du-Clain, France | Own site is Dutch and lists events in Delft/Heerlen with no home stated; may have moved to France or work between both. |
| Laura Lynne Jackson | New York, United States | Bio says only "New York" - unclear whether city or state; city left blank. |
| Charlotte Rotterdam & Pieter Oosthuizen | Colorado, United States | Region inferred from bio history; no current city stated (Naropa suggests Boulder area). |
| Lynne Twist | San Francisco, California, United States | This is her institute's base, not a stated home. |
| Danielle Dulsky | Pennsylvania, United States | Two homes: an unnamed Pennsylvania steel town and rural upstate New York. |
| Lindsay Mack | Portland, Oregon, United States | Unclear if "we" means Lindsay herself or the business team. |
| Schuyler Grant | Los Angeles, California, United States | Inferred from 2015 move; no current home stated. Previously built studio work in New York City. |
| Becky Vollmer | St. Louis, Missouri, United States | Inferred from "STL" abbreviation and blog mention; not a direct statement. |
| Shivananda Thomas Amelio | New York City, New York, United States | Inferred from career history; no current home stated. |
| Faith Hunter | Washington, District of Columbia, United States | Own site About says she ran two DC studios for 17+ years (past tense); current status of studio unclear. |
| Rudy Peirce | Massachusetts, United States | Region only (the Berkshires); a directory lists Great Barrington. Own site and Kripalu silent; Gentle Yogis is online, Eastern Time. |
| Rolf Gates | Santa Cruz, California, United States | Third-party (publisher) source only; own site and Kripalu silent; bio may be old. |
| Kaitlin Curtice | Philadelphia, Pennsylvania, United States | Third-party (publisher) source; older tribal profile said Atlanta. Own site silent. |
| Sarah Powers | California, United States | Bay Area / Marin County, third-party only; own site lists events worldwide but no home base. |
| Sasha Graham | New York City, New York, United States | Third-party sources only; own site and Kripalu silent. |
| Yura Sapi | New York City, New York, United States | Birthplace, not clearly current residence; Kichwa with Ecuadorian and Colombian citizenship. Own site silent. |
| Sherianna Boyle | Yarmouth, Massachusetts, United States | Third-party sources only; own site silent (sessions in ET). |
| Loch Kelly | New York, United States | Own site lochkelly.org returned 403 (skipped). Sources disagree: New York City vs upstate New York. |
| Laura Berman Fortgang | Montclair, New Jersey, United States | Third-party sources only; own site home page silent. |
| Sianna Sherman | Los Angeles, California, United States | Business footer address, not an explicit residence statement. |
| Michael Ventura | Shelter Island, New York, United States | Inferred: Manhanset territory corresponds to Shelter Island, Long Island; no town named on site. |
| Mirabai Starr | Taos, New Mexico, United States | Third-party (publisher); recent bios say mountains of northern New Mexico. Own site home page silent. |
| Dr. Raj Balkaran | Hamilton, Ontario, Canada | Inferred from employer (McMaster, Hamilton); residence not stated. |
| William Donius | St. Louis, Missouri, United States | Third-party; inferred from career base, residence not explicitly stated. Own site silent. |
| Robert MacPhee | Sonoma, California, United States | Company location, not stated residence. Own site returned 429 (skipped). |
| Dustin DiPerna | California, United States | Own site failed (certificate error) and Esalen page errored; state only; third-party source. |
| Murray Hidary | Marina del Rey, California, United States | Third-party and from 2021; MindTravel runs many events in New York. Own site silent. |
| Noah Mazé | Los Angeles, California, United States | Not confirmed on own site; directory profile. |
| Day Schildkret | Richmond, California, United States | Third-party and possibly old; own site press links hint at Minnesota (Lakewood Cemetery project). Esalen page errored. |
| Devon & nico Hase | Ashland, Oregon, United States | Own site silent; may be outdated; Madison, Wisconsin ties (Nico's PhD, 2026 workshop). |
| Pat Divilly | Galway, Ireland | Conflict: Galway (location field) vs 'based in Bali' (bio). May have moved to Bali. |

**Region or country only (37, country applied, no town).** Near You needs a town. Name one per person if you know it, or leave them:
Mooji (Alentejo, Portugal); Teal Swan (Utah, United States); Julie Schiffman (United States); Adyashanti (California, United States); John Edward (Long Island, New York, United States); Jia Apple (Colorado, United States); Eva Dalak (Costa Rica); Kathleen Prasad (California, United States); Saskia Lightstar (Devon, United Kingdom); Selena Lael (Florida, United States); Robert Aceves (California, United States); David Bower (Hawaii, United States); Silvia Nakkach (California, United States); Elizabeth B. Jenkins (Hawaii, United States); Richard Moss (North Carolina, United States); Philip Carr-Gomm (Sussex, United Kingdom); Becca Tarnas (California, United States); Neil Douglas-Klotz (Fife, United Kingdom); Anamika Neitlich (California, United States); Joan Ranquet (California, United States); Sarah Blondin (British Columbia, Canada); Brad Yates (California, United States); Steve Wolf (Maryland, United States); Guri Sohal (Ontario, Canada); Amanda Machado (Canada); Sabine Priestley (Florida, United States); Susie Hemsted (Bali, Indonesia); Tomek Wyczesany (Queensland, Australia); Martha Beck (Pennsylvania, United States); Mary Beth LaRue (Colorado, United States); Tara Stiles (Illinois, United States); Aki Hirata Quetzalyolotzin (Japan); Tenzin Wangyal Rinpoche (United States); Catherine Wilde (Texas, United States); Tara Mulay (Massachusetts, United States); Jordyn Roe (Florida, United States); Sarah Hall (Michigan, United States).

**Nothing published (119), left blank.** Where the agents saw a third-party lead, it's in the note in `audit.json`. Examples: Donna Eden (Ashland), Brian Weiss (Miami), Anodea Judith (Sebastopol), Elizabeth Gilbert (Frenchtown, New Jersey), Tammy Billups (Atlanta). The full list:
Justin Perry; Aaron Doughty; Leeor Alexandra; Jake Ducey; Bruce H. Lipton PhD; Rhonda Byrne; Heidi Priebe; Jeff Foster; Leia Cohen; Jake Mace; Andrea Kennedy; Jillian (The Lune INNATE); Jenna Zoe; Sam Harris; Dan Brulé; don Miguel Ruiz; Alberto Villoldo; Donna Eden; Dr Brian Weiss; Anodea Judith; Tyler Henry; Susan Miller; Iyanla Vanzant; Marianne Williamson; Chani Nicholas; The AstroTwins; Debra Silverman; Dr. Gary Chapman; Amanda Johnson; Amron Bevels; Amy Belair; Michael McGinnis; Lisa Powers; Melissa Crowhurst; Tevia Feng; Cyndi Dale; Elayne Kalila Doughty; Dr. Ken Nelson; Penelope Smith; Tammy Billups; Dr. Marie Mbouni; Jean Else; David Crow; Richard Gordon; Eluña Noelle; Davina MacKail; Kaedrich Olsen; Erika Gagnon; Lynn McKenzie; Alexandra Wenman; Rob Schwartz; Richard Tarnas; David Gandelman; Marguerite Mary Rigoglioso; Viviane Chauvet; Dr. Shamini Jain; Devaa Haley Mitchell; Melissa Kim Corter; George Thompson; Gemma Petherbridge; Barry Goldstein; The Brothers Koren; Alexis Cohen; Maria Furlano; Shifu Lindsey Wei; Lauren Walker; Suzanne Giesemann; Wendy De Rosa; Maryam Hasnaa; Dr. Laura Koniver; Rev. Sue Frederick; Donna Lozito; Dr. William Bloom; Rebecca Dawson; davidji; Dr. Farima Berenji; Richard Rudd; Pádraig Ó Tuama; Eliza Swann; Dan Harris; Norma and Nisha Burton; Robert Peng; Mark Nepo; Jillian Pransky; Meggan Watterson; Maude Hirst; Lynne Goldberg; Jeff Warren; Cirak; Light Watkins; Llyn Roberts; Damien Echols; Dr. Chelsea Jackson Roberts; Chelsey Korus; Scott Schwenk; Laura Ahrens; Biet Simkin; Tracee Stanley; Shelly Tygielski; MC YOGI; Sage Rountree; Toni Bergins; Girish; Hope Fitzgerald; Kamini Desai; Kristi Nelson; Mícheál Ó Súilleabháin; Tama Kieves; Jovinna Chan; Leslie McGuirk; Jess Magic; Lisa Marchiano; Hawah Kasat; Coby Kozlowski; Dr. Amanda Hanson; Sigal Brier; Lihi Benisty; Russ Hudson; Matthew Brensilver.

**Blocked or unreachable (9), skipped and not retried:**
- Gabby Bernstein: Not retried per rules.
- Nassim Haramein: Born in Geneva. Some say he lives on Kauai; LinkedIn lists Martigny. Not recorded.
- Theresa Caputo: Known as the Long Island Medium (born Hicksville, NY); no current base found on an allowed source.
- Elizabeth Gilbert: Search results suggest her site says Frenchtown, New Jersey; could not verify because the site did not load.
- David Deida: 
- Joette Calabrese: 
- White Tiger Qigong: Founder Tevia Feng is said by his publisher to live in Asia.
- Robert Moss: 
- Yuval Ron: Skipped per site rules.

## 4. The rule, fixed for every future listing

- **`scripts/ingest.mjs`:**
  - City and country are kept whatever the availability, for schools and organisations too.
  - A new living person, school or organisation needs either its published base plus `location_source` (the page), or `no_public_base` with why. Otherwise it's a PROBLEM and nothing goes in.
  - A city with digits is refused as a possible address.
  - A town that doesn't resolve is noted: "add a place alias".
  - `city` and `country` can now be set on an existing listing through `healer.update`.
  - Tested on two test plans (dry run, nothing inserted).
- **Research briefs:** all six (`docs/content-audits/*-sprint-1/BRIEF.md`) have a new **Base location** rule: city level only, the source page, not a retreat venue, "Town, State" for the US, Canada and Australia, and never a guess. The plan schema now has `location_source` and `no_public_base`. Availability no longer decides the location.
- **Migration `0033_place_aliases.sql`:**
  - `place_aliases` points a village at the nearest town of 5,000+ **in the same country** (45 rows); the listing still shows its own village name.
  - `resolve_place()` now also handles "St." = Saint, dots, "The" in country names, and any country name or code.
  - A backfill of every listing.
  - Tested in a local Postgres against all 69,816 places: 148 of 150 towns resolve, and **no existing match changes**.
- **README:** §18.3 (the plan file), §18.4 (**Base location** rule), §8.1 (`0033`), §17 places note, and the database line.

**Villages mapped further than 50 km** (they'll show under "Closest to you" rather than Near You): Alonissos → Kými (61 km), Joseph, Oregon → La Grande (67 km), Tilba → Batemans Bay (69 km).

## 5. Going live, after your OK

1. **You:** `0033` on live (the same file).
2. **Me:** `node docs/content-audits/location-audit-2026-11-03/apply.mjs --env live --apply`. It writes the same 143 and never touches a listing that already has a location. `--rollback` puts them back.
3. **Me:** whichever doubtful ones you approve, on dev and then live, the same way.
