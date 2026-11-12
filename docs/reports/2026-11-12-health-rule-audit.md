# Broken images, the new health rule, and what the old one cost (12 Nov 2026)

## 1. The counts: what the old health rule cost

**How this was counted:**
- I read every plan, skip, drop, held file and title screen in `docs/content-audits/` (all sprints since October). That is 1,412 plans, 2,064 skips and 3 title screens.
- A wide word net picked out 3,355 entries that might be health-related.
- Helpers read each one against the new rule. Each entry was marked:
  - health the **only** reason, or health **plus another** reason that keeps it out on its own (already started, closed, no page, not on Amazon, no contact route, too thin, blocked);
  - **passes** the new rule, **to check** (it names a condition with no cure or treat claim, or the note is too short to tell), or **fails** (a cure or treatment claim, or replacing medical care).
- **Item counts are approximate**, because notes like "13 videos" were counted as 13.

### Items left out of listings that are live

**892 live listings** had 3,697 items left out for health reasons:

| | Items |
| :-- | --: |
| Passes the new rule (wellbeing wording only) | **1,413** |
| To check (names a condition, no cure claim found) | **1,408** |
| Fails (a cure or treatment claim) | 320 |
| Out for another reason as well | 556 |

**By type** (passes / to check):
- videos 714 / 466
- offerings 391 / 665
- books 60 / 75
- free resources 86 / 45
- notes covering several types 162 / 153

**Restorable:** 2,821 items in 779 listings, of which 1,413 clearly pass.

**Listings that never went in:** held and dropped plans left out another 369 restorable items. Those plans aren't live and wait on your other decisions.

### Practitioners, channels, apps and schools skipped or held

**Skipped in research for health: 658.**
- **351** were also out for another reason (mostly no contact route, too thin, or blocked).
- **307** were out for health alone:
  - passes: 37 (wellbeing-led work such as grief, trauma healing, anxiety, burnout, self-healing qigong);
  - to check: 189 (56 condition-named, 42 medical roles, 65 mainly therapy, 21 mainly fitness or bodywork, 5 other);
  - fails: 81 (disease-cure claims, or replacing medical care).

**Taken out by the title screen before research: 157.**
- **The roles:** 73 medical (doctor, naturopath, medical qigong), 67 therapists or psychologists, 15 nutrition and similar, 2 posture.
- **What the screen did:** it took them out by role, with no research.

**Held or dropped with health as a reason: 7.**
- **Health was the only reason (3):** Jamie Wozny (held), Julie E. Brent and J. Brown (dropped).
- **Health plus another reason (4):** Dr. Miles Neale and Catherine Andrews (held), Amy Belair and NgalSo (dropped).
- **What happens to them:** your earlier decisions on these stand unless you say otherwise.

**Owner removals under the old rule (4):**
- **Back in now (2):** Iyanla Vanzant's "Working Through Anxiety" and Healing Vibrations' "Guided Bedtime Body Scan Meditation For Sleep And Anxiety". Both pass the new rule, so I re-added them on dev and live.
- **Staying out (2):** Jillian's "Reiki for Clearing Depression…" and "REIKI FOR WEIGHT LOSS". Both read as treating a condition.

### Did video selection avoid popular wellbeing titles? Yes.

I took every 18th live teacher with a YouTube channel (40 teachers) and read their 15 most-viewed uploads through the YouTube Data API. That gave 435 videos over 90 seconds.

| Most-viewed videos | Count | On Spiritpedia |
| :-- | --: | --: |
| Wellbeing titles (stress, anxiety, sleep, healing, grief, calm…) | 63 | **7 (11%)** |
| Every other title | 372 | 124 (33%) |

The 56 wellbeing titles we passed over belong to 24 of the 40 teachers. Some of the most-viewed:
- Melinda Quesenberry, "Heal Relationship Anxiety…" (131k views);
- David Gandelman, "Vipassana for Sleep" (20k views);
- Liza Colpa, "…Singing Bowl Meditation for Sleep & Relaxation" (12k views).

Overall, we list only 30% of these teachers' most-viewed videos, because helpers picked from the latest uploads.

**The list by listing:** `docs/reports/2026-11-12-health-audit-by-listing.md`. It covers all 892 listings with counts, and every health-only skip with its reason.

## 2. Live items that clearly break the new rule (report only: you decide)

I checked every live title, description and bio for disease words: 105 hits. These are the ones that clearly claim to cure or treat a disease or condition:

**Videos:**
- **Karina Grant:** "Healing arthritis naturally", "Overcome chronic fatigue…", "Joannas Quantum-Touch testimonial pain relief fibromyalgia", "Quantum-Touch helps Anne and her Raynaud's disease…"
- **Lee Holden:** "60 Sec Immunity Boost", "9-Minute Arthritis Relief Qi Gong Routine", "7-Min Natural Blood Pressure Control", "How to Lower Cholesterol Naturally"
- **Julie Schiffman:** "Releasing Inflammation", "Releasing Hypertension/High Blood Pressure", "Tapping Support for IBS…"
- **Immune-system titles:**
  - Jeffrey Chand, "Immuni Qi… Immune System";
  - Mindful Movement, "Strengthen your Immune System…";
  - The Shift Network, "Qigong to Rejuvenate Your Immune System";
  - Dawson Church, "Boost Your Immune System Naturally";
  - Wim Hof, "Influencing the Immune System";
  - Dr Paul Lam, "…Improve Immunity".
- **COVID titles:**
  - Wim Hof, "Wim Hof's take on Coronavirus";
  - Tony Robbins, "Unmasking The Science You Aren't Hearing On TV | COVID-19…" (also reads as conspiracy);
  - Lynne McTaggart, "A live intention to limit the spread of the Coronavirus";
  - Patrick McKeown, "Coronavirus (Covid19) Recovery Breathing Exercises".
- **Others:**
  - Donna Eden, "Lower Your Blood Pressure…";
  - Bruce Lipton, "Cancer is a Symptom".

**Offerings:**
- Patrick McKeown, "OA Breathing For Diabetes Course";
- FibroClear (EFT for fibromyalgia);
- Julie Schiffman's "Arthritis…" and "Tapping for Digestive Issues (IBS)" masterclasses;
- Marisa Cranfill, "YoQi: Qigong Flow to Boost the Immune System" (you said keep Marisa's; listed only so you have the full picture).

**Books:**
- Lynne McTaggart, *The Cancer Handbook*;
- Dawson Church, *EFT for Fibromyalgia*;
- Patrick McKeown, *Asthma-Free Naturally* ("drug-free");
- Leia Cohen, *Battle the Flu: How to Boost Your Immunity…*;
- Dr Paul Lam, *Tai Chi for Diabetes Handbook*;
- *The Way of the Iceman* (blurb: "boosts the immune system, reduces inflammation").

**Free resources:**
- Gary Craig's "Health Articles & Videos" (EFT for cancer, arthritis, asthma) and "Impossible" Healings (kidney failure, vision loss).

**Borderline, probably fine:**
- Dr Paul Lam's Tai Chi for Arthritis lessons and handbook (an evidence-based programme, "easing joint pain");
- Jeffrey Chand's neck-and-arthritis routines;
- Healing Vibrations' "…Sleep Music for Anxiety | Hypertension";
- Hahnemann's and Vithoulkas's homeopathy classics (historic texts, under the homeopathy note).

**Fine:** bios that tell a teacher's own illness (Anita Moorjani, Donna Eden, Louise Hay), astrology's Cancer, and "mind virus" titles.

## 3. Restore

See section 4 for progress. The order: items in live listings now (dev, then live); the skipped listings as the first job of tonight's sprint.

## 4. Progress

**Videos (done, dev and live):**
- **Live:** 885 videos on 305 listings (dev 797 on 281, plus the 24 retried below).
- **How they were chosen:**
  - left-out titles first, matched on each channel's uploads through the YouTube Data API;
  - then the channel's most-viewed wellbeing titles, up to as many as were left out (at most 10 per listing).
- **Filtered out (31):**
  - cure or treatment words;
  - news, politics and promo;
  - psychedelics and medical intuition;
  - repeated or empty titles.
- **Not done (94 listings):** 54 have no YouTube channel on the listing, 12 have a channel that wasn't found, and 28 have no matching or wellbeing titles.
- **Logs:** plans `docs/content-audits/health-restore-2026-11-12/*-videos.json`; the method `videos.mjs` and `videos-tidy.mjs`.

**My slip, fixed:**
- **What happened:** the first top-ups ran the ingest's existing-photo check, which dropped photos it couldn't fetch because the host refuses our checker. That changed the photo lists of 73 listings (70 on dev, 3 on live).
- **The fix:** all 73 are back exactly as they were (`photos-reverted.log.json`). The ingest now drops a photo only when it's certainly dead (404 or 410, not an image, too small, a Google thumbnail), the same can't-tell rule as the audit.

**Offerings, books, free resources:** helpers re-read each item's real page, then each plan was dry-run and inserted on dev, then live.

| Batches | Listings | Plans | Offerings | Free | Books |
| :-- | --: | --: | --: | --: | --: |
| 01–03 | 76 | 50 | 76 | 32 | 8 |

- **Commonest reasons still out:**
  - the item is only on Insight Timer, which is never fetched;
  - the page still makes a cure or treatment claim (immunity, blood pressure, "cure insomnia", disease prevention);
  - past or closed;
  - the 10-item cap;
  - the site blocks us (robots.txt naming ClaudeBot, 429 or a Cloudflare challenge: skipped, never retried).
- **Taken out on review:** Peter Sterios's "Yoga for Pain Relief" ("Tired of taking pain medications?").

**Remaining:** batches 04–25 (about 525 listings) are being researched three at a time, and go in as each batch finishes.
