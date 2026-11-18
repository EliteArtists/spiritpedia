# App 1.0.2 merged, and disk space — 18 Nov 2026

## 1.0.2 merged

1.0.2 (build 29) is live on the App Store and Google Play. `release/1.0.2` (9 commits) is
merged into `main` (fcd256a, pushed). There were no conflicts. `flutter test` on `main`
passes: 383 tests. Merging also fixes the safety-test failure that `main` had since 10 Nov.
The branch is kept; the worktree `~/Sites/spiritpedia-1.0.2` is removed.

README:
- **§10.8** (the Near You notes live there, not §10.7) now describes the 1.0.2 rule:
  - the shelf is sorted, never filtered;
  - "Closest to you" is the same full list;
  - Schools and Retreat Centres show nearest first;
  - subject pages show tiers, nearest first within each.
- The status row and the build 29 row are updated.

## Release builds kept

All store builds are now together:
- `app/build/ios-release/`: Spiritpedia-1.0.0-27.ipa, -1.0.1-28.ipa, **-1.0.2-29.ipa** (moved).
- `app/build/android-release/`: Spiritpedia-1.0.0-25.aab, -1.0.1-28.aab,
  **-1.0.2-29.aab** (moved).
- `~/Library/Developer/Xcode/Archives/`:
  - Spiritpedia 1.0.0 (27) and 1.0.1 (28);
  - 2026-11-17/Runner.xcarchive (1.0.2 (29), the Organizer copy that was uploaded);
  - **2026-11-17/Spiritpedia 1.0.2 (29) build copy.xcarchive**, moved from the worktree.
    It is identical apart from the Organizer's upload note.

`flutter clean` deletes `app/build`, including the two release folders, so never run it in
`main` without moving them first.

## Disk space

**Free before: 3.8 GB. Free after: 12 GB (8.2 GB freed).**

| Removed | Size before |
|---|---|
| Gradle caches, wrapper, daemon, native (`~/.gradle`) | 3.6 GB |
| npm cache and npx cache (`~/.npm`) | 2.0 GB |
| Worktree `~/Sites/spiritpedia-1.0.2` (after moving its builds; its `app/config/prod.json` was byte-identical to `main`'s, which stays) | 1.5 GB |
| App build folder `app/build`, except `ios-release` and `android-release` | 1.4 GB |
| Swift Package Manager cache | 465 MB |
| Website `.next` | 342 MB |
| `app/.dart_tool`, `app/android/.gradle` | 98 MB |
| CocoaPods spec repos | 53 MB |
| Xcode DerivedData, Xcode cache, CoreSimulator user caches, unavailable simulators (none), old DeviceSupport (none), Homebrew cleanup | under 50 MB |

The df figure is lower than the column total because APFS counts space a little differently.
The shared simulator cache `/Library/Developer/CoreSimulator/Caches/dyld` (9.9 GB) is owned
by root, so removing it needs your password.

Nothing in `~/.secrets`, any env file, `docs/`, `supabase/` or the git history was touched.

## For you to decide (over 1 GB)

| Item | Size | Note |
|---|---|---|
| Simulator dyld cache, `/Library/Developer/CoreSimulator/Caches/dyld` | 9.9 GB | On your safe list. Rebuilt when a simulator next boots. Needs `sudo rm -rf /Library/Developer/CoreSimulator/Caches/dyld` |
| iOS 18.0 simulator runtime | 7.8 GB | No simulators use it |
| iOS 18.2 simulator runtime | 8.1 GB | No simulators use it. The app supports iOS 15+, so keep one old runtime if you want to test older iOS |
| Android emulator "Pixel 8 API 34 – Test Device Clean" (`~/.android/avd`) | 6.1 GB | The only Android emulator. It can be recreated, but its set-up is lost |
| Chrome's cache (`~/Library/Caches/Google/Chrome`) | 4.8 GB | Best cleared from Chrome's own settings |
| VS Code updater leftovers (`~/Library/Caches/com.microsoft.VSCode.ShipIt`) | 1.6 GB | Safe |
| Codex runtimes (`~/.cache/codex-runtimes`) | 1.6 GB | Downloaded again when needed |
| Android NDK 28.2 | 2.8 GB | Flutter's Android builds use it; downloaded again on the next build |
| Not recommended: Claude app data (13 GB), Chrome profile (7.8 GB), VS Code extensions (6.2 GB), Codex sessions (1.5 GB), Android system image (3.1 GB, used by the emulator) | | |

Under 1 GB, not touched: `~/.pub-cache` (773 MB), and four older non-store Spiritpedia
archives (builds 16, 22, 23, 24; 744 MB together).
