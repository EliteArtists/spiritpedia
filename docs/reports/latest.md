# Organisations shelf: plan (1 Nov 2026)

**Plan only. Nothing is built yet.** The rule (README job #13) is that organisations stay in Explore These Channels until there are 5 or more, and then get their own shelf, never a one-card shelf. Live now has **7 organisation hubs**:
- The Shift Network
- Insight Timer
- Omega Institute
- Commune
- Kripalu
- Esalen
- 1440 Multiversity

So the rule is met.

## Today

- **Website** (`web/components/HomePageContent.js`):
  - Explore These Channels holds every platform that isn't a school (`isPlatform && !isSchool`): channels, apps and organisations, with Spiritpedia Official first.
  - Schools already have their own shelf, Schools & Academies ("Train With a School"). It uses `SchoolCard` with an "N teachers" line, worked out from `hub_teachers`. The home page already fetches `hub_teachers` for that line.
- **App:**
  - `app/lib/data/shelf_rules.dart` puts every platform in `HealerShelves.platforms`, shown as Explore These Channels in `home_screen.dart`.
  - The app has its own copy of the platform rule (`models.dart` → `isPlatform`).
  - There is no school or hub shelf in the app yet.

## Website (now)

1. **One rule in one place.**
   - Add `ORGANISATION_SHELF_MIN = 5` and a small `splitOrganisations(healers)` to `web/utils/listings.js`.
   - With 5 or more organisations, they get their own list and leave the platforms list. Below 5, they stay in Explore These Channels.
   - This keeps the one-card rule automatic if a hub is ever removed.
   - Tests go in `listings.test.mjs` (4 organisations means no shelf; 5 means a shelf; channels and apps are never moved).
2. **The shelf** goes in `HomePageContent.js`, between Schools & Academies and Explore These Channels.
   - Order: Spiritpedia Official first, then tier (Superhero, then Luminary, then the rest), then number of teachers.
   - This puts Omega, Kripalu, The Shift Network, Insight Timer and Esalen ahead of Commune and 1440.
3. **The card.** Reuse the Schools card (its "N teachers" line) so Kripalu reads "90 teachers".
   - The counts come from the `hub_teachers` rows the page already loads.
   - No new query, no migration, no RLS change.
   - If the card's wording says "school", give it a neutral prop rather than copying it.
4. **Check on localhost against dev.**
   - Dev also has 7 organisations, so the shelf shows there.
   - Run the web tests (including the crisis-intercept tests).
   - Then show the diff and wait for an OK. A push that changes `web/` deploys.

## App (with the hubs app build)

- **When:** the app has no school or hub support yet, so the shelf ships with that build rather than as a separate change.
- **Rules and code:**
  - `shelf_rules.dart` gets an `organisations` list with the same minimum and order. `platforms` drops organisations when the shelf is shown.
  - `home_screen.dart` gets the shelf in the same place and with the same title as the website.
  - Its personalisation list (`fy(...)`) and empty-state check take the new list into account.
- **Teacher counts:** come from `hub_teachers` (public read, as on the website).
- **Tests:** `app_test.dart` and the shelf-rule tests are updated, keeping the two copies of the platform rule in step.
- **Build:** one simulator at a time; build number bumped before TestFlight.

## Decisions for the owner

1. **Title and subtitle.** Schools use "Schools & Academies / Train With a School". Suggested: **"Retreat Centres & Organisations" / "Learn With an Organisation"**.
2. **"See all" link.** The other shelves show one only on a subject page. Suggested: the same here (none on the main Discover page) until there's an organisations listing page.

## Not affected

- Search keeps organisations in its CHANNELS group.
- Subject pages, My Library, the hub pages and tiers are unchanged.
