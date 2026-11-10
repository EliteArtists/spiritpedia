# Night sprint, 9–10 Nov 2026: centres, apps, Quantum-Touch, pipelines and yoga schools

**Dev only.** Nothing was written to live; live inserts wait for your OK.
**Your target was 100 new listings; 102 are on dev.** Tables below; links open on the local site (`localhost:3000`).

| Group | On dev | Held for you |
| :-- | --: | --: |
| Practice centres (organisations, with teachers linked) | 31 | 7 |
| Apps | 9 | 7 |
| Quantum-Touch practitioners (ranks 83–140, then paused) | 11 | 1 |
| Yoga schools (40 target cities) | 15 | 3 |
| Pipelines sprint 3, ranks 312–431 (Kripalu 22, Sounds True 11, Esalen 3) | 36 | 6 |
| **Total** | **102** | **24** |

- **Teacher links:** 82 centre links on dev, plus Kino MacGregor as founder of Miami Life Center.
- **Checks:** every plan passed the bio check (no 8+ word runs) and an ingest dry run before inserting. Five random new pages (Miami Life Center, Joan Halifax, Insight Meditation Center, Bess Matassa, Hallow) all return HTTP 200 on the local site.
- **Tiers:** every new listing is Local Hero. YouTube channel pages redirect this machine to the consent page, and Instagram and Facebook are never fetched, so no follower count could be read. Tiers can be redone once the YouTube API key arrives.

## 1. Search, subject and location gap check

Done first; the full report is [2026-11-09-search-subject-location-gaps.md](2026-11-09-search-subject-location-gaps.md) (report only, no changes made).
- **Your rule is broken in one place:** Practitioners Near You / Closest to you (website and app). With an area set, it keeps only people within 50 km plus those marked "online", so Richard Gordon (no base, "Worldwide") drops off. Subject pages, the other shelves and search ignore location entirely (no filter, no sort).
- **"Corinne Grant" is Karina Grant.**
- **The website home query isn't paged:** 1,013 listings against a 1,000-row limit, so 13 are missing.
- **3,339 content-only subject gaps** (a subject on a teacher's content but not their profile); list in `docs/content-audits/subject-gaps-2026-11-09.json`.
- Search spelling misses and the proposed fixes (which need an app build and which are website or data only) are in that report.

## 2. What went in

### centre — 31 on dev, 7 held

| Rank | Listing | Town | V/B/O/F |
| --: | :-- | :-- | :-- |
| 1 | [Insight Meditation Center](http://localhost:3000/healers/insight-meditation-center) | Redwood City, California | 9/0/4/4 |
| 2 | [Insight San Diego](http://localhost:3000/healers/insight-san-diego) | San Diego, California | 8/0/1/4 |
| 4 | [True North Insight / Voie boréale](http://localhost:3000/healers/true-north-insight) | Montreal, Quebec | 12/0/5/2 |
| 6 | [Clear Mountain Monastery](http://localhost:3000/healers/clear-mountain-monastery) | North Bend, Washington | 3/0/0/4 |
| 7 | [Common Ground Meditation Center](http://localhost:3000/healers/common-ground-meditation-center) | Minneapolis, Minnesota | 12/0/1/3 |
| 8 | [London Insight Meditation](http://localhost:3000/healers/london-insight-meditation) | London | 9/0/3/2 |
| 10 | [Wild Heart Meditation Center](http://localhost:3000/healers/wild-heart-meditation-center) | Nashville, Tennessee | 12/0/1/2 |
| 11 | [The Center for Mindful Living](http://localhost:3000/healers/center-for-mindful-living) | Washington, D.C. | 12/0/0/3 |
| 12 | [Garrison Institute](http://localhost:3000/healers/garrison-institute) | Garrison, New York | 4/0/6/2 |
| 13 | [Insight Meditation Community of Washington](http://localhost:3000/healers/insight-meditation-community-of-washington) | Washington, D.C. | 6/0/1/3 |
| 14 | [InsightLA](http://localhost:3000/healers/insightla) | Santa Monica, California | 11/0/4/2 |
| 16 | [Mountain Stream Meditation](http://localhost:3000/healers/mountain-stream-meditation) | Nevada City, California | 2/0/1/2 |
| 17 | [Sangha Live](http://localhost:3000/healers/sangha-live) |  | 2/0/1/2 |
| 18 | [Sufi Center Minnesota](http://localhost:3000/healers/sufi-center-minnesota) | Bloomington, Minnesota | 3/0/0/3 |
| 19 | [Vedanta Society of New York](http://localhost:3000/healers/vedanta-society-of-new-york) | New York, New York | 8/0/0/2 |
| 20 | [Wild Flower Zen Sangha](http://localhost:3000/healers/wild-flower-zen-sangha) | Paris | 12/0/1/1 |
| 21 | [Zen Life & Meditation Center, Chicago](http://localhost:3000/healers/zen-life-meditation-center-chicago) | Oak Park, Illinois | 6/0/5/2 |
| 25 | [Charlotte Buddhist Vihara](http://localhost:3000/healers/charlotte-buddhist-vihara) | Charlotte, North Carolina | 9/0/0/2 |
| 26 | [Community Meditation Center (CMC)](http://localhost:3000/healers/community-meditation-center) | New York, New York | 4/0/1/2 |
| 27 | [Center for Spiritual Awareness](http://localhost:3000/healers/center-for-spiritual-awareness) | Lakemont, Georgia | 1/0/1/4 |
| 29 | [Edmonton Insight Meditation](http://localhost:3000/healers/edmonton-insight-meditation) | Edmonton, Alberta | 11/0/2/2 |
| 30 | [Houston Zen Center](http://localhost:3000/healers/houston-zen-center) | Houston, Texas | 5/0/4/2 |
| 31 | [Insight Meditation Community of Charlottesville](http://localhost:3000/healers/insight-meditation-community-of-charlottesville) | Charlottesville, Virginia | 1/0/0/3 |
| 33 | [Ligmincha International](http://localhost:3000/healers/ligmincha-international) | Shipman, Virginia | 10/0/4/1 |
| 34 | [Monroe Institute](http://localhost:3000/healers/monroe-institute) | Faber, Virginia | 1/0/4/3 |
| 35 | [Pārāyana Vihāra](http://localhost:3000/healers/parayana-vihara) | Port Townsend, Washington | 5/0/0/4 |
| 38 | [Tallahassee Chan Center](http://localhost:3000/healers/tallahassee-chan-center) | Tallahassee, Florida | 7/0/2/1 |
| 39 | [Tara Mandala](http://localhost:3000/healers/tara-mandala) | Pagosa Springs, Colorado | 2/0/4/1 |
| 42 | [Vedanta Society of Southern California](http://localhost:3000/healers/vedanta-society-of-southern-california) | Los Angeles, California | 5/0/2/3 |
| 43 | [Village Zendo](http://localhost:3000/healers/village-zendo) | New York, New York | 6/0/2/3 |
| 46 | [Institute of Noetic Sciences](http://localhost:3000/healers/institute-of-noetic-sciences) | Novato, California | 7/0/2/2 |

**Held:**
- 5 Buddhist Society of Western Australia (`buddhist-society-of-western-australia.json`): All three photos from bswa.org fail the ingest's image check: its robots.txt request to bswa.org ends in a socket error (UND_ERR_SOCKET) for the ingest, so the host counts as refusing it; per the brief, held rather than worked around. The dry run fell back to 
- 15 Mission Dharma (`mission-dharma.json`): Lead, 9 Nov 2026: no usable image (the site's only image is 174 x 220, under the ingest's 300 px minimum).
- 23 East Bay Meditation Center (`east-bay-meditation-center.json`): Owner decision needed: the centre frames its dharma practice strongly around social justice (a published 'stance on Gaza' post, a white-identity group, a Practice in Transformative Action programme for organisers). It is a meditation centre first, but the owne
- 36 San Francisco Zen Center (`san-francisco-zen-center.json`): sfzc.org refused the ingest's image requests with HTTP 429 (rate limit) on the dry run, 9 Nov 2026, so no image loads; not retried. Images were viewed via plain curl earlier.
- 37 Sivananda Ashram Yoga Retreat Bahamas (`sivananda-ashram-yoga-retreat-bahamas.json`): Owner decision: the Sivananda organisation's founder Swami Vishnudevananda has been the subject of publicly reported sexual-abuse allegations (raised in 2019, after his death). Not verified in this session; the ashram's site carries a misconduct policy page. B
- 41 The Sati Center (`the-sati-center.json`): The ingest's image check could not read sati.org's robots.txt (socket closed: 'robots.txt unreachable (UND_ERR_SOCKET)'), so the centre's own logo was refused and no image is usable; not retried. Owner to decide whether to retry later or accept another image.
- 44 Arava Spiritual Center (`arava-spiritual-center.json`): Allegations about the current leadership in a reputable source: Wikipedia's article on Ehvam (https://en.wikipedia.org/wiki/Ehvam_-_International_Spiritual_Center_for_Peace) summarises a Haaretz report in which at least ten former students and relatives critic

### app — 9 on dev, 7 held

| Rank | Listing | Town | V/B/O/F |
| --: | :-- | :-- | :-- |
| 50 | [Plum Village App](http://localhost:3000/healers/plum-village-app) |  | 1/0/1/1 |
| 51 | [Medito](http://localhost:3000/healers/medito) |  | 0/0/0/1 |
| 53 | [Open](http://localhost:3000/healers/open) | Los Angeles, California | 2/0/2/1 |
| 54 | [Sattva](http://localhost:3000/healers/sattva) |  | 0/0/1/0 |
| 55 | [Tergar Meditation App](http://localhost:3000/healers/tergar-meditation-app) | Minneapolis, Minnesota | 0/0/0/2 |
| 66 | [Hallow](http://localhost:3000/healers/hallow) |  | 1/0/1/2 |
| 69 | [Pray As You Go](http://localhost:3000/healers/pray-as-you-go) |  | 0/0/0/3 |
| 70 | [Glorify](http://localhost:3000/healers/glorify) |  | 0/0/0/2 |
| 77 | [Labyrinthos](http://localhost:3000/healers/labyrinthos) |  | 0/0/0/3 |

**Held:**
- 48 Waking Up (`waking-up.json`): No usable image: the site's images (logo, share image, artwork) are all served from assets.wakingup.com, whose robots.txt request is refused (403 Access Denied), so they can't be used; the one www.wakingup.com image link (/images/logo.png) returns 404 and the 
- 62 Buddhify (`buddhify.json`): buddhify.com's blog (buddhify.com/blog/) now lists gambling and casino spam posts (Melbet, Mostbet, online casino and betting pieces) in place of meditation articles, so the site looks compromised or no longer looked after; owner to decide whether to link to i
- 64 Mindfulness.com (`mindfulness-com.json`): Lead, 9 Nov 2026: held for the owner. Borderline on the health rule (the home page compares mindfulness with CBT and SSRIs and has 'Pain & illness' tabs), and the only image the ingest accepted is the share image with 'Ease Anxiety' and 'Better Sleep' tiles.
- 65 The Way (`the-way.json`): Lead, 9 Nov 2026: held for the owner. Henry Shukman is live, and two of these offerings (Lifetime Subscription, Rest and Renew) are already on his listing: list the app separately, or keep it on his listing?
- 74 Sadhguru App (`sadhguru-app.json`): Lead, 9 Nov 2026: held for the owner. Its items overlap the existing sadhguru listing: list the app separately, or add to his listing?
- 76 The Pattern (`the-pattern.json`): No usable image: every image on thepattern.com (a Wix site), including its logo and app icon, is served from static.wixstatic.com, which refuses our robots.txt request (403), and no other host carries its icon on the pages read. Also thin (one free resource, n
- 81 Meditation Studio (`meditation-studio.json`): Lead, 10 Nov 2026: held for the owner. Its library includes Pain, Fertility, Cancer Comfort, Sleep and Anxiety collections (like Breethe and Aura, which were skipped), and its only usable image is a 477 x 60 wordmark.

### quantum-touch — 11 on dev, 1 held

| Rank | Listing | Town | V/B/O/F |
| --: | :-- | :-- | :-- |
| 85 | [Annabel Hall](http://localhost:3000/healers/annabel-hall) | Mesa, Arizona | 1/0/3/0 |
| 86 | [April Walker](http://localhost:3000/healers/april-walker) | Modesto, California | 1/0/5/1 |
| 87 | [Asha Carolyn Young](http://localhost:3000/healers/asha-carolyn-young) | Gualala, California | 2/0/2/0 |
| 91 | [Bia de Castro Oliveira](http://localhost:3000/healers/bia-de-castro-oliveira) | São Paulo | 5/0/4/0 |
| 93 | [Carol Wetherill](http://localhost:3000/healers/carol-wetherill) | Columbia, Maryland | 0/0/3/1 |
| 94 | [Cathy Marshall](http://localhost:3000/healers/cathy-marshall) | Kingston, Ontario | 0/0/3/0 |
| 101 | [Constantina M. Vaseliades](http://localhost:3000/healers/constantina-vaseliades) | St. Petersburg, Florida | 0/0/4/0 |
| 103 | [Deborah Gair](http://localhost:3000/healers/deborah-gair) |  | 0/0/5/0 |
| 105 | [Eileen Strong](http://localhost:3000/healers/eileen-strong) | Belper | 0/0/6/0 |
| 117 | [Heather Watson](http://localhost:3000/healers/heather-watson) | Sonora, California | 0/0/4/0 |
| 123 | [Jason Carlson](http://localhost:3000/healers/jason-carlson) | Burleson, Texas | 0/0/5/0 |

**Held:**
- 124 Jodie Cruz (`jodie-cruz.json`): Lead, 10 Nov 2026: held for the owner. Her session pages, which the offerings link to, list stress, anxiety, chronic pain, sleep and illness recovery; under the strict Quantum-Touch health rule the linked pages themselves are condition-led.

### yoga-school — 15 on dev, 3 held

| Rank | Listing | Town | V/B/O/F |
| --: | :-- | :-- | :-- |
| 501 | [Sachidananda Ashtanga Yoga Shala](http://localhost:3000/healers/sachidananda-ashtanga-yoga-shala) | Mysuru, Karnataka | 1/0/4/0 |
| 502 | [Samadhi Yoga Ashram](http://localhost:3000/healers/samadhi-yoga-ashram) | Rishikesh, Uttarakhand | 1/0/5/1 |
| 505 | [Under The Light Yoga School](http://localhost:3000/healers/under-the-light-yoga-school) | Tokyo | 0/0/4/0 |
| 509 | [The Shala – Cape Town Yoga School](http://localhost:3000/healers/the-shala-cape-town-yoga-school) | Cape Town | 0/0/3/0 |
| 510 | [Kanga Studio Nairobi](http://localhost:3000/healers/kanga-studio-nairobi) | Nairobi | 0/0/5/0 |
| 511 | [Iyengar Yoga Center](http://localhost:3000/healers/iyengar-yoga-center-mexico) | Mexico City | 0/0/2/3 |
| 513 | [Instituto Sivananda DLS Brasil](http://localhost:3000/healers/instituto-sivananda-dls-brasil) | São Paulo | 2/0/3/0 |
| 515 | [Sadhana Yoga Vitacura](http://localhost:3000/healers/sadhana-yoga-vitacura) | Santiago | 0/0/2/1 |
| 519 | [Samadhi Yoga Sangha](http://localhost:3000/healers/samadhi-yoga-sangha) | Denver, Colorado | 0/0/5/0 |
| 520 | [onlYoga](http://localhost:3000/healers/onlyoga) | Atlanta, Georgia | 0/0/3/0 |
| 521 | [Miami Life Center](http://localhost:3000/healers/miami-life-center) | Miami, Florida | 0/0/4/0 |
| 522 | [Byron Yoga Centre](http://localhost:3000/healers/byron-yoga-centre) | Byron Bay, New South Wales | 1/0/4/0 |
| 524 | [Bristol School of Yoga](http://localhost:3000/healers/bristol-school-of-yoga) | Bristol | 0/0/3/0 |
| 528 | [Sivananda Yoga Vedanta Zentrum Berlin](http://localhost:3000/healers/sivananda-yoga-vedanta-zentrum-berlin) | Berlin | 0/0/4/2 |
| 539 | [Iyengar Yoga Vienna](http://localhost:3000/healers/iyengar-yoga-vienna) | Vienna | 0/0/4/0 |

**Held:**
- 517 Karma Teachers (`karma-teachers.json`): Held for the owner (10 Nov 2026): the brief asks for a physical home; Karma Teachers closed its Gastown studio after the pandemic and now teaches in a rented room (Green Room Yoga). Also only one photo, a 2013 group shot.
- 527 Centre Sivananda Paris (`centre-sivananda-paris.json`): Ingest dry run (10 Nov 2026): sivanandaparis.org answered the ingest's robots.txt request with HTTP 502, so every image was refused (the same robots.txt returned 200 to a plain curl earlier). Not retried, per the blocked-means-skip rule. Owner to decide whethe
- 530 The Yoga Flat (`the-yoga-flat.json`): Held for the owner (10 Nov 2026): scope check. The studio also sells strength and pilates classes and runs prenatal and pelvic-floor items (all left out of the plan); the brief excludes fitness-led studios.

### pipelines: esalen — 3 on dev, 2 held

| Rank | Listing | Town | V/B/O/F |
| --: | :-- | :-- | :-- |
| 392 | [Devarshi Steven Hartman](http://localhost:3000/healers/devarshi-steven-hartman) | Maui, Hawaii | 7/1/5/0 |
| 395 | [Teja Bell](http://localhost:3000/healers/teja-bell) |  | 0/0/2/2 |
| 406 | [Amy Secada](http://localhost:3000/healers/amy-secada) |  | 1/0/2/0 |

**Held:**
- 394 Reverend Bodhi Be (`bodhi-be.json`): No usable photo: the photos on his site (and on Esalen's page) are served from cdn.prod.website-files.com, whose robots.txt returns 403 to us (10 Nov 2026), so the ingest will refuse them; his YouTube channel avatar could not be taken (channel pages not fetche
- 404 Ally Bogard (`ally-bogard.json`): No usable photo: her site is on Wix (photos on static.wixstatic.com, which refuses our robots.txt request), her Esalen photo is on cdn.prod.website-files.com (robots.txt 403), the Kripalu presenter page found by search returns 404, and her YouTube avatar was n

### pipelines: kripalu — 22 on dev, 1 held

| Rank | Listing | Town | V/B/O/F |
| --: | :-- | :-- | :-- |
| 353 | [Leslie Booker](http://localhost:3000/healers/leslie-booker) | Philadelphia, Pennsylvania | 4/0/1/2 |
| 354 | [Kate Johnson](http://localhost:3000/healers/kate-johnson) |  | 0/1/4/0 |
| 355 | [Rashid Hughes](http://localhost:3000/healers/rashid-hughes) | Washington, DC | 0/0/0/5 |
| 357 | [Ji Hyang Padma](http://localhost:3000/healers/ji-hyang-padma) | Boulder, Colorado | 1/2/1/1 |
| 358 | [Robert Rosenbaum](http://localhost:3000/healers/robert-rosenbaum) | Sacramento, California | 0/0/2/4 |
| 360 | [Harshada Wagner](http://localhost:3000/healers/harshada-wagner) |  | 0/0/7/1 |
| 362 | [Arawana Hayashi](http://localhost:3000/healers/arawana-hayashi) |  | 5/1/2/0 |
| 365 | [Lizzie Lasater](http://localhost:3000/healers/lizzie-lasater) | Salzburg | 0/1/7/2 |
| 367 | [Melina Meza](http://localhost:3000/healers/melina-meza) | Oakland, California | 0/0/4/0 |
| 474 | [Barrie Risman](http://localhost:3000/healers/barrie-risman) | Sutton, Quebec | 0/0/2/1 |
| 476 | [Joseph Le Page](http://localhost:3000/healers/joseph-le-page) | Garopaba | 10/0/2/1 |
| 478 | [Megha Nancy Buttenheim](http://localhost:3000/healers/megha-nancy-buttenheim) | Pittsfield, Massachusetts | 2/1/4/0 |
| 480 | [Rochelle Schieck](http://localhost:3000/healers/rochelle-schieck) |  | 8/1/4/1 |
| 481 | [Camille Maurine](http://localhost:3000/healers/camille-maurine) | Marina del Rey, California | 0/2/2/0 |
| 487 | [Anjie Cho](http://localhost:3000/healers/anjie-cho) | New York, New York | 0/0/3/1 |
| 592 | [Libby Barnett](http://localhost:3000/healers/libby-barnett) | Asheville, North Carolina | 0/0/5/0 |
| 593 | [Rick Barrett](http://localhost:3000/healers/rick-barrett) | New York, New York | 5/1/0/1 |
| 594 | [Bess Matassa](http://localhost:3000/healers/bess-matassa) | New York, New York | 0/6/5/0 |
| 595 | [Judith Valente](http://localhost:3000/healers/judith-valente) |  | 1/3/0/0 |
| 596 | [Donald Altman](http://localhost:3000/healers/donald-altman) |  | 0/6/0/0 |
| 600 | [Bhavani Lorraine Nelson](http://localhost:3000/healers/bhavani-lorraine-nelson) |  | 0/0/3/2 |
| 601 | [Jo Ann Levitt](http://localhost:3000/healers/jo-ann-levitt) | Berkshires, Massachusetts | 0/2/1/1 |

**Held:**
- 491 Itzhak Beery (`itzhak-beery.json`): Psychedelics: his Ecuador shamanic healers training lists 'visionary plant medicine work with Huachuma (San Pedro), Yajé, and Ayahuasca' (https://www.itzhakbeery.com/ecuador-trip.html), his site's keywords include Ayahuasca, and one book is titled The Gift of 

### pipelines: sounds-true — 11 on dev, 3 held

| Rank | Listing | Town | V/B/O/F |
| --: | :-- | :-- | :-- |
| 333 | [Lama Surya Das](http://localhost:3000/healers/surya-das) | Lexington, Massachusetts | 1/10/1/1 |
| 334 | [Lama Tsultrim Allione](http://localhost:3000/healers/tsultrim-allione) | Pagosa Springs, Colorado | 1/1/6/0 |
| 335 | [Roshi Joan Halifax](http://localhost:3000/healers/joan-halifax) | Santa Fe, New Mexico | 7/5/3/0 |
| 338 | [Shri Anandi Ma](http://localhost:3000/healers/anandi-ma) | Antioch, California | 0/0/2/2 |
| 342 | [Lama Lhanang Rinpoche](http://localhost:3000/healers/lhanang-rinpoche) | San Diego, California | 0/3/2/1 |
| 343 | [Dzigar Kongtrul Rinpoche](http://localhost:3000/healers/dzigar-kongtrul-rinpoche) | Boulder, Colorado | 1/0/3/0 |
| 344 | [Dzogchen Ponlop Rinpoche](http://localhost:3000/healers/dzogchen-ponlop-rinpoche) | Seattle, Washington | 0/5/0/0 |
| 346 | [Thupten Jinpa](http://localhost:3000/healers/thupten-jinpa) | Montreal, Quebec | 3/2/0/0 |
| 347 | [Matthieu Ricard](http://localhost:3000/healers/matthieu-ricard) |  | 3/4/0/0 |
| 351 | [Agapi Stassinopoulos](http://localhost:3000/healers/agapi-stassinopoulos) | New York, New York | 3/4/0/1 |
| 375 | [Aleya Dao](http://localhost:3000/healers/aleya-dao) | Prather, California | 3/1/6/2 |

**Held:**
- 345 Yongey Mingyur Rinpoche (`yongey-mingyur-rinpoche.json`): Held for the owner (10 Nov 2026): the only contact route is an email the helper decoded from Cloudflare email protection on tergar.org. That protection is meant to stop harvesting, so it isn't used without your OK. Could also be linked to the Tergar app.
- 349 His Holiness the Dalai Lama (`dalai-lama.json`): Held for the owner (night sprint, 10 Nov 2026): much of his own site is Tibet politics; does the listing fit the no-political-content rule?
- 350 Aaravindha Himadra (`aaravindha-himadra.json`): Held for the owner (10 Nov 2026): the photo comes from an uncaptioned ideamensch.com interview (identity likely, not certain), and the email was decoded from Cloudflare email protection (his contact form is fine).

## 3. For you to decide

Collected as each chunk came back. Also saved as `docs/content-audits/night-sprint-2026-11-09/for-you-to-decide.md`.

- Arava Spiritual Center (rank 44): held. A Haaretz report, summarised on Wikipedia, describes cult-style allegations about its founder Lama Dvora (Dvora Tzvieli), who is already listed on Spiritpedia. Founder link prepared, to apply only if released.
- Institute of Noetic Sciences (46): in scope as a centre? (a research institute; one psychedelic and one UFO/orgone webinar left out)
- Tergar (55): listed as an app; the app page is thin. Would an organisation listing for Tergar be better?
- Swami Sarvapriyananda: on Vedanta Society of Southern California's audio-talks page, but now minister in New York. Not linked; link him?
- Waking Up (48): held. No usable image (assets.wakingup.com refuses robots.txt), and thin.
- The Sati Center (41): held. The ingest couldn't read sati.org's robots.txt (socket error), so its logo was refused.
- Skips you may want to overrule: Calm (calm.com 403), Ten Percent Happier (meditatehappier.com blocks ClaudeBot), Healthy Minds, Balance, Aura and Breethe (condition-led).
- **lama-dvora (already live):** the Arava allegations concern her as founder and spiritual director. Keep her listing, or take it down as with Adam Apollo?
- East Bay Meditation Center (23): held. Strong social-justice framing (a published "stance on Gaza" post, a white-identity group, an organising programme). List it or leave it out?
- San Francisco Zen Center (36): held. sfzc.org answered the ingest's image check with 429 (rate limit). Not retried; can go in later with a photo from a host that allows us.
- Sivananda Ashram Yoga Retreat Bahamas (37): held. Publicly reported abuse allegations against the late founder, Swami Vishnudevananda (2019). The helper didn't open a source this session, so this is from general knowledge. Its images also failed. Banafsheh Sayyad's April 2027 course there would be her link.
- Skipped for blocks: Drala Mountain Center (robots.txt 406), The Rowe Center (blocks ClaudeBot), Sit-Heads (blocks all). Bellingham Insight (no photo, thin), Insight Meditation South Bay (no photo; Shaila Catherine's centre), Brightheart (Finnbarr Kennedy's own).
- Apps held: Buddhify (its blog now shows casino spam, so the site looks hacked); Mindfulness.com (borderline health, and its only image has "Ease Anxiety" and "Better Sleep" tiles); The Way (overlaps Henry Shukman's listing); Sadhguru App (overlaps Sadhguru's listing); The Pattern (Wix images only).
- Apps skipped you may want to overrule: Smiling Mind, Simple Habit and Abide (condition-led); Lectio 365 and 24-7 Prayer (robots.txt 403); Heartfulness (app site 503; could be an organisation); Art of Living (404 everywhere); Sahaja Online (healing claims); CHANI (blocks anthropic-ai, and chaninicholas.com now redirects there, which affects the live chani-nicholas listing's links); Co–Star (JavaScript only); Sanctuary (now a psychic-reading marketplace).
- Possible tier raises from published user numbers: Mindfulness.com (1M+), Sadhguru App (5M downloads), Pray As You Go (500k, from a search result only), Glorify (20M, from a snippet only).
- Centres held: Buddhist Society of Western Australia (bswa.org drops the ingest's connection; Ajahn Brahm's centre); Mission Dharma (only image under 300 px).
- Centre links with thin evidence (made on dev, review before live):
  - guest-talk speakers at Mountain Stream (Dawn Mauricio, Tuere Sala, Devin Berry);
  - Hugh Byrne at IMCW (named an "IMCW teacher" on its sister Center for Mindful Living site);
  - all 34 teachers on Sangha Live's teachers page.
  Mission Dharma's guest speakers wait with the held plan.
- Possible editorial-stature raises (not made): BSWA, Garrison Institute, IMCW, InsightLA, Sangha Live, Vedanta Society of New York, Insight Meditation Center.
- Skipped centres: Theosophical Society (theosophical.org blocks ClaudeBot); SF Dharma Collective (site behind a Google sign-in).
- Meditation Studio (81): held. It has Pain, Fertility, Cancer Comfort, Sleep and Anxiety collections, and only a 477 x 60 wordmark logo.
- Quantum-Touch skips you might overrule: Bianca Telle (Heilpraktiker practice framed on illness; could be a Quantum-Touch-only listing).
- Carol Wetherill: her base and email come from her Quantum-Touch profile, not her own site.
- Quantum-Touch skips under the strict health rule that you may want to overrule: Goldi Chan, Grace Lee, Eric Jacquet, Gene Skaggs (each skip file says what could be listed). Eileen Strong was listed, but her site also has a Cancer Support page (left out).
- Kripalu chunk (pipelines 352–371):
  - **Scope calls:** Arawana Hayashi (largely leadership and organisational work); Ji Hyang Padma (her book is about Buddhist healers' rituals); Melina Meza ("healthy ageing" framing); Harshada Wagner (a course titled "Yogic Energy Healing").
  - **Hub links from their own sites:** Leslie Booker to Kripalu, IMS and Omega; Kate Johnson to Kripalu and Omega; Melina Meza to Esalen.
  - **Possible future listing:** Judith Hanson Lasater, Lizzie Lasater's mother and co-teacher.
- **Quantum-Touch paused after rank 140** (83–140 researched: 12 listed, 1 held). Most practitioners have no website of their own, or sell Quantum-Touch on pain and conditions. Ranks 141–487 are still in the queue. Carry on, or stop?
  - Jodie Cruz: held (her session pages list conditions).
  - Kathie Scott: viable as "Kathie and Paul Scott"; the only headshot on their site is of Paul.
  - Linda Menkhorst-Elsinga, the Dutch Quantum-Touch liaison: skipped, because her team's site promises back-pain relief and bone realignment.
- **Amy Secada (inserted on dev, Esalen 406):** her own site promises less anxiety and release of trauma; the helper left out the trauma class and wrote the rest without health wording. Keep, or drop before live?
- **Bodhi Be and Ally Bogard (held, Esalen 394, 404):** no usable photo (Webflow and Wix image hosts refuse our robots.txt). They could go in once YouTube avatars can be read through the API, or with a photo you choose.
- **Dalai Lama (held, Sounds True 349):** much of his site is Tibet politics; the plan leaves it out. Does he fit the no-political-content rule?
- **Yongey Mingyur Rinpoche (held, 345):** the only email came from decoding Cloudflare's email protection on tergar.org. I didn't use it without your OK. If you OK him, he could also be linked to the Tergar app listing.
- **Aaravindha Himadra (held, 350):** his photo is uncaptioned (from an interview site), and his email was decoded the same way. He has a contact form.
- **Matthieu Ricard (inserted on dev):** his own FAQ says he doesn't see himself as a teacher. Keep him?
- **Tiers:** Surya Das, Tsultrim Allione, Joan Halifax, Thupten Jinpa and Matthieu Ricard (and the Dalai Lama and Mingyur if you OK them) are all local_hero, because no follower counts could be read without YouTube. Tier override, or wait for the API key?
- **Shi Heng Yi (skipped, 341):** shaolintemple.eu carries a statement about an abuse investigation, so he's held under the allegations rule.
- **Agapi Stassinopoulos (inserted):** her work is largely corporate wellbeing talks. Keep her?
- **Itzhak Beery (held, Kripalu 491):** his Ecuador training includes ayahuasca, yajé and San Pedro ceremonies, and his site carries political articles. Psychedelics rule → held.
- **Anjie Cho (inserted):** her work is mainly feng shui and ikebana. Is that in scope?
- **Camille Maurine (inserted):** her site names The Shift Network among the places she has taught, so she's linked to it (no Shift Network page opened). Keep that link?
- **Maya Tiwari (skipped, 484):** her Ayurveda work is health-led, but she is also an interfaith peace figure. Reconsider?
- **Krishna Kaur (skipped, 483):** her site was down (HTTP 500). Worth revisiting.
- **Libby Barnett (inserted, Kripalu 592):** her own site frames Reiki around pain, immunity and anxiety. The listing avoids that wording, and her book "Reiki Energy Medicine" is left out. Keep her?
- **Donald Altman (inserted, 596):** a licensed psychotherapist as well as a former monk. He's listed for his mindfulness books only (his offerings sit on a host that disallows us). Keep him?
- **Bess Matassa (inserted, 594):** "New York-based" comes from her publisher's page, not her own site, and one ISBN comes from a cover image filename on her own site.
- **Judith Valente (inserted, 595):** I dropped her pilgrimage, because the page still shows only the 2025 dates. She keeps 1 video and 3 books.
- **Karma Teachers, Vancouver (held, yoga 517):** a non-profit teacher-training school, but with no studio of its own since the pandemic (it rents a room). Does it count as a physical school?
- **Squarespace preview hosts (yoga 517–520):** the helper reached three schools through Squarespace preview addresses from search results, then took each real domain from the preview site's robots.txt sitemap line. Is that acceptable?
- **The Yoga Flat, Copenhagen (held, yoga 530):** a teacher-training school that also sells strength and pilates. In scope or out?
- **Centre Sivananda Paris (held, yoga 527):** its robots.txt answered the ingest with HTTP 502, so the ingest refused every image. Not retried. Try again on a later day?
- **Yoga schools, 22 of 40 cities skipped:** most were blocked (yoga.se and Yoga Centre Toronto name ClaudeBot in robots.txt), known only from directories, or fitness chains. Europe was the hardest. The next yoga list could start from lineage sites' own centre lists (Iyengar, Sivananda, Ashtanga), checking each one's robots.txt first.

## 4. Place aliases: migration 0042 (for you to run)

`supabase/migrations/0042_place_aliases_night_sprint.sql`, dev first, then live. Eleven aliases for towns under 5,000 (or a region) so Near You finds these listings: Lakemont → Toccoa, Shipman → Stuarts Draft, Faber → Crozet, Pagosa Springs → Durango, Garrison (NY) → West Point, Gualala → Cloverdale, Sonora (CA) → Oakdale, Prather → Clovis, Haiku (HI) → Haʻikū, Sutton (Quebec) → Cowansville, the Berkshires → Pittsfield. **Check row on dev:** 103 aliases; without_place 2 (MaryBeth Hyland's "Salmon" and Beth Bradford's "Sussex County", both older listings).

## 5. Ingest changes (scripts only, no deploy)

- **Crawl-delay is honoured** (`scripts/lib/images.mjs`, a746515): the delay in the robots.txt group that applies to us spaces every request to that host, robots.txt included. Found when the ingest fetched Charlotte Buddhist Vihara's images faster than its Crawl-delay.
- **No YouTube channel pages or consent.youtube.com** (aa6f385): the photo fallback was requesting channel pages, which redirect this machine to the consent page. Video oEmbed and yt3 avatars are unaffected.

## 6. Yields, and what's left in the queue

- **Quantum-Touch paused after rank 140.** Ranks 83–140 gave 12 plans (11 listed, 1 held). Most practitioners have no site of their own, or sell the work on pain and conditions, which the strict health rule rules out. Ranks 141–487 are still queued.
- **"Unsure" chunks yield little.** Sounds True 372–391 gave 1 of 20, and 412–431 gave none of the 16 done so far (musicians, therapists, doctors, coaches). That chunk was stopped with 4 names left (Carole Hyder, Cheryl Richardson, Christina Baldwin, Clarissa Pinkola Estés). The confident lists (Kripalu "keep" chunks) gave 6–9 of 20.
- **Yoga schools: 15 of 40 cities.** 22 skipped (robots blocks, schools known only from directories, fitness chains) and 3 held (Vancouver, Paris, Copenhagen). Europe was hardest. A better next list: the centre lists on lineage sites (Iyengar, Sivananda, Ashtanga), each checked for robots.txt first.
- **Omega chunks skipped:** your 9 Nov message named only Kripalu and Esalen.
- **Channels** wait for the YouTube Data API key.

## 7. Rule slips (reported honestly)

**Mine:**
- One HEAD request to m.youtube.com for the Eye of Wisdom channel (before the consent gate).
- Two guessed quantumtouch.com image paths while testing the Crawl-delay fix.

**Helpers', tonight:**
- dyc.org: a HEAD request sent without waiting out its 20 s Crawl-delay (Sounds True 338).
- Cloudflare-protected emails decoded on tergar.org and aaravindha.com. Those plans are held, and later helpers were told never to decode them.
- YouTube watch pages fetched to read video lengths, without reading youtube.com's robots.txt first (Kripalu 472). Later helpers were told oEmbed only.
- A few third web searches beyond the two allowed per teacher; one directory page read (GreatNonprofits, to look for a school's site; none found).
- One robots.txt read in the same step as a home-page request; the page output was thrown away (Amy Secada).
- Joseph Le Page's bio uses one fact (Kripalu Yoga and Tibetan Buddhism background) from his Kripalu hub page, in our own words.
- Three yoga schools were reached through Squarespace preview addresses from search results, with the real domain taken from the preview's robots.txt sitemap line (listed under For you to decide).
- iyengaryoga.at: one page timed out; three other pages were fetched later, more slowly. A timeout isn't a refusal, but you may prefer stopping there.
- While debugging the Paris dry run, a helper ran the ingest's robots check once by hand (same user agent; no retry after the 502).
- naim.org.il's robots.txt points AI agents to an "agent-instructions" page; it was treated as data and not opened.
- Two helpers were stopped mid-chunk when my usage limit ran out; their finished plans were checked and dry-run before inserting.

Slips from the earlier chunks of the night (centres, apps, Quantum-Touch) are recorded in each plan's `sprint.flags`.

## 8. Next steps

1. Your decisions above, and migration 0042 (dev, then live).
2. On your OK, insert the 102 on live, minus any you drop.
3. When the YouTube key arrives: channels sprint, and tiers for tonight's listings.
