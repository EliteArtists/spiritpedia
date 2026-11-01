# Retreat Centres & Platforms shelf: live (1 Nov 2026)

The owner approved the shelf (plan: `2026-11-01-organisations-shelf-plan.md`). The web side is pushed and deploys live with this commit. The app side goes in with the hubs app build.

## What changed

- **New shelf on Discover:** "Retreat Centres & Platforms", with the subtitle "Discover Where They Teach".
  - It sits between Schools & Academies and Explore These Channels.
  - There is no "See all" link.
- **The rule** (`web/utils/listings.js`):
  - `ORGANISATION_SHELF_MIN = 5`.
  - `splitOrganisations()` moves the organisations out of Explore These Channels only when there are 5 or more. Below that they stay put, so there is never a one-card shelf.
  - Order: Spiritpedia Official first, then tier, then most teachers.
- **The card** is the Schools card, with a `kind` prop. It reads "View Organisation" and shows "N teachers", counted from the `hub_teachers` rows the page already loads.
- **Label fix:** on logo cards, the type label was white text on the white logo panel, so it showed as a blank tag. "School" on the Schools shelf was already affected on live.
  - `ListingBadges` has a new `onLight` option that makes that label dark.
  - The Schools card uses it, so both shelves now show "SCHOOL" or "ORGANISATION".
- No migration, no new query, no RLS change.

## Shown now (7)

The order is: Insight Timer (136 teachers), The Shift Network (120), Kripalu (90), Omega (47), Esalen (33), Commune (32), and 1440 Multiversity (founded 2017, no teachers). Explore These Channels keeps the channels and apps.

## Checks

- 163 web tests pass, including two new ones: the minimum of 5 and the order.
- Lint shows nothing new. The two existing errors in `HomePageContent.js` and one existing warning in `ListingBadges.jsx` were there before.
- Checked by eye on localhost against dev (which also has 7 organisations).

## Still open

- **App:** the same shelf, rule and order, with the hubs app build. The app's platform rule (`models.dart`) changes too.
