# Search, subjects and location: where teachers get hidden (9 Nov 2026)

Report only. No code, data or settings were changed. Data checked on the live
database (and dev where noted), read-only. Code checked on `main` at `fc0e05a`.

**Your rule:** never hide a practitioner because they're far away. Sort the
nearest first, but everyone stays on the shelf.

**In short:** the rule is broken in one place, the **Practitioners Near You /
Closest to you** shelf. It is broken the same way on the website and in the app.
Once someone has set their area, that shelf only shows people within 50 km plus
people whose availability says "online". Everyone else is left out, including
everyone marked "Worldwide (Famous Names)". Every other place (subject pages,
the other home shelves, search) ignores location completely. They don't filter
by distance, and they don't sort by it either.

---

## 1. The Quantum-Touch case

The teacher you called "Corinne Grant" is **Karina Grant** (`karina-grant`).
Nobody on live or dev is named Corinne Grant.

| | Karina Grant | Richard Gordon |
|---|---|---|
| Profile subjects | breathwork, consciousness, energy-medicine, meditation, mindfulness, self-healing, spirituality, **quantum-touch** | **quantum-touch**, energy-medicine, polarity |
| Tier | local_hero | local_hero |
| Base | London, United Kingdom (place 2643743) | none (no city, country or place) |
| Availability | "Local & Online Sessions" | "Worldwide (Famous Names)" |

These are the only two individuals with `quantum-touch` on their profile (live
and dev). Both are Local Heroes, so on the home page both belong on **one**
shelf, Practitioners Near You. The superhero, luminary and ascended-master
shelves have no Quantum-Touch teachers.

**What happened.** You picked the Quantum Touch pill with an area set. That
narrows the home page to these two teachers. Then the Near You rule runs:

1. **Within 50 km, in person:** only people with a town. Richard has none, so
   he is skipped (website `web/utils/area.js:88-90`, app
   `app/lib/data/shelf_rules.dart:817-818`).
2. **Plus anyone who "offers online":** this checks whether the availability
   text contains the word "online" (website `web/utils/area.js:79`, app
   `app/lib/data/models.dart:168-169`). Richard's text is "Worldwide (Famous
   Names)", which doesn't contain "online", so he is left out again
   (`area.js:99`, `shelf_rules.dart:830-833`).
3. **If nobody is within 50 km, the shelf becomes "Closest to you":** the 10
   nearest people *who have a town*. Anyone without a town is dropped, and so
   is everyone online (`area.js:123-132`, `shelf_rules.dart:866-883`).

So whether your area was near London or not, Karina was the only one who could
show. Richard was hidden only because he has no base and isn't marked
"online".

**Why "See all" found him.** On that shelf, "See all" opens the subject page
(`/subject/quantum-touch`): website `web/components/HomePageContent.js:193`,
app `app/lib/features/home/home_screen.dart:102-104`. The subject page lists
**everyone** with the subject on their profile and ignores location (website
`web/data/subjects.js:79`, app `app/lib/data/content_repository.dart:193-202`).

This happens in both places. The website shelf is `web/components/NearYouShelf.jsx:27-30`
and the app's is `app/lib/features/home/home_screen.dart:142-148`. With **no**
area set, both teachers would have shown (`area.js:86`,
`shelf_rules.dart:814`).

**How big this is (live, 9 Nov):** 755 people go to the Local Hero / Near You
shelf (not superhero, luminary or ascended master; not a channel, app,
organisation or school).

- 379 are "Worldwide (Famous Names)" and 22 are "Local Only (In-Person)". None
  of them count as "online".
- 250 have no town **and** aren't "online". For anyone with an area set, they
  can never appear on Near You.
- 152 more have a town but aren't "online". They only appear when they're
  within 50 km.
- Only 353 count as "online".

---

## 2. Where teachers appear

"Profile subjects" means the teacher's own `subject_slugs`. **Nowhere** uses
their content's subjects (videos, books, courses) to put a teacher on a
subject's list.

### Practitioners Near You / Closest to you (home page)
- **Who:** Local Heroes and untiered individuals (`HomePageContent.js:140`,
  `shelf_rules.dart:136-139`). With a subject pill chosen, only those with that
  subject on their **profile** (`HomePageContent.js:84-89`, `shelf_rules.dart:301-310`).
- **Location:** **filters.** With an area set it shows people within 50 km,
  nearest first, then "online" people. Everyone else is hidden. If nobody is
  within 50 km, it shows the 10 nearest people with a town and nothing else.
  - Website: `web/utils/area.js:85-101`, `123-132`;
    `web/components/NearYouShelf.jsx:27-30`.
  - App: `shelf_rules.dart:809-835`, `866-883`; `home_screen.dart:142-148`.
- **No base:** hidden unless "online". Always hidden in "Closest to you".
- **Limits and order:** no limit when there are people within 50 km. Exactly 10
  in "Closest to you" (`area.js:104`, `shelf_rules.dart:838`).
  - With no area: everyone, in database order on the website and by id plus
    the member's interests in the app (`home_screen.dart:77-85`).
- **Also:** the weekly discovery email's "A little closer to home" picks one
  Local Hero within 50 km (`web/utils/discoverySelect.js:231-235`). That's one
  suggestion, not a list, so it isn't really your rule's territory. I'm
  mentioning it for completeness.

### Home tier shelves: Worldwide (superheroes), Rising Voices (luminaries), Timeless Teachers (ascended masters)
- **Who:** by tier. With a pill, profile subjects only.
- **Location:** none.
- **No base:** shown normally.
- **Limits and order:** no cap.
  - Website: database order. The query has no ORDER BY
    (`HomePageContent.js:49`, shelves at `118-140`).
  - App: by id, then the member's interests (`shelf_rules.dart:120-131`,
    `home_screen.dart:77-85`).
  - "See all" goes to the subject page when a pill is chosen.

### Billboard
- **Who:** superheroes and ascended masters, three to one (`HomePageContent.js:126-130`,
  `shelf_rules.dart:163-174`). Profile subjects when a pill is chosen.
- **Location:** none.
- **No base:** shown.
- **Limits and order:** no cap. The website starts at a random slide.

### Explore These Channels, Retreat Centres & Platforms (organisations), Schools & Academies
- **Who:** channels, apps and organisations, or schools. Profile subjects when
  a pill is chosen (`HomePageContent.js:109-116`, `shelf_rules.dart:103-146`).
- **Location:** none.
- **No base:** shown.
- **Limits and order:**
  - Organisations get their own shelf only at 5 or more
    (`shelf_rules.dart:195-233`).
  - Explore These Channels has Spiritpedia Official first.
  - Organisations are ordered official first, then tier, then number of teachers.
  - No caps.

### Subject pages (`/subject/<slug>`, which is where every "See all" goes)
- **Who:** profile subjects only (`web/data/subjects.js:79`,
  `content_repository.dart:193-202`). Teachers are listed apart from channels
  (`web/app/subject/[slug]/page.js:131,141`, `subject_screen.dart:182-207`).
- **Location:** none.
- **No base:** shown.
- **Limits and order:** everyone is shown, with no sort by distance or tier.
  - Website: database order (no ORDER BY). The query isn't paged, so it would
    stop at 1,000 per subject, but no subject is near that yet.
  - App: by id, paged.

### Subject pills
On both platforms a pill narrows the home page. Website: `?subject=` link at
`web/components/SubjectPills.js:145`. App: `subject_pills.dart:160`. So pills
follow the home shelves above, **including Near You's filtering**. That is
exactly the Quantum-Touch case.

### Search
- **Who:** teachers are found **by name only**, never by subject. Website:
  `ilike name %term%`, limit 4 (`web/components/EmotionSearch.js:366-371`). App:
  every word must appear in the name, 24 fetched, 60 on "See all"
  (`app/lib/features/search/content_search.dart:197-205`, `283-289`).
- Subjects come back as links to the subject page (section 4).
- **Location:** none.
- **No base:** shown.

### "See all"
On the home healer shelves it only appears when a pill is chosen, and it opens
the subject page, which follows your rule (see above).
- Website: `HomePageContent.js:193`, used on Worldwide, Rising Voices, Near You,
  Timeless Teachers and Explore These Channels.
- App: `home_screen.dart:102-104,130`.
- Schools and organisations have no "See all".

### Something found along the way (website only): 13 live teachers are missing from the whole home page
The website home page loads healers with `select('*')`. That query isn't paged
(`web/components/HomePageContent.js:49`). The database returns at most 1,000
rows per request without warning, and **live now has 1,013 healers**, so 13
never reach the page. Which 13 isn't fixed, because there's no ORDER BY.

Today the rows past 1,000 are 13 Local Heroes, for example Cynthia Bourgeault,
Henry Shukman, Laurence Freeman, Stephen Jenkinson and angel Kyodo williams.

Confirmed on dev: dev has 1,012 healers. None of the 12 past the 1,000 cap
(e.g. `henry-shukman`, `cynthia-bourgeault`) appear anywhere in the local home
page's HTML. Karina and Richard do.

The same unpaged query names teachers on video and offering cards
(`web/data/subjects.js:32`), so those 13 can also lose their names there. The
app pages its query (`content_repository.dart:96-126`) and isn't affected.

### Summary table

| Place | Website | App | Follows your rule? |
|---|---|---|---|
| Practitioners Near You / Closest to you | Filters by distance, drops no-base people who aren't "online"; Closest = 10 with a town only | Same | **No** (both) |
| Subject pills (home narrowed to a subject) | Inherits Near You filtering | Same | **No** (both, through Near You) |
| Worldwide / Rising Voices / Timeless Teachers | No location | No location | Yes (but no nearest-first sort) |
| Billboard | No location | No location | Yes |
| Explore These Channels / Organisations / Schools | No location | No location | Yes |
| Subject pages | No location, everyone shown | Same | Yes (no nearest-first sort) |
| "See all" | Opens subject page | Same | Yes |
| Search | Name only, no location | Same | Yes |
| Whole home page | **13 live teachers missing (1,000-row cap)** | Not affected | **No** (website, not location-related) |

---

## 3. Content vs profile subject gaps (live)

The question: which teachers have content carrying a subject that isn't on
their own profile? A teacher only appears on a subject page or pill if the
subject is on their **profile**.

What I counted:
- Individuals only (`entity_type` individual or empty).
- Content: videos (by `healer_slug`), books (main author **and** co-authors),
  courses (by `healer_id`) and free resources (by `healer_id`).

**Totals:**
- 988 individuals; 986 have content.
- **840 teachers** have at least one gap.
- **3,339 teacher-subject pairs** are missing. All 3,339 are real subjects.
- 3,323 of those pairs are backed by at least one live item.
- **1,572 pairs** are backed by 2 or more items, which makes them stronger
  candidates.
- Quantum Touch has **no** gaps: no other teacher has Quantum-Touch content.

**The 20 biggest subjects, by number of teachers missing it:**

| # | Subject | Teachers missing it | ...with 2+ items |
|---|---|---|---|
| 1 | Spirituality | 353 | 244 |
| 2 | Meditation | 216 | 141 |
| 3 | Spiritual Awakening | 214 | 91 |
| 4 | Ancient Wisdom | 185 | 94 |
| 5 | Soul Purpose | 183 | 89 |
| 6 | Consciousness | 175 | 84 |
| 7 | Mindfulness | 161 | 92 |
| 8 | Shadow Work | 155 | 77 |
| 9 | Conscious Relationships | 154 | 61 |
| 10 | Self-Healing | 133 | 71 |
| 11 | Breathwork | 132 | 43 |
| 12 | Manifestation | 123 | 53 |
| 13 | Life Coaching | 120 | 44 |
| 14 | Mysticism | 107 | 54 |
| 15 | Energy Medicine | 103 | 42 |
| 16 | Chakra Healing | 91 | 29 |
| 17 | Non-Duality | 87 | 28 |
| 18 | Death & The Afterlife | 81 | 26 |
| 19 | Sound Healing | 65 | 24 |
| 20 | Conscious Science | 64 | 32 |

**10 example teachers (the most subjects missing):**

| Teacher | Tier | Subjects on profile | Missing | Biggest missing (items) |
|---|---|---|---|---|
| Ra Uru Hu | ascended master | 4 | 20 | Consciousness (30), Ancient Wisdom (13), Self-Healing (11) |
| Stanislav Grof | superhero | 5 | 17 | Self-Healing (30), Mysticism (19), Spirituality (17) |
| Michael Harner | ascended master | 4 | 17 | Self-Healing (14), Spirituality (13), Energy Medicine (12) |
| Dr. Wayne W. Dyer | ascended master | 5 | 17 | Consciousness (38), Spiritual Awakening (20), Soul Purpose (17) |
| Melissa Crowhurst | luminary | 3 | 17 | Self-Healing (21), Meditation (10), Mindfulness (9) |
| Alberto Villoldo | luminary | 4 | 16 | Shadow Work (6), Soul Purpose (5), Meditation (5) |
| James Van Praagh | superhero | 4 | 16 | Channelled Teachings (7), Meditation (6), Energy Medicine (6) |
| Louise Hay | ascended master | 4 | 16 | Mindfulness (30), Consciousness (17), Shadow Work (17) |
| Barbara Brennan | ascended master | 4 | 15 | Soul Purpose (23), Channelled Teachings (11), Consciousness (8) |
| Alan Watts | ascended master | 5 | 15 | Mindfulness (23), Meditation (15), Spiritual Awakening (11) |

The full list, with counts per teacher and subject split into videos, books,
courses, free resources and live items, is in
`docs/content-audits/subject-gaps-2026-11-09.json`.

A caution: nearly every teacher has a gap. Content is tagged more broadly than
profiles, and one video tagged "Spirituality" doesn't make someone a
Spirituality teacher. If we backfill everything, the big subject pages would
fill up with loosely related people. A threshold (2 or more items, or a share of
the teacher's content) plus a quick review would be safer.

---

## 4. Search matching

**How it works (the same on both platforms):**

- **The feelings search** looks phrases up in `emotion_mappings`.
  - Website: `web/components/EmotionSearch.js:68-150`, using
    `web/utils/emotionSearchPatterns.js:50-58` (normalising) and `509-600`.
  - App: `app/lib/features/search/search_repository.dart:57-98` and
    `emotion_search_controller.dart:243-389`, using
    `app/lib/core/safety/emotion_safety.dart:283`.
  - The phrase is lower-cased, apostrophes are removed and other punctuation
    becomes a space. **Hyphens are kept.**
  - None of the stored phrases has a hyphen.
- **The name search** looks for subject names.
  - Website: the whole typed text must appear inside the subject's name
    (`EmotionSearch.js:374`).
  - App: the text is split into words at spaces and hyphens, and each word must
    appear in the name (`content_search.dart:131-141, 179-191, 225-232`).
- **No SQL function** matches subjects (checked `supabase/migrations`).

**Results** (ran the website's own matching code against dev and live; both
gave identical results):

| Typed | Feelings search (both) | Subject by name: website | Subject by name: app | Finds the subject? |
|---|---|---|---|---|
| quantum touch | yes: Energy Medicine, Reiki, Quantum Touch, Chakra Healing | Quantum Touch | Quantum Touch | Yes / Yes |
| Quantum-Touch | none | none | Quantum Touch | **Website no** / App yes |
| quantumtouch | none | none | none | **No / No** |
| reiki, Reiki | yes (Reiki, Energy Medicine...) | Reiki | Reiki | Yes / Yes |
| tai chi | yes (Qi Gong, Tai Chi...) | Tai Chi | Tai Chi | Yes / Yes |
| tai-chi | none | none | Tai Chi | **Website no** / App yes |
| taichi | none | none | none | **No / No** |
| qi gong | yes (Qi Gong, Tai Chi...) | Qi Gong | Qi Gong | Yes / Yes |
| qigong | none | none | none | **No / No** (the most common spelling) |
| breath work | none | none | Breathwork | **Website no** / App yes |
| breathwork | none | Breathwork | Breathwork | Yes / Yes |
| sound bath | yes (Sound Healing first) | none | none | Yes / Yes (through feelings) |
| soundbath | none | none | none | **No / No** |
| yoga nidra | none | none | none | **No / No** (no "Yoga Nidra" subject; "Yoga" not found) |

Capitals never matter. Hyphens and joined-up spellings do.

**One more thing.** When someone types "quantum touch" and presses Enter, it
opens the top-weighted subject. The highest-weighted subjects are **Energy
Medicine and Reiki** (weight 3); Quantum Touch is weight 2. So Enter opens
Energy Medicine or Reiki, not Quantum Touch.
- Website: `EmotionSearch.js:544-546, 565-567`.
- App: `emotion_search_controller.dart:446-447`.
- The same thing happens for "reiki", where Reiki and Energy Medicine tie at
  weight 3, and the order between tied rows isn't fixed.

Search only finds teachers by **name**. Typing "quantum touch" never lists
Karina or Richard directly. You reach them through the subject.

---

## 5. Proposed fixes (priority order)

| # | Fix | Where | Effort |
|---|---|---|---|
| 1 | **Near You: sort by distance, never filter.** With an area: everyone on the shelf. People with a town go nearest first (with "x miles away"), then everyone without a base. "Closest to you" becomes the same list, not 10. Change `nearYou`/`closestTo` in `web/utils/area.js`; NearYouShelf's note text. | **Website only** for the site (same day) | Small: about half a day with tests |
| 1b | The same change in the app (`shelf_rules.dart:809-883`, `home_screen.dart:142-152`). | **Needs an app build (next version)** | Small: half a day plus tests; ship in the next build |
| 2 | **Page the website home page's healer query** (and `getHealerNames`) so the 13 missing live teachers come back. Use `.range()` by id, as the sitemap does. | **Website only** | Small: 1-2 hours |
| 3 | **Search spellings, data side:** add `emotion_mappings` rows for `quantum-touch`, `quantumtouch`, `tai-chi`, `taichi`, `qigong`, `breath work`, `breathwork`, `soundbath`, `yoga nidra` (pointing at the right subject). Raise Quantum Touch's weight for "quantum touch" (and Reiki's for "reiki") so Enter opens the right page. Both platforms read this table, so it helps the app too, with no build. | **Website/data only** (dev, then live) | Small: about an hour plus a check of your wording |
| 4 | **Search spellings, code side:** match subject names ignoring spaces, hyphens and capitals ("Quantum-Touch", "quantumtouch", "breath work" all → Quantum Touch / Breathwork). Optionally treat a hyphen as a space when normalising. That change touches the safety-checked feelings pipeline and its tests, so it needs care. | Website: **website only**. App: **needs an app build** | Medium: a day per platform including the safety test suite |
| 5 | **Backfill profile subjects from content**, with a threshold (e.g. 2 or more items in that subject) and your review of the list. Run on dev first, then live. The 1,572 strong pairs are the starting point. | **Website/data only** (both platforms read profiles) | Medium: script plus review; the review is most of the work |
| 6 | **Optional:** a fixed order on subject pages (e.g. tier, then nearest when an area is set). The website currently shows them in database order. | Website only; app needs a build | Small |

**Stopgap if #1 can't ship today:** count "Worldwide" as online in
`offersOnline` (website `area.js:79`). That brings back 379 worldwide people,
Richard included, wherever an area is set, but only on the website, and it
still drops people who have a town but aren't online. I'd rather do #1 properly.

---

### Caveats
- I couldn't see your exact screen. That the Quantum-Touch view was the home
  page with the pill and an area set is inferred from the code and data. With no
  area set, both teachers would have shown. The behaviour is identical on the
  website and in the app.
- Which 13 teachers fall off the website home page can change, because the
  query has no order. The 13 named come from an unordered read on live.
- The gap counts include all courses and free resources, active or not.
  `live_items` in the JSON separates out the live ones.
- Search was tested by running the website's own matching code against both
  databases, not by typing into the running site. The app's name matching was
  reproduced from its code rather than run on a device.
