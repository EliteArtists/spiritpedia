# Content run: 100 new teachers on dev (1 Nov 2026)

This is the README §18.7 content run. **All 100 new teachers are on dev and nothing is live.** Nothing goes live until the owner says OK.

## Totals

- **New teachers on dev: 100.**
  - 2 leftovers already researched (Russ Hudson, Raj Balkaran).
  - 10 from Esalen ranks 236–254.
  - 3 from Commune ranks 26–34.
  - 20 from Insight Meditation Society (IMS), out of its 40 current teachers.
  - 65 from Insight Timer sprint 2, from rank 117 onwards.
- **Items added:** 769 videos, 70 books, 324 offerings and 184 free resources.
- **Tiers** (§17.1, followers added together):
  - 2 Superhero: Sah D'Simone, Nandhiji.
  - 9 Luminary. Two of them are raised by editorial stature, owner to confirm: Russ Hudson and Joseph Goldstein.
  - 89 Local Hero.
- **Contact:** 78 have a published email; 22 have a contact form only.
- **Hubs:**
  - Spirit Rock was skipped.
  - IMS is a new hub on dev.
- **Not listed: 114 researched teachers.** 110 were skipped or dropped and 4 are held for your check. The list is below.
- **The order the owner asked for was kept:**
  - The leftovers came first.
  - Then the rest of Esalen and Commune.
  - Then the hubs: Spirit Rock, then IMS.
  - Then the Insight Timer top-up, inserted in rank order.
  - The run stopped at exactly 100. The last teacher in is Beth Bradford (rank 262).
  - Dennis & Kathy Lang (rank 265) is written up but held, not inserted.

## Hubs

### Spirit Rock: skipped

- Its robots.txt blocks ClaudeBot, anthropic-ai and Claude-Web.
- Nothing from spiritrock.org was fetched.
- Every research brief now says never to fetch it.
- Spirit Rock teachers who also teach elsewhere were researched from other sources only.

### Insight Meditation Society (Barre, MA): new Organisation hub on dev

- **robots.txt and terms:** dharma.org's robots.txt allows everything. It has no terms page, and the privacy policy raises nothing.
- **Tier: Luminary by editorial stature, owner to confirm.**
  - The followers we could read add up to only about 7.5k.
  - The reason for the raise: it was founded in 1975 by Joseph Goldstein, Jack Kornfield and Sharon Salzberg and is one of the oldest insight meditation centres in the West.
  - Superhero is the alternative if you prefer.
- **On the hub listing:** 9 offerings (retreats, Forest Refuge, IMS Online) and 3 free resources.
- **Faculty:**
  - 40 current teachers were ranked by how likely they are to claim a listing.
  - The 4 past faculty are listed on the hub without links.
  - Sharon Salzberg was already on Spiritpedia and is linked as founder.
- **Outcome for the 40:**
  - 20 are on dev.
  - 19 were skipped: 17 had no contact route of their own, 1 was too thin and 1 was skipped under the health rule.
  - 1 was dropped: Bob Stahl, under the health rule.
- **events.dharma.org:**
  - One research agent made a single request to events.dharma.org before reading its robots.txt, which blocks that subdomain.
  - Nothing from that request was used.
  - The agent tried again under a different browser identity, and the permission check blocked it.
  - The IMS 2027 retreat schedule pages there were not read. Some teachers' retreat dates are therefore missing; they are noted in each plan's `left_out`.

### Insight Timer: candidate list extended

- **Why:** yesterday's candidate list (ranks 1–229) ran out before 100.
- **How it was extended:**
  - An agent built ranks 230–312 using the same public pages: the "Popular teachers" lists on 38 topic pages that hadn't been used yet.
  - It checked robots.txt first. Only `/search`, `/meditation-groups/` and `/groups` are blocked, and none of them were opened.
  - No internal APIs, logins or fake browser identities were used.
- **Result:** 83 teachers ranked, 115 set aside. It is saved in `docs/content-audits/insight-timer-faculty-extension.json`; the original file is untouched.
- **Used so far:** ranks 230–265. Ranks 266–312 are still available for the next sprint.

## Links made (dev)

- **Insight Timer:** 65 "Teaches on Insight Timer" links. Each has a "<Name> on Insight Timer" free resource.
- **IMS:** 19 "Teaches at" links, plus 2 founders: Joseph Goldstein, new in this run, and Sharon Salzberg, already listed.
- **Esalen:** 12 instructor links (the 10 Esalen teachers plus the two leftovers, who were Esalen faculty).
- **Commune:** 3 instructor links.
- **Total:** 100 links for the 100 new teachers, plus Sharon Salzberg's founder link to IMS.
- **Co-author:** Joseph Goldstein was added as co-author of *Seeking the Heart of Wisdom* (Jack Kornfield's book, id 363) on dev.
  - Script: `content-run-fixes-2026-11-01.mjs`, logged for rollback.
  - It needs running on live when this goes live.

## The 100 teachers

In insertion order. V/B/O/F = videos, books, offerings, free resources, counted on dev. "(override)" = tier raised by editorial stature, owner to confirm. Tier evidence for each teacher is in their plan's `sprint.tier_evidence`.

| Source | # | Teacher | Tier | V | B | O | F | Contact |
|---|---|---|---|---|---|---|---|---|
| Leftover | 233 | [Dr. Raj Balkaran](http://localhost:3000/healers/raj-balkaran) | local hero | 12 | 2 | 6 | 2 | form |
| Leftover | 234 | [Russ Hudson](http://localhost:3000/healers/russ-hudson) | luminary (override) | 11 | 4 | 4 | 1 | form |
| Insight Timer | 117 | [Catherine Wilde](http://localhost:3000/healers/catherine-wilde) | local hero | 3 | 0 | 2 | 1 | form |
| Insight Timer | 120 | [Joshua Canter](http://localhost:3000/healers/joshua-canter) | local hero | 4 | 0 | 3 | 1 | email |
| Insight Timer | 121 | [Michael and Jahna](http://localhost:3000/healers/michael-and-jahna) | local hero | 8 | 0 | 3 | 1 | email |
| Insight Timer | 122 | [Marisa La Fata](http://localhost:3000/healers/marisa-la-fata) | local hero | 0 | 0 | 4 | 1 | email |
| Insight Timer | 124 | [Sara Clark](http://localhost:3000/healers/sara-clark) | local hero | 9 | 0 | 0 | 2 | email |
| Insight Timer | 125 | [Keith Parker](http://localhost:3000/healers/keith-parker) | local hero | 7 | 1 | 2 | 2 | email |
| Esalen | 236 | [William Donius](http://localhost:3000/healers/william-donius) | local hero | 9 | 1 | 1 | 0 | form |
| Esalen | 238 | [Ulrika Engman](http://localhost:3000/healers/ulrika-engman) | local hero | 1 | 0 | 7 | 0 | email |
| Esalen | 239 | [Zuza Engler](http://localhost:3000/healers/zuza-engler) | local hero | 9 | 0 | 6 | 2 | email |
| Esalen | 240 | [Alex Halenda](http://localhost:3000/healers/alex-halenda) | local hero | 10 | 0 | 6 | 1 | email |
| Esalen | 247 | [Jeffrey S. Reid](http://localhost:3000/healers/jeffrey-s-reid) | local hero | 7 | 0 | 3 | 0 | email |
| Esalen | 248 | [Lori Sheridan](http://localhost:3000/healers/lori-sheridan) | local hero | 4 | 1 | 4 | 0 | email |
| Esalen | 250 | [Robert MacPhee](http://localhost:3000/healers/robert-macphee) | local hero | 5 | 1 | 3 | 0 | email |
| Commune | 26 | [Suzanne Sterling](http://localhost:3000/healers/suzanne-sterling) | local hero | 11 | 0 | 4 | 2 | email |
| Commune | 27 | [Murray Hidary](http://localhost:3000/healers/murray-hidary) | local hero | 11 | 0 | 4 | 2 | email |
| Commune | 30 | [Noah Mazé](http://localhost:3000/healers/noah-maze) | luminary | 6 | 0 | 10 | 0 | email |
| Esalen | 242 | [Day Schildkret](http://localhost:3000/healers/day-schildkret) | luminary | 10 | 2 | 1 | 0 | email |
| Esalen | 243 | [Dustin DiPerna](http://localhost:3000/healers/dustin-diperna) | local hero | 9 | 3 | 1 | 2 | email |
| Esalen | 245 | [Micha Merrick](http://localhost:3000/healers/micha-merrick) | local hero | 0 | 0 | 4 | 0 | email |
| IMS | 34 | [Joseph Goldstein](http://localhost:3000/healers/joseph-goldstein) | luminary (override) | 12 | 6 | 1 | 2 | email |
| IMS | 35 | [Mark Nunberg](http://localhost:3000/healers/mark-nunberg) | local hero | 11 | 0 | 0 | 2 | email |
| IMS | 36 | [Matthew Brensilver](http://localhost:3000/healers/matthew-brensilver) | local hero | 12 | 2 | 4 | 3 | form |
| IMS | 6 | [Éowyn Ahlstrom](http://localhost:3000/healers/eowyn-ahlstrom) | local hero | 3 | 1 | 2 | 2 | email |
| IMS | 7 | [Tara Mulay](http://localhost:3000/healers/tara-mulay) | local hero | 9 | 0 | 3 | 2 | form |
| IMS | 8 | [Jill Shepherd](http://localhost:3000/healers/jill-shepherd) | local hero | 11 | 0 | 4 | 2 | form |
| IMS | 10 | [Cara Lai](http://localhost:3000/healers/cara-lai) | local hero | 6 | 0 | 3 | 2 | email |
| IMS | 1 | [Devin Berry](http://localhost:3000/healers/devin-berry) | local hero | 8 | 0 | 0 | 1 | email |
| IMS | 2 | [Walt Opie](http://localhost:3000/healers/walt-opie) | local hero | 10 | 0 | 2 | 1 | form |
| IMS | 3 | [Rebecca Bradshaw](http://localhost:3000/healers/rebecca-bradshaw) | local hero | 5 | 1 | 5 | 1 | email |
| IMS | 4 | [Devon Hase](http://localhost:3000/healers/devon-hase) | local hero | 11 | 2 | 7 | 2 | email |
| IMS | 5 | [Rachel Lewis](http://localhost:3000/healers/rachel-lewis) | local hero | 5 | 0 | 0 | 3 | email |
| IMS | 11 | [Roxanne Dault](http://localhost:3000/healers/roxanne-dault) | local hero | 12 | 0 | 3 | 0 | email |
| IMS | 12 | [Ajahn Canda](http://localhost:3000/healers/ajahn-canda) | local hero | 12 | 0 | 0 | 2 | form |
| IMS | 13 | [Tuere Sala](http://localhost:3000/healers/tuere-sala) | local hero | 12 | 0 | 2 | 0 | form |
| IMS | 14 | [Kristina Baré](http://localhost:3000/healers/kristina-bare) | local hero | 10 | 0 | 1 | 0 | email |
| IMS | 15 | [Yong Oh](http://localhost:3000/healers/yong-oh) | local hero | 1 | 0 | 2 | 0 | email |
| IMS | 24 | [Bart van Melik](http://localhost:3000/healers/bart-van-melik) | local hero | 7 | 0 | 2 | 0 | email |
| IMS | 25 | [Bhante Buddharakkhita](http://localhost:3000/healers/bhante-buddharakkhita) | local hero | 11 | 0 | 0 | 4 | email |
| IMS | 30 | [Cuong Lu](http://localhost:3000/healers/cuong-lu) | local hero | 11 | 3 | 3 | 0 | email |
| Insight Timer | 126 | [Gillian White](http://localhost:3000/healers/gillian-white) | local hero | 12 | 0 | 8 | 5 | email |
| Insight Timer | 128 | [Rev. Lee Wolak](http://localhost:3000/healers/lee-wolak) | local hero | 12 | 0 | 0 | 2 | email |
| Insight Timer | 131 | [Tanis Fishman](http://localhost:3000/healers/tanis-fishman) | local hero | 0 | 0 | 4 | 3 | email |
| Insight Timer | 133 | [Nid Ra](http://localhost:3000/healers/nid-ra) | local hero | 12 | 0 | 6 | 3 | form |
| Insight Timer | 135 | [Joe Stuczynski](http://localhost:3000/healers/joe-stuczynski) | local hero | 12 | 0 | 0 | 3 | email |
| Insight Timer | 137 | [Fred Haas](http://localhost:3000/healers/fred-haas) | local hero | 0 | 0 | 2 | 2 | email |
| Insight Timer | 139 | [Lyndsay Toensing](http://localhost:3000/healers/lyndsay-toensing) | local hero | 0 | 1 | 1 | 2 | email |
| Insight Timer | 141 | [Ally Boothroyd](http://localhost:3000/healers/ally-boothroyd) | luminary | 12 | 0 | 5 | 1 | email |
| Insight Timer | 142 | [Stuart Sandeman](http://localhost:3000/healers/stuart-sandeman) | luminary | 10 | 0 | 1 | 1 | email |
| Insight Timer | 143 | [Sah D'Simone](http://localhost:3000/healers/sah-dsimone) | superhero | 9 | 3 | 5 | 2 | email |
| Insight Timer | 145 | [Renée Rotkopf](http://localhost:3000/healers/renee-rotkopf) | local hero | 4 | 0 | 4 | 2 | email |
| Insight Timer | 146 | [Gaia Hope Good](http://localhost:3000/healers/gaia-hope-good) | local hero | 0 | 0 | 5 | 2 | form |
| Insight Timer | 147 | [Tom Evans](http://localhost:3000/healers/tom-evans) | local hero | 8 | 10 | 2 | 1 | form |
| Insight Timer | 148 | [Renee Sills](http://localhost:3000/healers/renee-sills) | local hero | 0 | 0 | 2 | 2 | email |
| Insight Timer | 153 | [Francie La Flow](http://localhost:3000/healers/francie-la-flow) | local hero | 12 | 0 | 10 | 4 | email |
| Insight Timer | 165 | [Stephan Pende Wormland](http://localhost:3000/healers/stephan-pende-wormland) | local hero | 8 | 0 | 8 | 2 | email |
| Insight Timer | 166 | [Josh Korda](http://localhost:3000/healers/josh-korda) | local hero | 9 | 1 | 0 | 4 | email |
| Insight Timer | 168 | [Olivia Rosewood](http://localhost:3000/healers/olivia-rosewood) | local hero | 8 | 0 | 2 | 1 | email |
| Insight Timer | 175 | [Jordyn Roe](http://localhost:3000/healers/jordyn-roe) | local hero | 10 | 0 | 2 | 3 | email |
| Insight Timer | 189 | [Ryan Powell](http://localhost:3000/healers/ryan-powell) | local hero | 4 | 0 | 1 | 2 | email |
| Insight Timer | 176 | [Guo Gu](http://localhost:3000/healers/guo-gu) | local hero | 12 | 3 | 6 | 4 | email |
| Insight Timer | 178 | [Jenna Pfingston](http://localhost:3000/healers/jenna-pfingston) | local hero | 12 | 0 | 3 | 1 | email |
| Insight Timer | 181 | [Acharya Shunya](http://localhost:3000/healers/acharya-shunya) | local hero | 10 | 2 | 6 | 4 | email |
| Insight Timer | 182 | [Aluminea](http://localhost:3000/healers/aluminea) | local hero | 0 | 0 | 4 | 2 | email |
| Insight Timer | 183 | [Jocelyn Valencia](http://localhost:3000/healers/jocelyn-valencia) | local hero | 10 | 0 | 0 | 4 | email |
| Insight Timer | 184 | [Mel Collins](http://localhost:3000/healers/mel-collins) | local hero | 3 | 1 | 3 | 1 | email |
| Insight Timer | 157 | [Finnbarr Kennedy](http://localhost:3000/healers/finnbarr-kennedy) | local hero | 11 | 0 | 2 | 2 | email |
| Insight Timer | 159 | [Jordanna Levin](http://localhost:3000/healers/jordanna-levin) | local hero | 0 | 2 | 3 | 1 | email |
| Insight Timer | 160 | [Sarah Hall](http://localhost:3000/healers/sarah-hall) | luminary | 10 | 0 | 6 | 2 | email |
| Insight Timer | 193 | [Frida Möhres](http://localhost:3000/healers/frida-mohres) | local hero | 6 | 0 | 4 | 2 | email |
| Insight Timer | 203 | [Katharine Chestnut](http://localhost:3000/healers/katharine-chestnut) | local hero | 12 | 2 | 5 | 1 | email |
| Insight Timer | 205 | [Jessica Prestia](http://localhost:3000/healers/jessica-prestia) | local hero | 2 | 0 | 4 | 2 | email |
| Insight Timer | 198 | [Laurie Cameron](http://localhost:3000/healers/laurie-cameron) | local hero | 12 | 1 | 3 | 3 | email |
| Insight Timer | 199 | [Lee Papa](http://localhost:3000/healers/lee-papa) | local hero | 0 | 2 | 4 | 1 | email |
| Insight Timer | 200 | [Melinda Quesenberry](http://localhost:3000/healers/melinda-quesenberry) | local hero | 11 | 1 | 1 | 2 | email |
| Insight Timer | 206 | [Amy Elizabeth Bost](http://localhost:3000/healers/amy-elizabeth-bost) | local hero | 0 | 0 | 2 | 3 | email |
| Insight Timer | 226 | [Whitney Durrant](http://localhost:3000/healers/whitney-durrant) | local hero | 12 | 0 | 3 | 3 | form |
| Insight Timer | 223 | [Eric Zimmer](http://localhost:3000/healers/eric-zimmer) | local hero | 7 | 1 | 3 | 5 | form |
| Insight Timer | 211 | [Desirée Dunbar](http://localhost:3000/healers/desiree-dunbar) | local hero | 8 | 0 | 2 | 1 | email |
| Insight Timer | 214 | [Charles Freligh](http://localhost:3000/healers/charles-freligh) | local hero | 12 | 1 | 6 | 1 | email |
| Insight Timer | 216 | [Julian Daizan Skinner](http://localhost:3000/healers/julian-daizan-skinner) | local hero | 12 | 2 | 9 | 2 | form |
| Insight Timer | 217 | [Nina Rao](http://localhost:3000/healers/nina-rao) | local hero | 11 | 0 | 5 | 3 | form |
| Insight Timer | 236 | [William Cooper](http://localhost:3000/healers/william-cooper) | local hero | 0 | 0 | 0 | 5 | email |
| Insight Timer | 237 | [Ekta Bathija](http://localhost:3000/healers/ekta-bathija) | local hero | 10 | 4 | 0 | 5 | email |
| Insight Timer | 241 | [Pavlina Nehrebecki](http://localhost:3000/healers/pavlina-nehrebecki) | local hero | 4 | 0 | 4 | 1 | email |
| Insight Timer | 242 | [Pat Divilly](http://localhost:3000/healers/pat-divilly) | luminary | 12 | 1 | 3 | 3 | email |
| Insight Timer | 246 | [Nandhiji](http://localhost:3000/healers/nandhiji) | superhero | 12 | 0 | 3 | 1 | email |
| Insight Timer | 230 | [Julie Ela Grace](http://localhost:3000/healers/julie-ela-grace) | local hero | 0 | 0 | 6 | 1 | email |
| Insight Timer | 232 | [MC Brigitte Schrottenbacher](http://localhost:3000/healers/mc-brigitte-schrottenbacher) | local hero | 10 | 0 | 2 | 1 | email |
| Insight Timer | 233 | [Samaneri Jayasāra](http://localhost:3000/healers/samaneri-jayasara) | luminary | 8 | 0 | 1 | 2 | email |
| Insight Timer | 248 | [Mark Zelinsky](http://localhost:3000/healers/mark-zelinsky) | local hero | 9 | 0 | 3 | 4 | form |
| Insight Timer | 252 | [Freya Bennett-Overstall](http://localhost:3000/healers/freya-bennett-overstall) | local hero | 3 | 1 | 4 | 1 | email |
| Insight Timer | 253 | [Yehuda Ashkenazi](http://localhost:3000/healers/yehuda-ashkenazi) | local hero | 4 | 0 | 4 | 1 | email |
| Insight Timer | 254 | [Nola Bloom](http://localhost:3000/healers/nola-bloom) | local hero | 10 | 0 | 6 | 2 | form |
| Insight Timer | 255 | [Rabbi Brian Yosef Schachter-Brooks](http://localhost:3000/healers/brian-yosef-schachter-brooks) | local hero | 11 | 1 | 4 | 3 | email |
| Insight Timer | 258 | [Ryan T. Schmidt](http://localhost:3000/healers/ryan-t-schmidt) | local hero | 8 | 0 | 3 | 2 | form |
| Insight Timer | 259 | [Jaime Tan](http://localhost:3000/healers/jaime-tan) | local hero | 11 | 0 | 2 | 2 | form |
| Insight Timer | 261 | [Marysol Ximenez-Carrillo](http://localhost:3000/healers/marysol-ximenez-carrillo) | local hero | 8 | 0 | 3 | 2 | email |
| Insight Timer | 262 | [Beth Bradford](http://localhost:3000/healers/beth-bradford) | local hero | 9 | 0 | 2 | 2 | form |

## FLAGGED: owner decisions

All of these are on dev unless marked "held". Each plan's `sprint.flags` has the researcher's full notes; the appendix lists them all.

### Hub and tier calls

1. **IMS hub tier.** It is Luminary by editorial stature, with Superhero as the alternative.
2. **Raised by editorial stature.** Please confirm Russ Hudson (Luminary) and Joseph Goldstein (Luminary). Goldstein has no personal accounts, so his counted followers are 0.
3. **Could be raised by editorial stature, but left as counted:**
   - Guo Gu: three Shambhala books, Sheng Yen's attendant.
   - Acharya Shunya: three Sounds True books, head of a Vedic lineage.
   - Julian Daizan Skinner: the first English Rinzai roshi, founder of Zenways.
   - Eric Zimmer: a HarperCollins author whose podcast claims 75M downloads.
4. **Nandhiji is Superhero (about 4.4M, mostly 3.8M on YouTube).** His views look small for that many subscribers, which may mean bought growth. His music pages make kinesiology "calibration" and healing claims; no music is listed.
5. **Sah D'Simone is Superhero only with TikTok counted.** The 566K TikTok figure was read from data built into the page. Without it he would be Luminary.
6. **Near the 80k–150k line:**
   - Pat Divilly is Luminary at about 105k, most of it Instagram from his earlier fitness career.
   - Sarah Hall is Luminary at about 145k.
   - Samaneri Jayasāra is Luminary on a 241K YouTube channel that is mostly her reading other teachers' texts.

### Political and conspiracy checks (held, not inserted)

7. **Kerri Kelly (Esalen 244)** is held: her about page calls her work "an embodied political practice".
8. **Steven Webb (Insight Timer 195)** is held: he is a serving Truro and Cornwall councillor and a former Mayor of Truro.
9. **Rachel Ricketts (Insight Timer 204)** is held: her site and offerings centre racial-justice activism. She would be Luminary at about 192k.
10. **Catherine Ingram (Insight Timer 243)** is held: her "Facing Extinction" page says she was "propagandized into climate hysteria". Her site says she co-founded IMS.
11. **On dev but worth a look:**
    - Josh Korda: a quote about "the resistance" on the Dharma Punx NYC home page.
    - Cuong Lu: an open letter to Vietnam's party leader about the repression of Buddhists.

### Strict health rule: borderline calls kept on dev

Each was kept because nothing is *sold* on a condition; the condition items are left out.

12. **Recovery and addiction:**
    - Walt Opie: Buddhist addiction recovery, with all recovery items left out.
    - Josh Korda: his own addiction story.
    - Eric Zimmer: his podcast menu has "Anxiety & Depression" and "Addiction & Recovery".
    - Fred Haas: the bio mentions recovery coaching; you may want that sentence dropped.
13. **Trauma or healing framing:**
    - Sah D'Simone: Somatic Activated Healing.
    - Francie La Flow: a voice healer.
    - Jenna Pfingston: "Embodied Somatic Therapy".
    - Stephan Pende Wormland: his mentoring page names depression and anxiety, and his wife's work is plant medicine.
    - Pavlina Nehrebecki: "trauma-informed care".
    - Desirée Dunbar: "Violet Healing".
14. **Condition statistics or topic lists on their sites:**
    - Stuart Sandeman: app pages lead with anxiety and pain statistics.
    - Katharine Chestnut: "abuse recovery" and "stress/anxiety" topics.
    - Nola Bloom: one ritual for anxiety, one for digestion.
    - Ryan T. Schmidt: a resources page lists anxiety, insomnia, pain and blood pressure.
15. **Their own past told on an About page, not sold:** Sarah Hall, Jordyn Roe, Marysol Ximenez-Carrillo and Julie Ela Grace.
16. **Clinical background, but the work is described as non-clinical:**
    - Charles Freligh: clinical psychology PhD.
    - William Cooper: a licensed counsellor whose groups are "not psychotherapy".
    - Mel Collins: counsellor, prison substance-misuse background.
    - Melinda Quesenberry: a therapist on Psychology Today, while her own site calls it coaching.
17. **Plant medicine nearby:** Gaia Hope Good trained in Amazonian plant-medicine traditions, but nothing like that is offered.

### Contact routes

18. **A centre's general inbox used as the contact:** Joseph Goldstein (IMS front office) and Mark Nunberg (Common Ground). Both founded those centres.
    - Shelly Graf (IMS 20) was skipped with the same Common Ground inbox because she co-leads it but didn't found it.
    - Narayan Helen Liebenson, Matthew Hepburn and Chas DiCapua would also qualify if centre inboxes count.
    - Please give one rule.
19. **Emails found behind buttons or decoded:**
    - Guo Gu: behind an "Email a question" button.
    - Rabbi Brian Yosef Schachter-Brooks: decoded from hidden text.
    - Yehuda Ashkenazi: only behind a Linktree icon.
    - Cara Lai and Samaneri Jayasāra: decoded.
    - Earlier rule: decoded emails count as published.
20. **Old or uncertain addresses:** Yong Oh's email is from a 2024 retreat-centre team page.

### Names and couples

21. **Couples.** Devon Hase teaches with nico Hase, and Dennis & Kathy Lang are one listing (held, not inserted). Do you want "Devon & nico Hase"?
22. **Names:**
    - Jessbeinspired: her surname, Prestia, comes from a retreat-site page.
    - Ajahn Canda: IMS calls her "Venerable Canda".
    - Rabbi Brian Yosef Schachter-Brooks: "Rabbi" kept in the display name.
    - Melinda Quesenberry: brand Inner Shift.
    - MC Brigitte Schrottenbacher: "MC" kept.

### Quality and activity

23. **Thin or quiet:**
    - Yong Oh: just 3 items.
    - Rachel Lewis: no offerings, and her site dates from 2021–22.
    - Fred Haas and Lyndsay Toensing: 4 items each.
    - Renee Sills: 4 items.
    - Whitney Durrant: may have stopped teaching; uploads about 4 years old, and her surname may have changed.
    - Amy Elizabeth Bost: uploads 5 years old, but her booking calendar is live.
    - Jocelyn Valencia: no paid offerings.
    - Lee Papa: no videos.
24. **Hacked site.** MC Brigitte Schrottenbacher's home page shows casino spam, so her listing links only to clean pages. A flood has also damaged her retreat centre.
25. **One confirmed photo only:** about 15 teachers, including Joseph Goldstein, Rebecca Bradshaw, Ajahn Canda, Kristina Baré, Yong Oh, William Cooper and Mark Zelinsky.
26. **Shared IMS programme links.** IMS uses one page for all Forest Refuge months and shared IMS Online courses. Ingest adds each link only once, so these teachers lost their IMS offering:
    - Devin Berry, Tara Mulay, Jill Shepherd, Mark Nunberg, Rachel Lewis, Bart van Melik, Bhante Buddharakkhita, Ajahn Canda and Kristina Baré.
    - They could be linked by hand, or ingest could allow a shared offering link.
27. **AI product.** Renée Rotkopf sells Stellarmuse, an AI astrology chatbot. Do you want AI products listed?
28. **Joseph Goldstein's book** *Mindfulness: A Practical Guide to Awakening* went in under him. Its title is close to a Jon Kabat-Zinn book (id 349); they are different books.
29. **Ekta Bathija's book.** Ingest warned that her *I: Ko'Ham Drishti* has the same title as Justin Perry's book 40. That is the known false match on the text before the colon; they are different books and both are correct.
30. **Dustin DiPerna.** Insight Timer was taken out of his teaches_at.

## Held plans (written, not inserted)

| Teacher | Source | Why held |
|---|---|---|
| Kerri Kelly | Esalen 244 | political check |
| Steven Webb | Insight Timer 195 | political check (serving councillor) |
| Rachel Ricketts | Insight Timer 204 | political check |
| Catherine Ingram | Insight Timer 243 | climate-conspiracy page |
| Dennis & Kathy Lang | Insight Timer 265 | passed every check, but the run stopped at 100; first in for the next sprint |

The plans are in each sprint's `dropped/` folder, except Dennis & Kathy Lang, which is in `docs/content-audits/dennis-and-kathy-lang.json`.

## 5 random localhost links

- http://localhost:3000/healers/joe-stuczynski
- http://localhost:3000/healers/gaia-hope-good
- http://localhost:3000/healers/fred-haas
- http://localhost:3000/healers/cara-lai
- http://localhost:3000/healers/mark-nunberg
- Hub: http://localhost:3000/healers/insight-meditation-society

All six returned 200 on localhost against dev.

## Not listed (110 skipped or dropped, plus the 4 held above)

"Dropped" means a plan was written and then pulled; it is kept in that sprint's `dropped/` folder. Full reasons are in each sprint's `skipped/` folder.


### Health rule (60)

| Source | # | Teacher | Reason |
|---|---|---|---|
| Commune | 28 | Jennifer Partridge | dropped, plan kept. Strict health rule: |
| Commune | 29 | Paul Denniston | Grief-led throughout: |
| Commune | 33 | Pedram Shojai | Most of his work fails the health rule: |
| Commune | 34 | David Kessler | His work is almost entirely grief support, which the brief treats as condition framing: |
| Esalen | 241 | Andrew Holecek | No email or contact form could be confirmed: |
| Esalen | 253 | Toni Cupal | Her main work is Ninniku Okyū (garlic moxibustion) treatments at Healing Cultures, a treatment practice priced per day whose Benefits page lists cancer, infertility, depression, chronic pain and many other conditions it works… |
| IMS | 9 | Bob Stahl | dropped, plan kept. Strict health rule: |
| Insight Timer | 127 | Destiny Marie Love | Work is sold mainly on nervous-system healing: |
| Insight Timer | 130 | Christian Thomas | dropped, plan kept. Strict health rule: |
| Insight Timer | 134 | Caroline Stewart | dropped, plan kept. Health rule: |
| Insight Timer | 136 | Sandra Rea | dropped, plan kept. Strict health rule: |
| Insight Timer | 138 | Johanna Burkhardt | dropped, plan kept. Strict health rule: |
| Insight Timer | 144 | Camilla Sacre-Dallerup | dropped, plan kept. Strict health rule: |
| Insight Timer | 149 | James Cole | Health rule: |
| Insight Timer | 150 | Jerri Doran | dropped, plan kept. Strict health rule: |
| Insight Timer | 151 | Shilpa Mukerji | Too thin and partly sold on conditions: |
| Insight Timer | 154 | Zvi Ish-Shalom | Strict health rule: |
| Insight Timer | 156 | Eric Brumett | Strict health rule: |
| Insight Timer | 158 | Bruce Cohn | Too thin and medical-intuitive: |
| Insight Timer | 161 | Natalie Brown | Strict health rule and fit: |
| Insight Timer | 162 | Chibs Okereke | Strict health rule: |
| Insight Timer | 163 | Bree Melanson | Strict health rule: |
| Insight Timer | 164 | Michelle Chalfant | Strict health rule: |
| Insight Timer | 169 | Niamh Devine (Mythological Goddess) | Strict health rule: |
| Insight Timer | 171 | Susie Sands | Strict health rule: |
| Insight Timer | 172 | Sal Worringham | Strict health rule: |
| Insight Timer | 173 | John Bruna | Strict health rule: |
| Insight Timer | 174 | Lee Ann Dzelzkalns | Strict health rule: |
| Insight Timer | 179 | Jere Friedman | Strict health rule: |
| Insight Timer | 185 | Michelle Cervantez | Her only website is Hendo Care Farm (hendocarefarm.com), a therapeutic care-farm brand she co-owns whose equine programme page sells its work on conditions (says horse work is effective for depression, anxiety, PTSD, ADHD,… |
| Insight Timer | 186 | Mouse Savaiano | Strict health rule: |
| Insight Timer | 187 | Being in Beauty | Strict health rule: |
| Insight Timer | 188 | Sheena Andrea | Anahata Rising runs ayahuasca (plant medicine) ceremony retreats sold on releasing stored trauma, which falls under the plant-medicine and strict health rules (as with earlier plant-medicine skips); |
| Insight Timer | 190 | Peruquois | Strict health rule: |
| Insight Timer | 191 | Sharon Mundy | Her site's pranayama page sells breathwork on conditions (PTSD symptoms, anxiety, high blood pressure, smoking cessation, immunity), so she falls under the strict health rule; |
| Insight Timer | 192 | Amber Love | Her site sells classes on conditions (aerial yoga promoted as a benefit for anxiety and depression, meditation for lowering blood pressure, a 'Yoga for Anxiety & Depression' credential), so she falls under the strict health rule; |
| Insight Timer | 194 | Fleur Chambers | dropped, plan kept. Strict health rule: |
| Insight Timer | 196 | Burgs (The Art of Meditation) | Strict health rule: |
| Insight Timer | 201 | Ariel Hardy | Health rule: |
| Insight Timer | 202 | Sabrina (Sabrina the Oracle) | Health rule: |
| Insight Timer | 209 | Leslie Riopel | Health rule and not mainly a teacher: |
| Insight Timer | 213 | Louisa Tanner Munson | dropped, plan kept. Strict health rule: |
| Insight Timer | 215 | Don Reed Simmons | Strict health rule: |
| Insight Timer | 218 | Vivienne Gerard | Strict health rule: |
| Insight Timer | 219 | Rachel Fearnley | Strict health rule: |
| Insight Timer | 220 | Alyssa Chanelle | A product brand rather than a teacher: |
| Insight Timer | 221 | Zawadi Nyong'o | Strict health rule: |
| Insight Timer | 228 | Beth Budesheim Kaoihme | Strict health rule: |
| Insight Timer | 229 | Gavin Flanagan | No working contact route: |
| Insight Timer | 231 | Eileen Rose Miles | Strict health rule: |
| Insight Timer | 234 | Elizabeth Pyjov | Strict health rule: |
| Insight Timer | 239 | Heceliza Perez | Strict health rule: |
| Insight Timer | 244 | Amita Schmidt | Health rule: |
| Insight Timer | 245 | Lisa Venable | Too thin and near the health rule: |
| Insight Timer | 249 | Kelly Smith | dropped, plan kept. Strict health rule: |
| Insight Timer | 250 | Michelle Alva | Strict health rule: |
| Insight Timer | 256 | Kali Basman | Strict health rule: |
| Insight Timer | 260 | Emma Mumford | Strict health rule: |
| Insight Timer | 263 | Fallon Stone | Strict health rule: |
| Insight Timer | 264 | Sarah Dubow | Strict health rule and too thin: |

### No contact route (27)

| Source | # | Teacher | Reason |
|---|---|---|---|
| Commune | 31 | Briohny Smyth | No published email or contact form: |
| Esalen | 237 | Max Gaenslen | Too thin for a proper page: |
| Esalen | 249 | Marianne Murray | No personal website, no published email and no contact form of her own could be found (only the Esalen and retreat.guru teacher pages), and she has no books, no YouTube channel and only one podcast interview, so there is too… |
| Esalen | 251 | Adam Clark | No website, no published email and no contact form of his own could be found (only an Instagram account with about 750 followers, and the Ecstatic Dance SLO listing points to a different organiser's site), and beyond his one… |
| Esalen | 254 | Caitlin Wild | No website, published email, contact form or social accounts could be found for her, she is guest faculty on Mark Nicolson's Esalen workshop rather than its lead, and her hub bio frames her work partly around plant medicines… |
| IMS | 16 | Chas DiCapua | No contact route: |
| IMS | 17 | Greg Scharf | No contact route: |
| IMS | 18 | Matthew Hepburn | No contact route: |
| IMS | 19 | Narayan Helen Liebenson | No contact route: |
| IMS | 20 | Shelly Graf | No contact route: |
| IMS | 21 | Winnie Nazarko | No contact route: |
| IMS | 22 | Andrea Fella | No contact route: |
| IMS | 23 | Annie Nugent | No contact route: |
| IMS | 27 | bruni dávila | No contact route: |
| IMS | 28 | Carol Wilson | No contact route: |
| IMS | 29 | Caroline Jones | No contact route: |
| IMS | 31 | DaRa Williams | No contact route: |
| IMS | 32 | Deborah Helzer | No contact route: |
| IMS | 33 | Guy Armstrong | No contact route: |
| IMS | 37 | Nakawe Cuebas Berrios | No contact route: |
| IMS | 38 | Nolitha Tsengiwe | No contact route: |
| IMS | 39 | Sally Armstrong | No contact route: |
| IMS | 40 | Sayadaw U Jagara | No contact route: |
| Insight Timer | 212 | Daiun Jōshin (大雲浄心) | Too thin: |
| Insight Timer | 222 | Thomas J Bushlack | No working contact route of his own: |
| Insight Timer | 225 | James Michael Corrigan | No published email and no contact form: |
| Insight Timer | 227 | Enda Quealy | His site (endaquealy.com) now sells one-to-one high-performance work for founders, billed as 'not coaching, not therapy', rather than spiritual teaching, and it publishes no email and no contact form, only a bookme.name… |

### Too thin (10)

| Source | # | Teacher | Reason |
|---|---|---|---|
| Esalen | 246 | Adam Baraz | Too thin and mainly therapy: |
| IMS | 26 | Bonnie Duran | dropped, plan kept. Too thin: |
| Insight Timer | 140 | Bhante Bodhicitta | Too thin for a full page: |
| Insight Timer | 152 | Hannah Devries | Too thin: |
| Insight Timer | 197 | Johnny Scifo | Too thin: |
| Insight Timer | 207 | Mirelle Gunn-Fevang | Too thin: |
| Insight Timer | 210 | Edo & Jo | A mantra music duo rather than a teacher: |
| Insight Timer | 224 | Deva Vasuda | Too thin and not teaching now: |
| Insight Timer | 235 | MysticAly | dropped, plan kept. Not listed: |
| Insight Timer | 247 | Adele Satori | Too thin: |

### Fit (music, brand, coach, not teaching) (11)

| Source | # | Teacher | Reason |
|---|---|---|---|
| Commune | 32 | Jeff Krasno | Commune's co-founder and podcast host rather than a teacher, and his own writing carries partisan political commentary (Substack 'Middle Way' essays such as 'What Made America Great', Sept 2026, critical of the Trump… |
| Insight Timer | 132 | Sandeep Khurana | Music project rather than a teacher: |
| Insight Timer | 155 | Jo-Anne Mac Millan | No longer teaches as a spiritual teacher: |
| Insight Timer | 167 | Garth Stevenson | A composer and double bassist rather than a teacher: |
| Insight Timer | 177 | Natalie Eve Marquis | No longer works mainly as a spiritual teacher: |
| Insight Timer | 180 | Katie Wise | A music act rather than a teacher: |
| Insight Timer | 208 | Kathryn Overall | No longer teaching for now: |
| Insight Timer | 238 | Kylee O'Donnell | Mainly a flutist and musician rather than a teacher: |
| Insight Timer | 240 | Lydia Baksh | Mainly a singer-songwriter: |
| Insight Timer | 251 | Devon Kerns | dropped, plan kept. Fit: |
| Insight Timer | 257 | Ipek Williamson | dropped, plan kept. Fit: |

### Plant medicine (2)

| Source | # | Teacher | Reason |
|---|---|---|---|
| Esalen | 252 | Glauber Loures de Assis | His work is mainly plant-medicine and psychedelic framed (Santo Daime community founder, 600+ ceremonies, Psychedelic Parenthood Community, Kura Alliance on sacred plant traditions and psychedelic science), and his only Esalen… |
| Insight Timer | 170 | East Forest | A music project (Krishna-Trevor Oswalt's artist name) rather than a teacher listing: |

## Appendix: researcher flags for the 100 on dev (583)

**Dr. Raj Balkaran** (`raj-balkaran`)

- Name kept as 'Dr. Raj Balkaran', as he presents himself on his site and school (he is widely called 'Dr. Raj'); his doctorate is in religion.
- Instagram and YouTube accounts are branded The Indian Wisdom School / The Indian Wisdom Podcast; they are his own one-teacher school, so they were counted and linked. Facebook and X counts could not be read.
- No email is published (the only address on his site is a 'user@domain.com' form placeholder); the contact form on rajbalkaran.com is used.
- Both photos look heavily retouched or AI-enhanced studio portraits; they match each other and the Esalen page, but a human may want to check.
- Goddess Stories is marked 'free for a limited time'; it may become paid.
- Life Guidance sessions use coaching framing (he holds ICF certification); kept because the work is rooted in Indian wisdom texts and makes no health claims.

**Russ Hudson** (`russ-hudson`)

- Tier raised from local_hero to luminary by editorial stature; the owner should confirm. Facebook and X counts (main accounts) could not be read.
- The Enneagram is not in the subject list; spirituality, meditation and consciousness were used as the nearest fit.
- He is in docs/content-audits/the-shift-network-faculty.json (six courses, activity 'older') and his own site lists Shift Network on-demand courses, but Shift pages returned 403 to curl and no current Shift programme was confirmed, so the-shift-network is not added to teaches_at.
- No email is published; the contact form on russhudson.com is used.
- Most videos are on other channels (interviews and talks where he is the main speaker); his own channel holds a handful of short clips.
- Possible overlap with co-authors A. H. Almaas and Sandra Maitri (Keys to the Enneagram) if they are or become listings.

**Catherine Wilde** (`catherine-wilde`)

- Mainly a self-care and parenting life coach for mothers; spiritual teaching is light (meditation and gentle yoga within mom self-care). A human should decide whether she fits Spiritpedia.
- Her site and YouTube lean heavily on 'anxious mom to calm mom' framing; listing text avoids that wording.
- Only one usable photo (Insight Timer profile); the site's about photo shows her with a baby, so it was not used.
- Insight Timer bio could only be partly quoted via WebFetch; bio check relied mainly on her own site pages.

**Joshua Canter** (`joshua-canter`)

- Email is on his company domain (TrueNatureEducation.com) but is his named address, published on his own contact page.
- Videos come from the auto-generated 'Joshua Canter - Topic' YouTube channel (distributor uploads of his Mindfulness Now album); there is no channel he runs himself.
- Only one usable photo (Insight Timer profile); the photos on his about page are of his teachers.
- The Art of Presence is a dated series (remaining sessions 7 Nov and 5 Dec 2026); recheck after December.
- Insight Timer bio could only be partly quoted via WebFetch; bio check relied mainly on his own site pages and the museum page.
- Also appears as 'Joshua Cantor' on the Sivananda Bahamas ashram site.

**Michael and Jahna** (`michael-and-jahna`)

- Mainly a musician duo (Grammy for-your-consideration page on their site, albums, film soundtrack); kept because their work is guided sound baths and mindfulness practice with a certified mindfulness facilitator, but a human may want to judge the fit.
- Couple listed as one entry under the name they use, Michael and Jahna; photos show both of them together (not one person), as is their public image.
- The YouTube link in their site footer (@michaelandjahna8386) returns 404; their active channel is @michaelandjahna444 (found by search, clearly theirs from the Sonic Sunday uploads).
- Insight Timer bio: WebFetch quoted only the first sentence; the bio check relies on their own site pages plus that sentence.
- Some customer testimonials on their home page mention insomnia; none of that is used in the listing.

**Marisa La Fata** (`marisa-la-fata`)

- Much of her framing is recovery and codependency (podcast and workbook titled 'From Codependency to Authenticity', 'woman in recovery since 2008', past work in rehabs); listing kept on her Toltec, shamanic breathwork and meditation work, but a human may want to judge the fit.
- Her Shamanic Breathwork info page says addictions are sometimes transformed in the process; that page is not linked (the retreat page linked instead does not say this).
- Instagram count could not be read without logging in.
- Session price is not published on her site or the Cal.com page; set to Contact for pricing.
- The about page's mailto link uses marisa@healwithalchemy.co (missing the m); the contact page shows Marisa@healwithalchemy.com, which is used.

**Sara Clark** (`sara-clark`)

- Thin listing: her site is a two-page brochure with no offering pages of its own (private sessions, retreats, speaking, corporate work and brand partnerships are listed but not bookable), so there are no offerings; items are YouTube videos plus the Insight Timer link and her Substack.
- Mostly a vinyasa yoga and wellness presenter (brand partnerships, fitness media); the spiritual side is meditation, breath and her 'mother, mystic' Substack. A human may want to judge the fit.
- Location unclear: Insight Timer says New York, but her Substack describes life on an island and her site names no base, so availability is set to worldwide with no city.
- Email is a Gmail address published on her contact page.
- The site photo (LalunaShoot_closeup) matches her Insight Timer and YouTube photos but carries no caption; fairly confident it is her.
- Insight Timer bio: WebFetch quoted only the first sentence; the bio check relies on her own site and Substack pages.

**Keith Parker** (`keith-parker`)

- Email info@fielddynamicshealing.com is the Field Dynamics brand inbox (shared with co-founder Christabel Armsden).
- Field Dynamics is run with Christabel Armsden; YouTube, Instagram and Facebook are the shared brand accounts, and trainings are co-taught. Possible duplicate if she is listed separately.
- Private sessions left out: the sessions page lists anxiety and 'support for physical healing, alongside medical care' among areas it helps with.
- Location: Insight Timer says Miami, FL, but the site names no base for in-person sessions, so availability is worldwide with no city.
- Amazon: curl returned the /dp/B0DWH9XVYL page (title confirms Keith Parker, ISBN-13 9798309099580); WebFetch on the same page agreed.
- Insight Timer bio: WebFetch quoted only the first sentence; the bio check relies on his own site pages.

**William Donius** (`william-donius`)

- Much of his work is corporate ideation and leadership training (Right Brain Institute); the spiritual side is the Esalen intuition workshops and the book's personal chapters, so a human may want to confirm he fits the directory.
- His Esalen programme on 16 to 18 April 2027 is co-led with guest faculty Lori Sheridan, who is queue rank 248; they are separate listings, not a pair.
- X follower count for @bdonius could not be read, so the tier rests on a 17-subscriber YouTube channel; he is a New York Times best-selling author, which the owner may weigh.
- Only one photo could be confirmed (the Esalen portrait; the wide Esalen image is a crop of the same shot).
- An old speech titled 'America is in Default' (2010, on another channel) is the only political-sounding title found; it is not on his own channel and his output is otherwise about creativity and intuition.

**Ulrika Engman** (`ulrika-engman`)

- Instagram and Facebook are under her Yoga Journeys brand, but both name her (Instagram profile 'Ulrika Engman', Facebook 'Yoga Journeys with Ulrika'), so they were counted as hers.
- Her work is largely yoga travel through her company Yoga Journeys; she leads all the yoga on each trip, but a human may want to confirm the fit.
- Only one photo could be confirmed (the Esalen portrait; the wide Esalen image is a crop of the same shot and her site has no headshot).
- City set to Calistoga, where she teaches weekly at Solage; her bio says only that she lives in the Napa Valley.
- The Esalen programme blurb mentions tapping and 'movement medicine'; no condition is named, so it was kept.

**Zuza Engler** (`zuza-engler`)

- Pairing: both Esalen programmes are co-led with her husband Scott Engler (rank 227), who was skipped because his own practice is clinical craniosacral and birth-trauma work; she is listed on her own work (Soul Motion, Open Floor, Moving with Life), and Scott appears only in her bio and offering descriptions.
- Email angel@zuzaengler.com is an assistant or support inbox (the 'Email us' link on her schedule page, also given on the Esalen programme page for CE questions); her site's contact form is at /contact.
- Her work carries a therapeutic thread (Gestalt, CE credits for therapists, a 'Healing Trauma' blog category, an anxiety masterclass), but the bulk of her classes, courses and channel are conscious dance and awareness practice, so she was kept; a human may want to confirm.
- Facebook follower count could not be read.

**Alex Halenda** (`alex-halenda`)

- Her Esalen programme (5 to 9 April 2027) is co-led with Jet Eveleth, who is not in the queue.
- Her hub bio lists a Trauma-Informed Yoga certificate; it was left out of the bio under the health rule.
- The second photo is a side-on practice shot from her site (served as WebP); same tattoos and hair as the Esalen portrait.
- Facebook page 'Alex Halenda: Beyond Yoga' describes her as yoga teacher and studio manager; her site names Kinship Yoga as her home studio, so studio details may have changed.

**Jeffrey S. Reid** (`jeffrey-s-reid`)

- Email wudangsantacruz@gmail.com is the school's inbox (published on the contact page); the site also has a mailto link to wudangzihe@gmail.com, which looks personal but is not shown as text, so the school address was used.
- His Esalen programme is co-led with Simon Cox, who is already live on Spiritpedia (simon-cox.json, rank 220) and likely lists the same workshop; possible duplicate offering across the two listings.
- Social accounts are the school's (Wudang Santa Cruz), counted because the school is his own and the Instagram account is in his name.
- Taiji 13 and Taiji 28 are form demonstrations on the school channel (6 to 8 minutes) rather than spoken teaching; a human may prefer to drop them.
- Beyond Theory is a podcast from The Meadows, an addiction-treatment centre; the episode itself is about Daoist ancient wisdom, so it was kept.
- Second photo (sword form in the Siwa Oasis, Egypt, from his teacher page) matches the Esalen headshot but is an action shot, not a headshot.
- Esalen spells his first name both Jeffrey and Jeffery; his own site uses Jeffrey.

**Lori Sheridan** (`lori-sheridan`)

- Her Esalen weekend is led by William Donius (queue rank 236, still todo) with Lori as guest faculty; whoever researches Donius will likely list the same programme, so the offering may be skipped as already in for one of them.
- Her work centres on readings that connect people with loved ones who have died, and she facilitates retreats for the bereaved with the Forever Family Foundation; grief is not named in any item, but a human may want to check the fit with the health rule.
- All videos are on host channels (podcasts and a Lily Dale show) where she is the guest; the 5 Tips video is shared with the medium Laura Wooster.
- Esalen's hub page header shows williamdonius.com next to her name; that is the co-leader's site, not hers.

**Robert MacPhee** (`robert-macphee`)

- His work is mainly leadership development, executive coaching and values clarification for individuals and companies rather than spiritual teaching in a lineage; listed under life-coaching, soul-purpose and manifestation, but a human may want to confirm the fit.
- Follower counts for X and Facebook could not be read without logging in; an Instagram @robertmacphee (246 followers) exists but is not linked from his sites, so it was not used or counted.
- Esalen's image files spell his name McPhee; his own sites and books use MacPhee.
- Email robert@excellentdecisions.com is on his Excellent Decisions site; Values Based Life (valuesbasedlife.com) is used as the website as it carries his current courses.

**Suzanne Sterling** (`suzanne-sterling`)

- Also on The Shift Network faculty list (the-shift-network-faculty.json, course 'Create Healing Rituals to Release Trauma & Invoke Joy, Empowerment & the Sacred', older); the-shift-network added to teaches_at. That course title is trauma-framed and is not listed here.
- Possible overlap: the Commune course is shared with Seane Corn (already listed) and Hala Khouri (rank 25, skipped); its Day 7 session by Hala Khouri is titled 'How Trauma Shapes Us'. The course sits in Commune's Impact category, not Health, and Suzanne's own days are about voice and action, so it is kept; a human may prefer to drop it.
- The Commune course is social-activism themed (justice, leadership, 'systems'); I judged it non-partisan. Her own Action page uses similar language.
- City set to Oakland: her site gives no home address, but her regular in-person teaching is in the Bay Area (Embodied Singing series in Oakland, Globe Institute classes in Sausalito, concerts in Berkeley).
- Her site describes her as 'a respected expert on sound and sound healing' and she is on faculty at the Globe Sound Healing Institute; sound-healing is used as a subject for her voice work, but the Globe certificate classes (sound therapy) are not listed.
- Voice of Change and Art of Ritual online courses are marked 'coming in 2025' on her site and do not exist yet; the mentorship 'Learn More' link (/mentorship) is a 404, so the mentorship items point to the Voice of Change and Art of Ritual pages.
- She is also a recording artist (five albums, kirtan); concert and music-only videos are left out.

**Murray Hidary** (`murray-hidary`)

- Tier borderline: ~88k on personal accounts (80k–150k band). MindTravel is his own one-person project; if its Facebook (61.8k) and YouTube (1.64k) count, the total is ~152k and he would be luminary. Queue marks him big_name: owner to decide.
- Email is the MindTravel brand inbox (info@mindtravel.com, published on the contact page); booking@mindtravel.com is also published on the home page.
- Also on The Shift Network faculty list (the-shift-network-faculty.json, course 'The Freedom Frequencies', older); the-shift-network added to teaches_at.
- Fit check: MindTravel is largely a music/concert project, but he personally teaches Vedic Meditation (mantra initiation and classes) and guided walking meditation, so he is listed as a teacher. Facebook link is the MindTravel page (no personal page found).
- The Vedic Meditation page header says 'reduce stress & anxiety'; the course itself is about mantra meditation and rest, so it is kept with a description that names no condition (borderline, human may drop).
- The concerts are listed as one undated recurring offering (product_type retreat) pointing at the events page; ticket prices sit on Eventbrite per date.
- Availability set to worldwide: he tours the US and teaches online and in Miami, New York and Los Angeles, with no single stated base.
- Two of the videos are guided meditations from the auto-generated 'Murray Hidary - Topic' channel (his album tracks).

**Noah Mazé** (`noah-maze`)

- Commune classes (Yoga Strong, Yogamazé) are membership-only; no Commune course page exists in the catalogue, so no Commune offering is listed. teaches_at commune is kept.
- Tier rests mostly on the Facebook page 'Noah Mazé Yoga' (211k), which carries his name but describes his school; without it he would be local_hero (~26k).
- Email is the school's iCloud inbox (themazemethod@icloud.com), published on the course pages and answered by Tracy Mazé; the site's Contact page itself has only a form.
- Location unclear: his events page says 'At home in Boulder' while his bio says he lives in Los Angeles; availability set to worldwide (online school plus travelling workshops, no regular local class found).
- His bio names him as Esalen faculty; he is not in esalen-faculty.json, so Esalen is not added to teaches_at.
- Yoga Strong 'Back to School' was live on 1-3 Sep 2026 and is now sold as an ongoing recorded series; kept undated.
- Co-founder of the school is his wife Tracy Mazé; the 200-hour training is co-taught with Nichol Chase. One listing for Noah.
- Videos are thin on his own channel (mostly promos under 2 minutes); the list uses Wanderlust and podcast appearances where he is the main speaker. No free resources found.

**Day Schildkret** (`day-schildkret`)

- Tier is borderline (~103k): almost all of it is the @morningaltars Instagram and Facebook accounts, which carry his practice name rather than his own; I counted them because Morning Altars is his own one-person art and teaching practice and he posts there in his own voice. Without them he would be local_hero (an @dayschildkret Instagram with 2,922 followers exists but is not linked from his site, so not counted or linked).
- Only one usable photo (YouTube avatar, a selfie); the site's bio image shows him from above with his face hidden, and Esalen shows no headshot for him.
- Availability set to worldwide: his contact page says only 'California, United States' (older press places him in Richmond, East Bay) and his regular teaching is online or at venues, so no city was recorded.
- His website is morningaltars.com (dayschildkret.com redirects there; www.dayschildkret.com does not resolve).
- Grief is a main theme of his work (a Grief Ritual Series, grief-focused interviews); I treated grief as a life transition rather than a condition but left the grief-titled items out to be safe; a human may want to check.

**Dustin DiPerna** (`dustin-diperna`)

- His own website could not be read: dustindiperna.org (the hub's link) shows a Wix 'connect your domain' error, and dustindiperna.com drops the connection. The email comes from a visible 'Email Me' link on his Esalen teacher page on the hub's booking site (retreat.guru), not from his own site.
- Added insight-timer to teaches_at: he has a public Insight Timer profile with two free talks.
- No own YouTube channel: all videos are talks or interviews on other channels where he is the main speaker; two Bright Alliance videos are from the organisation he is associated with.
- Tier local_hero with very low readable counts; a human may consider editorial stature (Stanford adjunct, long association with Ken Wilber) but I did not raise it.
- Instagram @dustindiperna (display name 'Dustin', 1,029 followers) is probably his but not linked from anything I could open, so not listed.
- insight-timer taken out of teaches_at in review: he is not in insight-timer-faculty.json (as with earlier plans); his Insight Timer profile and free talks stay as free resources.

**Micha Merrick** (`micha-merrick`)

- Thin listing: no videos, books or free resources; items are her two Esalen programmes (counted once for thinness), the Herbal Clearing Ritual session and her practitioner training, so she only just reaches ~3.
- Health-claim borderline: four of the six session types on her own Healing page are reproductive-health oriented (Herbal Fertility Session, Womb Ritual, Prenatal, Postnatal Healing), and her Spirit Weavers profile mentions fertility and menopause work. I left all of those out; her Esalen programmes, classes and the Herbal Clearing Ritual are ritual and seasonal rather than condition-led, so I judged her work not mainly condition-based. A human may disagree.
- Only one usable photo (Esalen headshot); the photos on her own site show her hands or body without her face.
- Queue entry had no website; her site michamerrick.com was found via her Spirit Weavers Gathering profile.
- Rights of Spring is a five-day programme, but the Esalen page's static rate table shows the same $940 'from' figure as weekend programmes (live prices load from the booking system), so the price may be understated.

**Joseph Goldstein** (`joseph-goldstein`)

- Contact route is IMS's own Retreat Center front-office inbox (rc@dharma.org, written 'rc(at)dharma.org' on the IMS contact page), not a personal address: no personal site, email or form exists (josephgoldstein.net is an unrelated Marietta, GA councillor).
- Tier raised from local_hero (0 counted followers) to luminary on editorial stature as IMS co-founder and major author; owner to confirm.
- role 'founder' used for insight-meditation-society in teaches_at; Sharon Salzberg is already linked as an IMS founder.
- website_url points to his IMS teacher page, as he has no site of his own.
- Only one photo used (IMS hub headshot); the hub's IMG_0469 image is a CD cover, not a photo.
- Videos are on other channels (10% Happier, Be Here Now Network's Insight Hour, IMS) where he is the main teacher; two 10% Happier episodes are conversations with Sam Harris/Dan Harris.
- Seeking the Heart of Wisdom (co-written with Jack Kornfield) is already on Spiritpedia under jack-kornfield (book id 363), so I took it out of this plan; after insert, add joseph-goldstein as co-author there (co_authorships). The Path of Insight Meditation is also co-written with Kornfield and is in this plan.
- Dry run notes a book titled 'Mindfulness…' already under jon-kabat-zinn (id 349); that title-stem match looks like a different book, worth a glance.

**Mark Nunberg** (`mark-nunberg`)

- Email is Common Ground Meditation Center's general inbox (info@commongroundmeditation.org), the centre he co-founded and co-leads; he has no personal site or address.
- website_url is his Common Ground teacher page, as he has no site of his own.
- Tier counts are 0: no personal social accounts found.
- The Forest Refuge offering URL is the shared 2027 schedule page (no page per month); he co-teaches that month with Deborah Helzer (rank 32, skipped for no contact route).
- Common Ground video titles include talk dates; copied as published.
- Possible future hub: Common Ground Meditation Center itself is not on Spiritpedia.
- The dry run skips the Forest Refuge October 2027 offering because the shared Forest Refuge 2027 schedule URL is already in the database (IMS has no per-month page); a human may want to link it to him by hand. He still has 11 videos and 2 free resources.

**Matthew Brensilver** (`matthew-brensilver`)

- Contact is a form on his own site; the page says he is not taking new one-to-one students or teaching invitations but will reply to enquiries.
- Tier counts are 0: no personal social accounts found.
- Availability set to worldwide: he teaches in person at several California centres and online but no home base is published.
- Queue entry had no website; his site matthewbrensilver.org was found via his AudioDharma profile.
- IMS livestream price not yet shown (registration opens 17 Nov 2026), so written as 'Contact for pricing'.
- Books are co-written with Oren Jay Sofer and JoAnna Hardy (possible co-author listings).
- Bio mentions his social work and research background only in passing; his paid work is retreat teaching, not therapy.
- Videos are from Insight Meditation Center's and Against the Stream's channels, where he is the teacher.

**Éowyn Ahlstrom** (`eowyn-ahlstrom`)

- Her home page leans on condition language (anxiety, chronic pain, immune system, 'Starting Place for Healing' quiz) and she is also a licensed massage therapist; her teaching itself (IMS-authorised dharma teacher, weekly insight group, membership, retreats, poetry book) is clean, so she was kept, but a human may want to check the framing.
- No follower counts at all (no linked social accounts or own YouTube channel): tier local_hero on a 0 total.
- Co-teaches the IMS online retreat with Bob Stahl (rank 9), who has his own plan with the same programme URL.
- Videos are podcast interviews on other channels where she is the main guest; she has no channel of her own.
- Book ASIN B08YWLDZZ2 (Kindle) taken from the amazon.com /dp/ link on her own book page; amazon.com returned 500 to curl and WebFetch, so the listing could not be opened directly.

**Tara Mulay** (`tara-mulay`)

- Co-teaches both IMS offerings and Heartstream Sangha with Devin Berry (rank 1 in this sprint, separate plan); not marked as a pair in the queue, so kept as separate listings.
- Her teaching page links further IMS Retreat Center retreats (Heartfelt Wisdom 17–22 Dec 2026, Refuge in Awareness Apr 2027, Natural Clarity May 2027, Sure Heart's Release Aug 2027) but only via events.dharma.org, which was not fetched; the two queue programmes were used instead.
- Her contact page says she is on retreat 17 Oct–21 Nov 2026 and will not answer messages until then.
- Availability set to worldwide: she lives in Western Massachusetts but no regular local class of her own was found; all teaching is at centres or online.
- The dry run skips the Forest Refuge July 2027 offering because the shared Forest Refuge 2027 schedule URL is already in the database (IMS has no per-month page); a human may want to link it to her by hand.
- Only one confirmed photo (IMS headshot); her own site shows no portrait.
- Instagram account has 62 followers and 0 posts; linked from her own site, so kept.
- All videos are on other channels (IMS Daily Dharma, Insight Meditation Center, Sit-Heads, Mission Dharma) where she is the sole teacher.

**Jill Shepherd** (`jill-shepherd`)

- The dry run skips the Forest Refuge February 2027 offering because the shared Forest Refuge 2027 schedule URL is already in the database (IMS has no per-month page); a human may want to link it to her by hand.
- Blue Mountains retreat (8–17 Jan 2027) is marked FULL with a waiting list on her site.
- No follower counts at all: tier local_hero on a 0 total.
- Videos are on other channels (London Insight Meditation, Buddhist Library Sydney) where she is the sole teacher.
- Her site has 'Wise Action' pages on climate and undoing racism; these read as engaged-Buddhist reflection rather than partisan political commentary, so she was kept.
- Contact form used: the only addresses on her site belong to the Auckland Insight group (aucklandinsight@gmail.com) and Kalyanamitta (info@kalyanamitta.nz).

**Cara Lai** (`cara-lai`)

- Email fitzcara@gmail.com is Cloudflare-obfuscated on her shop page (decoded as the brief allows) and sits in the returns note; her Connect page also has a contact form (https://www.caralai.org/connect.html).
- No follower counts readable; she reaches large audiences through the Ten Percent Happier and Hatch apps, which are not her own accounts. Tier local_hero on a 0 total.
- Second photo shows her in a cold river (bare shoulders); it is clearly her, but a human may prefer to use only the IMS headshot.
- Her hub bio and podcast page mention chronic illness (Lyme disease); left out of the bio and items.
- Co-teaches the IMS livestream with Devon Hase (rank 4 in this sprint, separate plan).
- Hatch video 'Meditation for Sleep' kept (sleep as a practice); her other Hatch series is titled 'Meditations for a Racing Mind' and was left out as borderline.
- Videos are on other channels (Ten Percent Happier, Hatch, iBme, Yael Shy) where she is the main speaker.

**Devin Berry** (`devin-berry`)

- No YouTube channel of his own; all eight videos are talks or guided meditations on other channels (Sounds True, Insight Meditation Center, IMS, Insight San Diego, Sit-Heads, Mountain Stream Meditation, SF Dharma Collective) where he is the main speaker.
- Ingest will skip the Forest Refuge March 2027 offering as 'link already in': the IMS hub listing already uses the Forest Refuge Schedule 2027 page URL (for its April 2027 month), and the schedule has no separate page per month. His July 2027 Forest Refuge month (Heartstream Dharma, with Tara Mulay) is on the same page, so it is not listed either.
- Availability set to local_online with Barre, MA as the base: he is an IMS Core Guiding Teacher and lives in Western Massachusetts, but he also teaches retreats all over the US; owner may prefer worldwide.
- Co-teacher Tara Mulay (Heartstream Sangha co-founder, also IMS faculty) may come up later in the queue; Heartstream is listed here as his offering, not as a separate listing.
- Instagram is the only readable count (2,189); his Substack says 'thousands of subscribers' but that is not counted under §17.1.

**Walt Opie** (`walt-opie`)

- Health rule, borderline teacher: a large share of his work is Buddhist addiction recovery (Board President of the Buddhist Recovery Network, co-leads the IMS Insight Recovery Sangha, recovery daylong at IMS, BRN Academy talks). Kept because his YouTube and teaching as a whole are mainly general insight dharma (IMS Daily Dharma, Insight Meditation Center, Gay Buddhist Fellowship, Sacramento Insight core faculty, the 2027 IMS Living Dharma retreat); all recovery items left out. Owner may prefer to skip.
- Email: his Contact page has a mailto link (walt@buddhistpathways.org) with no visible text, so it is not treated as published; the contact form is used instead.
- Availability local_online with Sacramento as base: he is core faculty at Sacramento Insight Meditation (hybrid evenings) but lives in Berkeley, CA.
- No YouTube channel of his own; all videos are talks on other channels (IMS, Insight Meditation Center, Gay Buddhist Fellowship, Kevin Griffin, A Positive Light) where he is the main speaker. Some carry dates in their titles (copied as they are).
- The Dharma Seed archive also includes his recovery talks (12 Steps class series, Dharma & Recovery); the resource description mentions only the general talks.
- The Sacramento sit is a single dated evening (12 Nov 2026); he teaches there regularly but the SIM calendar lists each evening separately.

**Rebecca Bradshaw** (`rebecca-bradshaw`)

- Follower total is 0: she has no public social accounts that could be found, so the tier rests on that.
- Only one photo: her own site's portrait (640 px). The IMS headshot is the same sitting but only 291 px wide, so it was not used.
- Hub programmes are linked through the event pages on her own site, not dharma.org: the Forest Refuge 2027 schedule page is already the IMS hub listing's offering URL (ingest would skip it) and has no page per month, and the April 2027 Retreat Center retreat is only on events.dharma.org, which may not be fetched.
- Prices for the April IMS retreat and her non-IMS retreats are not on the pages read, so they say 'Contact for pricing'.
- Co-teaches March 2027 at the Forest Refuge with Devin Berry (rank 1); same month appears on both plans with different URLs.
- Holds a counselling psychology master's and the IMS page says she is a Licensed Mental Health Counselor; her teaching is dharma, not therapy, so this was left out of the bio.

**Devon Hase** (`devon-hase`)

- Couple listing: devon and nico Hase (formerly Craig Hase) share one website, Instagram, Facebook, two co-authored books, a sangha and most classes. Listed as Devon Hase (the IMS faculty member named in the queue); nico is in the bio, not a separate listing. Owner may prefer 'devon + nico hase'.
- Tier counts the couple's shared Instagram (13K); without it her own readable total is ~0. Either way local_hero. Facebook count unreadable.
- Hub programmes linked through the event pages on their own site: the IMS Online Metta Weekend URL is already the IMS hub listing's offering (ingest would skip it). The Forest Refuge Metta Jhanas month (1–23 March 2027, with Devin Berry) was not in the queue entry but is on the Forest Refuge 2027 schedule and their site.
- This Living Body (IMS, 27 April–4 May 2027) left out: its IMS livestream URL is already the hub listing's offering, and the link to it on their site is broken (404).
- Availability worldwide: no fixed teaching base; teaching is online plus retreats at centres in several states.
- Subjects include conscious-relationships because their recent book, course and most interviews are about partnership.
- Dharma Seed teacher page (teacher/866) found via the Dharma Seed teacher search.

**Rachel Lewis** (`rachel-lewis`)

- Her website looks little updated (footer 2021-22; 'upcoming' events are from 2021, the Vancouver Queer Sangha listing ended in March 2024). The daily morning sit page may be out of date; kept as a free resource but worth checking.
- Availability local_online with Vancouver as base: she is a guiding teacher of BC Insight Meditation Society, but no current in-person class of her own was found.
- Only one upcoming programme found (the IMS Online 30-day course), and the dev dry-run skips it because that course URL is already on dev under another listing; so her page would show no offerings, only videos and free resources.
- Her about page mentions a certificate in Indigenous Focusing-Oriented Therapy (a trauma therapy); her work is dharma teaching, so this is not in the bio.
- 'Infinite Space, Infinite Mind' is a shared talk with Francisco Gable (Clear Mountain Monastery); Rachel is co-speaker.
- The Buddhist Songbook link is a Box shared folder, not a page on her site.

**Roxanne Dault** (`roxanne-dault`)

- Email roxanne.dault@gmail.com is printed on her Contact and Support page as the e-Interac donation address; the same page has a contact form (roxannedault.ca redirects to roxannedaultmeditation.wordpress.com).
- Five of the twelve videos are on the True North Insight / Voie boréale channel (shared sangha channel, not counted for tier); she is the sole teacher in each. Most video titles are in French, copied as published.
- Her site links two YouTube channels; the channel ID link (UCfOWPY45VDKmcn1L_Zyn76Q) resolves to True North Insight's channel, so youtube_url is her own @RoxanneDaultMeditation channel.
- Moving Towards Freedom livestream price is not shown yet (registration opens 17 Nov 2026), so price is 'Contact for pricing'.
- Metta Sangha is a rotating IMS group; she co-leads only the 8 and 22 Dec 2026 sessions.
- Photo 3 (hub) is the same shoot as the YouTube avatar; photo 1 is a different studio portrait from her site.
- Dry run on dev skips the Moving Towards Freedom livestream offering because that URL is already in from another teacher's plan (shared hub page); it will not be added again for this teacher.

**Ajahn Canda** (`ajahn-canda`)

- Named 'Ajahn Canda' (slug ajahn-canda): her own monastery site now calls her Ajahn Candā, while IMS and older videos use Venerable Canda; the owner may prefer 'Venerable Canda' or the diacritic form.
- Contact route is the Anukampa Bhikkhuni Project contact form (a JavaScript Ninja Forms form under 'General queries'), the charity she leads; no personal email is published.
- Tier counts are 0: no personal accounts; the 10.4K Anukampa channel is the monastery's and was not counted (would still be local_hero).
- Videos are all on other channels (Buddhist Society of Western Australia, Anukampa Bhikkhuni Project, London Insight Meditation); she is the sole speaker in each. 'Softening Suffering with Compassion' and 'Finding Meaning in Suffering' use dukkha in the Buddhist sense, not a condition; kept.
- Only one usable photo (IMS hub headshot, 332 px); the Anukampa site photo is a distant full-length AVIF shot and was not used.
- The Forest Refuge offering URL is the shared 2027 schedule page; she co-teaches May with Sayadaw U Jagara.
- Monastic: does not handle money; the Forest Refuge price is IMS's room rate, teacher dana is separate.
- Dry run on dev skips the Forest Refuge 2027 schedule offering because that URL is already in from another teacher's plan (shared hub page); it will not be added again for this teacher.

**Tuere Sala** (`tuere-sala`)

- Her own site tueresala.org is behind a Cloudflare bot check (403 to curl and WebFetch); not bypassed, so her own pages were not read and website_url is kept unverified.
- Contact route is Dharma Ground's contact form (the non-profit she co-founded); AudioDharma and Dharma Seed say she can be contacted at tueresala.org and dharmaground.org. No email found.
- Videos are mostly on other centres' channels (she is the main speaker in each); the Sharon Salzberg item is a podcast conversation where she is the guest.
- Photo 2 (hub) is the same portrait as photo 1 (Dharma Ground); her YouTube avatar is a letter placeholder.
- Morning Qigong with Instruction from her own channel is kept (a movement practice, no claims).
- The Understanding the Strength of Metta daylong is on 8 Nov 2026, just after the 4 Nov cut-off.

**Kristina Baré** (`kristina-bare`)

- Email is written as 'kristinabare8(at)gmail.com' on her contact page (and the same address is Cloudflare-encoded on her dana page); converted to normal form.
- Only one usable photo (IMS hub headshot); her site photo is 184 px.
- City set to Gabriola Island: her IslandDhamma page calls the island her home base and spiritual home; her site does not name a home city outright.
- Former clinical psychologist and Somatic Experiencing practitioner; she states she no longer offers therapy and her work is meditation teaching only. Her site has a page titled 'Skillful means for nervous system regulation' (not used as an item).
- All videos are on other channels (Edmonton Insight Meditation, Sit-Heads); she is the sole teacher in each. 'Dukkha (Suffering)' is a Buddhist teaching title, kept.
- Tier counts are 0: no personal social accounts found.
- The Forest Refuge offering URL is the shared 2027 schedule page; she co-teaches November with Winnie Nazarko.
- Dhamma Mentoring dana suggestion is given without a currency on her site (she is in Canada); copied as written.
- Dry run on dev skips the Forest Refuge 2027 schedule offering because that URL is already in from another teacher's plan (shared hub page); it will not be added again for this teacher.

**Yong Oh** (`yong-oh`)

- Thin listing: 1 video, 2 IMS programmes (count once) and 1 outside retreat, which just reaches the 3-item bar.
- Email yongoh.practice@gmail.com comes from his teacher profile on Rocky Mountain Ecodharma Retreat Center's booking site (listed under '2024 Team', page spells him 'Young Oh'), where he asks people to contact him there for practice interviews; his own site publishes no email or form. May be dated.
- yongoh.com returns 406 to curl (mod_security); read via WebFetch only, so it is not among the bio-check sources.
- Only one usable photo (IMS hub headshot); no own-site or YouTube photo.
- Nature Sangha is a rotating IMS group; he leads only the 1 Dec 2026 session.
- Being Dharma is hosted by Big Bear Retreat Center and run by Sacred Mountain Sangha; Kittisaro and Thanissara are the senior teachers.
- Tier counts are 0: no personal social accounts found.
- Dry run on dev skips the Experience of Insight 2027 offering because that URL is already in from another teacher's plan (shared hub page); it will not be added again for this teacher.

**Bart van Melik** (`bart-van-melik`)

- Tier: no personal social accounts found, total 0 (counts unreadable for any main account); local_hero by default of evidence.
- Email vanmelik@hotmail.com is a personal Hotmail address published as the Contact link on every page of bartvanmelik.com.
- IMS livestream offering is skipped on dry run because its URL is already on dev (another co-teacher's plan); he gets no hub offering row of his own unless the shared-programme link is handled.
- Second photo (his site, IMG_2604) looks like a younger Bart; same person as the IMS headshot as far as I can tell.
- Still, in the City is an anthology edited by Angela Dews (Amazon credits Dews only); his site calls him co-author, so left out of books and mentioned in the bio as a contributor.
- Community Meditation Center Sunday sessions use cmc-ny.org (the centre's site), which he leads as guiding teacher.

**Bhante Buddharakkhita** (`bhante-buddharakkhita`)

- Email ugandabuddhistcentre@gmail.com is the Uganda Buddhist Centre's general inbox (Cloudflare-obfuscated on the contact page, decoded); the centre he founded and leads as abbot. website_url points at the centre's Our Abbot page.
- His books could not be verified on amazon.com (dp pages for 1723375683, 1724329626, 983251598X returned 500 on 1 Nov 2026, WebFetch also 500); all four books are instead listed as free PDF downloads from the centre.
- Thanksgiving livestream offering is skipped on dry run because its URL is already on dev from a co-teacher's plan.
- Availability local_online, Entebbe, Uganda (centre runs weekly in-person meditation; he also teaches online/abroad); some sources say he now lives partly at the Bhavana Society in West Virginia.
- Name kept with the honorific 'Bhante' as he is known; IMS spells it both Buddharakkhita and Buddharakkita.
- Tier: no personal social accounts found; the centre's YouTube channel not counted, total 0.

**Cuong Lu** (`cuong-lu`)

- His personal site cuonglu.org currently leads with an open letter to Vietnam's party leader To Lam about repression of Buddhist communities and a suspected poisoning under police investigation; this is religious-freedom advocacy rather than partisan commentary and his YouTube titles are all teaching, but a human should decide whether it trips the political rule.
- Email info@mindonly.org is the Mind Only school's general inbox, published on cuonglu.org/contact and mindonly.nl/contact.
- Availability local_online with the base set to the No Word Zen practice centre in Magnac-Laval, France, where his residential retreats are held; he is otherwise based in the Netherlands (no public Dutch address found).
- Wait: A Love Letter to Those in Despair (Shambhala, 2021) left out as borderline (despair framing); restore if the owner judges it fine.
- Hub URL is the IMS book-club course page (no IMS teacher page found); he also teaches at the Barre Center for Buddhist Studies (not a sprint hub).
- IMS book-club price not shown on the page, so 'Contact for pricing'.
- Tier: no personal accounts; brand channels No Word Zen (24) and Mind Only (249) not counted.

**Gillian White** (`gillian-white`)

- Prices for Sacred Caim Healing are published as '$200' with no currency; written as CAD because she is in Alberta and her other pages state CAD.
- Scotland 2027 dates (9–16 Oct 2027) are described as proposed and pricing is not yet set; kept with dates and 'Contact for pricing'.
- Sacred Caim Healing page lists letting go of stress and healing from past experiences among intentions, while saying she makes no claim to heal conditions; kept, description written without those words.
- Insight Timer bio: WebFetch quoted only the first sentence; the bio check relies mainly on her own site pages.
- Gmail address is her own published contact address (home page footer and every page).

**Rev. Lee Wolak** (`lee-wolak`)

- agapespiritualcenter.com returns 403 to both curl and WebFetch (bot block), so the site, its offerings and the queue's email source could not be read. The email rev.lee@agapespiritualcenter.com was confirmed as the owner address (itunes:email) in his public podcast RSS feed instead; a North Texas Giving Day page lists Rev.LeeWolak@gmail.com for the centre.
- In-person base not confirmed from his own site: Frisco comes from the queue lead, the centre's Facebook page (Frisco, check-ins) and a North Texas Giving Day listing (3245 Main St, Suite 235-115, Frisco, which looks like a mailbox address). Check that Agape still meets in person before keeping local_online.
- No offerings: Sunday services, classes and workshops are on the blocked site, so none could be verified with their own URLs.
- Only one photo (YouTube avatar); the podcast cover shows the same man but carries text.
- Not the Agape International Spiritual Center (Michael Bernard Beckwith, Los Angeles); the Instagram @agapespiritualcenter belongs to that organisation and is not used.
- Some video titles were trimmed of trailing channel tags such as '| Rev Lee Wolak | Agape' and '| Meditation | Frisco | Agape Meditation Center | (972) 468-1331'.

**Tanis Fishman** (`tanis-fishman`)

- Email admin@schoolofsankalpa.com appears in the contact page's structured data (schema.org contactPoint, marked customer support), not as visible text; the page also has a contact form, recorded as contact_form_url. It is the School of Sankalpa admin inbox.
- Only one photo confirmed: a sepia shot from her About page, filename naming her, face partly in profile under a hat. No YouTube avatar (channel link 404) and the Insight Timer photo URL could not be read.
- Instagram counts (@tanisfishman, @sacred_nidra) unreadable without login; tier rests on Insight Timer 17.8k alone.
- Templed retreat is co-led with Joanna Haines (joannahaines.com); possible duplicate if she is listed separately. Retreat prices are from her page, which the Tanis page links to for booking.
- Insight Timer bio: WebFetch quoted only the first sentence; the bio check relies mainly on her own site pages.
- Jana Roemer's plan (docs/content-audits/jana-roemer.json) names Tanis as her first yoga nidra teacher; a possible cross-link, not a duplicate.
- Contact page still shows Squarespace template placeholder text (123 Street Avenue, email@address.com) in a hidden block.

**Nid Ra** (`nid-ra`)

- No visible email: nid@nidsnidra.com appears only inside the contact form's embedded settings (emailTo), not as published text, so the plan uses the contact form (awakeningspiral.com/contact).
- Her most-viewed video 'Deep Healing Yoga Nidra' (7.4K) left out as borderline healing wording.
- Soul Realignment page lists 'physical wellbeing' among areas of life the reading may touch; no condition is named, so the offering is kept. A human may prefer to drop it.
- Recent YouTube titles include several anxiety/insomnia/gut items; taken as a whole the channel is mainly yoga nidra, breath and movement, so not skipped, but those items are left out.
- Her About page tells her own recovery story and mentions depression and anxiety; the bio mentions only the brain injury and career change.
- Prices are in AUD as published (site says other currencies are offered).

**Joe Stuczynski** (`joe-stuczynski`)

- Book Living and Loving Well (ISBN 9780615193168) is sold via Lulu; amazon.com /dp/0615193161 returned 500 to curl and WebFetch, so the book is left out.
- Email info@navigatingearth.org is the Navigating Earth brand inbox (his own one-person brand).
- His site's shop sells anti-war 'Fight War' and 'Peace Revolution' merchandise; peace messaging rather than partisan politics, but noted.
- He mentions a career as a healthcare consultant; the bio describes it neutrally and makes no health claims.
- No paid offerings with their own URL: no events are scheduled and Reiki sessions are only live on Insight Timer/HeyGo; the page relies on videos and free resources.
- Instagram count unreadable without login.

**Fred Haas** (`fred-haas`)

- Thin page: three items beyond the Insight Timer link (two session offerings and a free meditations page); his site footer still says 2016 and work groups show none scheduled, though booking prices are live.
- He also brands himself a Recovery Life Coach (addiction recovery, separate site fredhaascoaching.com); that work is condition-led and left out. The bio mentions his recovery-coaching teaching and board roles as background only; a human may prefer to drop that sentence.
- His YouTube channel (45 subscribers) is mostly recovery-coaching talks and sustainable-building videos, nothing on his spiritual teaching, so no videos and no youtube_url.
- Only one photo confirmed (YouTube avatar; the same shot appears on his site). Insight Timer photo URL was not obtainable.

**Lyndsay Toensing** (`lyndsay-toensing`)

- Thin page: three items beyond the Insight Timer link (one paid download, one free download, one business book); her spiritual book The Beautiful Un-Becoming could not be confirmed on Amazon.
- Her only book with an Amazon listing is a management book, not spiritual; kept as an authored book but a human may prefer to drop it.
- Photo identity: the Insight Timer headshot (darker hair) and the about-page photo from her site (lighter, greyer hair, crouched on a beach) look like the same woman years apart; her site's headshot (lyndsay.png) matches the beach photo but is only 250 px.
- theunfinishedhuman.com returns a Cloudflare challenge (403) to curl, so its about and library pages were read through WebFetch and checked against saved excerpts only.
- Her about page discusses her own diagnoses (AuDHD, chronic pain); the bio leaves these out.
- The queue name includes 'The Unfinished Human™' (her brand); listed under her own name.

**Ally Boothroyd** (`ally-boothroyd`)

- Only one usable photo: the YouTube avatar and the site's other images are back views or group shots.
- Location: Insight Timer says Peterborough, ON; her site places Sarovara Yoga in the Kawartha Lakes (Bobcaygeon). City set to Peterborough as local_online on the strength of Ontario retreats; she has no published weekly in-person class schedule.
- sarovarayoga.com has lapsed and now shows an unrelated casino page; not linked.
- Her site and Insight Timer bio describe her own recovery from anxiety, panic attacks and insomnia and many older YouTube/Insight Timer titles are sleep- or nervous-system themed; the bio and items avoid this. Overall the work is yoga nidra teaching, not condition-led.
- Video list is the 30 newest uploads on the /videos page (popular sort not available in the page HTML); older, more-viewed videos may exist.
- Retreats share one page URL, so they are one undated item; the 2027 Ontario, Uvita and Dominicalito retreats are on that page (several sold out).
- Insight Timer bio: WebFetch quoted only the first sentence; the bio check relies mainly on her own site pages.
- Embodied Wisdom and Moon to Moon trainings are co-run with Tiina Kivinen (School of Living Yoga); possible duplicate if she is listed.

**Stuart Sandeman** (`stuart-sandeman`)

- Email info@breathpod.me is the Breathpod Ltd company/support inbox (FAQ page; also in the site's structured data).
- Instagram @breathpod is the Breathpod brand account but is titled 'Stuart Sandeman - Breathwork Trainer', so counted as his; the listing is the person, not the company.
- Condition marketing: the Breathpod home and app pages lead with stress, anxiety, sleep and pain statistics and testimonials. Judged not mainly condition-led overall (live music sessions, radio, performance coaching, book), but a human should confirm the app item is acceptable.
- Book Breathe In, Breathe Out left out as borderline: the US title is 'Restore Your Health, Reset Your Mind...' and the Amazon listing adds 'Stress Management and Healing' (amazon.com/dp/1335430687). Owner may choose to add it.
- Breathpod LIVE Sunday Session, 8 Nov 2026 (£40 GBP, London, waitlist) left out: its page lists 'Boost immunity' among benefits.
- No own YouTube channel of note (@breathpod has 347 subscribers and only Shorts); all videos are interviews or guided sessions on other channels where he is the main speaker.
- Insight Timer bio: WebFetch quoted only short fragments; the bio check relies mainly on his own site pages.

**Sah D'Simone** (`sah-dsimone`)

- Tier borderline: ~1.19M total sits in the 0.8M–1.5M band and depends on the TikTok count (read from the public profile page's embedded data, not a visible header). Without TikTok the total is ~625k (luminary).
- Email operations@sahdsimone.com is an office inbox, published on the home page in a podcast-review note; there is also a contact form.
- His framing leans on trauma and healing (SAH = Somatic Activated Healing; site says he helps people 'heal from trauma'; membership page mentions nervous-system regulation and health). Judged not mainly condition-led (Buddhist meditation, somatic dance, books, oracle deck), but a human should look. Bio and items avoid the trauma framing.
- Availability set worldwide: Insight Timer gives Ojai, CA, but no regular in-person classes there are published (weekly class is on Zoom; retreats are in Costa Rica).
- The Initiation retreat is run on Blue Spirit's site with Nathan Hirschaut; room rates load only in the booking widget.
- Insight Timer bio: WebFetch quoted only two sentences; the bio check relies mainly on his own site pages.
- Oracle deck co-authored with Benjamin W. Decker: possible link if he is listed.

**Renée Rotkopf** (`renee-rotkopf`)

- Instagram count could not be read (main social account); tier rests on Insight Timer.
- Email renee@thestellarmuse.com appears on the store page as the questions address for purchases (no contact page; /contact is 404).
- Stellarmuse is an AI chatbot subscription she created; included as an offering because her site leads with it. Owner may prefer to leave AI products out.
- Location: Woodstock, NY from Insight Timer; her about page says she teaches online and in person but gives no venue. Set local_online.
- Name written Renée (as on her site and Insight Timer); slug renee-rotkopf.
- Photos: the two site images are stylised with star backgrounds but clearly the same person as the YouTube avatar.
- Insight Timer bio: WebFetch quoted only the first sentence; the bio check relies mainly on her own site pages.

**Gaia Hope Good** (`gaia-hope-good`)

- Availability set to worldwide: all readings and courses are online; her contact page mentions co-facilitated retreats in the Sacred Valley but the site has no retreats page, so no in-person offer could be confirmed. City set to Cusco from her Insight Timer profile (her own site says the Sacred Valley).
- Her About page says she trained in Amazonian plant medicine traditions and studied medical astrology and herbalism; none of this is sold as an offering and the bio leaves it out, but a human may want to check against the plant-medicine policy.
- No social accounts found, so the tier rests on Insight Timer alone.

**Tom Evans** (`tom-evans`)

- Tier borderline: ~84.8k total, inside the 80k–150k band; only Insight Timer and YouTube could be counted (no other accounts linked).
- His Insight Timer bio says he has paused new uploads indefinitely; he is still active on YouTube and his own audio platform, so kept as teaching.
- Book ASINs taken from the amazon.com links on his own book pages; amazon.com /dp/ pages returned 500 or redirects to curl, but cover images load for each ASIN.
- Common name: check there is no other Tom Evans already on Spiritpedia.
- His own site names his new platform both NRJ and Tmesis; the bio avoids naming it.
- Several popular Insight Timer tracks are sleep-titled and one course is 'Dealing With Anger'; the brand itself is not sold on conditions, but a human may want to confirm.

**Renee Sills** (`renee-sills`)

- Email is the Embodied Astrology office inbox (published as a mailto link on the ethics page); the contact form also goes to the office coordinator.
- Instagram and YouTube are under the Embodied Astrology brand name, counted because the Instagram account names Renee Sills and the brand is her own project; the site also hosts guest teachers.
- Pronouns: the site's team page uses they/them, the older About page and Insight Timer use she/her; the bio uses they/them and mostly the name. A human may want to confirm.
- Health: her readings page describes using medical astrology to see how clients' bodies are affected, and her course Your Chart is a Body teaches bodily rulerships and 'common symptoms'; both left out. Several popular Insight Timer tracks are condition-led (addiction, trauma responses, brain relaxation); covered only by the profile link. The brand itself is not sold on conditions, but a human may want to confirm she passes the strict health rule.
- Political check: the site carries social-justice language and guest workshops (e.g. one on the Combahee River Raid), and an interview elsewhere is titled 'Embodiment is inherently political'; her own YouTube titles are all seasonal horoscopes, so not mainly partisan, but worth a look.
- Two photos only, both from her own site; the second is an artistic shot with eyes closed.

**Francie La Flow** (`francie-la-flow`)

- Her site frames her story around her own trauma and depression and she is a Compassionate Inquiry practitioner (Gabor Maté's trauma method); the products listed are about voice and expression, not conditions, but a human may want to confirm she passes the strict health rule.
- The Insight Timer bio could only be saved in part (first sentence) because WebFetch would not quote it in full; bio check run against that plus her site pages.
- The retreats page mentions registration with the International Practitioners of Holistic Medicine; left out of the bio.
- Rising Resonance price shown as published for both private and group paths; the group runs on Tuesdays in January with early bird to 15 December.

**Stephan Pende Wormland** (`stephan-pende-wormland`)

- Health rule, borderline (owner to judge): his Spiritual Mentoring page lists 'support in times of fear, depression, anxiety, stress or grief' among what one-to-one sessions offer, and a coaching testimonial mentions managing anxiety. The rest of the site, his YouTube and all current events are mainly traditional Buddhist and nondual teaching, so I wrote the plan; mentoring, coaching and supervision are left out. Owner may prefer to skip, as with Camilla Sacre-Dallerup.
- Plant medicine: a January 2025 blog post ('Welcome to a New Chapter') says his main focus will be joint work with his wife Kristina, described as a plant-medicine shaman working with ayahuasca ('Queen of the Forest'), and mentions plant-medicine integration and cacao ceremonies. No current event on his calendar is plant-medicine based, but the owner may want to weigh this against the Esalen plant-medicine skips.
- Last Insight Timer upload was about 7 years ago; his YouTube uploads are 4 to 6 years old. His live teaching calendar is current (events through August 2027).
- YouTube titles copied as published, including the typo 'Give up your Live'. Only the 30 most recent uploads (of 209) could be read without the internal API, so the picks are the most-viewed among those, not necessarily the channel's most-viewed overall.
- The 'Just drop it!' afternoon sits at an odd URL slug (/event/become-your-own-healer-2/) on his site; it is the correct page for that event.
- Several offerings are taught in German (Graz, Semriach, Scheibbs) or co-led with Kristina (Bornholm, probably Assisi); the Tyresö retreat is booked through local organisers by email, not on his site.
- Email is a gmail address his site describes as reaching his personal assistant.

**Josh Korda** (`josh-korda`)

- Email dpxnyc@gmail.com is the Dharma Punx NYC community inbox (mailto in the site footer and podcast notes), not a personal address.
- Instagram @joshkorda (name 'Josh Korda', 4.1k) is not linked from his site; it looks like him but is not confirmed, and is counted and linked on that basis.
- Recovery framing, borderline: Josh speaks openly about his own past addiction, the Amazon blurb for Unsubscribe calls it a guide to 'recovery from addiction to consumerism', he led an 11th Step retreat (April 2026, past) and some podcast episodes deal with addictive behaviour. Kept because his site and teaching as a whole are general secular dharma; the book is described without that framing.
- Political check: the Dharma Punx NYC home page carries a quote from him calling on people to stand as allies 'in the resistance against brutality and oppression against people of color' (the Kerri Kelly precedent held a listing for the owner's political check).
- His Insight Timer bio describes his counselling as 'attachment based'; the bio here says spiritual counselling only and lists no conditions.
- No current offerings with their own URL: the weekly Tuesday class is a Zoom link on the home page, all 2026 calendar events are past, and the Patreon tiers can't be read without logging in.
- Videos: his own YouTube channel is mostly his electronic and piano music; three teaching videos come from it, the rest are on other channels (Lion's Roar, unself TV, Garrison Institute, What Meditation Really Is, marksand, Francesca Maximé) where he is the main speaker or one of two in a dialogue (the Lion's Roar and Garrison videos are conversations with Koshin Paley Ellison).
- Availability local_online with New York as the base: in-person class is in Williamsburg, Brooklyn, once a month; retreats are at the Garrison Institute.

**Olivia Rosewood** (`olivia-rosewood`)

- No personal website: oliviarosewood.com is password-protected, so the website and booking links point to the College of Tao's ITMI pages. The College of Tao site itself offers Medical Qi Gong, Self-Healing Qi Gong and clinical practices (not hers); a listing sends people to the ITMI page, which is meditation only.
- A second address, livvyrosewood@gmail.com, is published on her College of Tao instructor page (https://www.collegeoftao.org/team/olivia); the ITMI guide directory address was used.
- Name: her Insight Timer bio calls her 'Dr. Olivia Rosewood' (Doctor of Divinity, 2017); listed without the honorific, as her display name is.
- ITMI Level 1 is the institute's programme; the page doesn't name who teaches each cohort, but Olivia is Dean and one of the two master teachers named on the ITMI page.
- Availability worldwide: she is based in Los Angeles / Santa Monica, but no in-person class of hers could be found (the 2027 College of Tao retreat in Los Angeles doesn't name her).
- Videos are old (Please Meditate series, about her book) and low-view; several are conversations with students about mantra meditation rather than teaching by her alone.
- A YouTube video from Dhyanyogi Omdasji Maharaj's channel calls her a disciple of his; not used in the bio as it couldn't be confirmed elsewhere.

**Jordyn Roe** (`jordyn-roe`)

- Her own about page and Insight Timer bio describe her personal history of depression (her story, not a sales claim), and the Teachable pages carry a testimonial mentioning panic/anxiety attacks; nothing is sold on conditions, but a human may want to confirm this passes the strict health rule.
- Activity looks quiet: site footer says 2022, YouTube uploads are about 3 years old; the Teachable retreat is still for sale and the Teachable footer says 2026.
- Retreat price differs: $88 on the retreat page, $66 on the Teachable home listing (possibly a sale); plan uses $88 USD.
- The Insight Timer course and the Teachable retreat share a name and may be largely the same content in two places.
- No in-person base or classes found (live group meditation is on Zoom/Skype), so availability is worldwide; Insight Timer lists Florida, USA, but no city.
- Insight Timer handle is 'crystallizeddivinity'; Facebook page is titled 'Heart Revitalization - Jordyn Roe'.

**Ryan Powell** (`ryan-powell`)

- Thin listing: no current group class is posted (the summer 2026 Monday/Wednesday series ended 26 Aug and the events page shows nothing upcoming), so the page rests on private lessons, the podcast and four older YouTube videos.
- The Xu podcast's latest episode is from August 2024; it is still online but may be dormant.
- Email domain (qigongwithryan.com) differs from his site's domain; it is the address printed on his contact page.
- Location: his site and Insight Timer say Portland, OR; a MapQuest listing places him in Lake Oswego, a Portland suburb.
- His YouTube channel is named 'Ryan Powell Music' and is mostly Celtic music; only the four teaching videos are listed. A second channel (@ryanpowell2714) holds the rain qigong video.
- The past summer class blurb described the joint qigong form as healing the body; it is general, not condition-named, and the class is left out anyway as dated.

**Guo Gu** (`guo-gu`)

- Possible tier override for editorial stature (owner decides): three Shambhala books, Princeton PhD and FSU professor of Buddhist Studies, Sheng Yen's former attendant, founder of the Tallahassee Chan Center, teaches at BCBS, Zen Mountain Monastery and SF Zen Center. Left at local_hero because the counted total is ~3.8k.
- Email: admin@guogulaoshi.com is the mailto behind the 'Email a question' button on his Connecting page; the address itself is not printed as text. It is an admin inbox.
- All but one of the videos come from the Tallahassee Chan Center channel (the centre he founded), with Guo Gu as the only speaker; the other is a Guru Viking podcast interview with him. View counts came from the watch pages because the channel's videos tab would not sort by popularity without scripts.
- Facebook link is a personal profile (guogu.laoshi) that his own site links to; follower count unreadable.
- Insight Timer bio could only be saved in part (first sentence), because WebFetch would not quote it in full; bio check run against that plus his site pages and course pages.

**Jenna Pfingston** (`jenna-pfingston`)

- Health rule, borderline: she brands her one-to-one work 'Embodied Somatic Therapy' and the studio 'Collective Healing'; her session page mentions people arriving overwhelmed or in deep grief, a 'safe and healing space', and holding space for thresholds such as entering menopause, and a testimonial mentions anxieties. No condition is sold as treatable, so the plan is written, but the owner may prefer to skip under the strict rule. The offering is titled 'Embodied Somatic Sessions' and the bio avoids the word therapy.
- jalaBlu events page lists items such as 'Energy Medicine for Empaths' and 'Vagus Nerve reset'; none are listed here.
- Mexico retreat: the jalaBlu retreats page gives only 'March 2027', a $500 deposit and two spaces left, with no exact dates, full price or named leader (Jenna owns the studio). Dates left null.
- Her own site (jennapfingston.com) only loads on http; website_url is the http address.
- Insight Timer bio could only be saved in part (first sentence); bio check run against that plus her site and jalaBlu pages.
- YouTube videos are six to seven years old; still evergreen teaching.

**Acharya Shunya** (`acharya-shunya`)

- Possible editorial-stature case for the owner: three Sounds True books (Roar Like a Goddess won an OMMIE award), head of a Vedic lineage, taught at Kripalu, Omega and Stanford; tier left at local_hero by follower total (~34.8k), no override applied.
- Availability local_online with city Hayward: her site gives a Hayward street address (108 Shakti Drive) and says she is based in the Bay Area and teaches worldwide; student photos show in-person satsangs, but no current in-person class schedule was found.
- Her site also sells Ayurveda Lifestyle Wisdom, whose Amazon subtitle promises to prevent disease, and a free monthly Ayurveda Sangha led by an Ayurveda physician runs through Vedika Global; both left out, but the Ayurveda book page is one click from her website. The main site is framed around Vedanta and Goddess teaching, not conditions, so the plan was written.
- Course and video copy uses 'heal past wounds' and 'heal relational wounds' language (Roaring Abundance, Roaring Relationships); kept because no condition is named, and my descriptions leave the healing wording out.
- Inner Mandala and Open Mandala live on vedikaglobal.org, her nonprofit's site, not acharyashunya.com.
- Ancient Meditation for Inner Stillness is hosted on Next Level Soul; her site links an affiliate URL, the plan uses the plain course page.

**Aluminea** (`aluminea`)

- Single-name listing 'Aluminea' (LinkedIn shows 'Lauren Aluminea'); the business brand is Blossoming Lotus Reiki and the email is info@blossominglotusreiki.com (business inbox, her own practice).
- Base: progress.json said San Simeon; her site gives Templeton, CA (624 S Main St) as home location, with satellite locations in Southern California, Hawaii and Kauai. City set to Templeton.
- Health wording: some meditation and track titles use healing language ('Heal Your Physical Body', 'Peaceful and Healing Sleep', 'Healing Breath'); no condition is named. The free Meditate & Transform page includes those tracks; my description leaves them out. Her FAQ says low-frequency thoughts can 'create dis-ease within the physical body'. Borderline, kept; owner may prefer to drop the meditations page.
- Level 1 and Level 3 course pages (/shoden-reiki-level-1-course, /shinpiden-part-1-reiki-level-3) return 401 (member area), so the certifications overview page is used for the full path and Level 2 has its own item.
- She has a book/manual, The Reiki Experience: Your Guide to Practice Levels 1 & 2 (sold in her store, $24.99 USD), but no amazon.com listing was found, so it is not in books.
- Custom Malas listed as an offering since it is a session-based ceremony; owner may see it as a product rather than teaching.

**Jocelyn Valencia** (`jocelyn-valencia`)

- No current paid offerings: her Offerings menu item points to her YouTube channel, the shop says it is being updated and lists nothing, and the Book Me and Being Seasonal course pages return 404. The listing rests on videos and free resources.
- Availability set worldwide: Insight Timer and old YouTube vlogs place her in Los Angeles, but her site names no base and no in-person classes, and her recent videos are travel vlogs from Costa Rica and Guatemala. progress.json said Los Angeles with in-person events; not confirmed.
- Insight Timer last upload about four years ago; YouTube is the active channel (latest about ten months ago, mostly travel vlogs).
- Video titles copied with their 🌻 separators where the separator sits mid-title; the trailing 'with Jocelyn' (channel name) was removed.
- Most of her recent journaling videos are tied to dated full and new moons; those were left out in favour of evergreen ones, so the most-viewed list skips some higher-view moon videos.

**Mel Collins** (`mel-collins`)

- Health rule, borderline: she is a qualified counsellor (not taking new counselling clients) and her background is prison substance-misuse services; her Handbook covers HSPs who use substances to 'numb out' and her talks page links a Sober Club podcast interview. Her sessions page explicitly says they are not for people in trauma or mental-health crisis, and nothing is sold on conditions, so the plan was written. The bio mentions only that she was a prison governor.
- Availability worldwide with country UK: she offers in-person sessions, and web sources say she lives in Devon (progress.json said Totnes), but her own site names no town, so no city was set. Owner may switch to local_online if a town is confirmed.
- Her site and Insight Timer look quiet: copyright 2025, the only dated event was 15 Nov 2025 (passed), YouTube's five videos are 9–10 years old. Still offering sessions by email.
- Positive Affirmations for Sensitive People (Trigger, 2022) left out: amazon.com /dp/ pages for ISBN 1801290806 and 1837963622 both returned 500.
- Photos: website headshot, Insight Timer avatar and YouTube avatar are the same woman at different ages; the YouTube one looks about ten years older than the others.
- Her site footer links X @melcollins444; not opened (needs login), so left out of the links.

**Finnbarr Kennedy** (`finnbarr-kennedy`)

- Photo identity: the lavender-field headshot (site home page, same image as his Insight Timer photo) shows him now; the third photo is from his about page and shows a much younger monk in robes, very likely him but years apart.
- Monastic name Bhikkhu Dhammasaro is taken from one of his own YouTube video titles; a human may want to confirm before it shows in the bio.
- City set to Zalaszentlászló (the centre's published address); Insight Timer gives Keszthely, about 20 km away.
- His book The Timeless Heart is linked from his site to amazon.com/dp/B0H5VWHQK8, but the Amazon page returned 500 every time (curl and WebFetch), so the book is left out; a human could add it if the listing loads.
- Patreon tier prices could not be read without logging in, so the membership is listed as Contact for pricing.
- Insight Timer bio could only be captured as quoted excerpts (WebFetch limits long quotes); the bio check ran against those excerpts plus his site pages.

**Jordanna Levin** (`jordanna-levin`)

- Email is published on her readings page for out-of-hours booking requests; her contact page (form) says answering emails is not her priority and she gives no individual advice.
- Only one photo confirmed (her site's high-res portrait); her Insight Timer photo could not be matched to her (the track page we tried belonged to another teacher), so it was not used.
- Two of her four books (Make You Happen, All Signs Point to You) have no loadable amazon.com page (500 on every try); All Signs Point to You is print-only in Australia per her site.
- Journal prices are shown with a $ sign but no currency; her business is Australian, so they may be AUD.
- Readings prices are not shown (the Calendly link on the page returns 404), so listed as Contact for pricing.
- Celestial Storytelling has an intake in January 2027 with no exact dates or price yet; it links to the waitlist page.
- Insight Timer bio could only be captured as quoted excerpts; the bio check ran against those plus her site pages.

**Sarah Hall** (`sarah-hall`)

- Tier borderline: ~145k total, inside the 80k–150k band; almost all of it is her YouTube channel.
- Email is a support inbox (support@sarahhall.com, Cloudflare-encoded in the footer of her members' sign-in page); her main site has a contact form.
- Her about page tells her own story of depression, anxiety, addiction and abuse before her work with the angels; this is personal history, not a sales claim, and the bio leaves it out. A human may still want to check the health rule.
- Psychic Protection with Archangel Michael (her best-known meditation) was left out because its description mentions health and safety; Healing with Jesus was left out as borderline by title.
- Videos chosen from the 30 most recent uploads only (the Popular sort needs YouTube's internal API); most uploads are dated moon or eclipse updates, which were skipped.
- Photos: all three are styled portraits of the same woman (Insight Timer and YouTube avatar are crops of the about-page shoot).
- Insight Timer bio could only be captured as quoted excerpts; the bio check ran against those plus her site pages.

**Frida Möhres** (`frida-mohres`)

- She says she is now based in Barcelona (Impressum address is in Barcelona), but her in-person trainings are in Berlin and Insight Timer lists Berlin; city set to Berlin for Near You, owner may prefer Barcelona.
- Initiation into Gong Playing is a repeating training (20th edition) kept undated, but its page still shows the autumn 2026 dates that have passed and the next edition is not yet announced.
- The retreat page has a typo offering early arrival on 07.10.2026 for a retreat dated 8 to 10 October 2027; dates entered as 2027-10-08 to 2027-10-10.
- Video titles contain the word 'Healing' (sound-healing usage, no condition named); kept.
- Her site promotes Sound Medicine Institute trainings where she is a guest lecturer; left out under the 'medical' rule (those pages are login-only anyway).

**Katharine Chestnut** (`katharine-chestnut`)

- Amazon /dp/ pages returned 500 (curl and WebFetch); both ASINs come from her own site's Amazon links (B09GRKGZJW direct, B0CL2XVYXT via her amzn.to link) and are Kindle editions; a human may want to confirm them and swap in paperback ASINs.
- The Inner Affirmations blurb on her site tells her own story of depression, PTSD and a covert-narcissist relationship; the book itself is a journaling guide, so it was kept with a neutral description. Borderline under the health rule.
- Her meditations page lists abuse recovery and stress/anxiety among its topics, and some site testimonials mention trauma and sleep; her offerings themselves are sold on mindfulness and calm, so the plan was written rather than skipped. Owner may want to check under the strict health rule.
- Insight Timer bio could not be quoted word for word (WebFetch would only give short excerpts); the bio check used the two excerpts it returned plus her site pages.
- Only one photo used (site headshot); the YouTube avatar is the same image cropped, and the Banff photo shows half her face.

**Jessica Prestia** (`jessica-prestia`)

- Name: her own sites, Linktree and Insight Timer use only 'Jessbeinspired' / 'Jess'; the full name Jessica Prestia comes from a Retreat Guru teacher page ('Jessica Prestia aka jessbeinspired', same davidji training) and a site testimonial calling her Jessica. Owner may prefer to list her as Jessbeinspired.
- Location conflict: Insight Timer and her Linktree (a free Venice Beach series in Oct 2026) put her in Venice, Los Angeles; her older WordPress site jessbeinspired.com still says Delray Beach, FL. Plan uses Los Angeles; in-person evidence is thin (beach series, private events), sessions are online.
- Email is a Gmail address published on her Linktree and old site contact page.
- Her Linktree is mostly affiliate links (meal kits, Talkspace, Headspace etc.); not linked from the plan.
- Older site's services page says Reiki 'enhances your body's natural ability to heal itself'; mild, not condition-sold, so not a skip.
- Only two YouTube videos qualified (most uploads are Shorts-length clips or dated moon readings).
- WebFetch said the Insight Timer page contained a block of extraction instructions it ignored; probably the tool's own wrapper, not her text, but noted.

**Laurie Cameron** (`laurie-cameron`)

- Email info@purposeblue.com is her company's general inbox (also on purposeblue.com/contact/).
- Her PurposeBlue site looks dated: the events page stops in December 2023 and the home page still advertises a Spring 2021 retreat; her Substack shows posts through May 2026, so she appears active, but the coaching and programmes pages may not be current.
- Insight Timer bio names a second book, 'Everyday Mindfulness and the Power of Self-Compassion'; the only match found is the Audible audiobook 'The Power of Self-Compassion' (2020), with no amazon.com /dp/ listing confirmed, so it was left out.
- Most videos are on the Center for Mindful Living DC channel, where she is the sole speaker; whether she still teaches there regularly wasn't confirmed, so the centre wasn't added as a hub.
- Availability set to local_online (Washington, DC) because coaching is offered in person as well as online; Facebook gives her base as Chevy Chase, Maryland.
- Only one photo confirmed (the same selfie is used on Substack and Insight Timer).

**Lee Papa** (`lee-papa`)

- Availability set to local_online (Las Vegas): coaching is on Zoom, and her in-person work is the Mindfulness Lounge and corporate sessions at conferences and companies rather than local classes; a human may prefer worldwide.
- No videos: her YouTube channel is the Sunday Communion interview podcast (she is host, guests do most of the talking, several episodes are illness-recovery stories) plus Shorts, so nothing met the teaching-video rule.
- Last Insight Timer upload was about four years ago, though her site and coaching are current (2026 copyright, new pages from June 2026).
- Her Linktree also links an Amazon storefront and a superfood product (LIVEDEN); not listed, but a human may want to see it.
- Her Books & Media page lists a 2024 Apartment Guide article titled 'How to Treat Seasonal Affective Disorder at Home' where she is quoted; it's press, not an offering, and wasn't listed.
- Temple of All Knowing lists three other names on Amazon (Alejandra Orozco PhD, Jerry Metellus, Paul Isensee); they look like contributors, but authorship wasn't checked inside the book.

**Melinda Quesenberry** (`melinda-quesenberry`)

- Listed under her own name, not 'Inner Shift' (the progress queue name is her project's name); the Insight Timer profile and YouTube channel are both branded Inner Shift, and the YouTube count was added to her total because the channel is hers alone.
- Availability set to local_online (Honolulu) from her own site ('Honolulu, Hawaiʻi + Online'), but her Psychology Today listing says 'Available online only'; a human may prefer worldwide.
- Videos are affirmation tracks spoken over binaural beats rather than talks; I couldn't confirm the voice is hers, though she presents Inner Shift as her creation.
- Psychology Today lists her under 'therapists' with a $120 'one-on-one therapy' line; her own site calls the work mindfulness coaching, and its listed specialties (self-compassion, stress, burnout, life transitions) aren't medical conditions, so she was kept.
- Last Insight Timer upload about four years ago and YouTube uploads 3–4 years old; her coaching and Substack are current (posts to Oct 2026).
- Second photo is the same portrait as the first (Psychology Today copy, 320×400); only one distinct photo confirmed.

**Amy Elizabeth Bost** (`amy-elizabeth-bost`)

- Insight Timer shows her as 'Rev. Amy Elizabeth Bost' and she holds a Doctor of Ministry (lectured as 'Dr. Amy Bost Henegar'); her own site uses plain 'Amy Elizabeth Bost', so the plan uses that. Owner may prefer an honorific.
- Location unclear: Insight Timer says Los Angeles, but a CBE International author note says she lives near New York City and ministered at the Manhattan Church of Christ; set to worldwide (sessions by Zoom or phone).
- Published email is at the old amybosthenegar.com domain (her site's mailto); the Work With Me page also uses amyebh@gmail.com for cohort and workshop enquiries.
- Christian pastoral/preaching focus; Insight Timer uploads are 5 years old, though her site's booking calendar is live.
- Rituals by Amy site looks older (images from 2016) but is still linked from her Work With Me page.

**Whitney Durrant** (`whitney-durrant`)

- Possibly dormant: moonwandering.com footer says 2021, her newest YouTube upload is about 4 years old and her last Insight Timer upload was about 4 years ago; the Reiki page still says she is taking clients and the Teachable course is on sale (footer 2026), but a human may want to confirm she still teaches.
- Name check: Insight Timer shows 'Whitney Durrant E-RYT' but the Square booking link on her Reiki page is named 'whitney-reynolds', so she may have changed surname; listing uses the Insight Timer name.
- Photos are from her own site (Moon Wandering about page and home page); both appear to show the same woman, but there is no second independent source (Insight Timer photo could not be fetched as a direct URL).
- Instagram and Facebook counts could not be read without logging in.
- Insight Timer bio could only be captured in part (WebFetch quote limit), so the bio check against it covers the opening sentence only.

**Eric Zimmer** (`eric-zimmer`)

- Health rule, unsure so plan written: his own offerings (coaching, email course, membership, free trainings) are not sold on conditions, but oneyoufeed.net's main menu lists podcast categories 'Anxiety & Depression' and 'Addiction & Recovery', he pitches talks to 'patient communities', and his story of recovering from heroin addiction is central to his brand pages; owner to decide whether that counts as a brand sold on conditions.
- Instagram, Facebook and YouTube are the podcast's brand accounts (Instagram carries his name); counted because the brand is his own show, but the tier is local_hero either way.
- A possible editorial-stature case (HarperCollins author, long-running podcast with a large audience) was not applied; owner may want to consider luminary.
- No personal email published; the contact page asks guests to write to a guest-requests inbox (obfuscated in text), which was not used; general contact is the form.
- Partner Ginny Gay is listed on the site as co-host/team; not a separate listing.
- All videos are on other channels (TEDx, interviews where he is the main speaker); his own channel holds podcast interviews with guests, which were left out.
- Insight Timer bio could not be saved word for word (WebFetch would only quote the opening line and phrases); the bio check used that partial text plus his own pages.

**Desirée Dunbar** (`desiree-dunbar`)

- Email info@secretgardensociety.com is the brand inbox of The Secret Garden Society (her own business).
- Her work is mainly creative and embodied mentoring for women, with spiritual elements (ritual, intuition, moon cycles, priestess and witch themes); a human may want to confirm it fits Spiritpedia.
- Health rule checked: the site sells no programme on a condition, but one Charmed pillar is called 'Violet Healing' (clearing old patterns) and a testimonial mentions religious trauma; her YouTube has a 'Heal the Witch Wound' series (left out). Judged not condition-sold; please confirm.
- Photos are from her own site (About page social image and home page); they appear to be the same woman, but none is captioned with her name.
- Last Insight Timer upload was about six years ago; the profile itself is still live.
- No prices are published for Charmed or CRAFT (both waiting-list pages).

**Charles Freligh** (`charles-freligh`)

- Availability set to worldwide: he lives in Northfield, MN, but his one-to-one work is online and his retreats are at centres in California, Minnesota and New York; a human may prefer local_online with Northfield, US.
- Email connect@charlesfreligh.com appears as a mailto link on the Wu Wei Weekend and At-Home Retreat pages (not on the contact page, which has a form); retreat questions also go to an organiser's personal Gmail, not used.
- Retreat pages are dated 2027 but some internal lines still mention 2026 balance-due dates (e.g. 8/10/26, 5/3/26); dates taken from the headline 2027 dates.
- He holds a clinical psychology PhD and Insight Timer calls him a remote therapist; his site frames the one-to-one work as non-clinical guidance and names no conditions, so kept.
- Amazon's blurb for his book mentions his own struggles with anxiety; title and my description name no condition, so the book was kept.
- YouTube view counts could not be read from the channel page (localised markup); videos chosen by topic, all short (2-6 min) teaching clips.

**Julian Daizan Skinner** (`julian-daizan-skinner`)

- Contact route is the Zenways organisation contact form (no personal email published); the Insight Timer account itself is named 'zenways'.
- Editorial stature, owner to decide: first Englishman recognised as a Rinzai roshi, founder of Zenways (IMTA-accredited, 300+ mindfulness graduates stated); no tier override applied.
- Several offerings (teacher trainings, membership, zazen sittings) are run by Zenways with other tutors as well as Daizan; each page names him as founder, designer or lead trainer.
- All videos are from the Zenways organisation channel (@Zenways_zen), where Daizan is the main speaker; youtube_url left null because the channel is the organisation's.

**Nina Rao** (`nina-rao`)

- Works closely with Krishna Das (his business manager and co-teacher); three of the six offerings and two videos are shared with him. If Krishna Das is listed or planned, link rather than duplicate.
- Most videos are live devotional chanting (kirtan, Hanuman Chalisa) rather than spoken teaching; kept as group chanting practice, but a reviewer may see them as music.
- Retreats are run by other organisations (Love Serve Remember Foundation, Menla, Blue Spirit); prices are not shown on their pages, so 'Contact for pricing'.
- Availability set to local_online with New York as base: she leads regular in-person events in New York City and teaches online, but has no studio of her own.
- Dev dry run: the Maui retreat link (web.cvent.com Ram Dass Legacy 2026) is already on dev under another listing, so ingest will skip it; 5 offerings would be added.

**William Cooper** (`william-cooper`)

- Owner check (health rule): he is a Licensed Professional Counselor in private practice. His site says the awakening groups, podcasts and writings are not psychotherapy and sells nothing; the only health-adjacent content is a resources page that recommends other people's material, including a PTSD video. Plan written; owner to confirm.
- Availability set to worldwide: the meetings page says his group now meets only through free live sessions on Insight Timer. Insight Timer gives Tallahassee, Florida as his location, and the contact page's phone number is an Austin, Texas number, but no current in-person meetings are listed.
- Only one photo could be confirmed (his Insight Timer profile picture, 640 px); his site has no photo of him.
- No paid offerings, videos or books: the page rests on five free resources (Insight Timer plus four on his own site and podcast).
- Listing name drops 'M.Th., Licensed Professional Counselor' from his Insight Timer display name.

**Ekta Bathija** (`ekta-bathija`)

- Email is the general Gnyana Sangha inbox (ekta.gnyanasangha@gmail.com, the Contact link on gnyanasangha.com), not a personal address.
- Base taken from her Insight Timer profile (St. George, USA); her sites describe in-person sessions and silent retreats but give no address or current dates, and the store shows prices in rupees, so she may also teach in India.
- No paid offerings: all sessions, retreats, the Gurukul and one-to-one mentoring are stated as free of charge, so the courses list is empty and her free courses are listed as free resources.
- Sub-channel subscriber counts come from the main channel's Channels tab, not each channel's own header row.
- Her own site says the Gnyana Sangha site and blog 'are not mine' (created by students); she is clearly the teacher on both, so they are used as her website.
- Dev dry run: a book with the same title as 'I: Ko'Ham Drishti' is already on dev under justin-perry (id 40); likely a mis-attached record there, worth checking before insert.

**Pavlina Nehrebecki** (`pavlina-nehrebecki`)

- Health rule, borderline but kept: her site is built on rest and energy for tired mothers (wellbeing language). Two spots name health topics: the weekly women's yoga class says it suits life stages including postpartum and perimenopause, and the 1:1 page lists 'nervous system health and trauma-informed care' as an approach. The women's yoga class is left out; the 1:1 item is kept with neutral wording. Owner may want to look.
- Her about page lists 'Yoni Shakti Yoga Therapy for Women's Health' among her trainings; left out of the bio.
- Very small following (about 1.1k in total) and only four YouTube videos with low views; the page rests mostly on dated Copenhagen events.
- All three dated offerings are in November 2026 to January 2027; they will need replacing once they pass.

**Pat Divilly** (`pat-divilly`)

- Tier borderline: ~104.6k total puts him just over the luminary line, and most of it is Instagram (92k), much of it likely built during his earlier fitness career; X and Facebook could not be read.
- The email is a support inbox (support@patdivilly.com) in the site footer.
- Availability set to worldwide: he says he is from the west of Ireland but has lived in Bali for two years and works online; the only fixed in-person element is the training's Galway weekend.
- Kept the book Shadow Work although its subtitle says 'transforming pain into power' (emotional, not medical, pain); a reviewer may want to check.
- Site sells breathwork and coaching on mental, emotional and relational wellbeing, not on named conditions; his About page mentions his own anxiety and ADHD, and the training has a trauma-informed practice module. I judged this within the health rule, but it is near the line.
- Only the 28 newest of his 141 YouTube videos could be read from the channel page; videos were picked from those.

**Nandhiji** (`nandhiji`)

- Tier needs a human look: by the summed-followers rule he is a superhero (~4.39M, almost all YouTube), but his YouTube views are small for 3.78M subscribers (top videos 100k–234k views, most recent uploads a few hundred), which may point to promoted or bought growth; Insight Timer shows only 970 followers.
- He is also founder and CEO of CNESS Inc., a social app and certification business promoted on his site; part of his YouTube output is CNESS or summit publicity (left out).
- Most of his most-viewed videos are short (3–6 minute) temple films rather than teaching talks; kept as Siddha/temple lore, but a reviewer may prefer fewer.
- His music pages claim the albums 'calibrate' above the enlightenment threshold on Hawkins's kinesiology scale and are 'ideal for body work & healing'; no music items are listed, but the site carries that language.
- Email 123@nandhi.com from the site footer; the Santa Monica street address there may be a business (CNESS) office. Availability set to worldwide since no in-person classes are published.
- His 'Mastery of Consciousness' Podia course page loads empty without JavaScript, so his paid online courses could not be verified.

**Julie Ela Grace** (`julie-ela-grace`)

- Her site and Insight Timer bio tell her own story of a thyroid cancer diagnosis as how she came to yoga; she does not sell sessions on it and the bio leaves it out, but a human may want to confirm this sits within the health rule.
- Both photos are from her site's About gallery (meditating at sunset, and a wide-legged pose on a river rock); her face is visible but small in the first, so a closer headshot would be better if one turns up.
- Insight Timer 'Applying The Yamas & Niyamas' course URL built from the course slug on her profile in the /meditation-courses/ form used by other plans; worth one click to confirm.

**MC Brigitte Schrottenbacher** (`mc-brigitte-schrottenbacher`)

- Her site's home page and events list carry injected casino and gambling link spam (likely a hacked WordPress site); website_url is set to her About page and booking_url to the retreat page, which are clean, but the owner may prefer to hold until the site is fixed or tell her.
- Her home page carries an urgent appeal saying flooding damaged all 100 huts at Sorn Thawee; the December retreat is still listed, but the monthly retreats may be disrupted.
- Slug keeps the honorific 'MC' (Mae Chi), following the Ajahn/Bhante precedent; change to brigitte-schrottenbacher if preferred.
- Availability set to 'local' (in person in Thailand plus European tours); her online meditation sessions are cancelled for now. Insight Timer lists her location as Ravensburg, Germany.
- Email is a Yahoo address for the retreat centre site, effectively her own contact address.
- Ordination year differs between sources (1989 on Insight Timer, 4 January 1990 on her site); the bio says 'around 1990'.

**Samaneri Jayasāra** (`samaneri-jayasara`)

- Email is published as 'vivekahermitage[at]gmail[dot]com' on the contact page; written out here, not guessed. It is the shared hermitage inbox for her and Ayya Jitindriyā.
- Shares Viveka Hermitage, the retreat and the hermitage website with Ayya Jitindriyā, who is not on Spiritpedia or in this sprint; she could be a separate listing later.
- Most of her YouTube channel (241K) is her reading aloud the texts of other masters, rather than her own talks; the videos chosen are the most viewed of the latest 30 and include several readings (Nisargadatta, Fire Sermon) plus her own guided practices. A human may prefer only her own guided meditations.
- Only one photo confirmed (her About page, 372x382); the YouTube avatar is a Guanyin statue.
- City set to Tilba (her retreat venue near the hermitage); Insight Timer lists Sydney. The hermitage itself takes no guests.
- The hermitage home page shows a post 'A Conversation about Depression' (an Ayya Jitindriyā interview); it is not sold and is not linked from the plan.

**Mark Zelinsky** (`mark-zelinsky`)

- Availability set to local_online with Ashland, Massachusetts from his Insight Timer location; his site offers group sittings 'in person or online' but names no studio or venue, so the local side is on request only.
- No training, teachers or lineage are named anywhere he publishes, so the bio describes what he teaches rather than his background.
- Only one photo could be confirmed (his About page); Insight Timer shows no profile photo.

**Freya Bennett-Overstall** (`freya-bennett-overstall`)

- City set to Melbourne (her studio is in Brighton, a bayside suburb of Melbourne, at 421 New St, Brighton VIC 3186); 'Brighton' alone could be read as the English town.
- Amazon.com returned HTTP 500 for every /dp/ page on 1 Nov 2026 (curl and WebFetch); the book uses the Kindle ASIN B0B3LS2215 from the amazon.com /dp/ link on her own book page, and the cover from Amazon's image server (checked visually). Paperback ISBN 9781982293826 exists (Walmart, Balboa).
- She is a registered chiropractor (no longer practising); the bio mentions this only as background and nothing clinical is listed.
- Her shop sells herbal tinctures and mushroom tonics; not listed.

**Yehuda Ashkenazi** (`yehuda-ashkenazi`)

- Email Yehudaash@gmail.com is published only as the mailto: link behind the email icon on his Linktree (the address is not shown as text); the progress lead missed it.
- Teaches through The Kabbalah Centre (a large organisation, not a Spiritpedia hub here); both paid sessions are booked on kabbalah.com, with prices shown only during booking.
- The Sacred Sounds & Astrology event is a single evening on 5 Nov 2026, one day after the offering cutoff; drop it if the owner prefers evergreen items only.
- 'How to Open Your Heart' is a Kabbalah Centre Weekly Energy Boost episode hosted by Elisheva Balas with Yehuda as guest leading the sound meditation; its description calls it 'heart healing' in a figurative sense. Kept, but borderline on the main-speaker rule.
- Only one photo used (Insight Timer); his YouTube avatar is album art with text over it.
- His Linktree also carries affiliate discount links (supplements, skincare, audio gear); not used.

**Nola Bloom** (`nola-bloom`)

- Health rule, borderline: her site is framed around yoga, meditation and ceremony, but the Massage & Ritual Bodywork page says one ritual is especially good for people feeling anxious and another supports digestive wellbeing, the shop's gratitude journal blurb mentions calming anxiety, and there is a 'Womb Healing' meditation collection. None of these are in the plan; plan written under 'if unsure, write it and flag it'. Owner to decide.
- No published email: contact is the form on /contact (plus WhatsApp DMs).
- Availability set to local_online with Koh Phangan as base: she teaches public classes and ceremonies on the island and offers online sessions.
- She has a YouTube conversation with Francie La Flow (on dev in this content run) about the oracle deck; not included, but the two could be cross-linked.

**Rabbi Brian Yosef Schachter-Brooks** (`brian-yosef-schachter-brooks`)

- Email byosef@torahofawakening.com is behind the 'Email Me' button on the B'nai Mitzvah page (Cloudflare-obfuscated, decoded per the brief). The queue had him as contact form only; the homepage's 'Email for Zoom Link' button also decodes to lisa@torahofawakening.com (his wife, who co-leads weddings). The contact form is kept in contact_form_url as well.
- Name kept as 'Rabbi Brian Yosef Schachter-Brooks' because the title is how he presents everywhere (also 'Reb Brian Yosef'); slug drops it. Owner may prefer it without the honorific.
- His YouTube channel and Instagram are both named Torah of Awakening (his own project), so counted as his.
- The Torah of Awakening Skool page returned 403 to curl; the membership price ($36 a month) comes from his Tucson events page, and the Skool URL is linked from his own homepage.
- Availability set to local_online with Tucson as base (Shabbat at Congregation Bet Shalom) plus daily online sessions; he also leads services in Berkeley.
- Seven Keys order page shows $1997 USD alongside a 'total value' figure; the plain price is used.

**Ryan T. Schmidt** (`ryan-t-schmidt`)

- Health rule, borderline: his grief page lists dementia and anticipatory grief support and dementia caregiver groups (support for the grieving, not treatment), and his Resources page says meditation could help reduce anxiety, depression, insomnia, pain and blood pressure. The Resources page is not linked and no item names a condition; plan written under 'if unsure, write it and flag it'.
- Only one usable photo (YouTube avatar); his site's images are scenery, an altar and a selfie with another person.
- Availability set to local_online with Bastrop, Texas as base: his site gives Central Texas and in-person hospice, groups and men's retreats; online work is his Insight Timer content and free online circles. The queue had in_person false, so check.
- Several of his YouTube videos are older One Desire Church material (Bible studies, guided prayer); kept the teaching ones, left out songs and family clips.
- The 'Men's Work' retreats are run through Illuman of Texas and Oklahoma (official events registered on illumanoftexas.org).

**Jaime Tan** (`jaime-tan`)

- Contact form: the /contact page has a Squarespace form (Name, Email, Subject, Message) that loads with JavaScript; WebFetch and the queue note saw no fields, but the form definition is in the page source. No email is published.
- Her contact page header still offers a free 'Breakthrough Session' on nutrition and fitness from an older version of the site; her current work is meditation, Yoga Nidra and workplace talks.
- Availability set to local_online with Zürich as base: she lives there and gives talks and workshops in person or online, but has no public class schedule. Could be worldwide instead.
- She trained with Sarah Powers, as did Kali Basman (rank 256, skipped).

**Marysol Ximenez-Carrillo** (`marysol-ximenez-carrillo`)

- Her About page tells her own story of teenage depression and how she later left it behind through energy work (personal background, not a sales claim); no condition is named on any page selling her sessions, but a human may want to read it under the strict health rule.
- Email comes from the site's legal notice (Impressum), not a contact page; it is her own domain.
- Based in Hildesheim but all sessions and events are online (Zoom) with no in-person base, so availability is worldwide with no city.
- Second photo (sunlit close-up from her About page) looks like the same woman as the studio headshot, which is also her Insight Timer photo, but the light makes it a little less certain.

**Beth Bradford** (`beth-bradford`)

- Contact is the Wix form at the foot of her home page (Email, Subject, Message); no address is published.
- Availability set to local_online with city 'Sussex County' (her Insight Timer location is Sussex County, DE; no town is given anywhere): her booked classes and training are at the client's home or outdoors, and she teaches online through Insight Timer and YouTube. A human may prefer worldwide, or a town if one can be found.
- Only one photo used (the headshot in her site's About section); her YouTube avatar (paddleboard, sunglasses and visor) is probably her but too unclear to confirm.
- Much of her Insight Timer and Substack content is Christian contemplative (prayer, scripture, lectio divina); subjects set to yoga, meditation and mysticism.
