# Near You: "Closest to you" plan (3 Nov 2026)

This is open job #12, for app 1.0.1 and the website in the same pass. It follows the owner's defaults of 3 Nov 2026.

## Today

The shelf is called **Practitioners Near You**:
- **App:** `nearYou()` in `app/lib/data/shelf_rules.dart`, shown by `home_screen.dart`.
- **Website:** `nearYou()` in `web/utils/area.js`, shown by `NearYouShelf.jsx`.
- **Who's in it:** individual Local Heroes, filtered by the pill or subject in view.

What it shows depends on the area:
- **No area set:** everyone, with "Set your area".
- **Area set, someone within 50 km:** they come first, nearest first, then everyone who works online. The note says "Near {town}".
- **Area set, nobody within 50 km:** only the online practitioners, with "No practitioners near {town} yet. These offer online sessions."
- **Area set, nobody within 50 km and nobody online:** the shelf is empty. This is the gap.

## The change

**When an area is set and nobody is within 50 km:**
- The shelf's title becomes **Closest to you**. It stays in the same place with the same Local Hero badge.
- It shows the **10 practitioners nearest the area**, measured town centre to town centre. Only practitioners with a town on their listing count, nearest first.
- Each card shows the distance: **"320 km away"**, or **"200 miles away"** when the user's area is in the United Kingdom, the United States, Liberia or Myanmar. Distances are whole numbers, with thousands separated ("1,240 km away").
- The note reads **"Nobody near {town} yet. These are the closest to you."** followed by **Change**.
- Online practitioners further away are not added after the 10. The shelf is about distance, and the online ones stay on the other shelves.

**Fallback:** if no practitioner in view has a town at all (possible on a narrow subject filter), the shelf shows the online practitioners with today's note. With nobody online either, it's left out rather than shown empty.

**Unchanged:**
- With someone within 50 km, the shelf works as today: "Practitioners Near You", near first, then online, with no distances.
- With no area set, it works as today.

**The area used** is always the one the person set: Set Your Area, Tailor's Your Area, or the website's area box. It is never live GPS. "Use my location" still only picks a town once, at the moment it's set (§10.8).

**Same in the app and on the website.** The rule is one pure function on each side:
- `closestTo()` beside `nearYou()`, with its unit choice (`distanceUnitFor(country)`) and its label (`distanceLabel(km, country)`);
- tests on both sides: `app/test/shelf_rules_test.dart` and `web/utils/area.test.mjs`.

**Privacy:** nothing new is collected. The area is already a town (Coarse Location on the App Privacy label), and distances are worked out on the phone or in the browser.

## Data today (live, 3 Nov 2026)

- 161 of 399 Local Heroes have a town, so "Closest to you" always has someone in the unfiltered view.
- Places hold `country` ("United Kingdom", "United States"…), which the unit choice reads.
