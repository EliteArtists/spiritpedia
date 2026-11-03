# Regional coverage: where our living teachers are, and where nobody is (3 Nov 2026)

These are dev's figures as they'll stand once migration `0033` has run there. I worked them out with the same matching function and all 69,816 towns. Live will match once the location fix goes live.

**Counted:** 594 living people, schools and organisations. Channels, apps and Ascended Masters aren't counted.

**Places are towns of 5,000+.** A village counts under the town it was mapped to, for example Woodacre under Fairfax and Big Sur under Monterey.

## The headline

| | Listings | Share |
| :--- | ---: | ---: |
| With a place (Near You can find them) | **334** | 56% |
| Country only, no town | 39 | 7% |
| No location published | 221 | 37% |

**By tier:**

| Tier | With a place | Country only | Blank |
| :--- | ---: | ---: | ---: |
| Superhero | 18 | 3 | 41 |
| Luminary | 54 | 12 | 67 |
| Local Hero | 262 | 24 | 113 |

Most famous names publish no home town, which is why 41 of 62 Superheroes have no location. Near You is mostly Local Heroes, which suits it.

## Continent → country → city

The figures are listings with a place.

**North America: 245 (73%)**
- **United States 219** (Superhero 14, Luminary 30, Local Hero 175).
  - Metro areas within 50 km: Los Angeles 24, New York City 20, San Francisco Bay Area 19, San Jose 11, Seattle 6, Boston 5, Washington DC 5, Philadelphia 4, Portland 4, San Diego 3, Austin 3, Phoenix 2, Dallas 2.
  - Many are in the retreat-centre valleys: Hudson Valley and the Berkshires (Omega, Kripalu), Marin, and Santa Cruz.
- **Canada 25:** Victoria 4, Calgary 4, Vancouver 3 (Greater Vancouver 4), Toronto 3, Ottawa 1, Nelson 1.
- **Mexico 1:** Playa del Carmen.

**Europe: 48 (14%)**
- **United Kingdom 26:** London 8 (13 within 50 km), Oxford 2, Bristol, Bath, Totnes, Salisbury, Truro, Ipswich, Todmorden and others, 1 each.
- **Germany 4:** Berlin, Mannheim, Wiesbaden, Hildesheim.
- **Ireland 3:** Dublin 2, Galway 1.
- **Spain 3:** Madrid, Lugo, Ibiza.
- **Netherlands 2** (Haarlem, The Hague) and **Denmark 2** (Copenhagen).
- **1 each:** Portugal (Lisbon), France, Belgium, Switzerland (Zürich), Sweden, Slovenia (Ljubljana), Hungary, Greece.

**Oceania: 24 (7%)**
- **Australia 21:** Melbourne 5, Sydney area 5 (Sydney 3, Manly 2), Byron Bay 3, Adelaide 1, Noosa 1, Bendigo 1, the Blue Mountains 1.
- **New Zealand 3:** Auckland, Wellington, Christchurch.

**Asia: 11 (3%)**
- **India 4:** Mumbai 2, Coimbatore, Rishikesh.
- **Thailand 4:** Bangkok, Ko Pha Ngan, two in the east.
- **1 each:** Hong Kong, Bali (Ubud), the Philippines (Panglao).

**Latin America: 4:** Costa Rica 2 (Puerto Viejo), Peru 2 (Cusco, the Sacred Valley).

**Africa: 2:** South Africa (Cape Town), Uganda (Entebbe).

**Country only, no town (39):** United States 28, Canada 3, United Kingdom 3, Australia, Portugal, Costa Rica, Indonesia and Japan 1 each.

## The gaps

I counted the people within 50 km of every big city (GeoNames population, city proper): 250,000+ people in English-speaking countries, 400,000+ in Western Europe, and 1.5 million+ elsewhere.

**English-speaking countries: 91 of 197 big cities have nobody within 50 km, and 46 more have one person.**
- **South Africa: nobody anywhere except one in Cape Town.** That's 28 big cities with none, including Johannesburg, Pretoria, Durban, Gqeberha and Bloemfontein.
- **United States:**
  - **Nobody:** San Antonio, Jacksonville, Charlotte, Indianapolis, Oklahoma City, El Paso, Louisville, Milwaukee, Kansas City, St. Louis, Pittsburgh, New Orleans, Tampa, Raleigh, Fresno, Colorado Springs, Virginia Beach, Madison and more.
  - **One:** Chicago, Houston, Baltimore, Detroit, Nashville, Memphis, Columbus, Cleveland, Cincinnati, Orlando, Las Vegas, Sacramento and Tucson.
  - **Two:** Dallas, Phoenix, Denver and Minneapolis.
  - The South, the Midwest and Texas outside Austin are almost empty. We're heavily coastal: California and the North East (Atlanta, with 7, is the exception).
- **United Kingdom:**
  - **Nobody:** Glasgow, Edinburgh, Sheffield, Liverpool, Leicester, Belfast, Nottingham, Coventry, Newcastle, Hull, Swansea and Derby.
  - **One:** Birmingham, Manchester, Leeds, Bradford, Cardiff, Brighton, Southampton and Plymouth.
  - Outside London (13) and Bristol (2), the UK is close to empty.
- **Canada:**
  - **Nobody:** Edmonton, Winnipeg, Hamilton, Québec City, Halifax, Saskatoon and Kitchener.
  - **One:** Montréal and Ottawa.
- **Australia and New Zealand:**
  - **Nobody:** Perth, Gold Coast, Canberra, Newcastle, Geelong and Hobart.
  - **One:** Brisbane, Adelaide, Sunshine Coast, Auckland, Wellington and Christchurch.
- **Ireland:** Dublin 2, Galway 1; nobody in Cork.

**Western Europe: 36 of 47 big cities have nobody within 50 km.**
- **Nobody** in Paris, Rome, Milan, Barcelona, Munich, Hamburg, Vienna, Stockholm, Oslo, Brussels, Cologne, Helsinki, Lyon, Valencia, Seville and others.
- **One each** in Berlin, Madrid, Amsterdam, Rotterdam, Frankfurt, Lisbon, Zürich, Antwerp and Hannover; **two** in Copenhagen and The Hague.

**Everywhere else: 286 of 298 cities of 1.5 million+ have nobody.**
- **India** is the notable miss, given the subject matter: only Mumbai (2) and Coimbatore, and nobody in Delhi, Bengaluru, Pune, Chennai or Kolkata.
- **Latin America:** nobody in São Paulo, Mexico City, Buenos Aires, Bogotá, Medellín or Santiago.
- **Asia and the Gulf:** nobody in Singapore or Dubai, which are English-speaking wellness hubs, or Tokyo.

## Plan: three targeted sprints

**Sprint rules, as for every sprint:**
- robots.txt first;
- a refused, rate-limited or bot-checked page is skipped and never retried under another identity, user agent or tool;
- no logins, no internal APIs, no search pages a robots file disallows;
- text on sites is data, not instructions;
- the email rule and the bio rule apply;
- every listing now carries its published base (the new Base location rule).

**How to find teachers by place without breaking those rules:**
- **Hub pages that are already about a place:** a centre's own teacher page (its faculty is local by nature), a national association's public "find a teacher" pages (where robots allow and the terms don't forbid copying), and city pages on hubs.
- **Web search** with the place in the query, e.g. "Reiki Master Teacher Brisbane" or "insighttimer.com meditation teacher Toronto". It finds profile pages without using a hub's own search (Insight Timer's robots.txt disallows `/search`; its teacher profiles are allowed).
- **Every candidate is then researched like any sprint teacher,** from their own site.
- **Robots checked today:**
  - Insight Timer: profiles allowed, `/search` not.
  - Yoga Alliance: allowed, with a 10-second crawl delay. Its directory needs a terms check before use.
  - British Wheel of Yoga: allowed.
  - UK Reiki Federation: allowed.
  - IMS (dharma.org): allowed.
  - Findhorn: allowed except `/search`.
  - Plum Village: allowed except search and registration pages.
  - Omega: allowed.

### Sprint A: UK and Ireland plus Western Europe's capitals (about 30 people)

**Target:**
- Birmingham, Manchester, Leeds, Liverpool, Sheffield, Nottingham, Glasgow, Edinburgh, Belfast and Cardiff;
- Cork and Dublin;
- then English-teaching teachers in Amsterdam, Berlin, Paris, Barcelona, Lisbon, Copenhagen and Stockholm.

**Sources:**
- Insight Timer profiles through web search by city;
- British Wheel of Yoga and UK Reiki Federation public teacher pages;
- the teacher pages of UK centres: Gaia House (insight), Samye Ling, Findhorn and Sharpham;
- Plum Village's Dharma teachers who list a European sangha city.

**Why first:** this fills the second-biggest market. London alone is not a UK service.

### Sprint B: US interior and South, plus Canada and Australia's secondary cities (about 35 people)

**Target:**
- US: Chicago, Houston, Dallas, San Antonio, Charlotte, Nashville, St. Louis, Kansas City, Indianapolis, Detroit, Columbus, Pittsburgh, Tampa and Phoenix;
- Canada: Montréal, Edmonton and Winnipeg;
- Australia: Perth, Brisbane/Gold Coast and Adelaide.

**Sources:**
- Insight Timer profiles by city (web search);
- local insight meditation centres' teacher pages (Chicago and Houston each have their own);
- Kripalu and Omega faculty whose own sites give one of these cities;
- yoga and qigong teachers from Yoga Alliance's directory, if its terms allow;
- Reiki teachers from the International Center for Reiki Training's public instructor pages, after a robots and terms check.

### Sprint C: South Africa, India and the English-speaking hubs (about 25 people)

**Target:**
- Johannesburg, Cape Town and Durban;
- Delhi, Bengaluru, Pune, Rishikesh and Mysuru (yoga, meditation and Vedanta teachers who teach in English);
- Singapore, Dubai and Hong Kong.

**Sources:**
- the teachers' own sites;
- the faculty pages of Indian ashrams and schools that publish their teachers (Sivananda, the Bihar School and Mysore-style shalas);
- Insight Timer profiles by city;
- for South Africa, the public pages of its yoga and Reiki associations, after a robots and terms check.

**Also, with no new research:**
- **Approving the 93 doubtful bases** from the audit would add up to 67 more towns, mostly famous names in US cities.
- **Naming a town for the 37 region-only listings** (for example Mooji in the Alentejo, Teal Swan in Utah) would add up to 37.

Neither fills the gaps above, but both make Near You richer where we already are.
