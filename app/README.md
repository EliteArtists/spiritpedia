# Spiritpedia — the app

The Flutter app for iPhone and Android. Same Supabase project, same accounts
and the same content as the website in `../web`. Read the root README's
**Handover → For the Flutter build** first.

## Run it

```bash
cd app
flutter pub get
flutter run --dart-define-from-file=config/prod.json      # live data, read-only
```

In VS Code, the **Spiritpedia (prod config)** launch configuration does the same.

Without `--dart-define-from-file` the app starts on a screen naming the
missing values instead of crashing.

| File | What it points at | Committed |
| :--- | :--- | :--- |
| `config/prod.json` | the live Supabase project and `https://www.spiritpedia.co` | yes — public values only |
| `config/dev.json` | the dev Supabase project and a local `next dev` (Phase 2) | **no** — copy `config/dev.example.json` |

**Never put the service-role key in the app.** The anon key is public by
design — the website ships it in every page — and RLS protects the data.

## Pinned versions

Flutter is pinned to **3.47.7** (Dart 3.13.5) in `pubspec.yaml`; the build
refuses any other version. `pubspec.lock` pins every package and plugin. iOS
plugins come through Swift Package Manager (Flutter's default since 3.4x), so
there is no Podfile. Upgrading Flutter is a deliberate change: edit the pins,
`flutter pub upgrade`, re-test on both simulators, commit the lock file.

## Checks

```bash
flutter analyze
flutter test
```

## Layout

```
lib/
  main.dart            starts Supabase, holds the launch screen, locks portrait
  app.dart             MaterialApp + the intro overlay above the router
  router.dart          go_router; paths mirror the website's
  core/                config, Supabase client (reads only)
  theme/               the website's colours and type (Geist)
  shared/widgets/      tier badges, placeholders
  features/
    intro/             the shooting-star opening animation
    shell/             the four tabs
    home/              Explore (Phase 0 placeholder)
assets/                star, Geist + its licence, launch-screen source images
```

State management is **Riverpod** (no code generation); navigation is
**go_router**.

## The launch screen and intro

1. **Static launch screen** — native, generated from `flutter_native_splash.yaml`
   (`dart run flutter_native_splash:create` after any change): the website's
   dark background and the gold star, centred at 120 pt.
2. **Intro** (`lib/features/intro/intro_overlay.dart`) — starts from exactly
   that frame, then the star glows, shoots off to the top right with a fading
   trail, and the home screen is revealed underneath. About 1.6 s, on every
   cold start. A tap skips it; iOS Reduce Motion or Android's Remove
   animations skips it entirely.

## Decisions for v1

- iPhone only (no iPad layout) and portrait only, on both platforms.
- Explorers only: practitioner application, claim and dashboard stay on the website.
- Writes go through the website's API routes — never directly, never by loosening RLS.
- No analytics or crash reporting. Push notifications (Firebase) come in Phase 3.
- Amazon affiliate disclosure sits at the **bottom of the purchase section**,
  not directly under the Amazon button (Phase 1d).

## Phases

| Phase | Scope |
| :--- | :--- |
| 0 | Skeleton, theme, launch screen, intro, tabs ✅ |
| 1a | Shared crisis phrase list (one JSON file, used by website and app) |
| 1b | Explore: home shelves, subject pills, subject pages |
| 1c | Emotional search with the crisis intercept |
| 1d | Healer, book, video, publisher and offering pages; saved items on the device |
| 2 | Email-code sign-in, My Library sync, reviews, account deletion |
| 3 | Push notifications |
| 4 | Store readiness |

## Not the website

Changes here do not redeploy the website: `web/vercel.json` skips any build
where nothing under `web/` changed (see `web/scripts/vercel-ignore-build.sh`).
