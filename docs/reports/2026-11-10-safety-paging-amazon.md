# Crisis check, paging, YouTube key and Amazon check (10 Nov 2026)

## 1. Crisis check: hyphens count as spaces (website live; app on the 1.0.2 branch)

**Website (live, 4bfa6b1):** before the crisis check, hyphens now count as spaces. "self-harm", "kill-myself", "end-it-all" and every other crisis phrase written with hyphens are caught.
- Both forms are tested, so any stored phrase that has a hyphen still matches.
- Nothing outside the crisis check changed. The feelings lookup, the dual path and the soft tier behave as before.

**Shared cases regenerated** (`web/shared/emotion-safety.cases.json`): there are now 1,729 function cases (was 1,401), 287 full-search cases and 69 medical cases.

**Changed cases** (were pinned, now different):

| Case | Input | Before | After |
| :-- | :-- | :-- | :-- |
| Function case | `self-harm` | not crisis | **crisis (self_harm)** |
| Full search, dual-path answer none | `self-harm` | no_results | **crisis (self_harm)** |
| Full search, dual-path answer exploring | `self-harm` | no_results | **crisis (self_harm)** |
| Full search, dual-path answer distressing | `self-harm` | crisis (acute_crisis) | **crisis (self_harm)** |

**New cases:** 328 hyphenated inputs added, and **every one is pinned as crisis** (suicidal_ideation 184, active_abuse 42, acute_crisis 27, eating_disorder 24, self_harm 22, sexual_assault 17, child_protection 12). They are every crisis phrase written with hyphens, the same after "i want to", plus kill-myself, end-it-all and i want to self-harm. Nothing else changed: the 1,401 earlier function cases (apart from self-harm), the 69 medical cases and the other full-search cases are identical.

<details><summary>All 328 new inputs</summary>

`i want to suicidal`, `i want to suicide`, `kill-myself`, `i want to kill-myself`, `killing-myself`, `i want to killing-myself`, `want-to-die`, `i want to want-to-die`, `want-to-be-dead`, `i want to want-to-be-dead`, `wish-i-was-dead`, `i want to wish-i-was-dead`, `wish-i-were-dead`, `i want to wish-i-were-dead`, `end-my-life`, `i want to end-my-life`, `ending-my-life`, `i want to ending-my-life`, `end-it-all`, `i want to end-it-all`, `take-my-own-life`, `i want to take-my-own-life`, `no-reason-to-live`, `i want to no-reason-to-live`, `nothing-to-live-for`, `i want to nothing-to-live-for`, `no-point-living`, `i want to no-point-living`, `no-point-in-living`, `i want to no-point-in-living`, `better-off-without-me`, `i want to better-off-without-me`, `better-off-dead`, `i want to better-off-dead`, `dont-want-to-be-here-anymore`, `i want to dont-want-to-be-here-anymore`, `dont-want-to-live`, `i want to dont-want-to-live`, `cant-go-on`, `i want to cant-go-on`, `cant-keep-going`, `i want to cant-keep-going`, `ready-to-give-up-on-life`, `i want to ready-to-give-up-on-life`, `planning-to-end`, `i want to planning-to-end`, `how-to-kill-myself`, `i want to how-to-kill-myself`, `want-to-disappear`, `i want to want-to-disappear`, `wish-i-could-disappear`, `i want to wish-i-could-disappear`, `just-disappear`, `i want to just-disappear`, `nobody-would-miss-me`, `i want to nobody-would-miss-me`, `no-one-would-miss-me`, `i want to no-one-would-miss-me`, `nobody-would-care-if-i`, `i want to nobody-would-care-if-i`, `no-one-would-notice-if-i`, `i want to no-one-would-notice-if-i`, `nobody-needs-me`, `i want to nobody-needs-me`, `whats-the-point-of-anything`, `i want to whats-the-point-of-anything`, `whats-the-point-of-living`, `i want to whats-the-point-of-living`, `whats-the-point-of-being-alive`, `i want to whats-the-point-of-being-alive`, `no-point-in-anything`, `i want to no-point-in-anything`, `cant-do-this-anymore`, `i want to cant-do-this-anymore`, `cant-take-this-anymore`, `i want to cant-take-this-anymore`, `cant-take-it-anymore`, `i want to cant-take-it-anymore`, `cant-live-like-this-anymore`, `i want to cant-live-like-this-anymore`, `cant-handle-this-anymore`, `i want to cant-handle-this-anymore`, `giving-up-on-everything`, `i want to giving-up-on-everything`, `give-up-on-everything`, `i want to give-up-on-everything`, `feel-like-giving-up-on`, `i want to feel-like-giving-up-on`, `want-it-all-to-stop`, `i want to want-it-all-to-stop`, `want-it-to-all-stop`, `i want to want-it-to-all-stop`, `want-it-all-to-end`, `i want to want-it-all-to-end`, `want-everything-to-stop`, `i want to want-everything-to-stop`, `make-it-all-stop`, `i want to make-it-all-stop`, `want-the-pain-to-stop`, `i want to want-the-pain-to-stop`, `thinking-about-ending`, `i want to thinking-about-ending`, `been-thinking-about-ending`, `i want to been-thinking-about-ending`, `thought-about-ending-it`, `i want to thought-about-ending-it`, `thinking-of-ending-it`, `i want to thinking-of-ending-it`, `ending-things`, `i want to ending-things`, `dont-see-a-way-forward`, `i want to dont-see-a-way-forward`, `cant-see-a-way-forward`, `i want to cant-see-a-way-forward`, `no-way-forward`, `i want to no-way-forward`, `theres-no-way-out`, `i want to theres-no-way-out`, `no-way-out-of-this`, `i want to no-way-out-of-this`, `see-no-future`, `i want to see-no-future`, `dont-see-a-future`, `i want to dont-see-a-future`, `no-future-for-me`, `i want to no-future-for-me`, `life-isnt-worth-living`, `i want to life-isnt-worth-living`, `life-is-not-worth-living`, `i want to life-is-not-worth-living`, `not-worth-living`, `i want to not-worth-living`, `had-enough-of-living`, `i want to had-enough-of-living`, `tired-of-living`, `i want to tired-of-living`, `done-with-life`, `i want to done-with-life`, `burden-to-everyone`, `i want to burden-to-everyone`, `burden-to-my-family`, `i want to burden-to-my-family`, `im-a-burden`, `i want to im-a-burden`, `everyone-would-be-better-off`, `i want to everyone-would-be-better-off`, `world-would-be-better-without-me`, `i want to world-would-be-better-without-me`, `go-to-sleep-and-not-wake-up`, `i want to go-to-sleep-and-not-wake-up`, `not-wake-up-tomorrow`, `i want to not-wake-up-tomorrow`, `dont-want-to-wake-up`, `i want to dont-want-to-wake-up`, `hope-i-dont-wake-up`, `i want to hope-i-dont-wake-up`, `i-feel-invisible-to-everyone`, `i want to i-feel-invisible-to-everyone`, `feel-invisible-to-everyone`, `i want to feel-invisible-to-everyone`, `invisible-to-everyone`, `i want to invisible-to-everyone`, `i-feel-invisible`, `i want to i-feel-invisible`, `feel-invisible`, `i want to feel-invisible`, `nobody-sees-me`, `i want to nobody-sees-me`, `no-one-sees-me`, `i want to no-one-sees-me`, `nobody-notices-me`, `i want to nobody-notices-me`, `no-one-notices-me`, `i want to no-one-notices-me`, `nobody-even-sees-me`, `i want to nobody-even-sees-me`, `i-feel-like-i-dont-exist`, `i want to i-feel-like-i-dont-exist`, `feel-like-i-dont-exist`, `i want to feel-like-i-dont-exist`, `like-i-dont-exist`, `i want to like-i-dont-exist`, `i-dont-exist-to-anyone`, `i want to i-dont-exist-to-anyone`, `i want to self-harm`, `i want to selfharm`, `self-harming`, `i want to self-harming`, `harm-myself`, `i want to harm-myself`, `harming-myself`, `i want to harming-myself`, `hurt-myself`, `i want to hurt-myself`, `hurting-myself`, `i want to hurting-myself`, `cutting-myself`, `i want to cutting-myself`, `cut-myself`, `i want to cut-myself`, `burning-myself`, `i want to burning-myself`, `want-to-hurt-myself`, `i want to want-to-hurt-myself`, `urge-to-cut`, `i want to urge-to-cut`, `i want to anorexia`, `i want to anorexic`, `i want to bulimia`, `i want to bulimic`, `eating-disorder`, `i want to eating-disorder`, `purging-after-eating`, `i want to purging-after-eating`, `making-myself-sick-after-eating`, `i want to making-myself-sick-after-eating`, `starving-myself`, `i want to starving-myself`, `stop-eating-to-lose`, `i want to stop-eating-to-lose`, `binge-and-purge`, `i want to binge-and-purge`, `binge-eating-disorder`, `i want to binge-eating-disorder`, `restricting-food`, `i want to restricting-food`, `scared-to-eat`, `i want to scared-to-eat`, `cant-stop-binging`, `i want to cant-stop-binging`, `domestic-violence`, `i want to domestic-violence`, `domestic-abuse`, `i want to domestic-abuse`, `abusive-partner`, `i want to abusive-partner`, `abusive-husband`, `i want to abusive-husband`, `abusive-wife`, `i want to abusive-wife`, `abusive-relationship`, `i want to abusive-relationship`, `he-hits-me`, `i want to he-hits-me`, `she-hits-me`, `i want to she-hits-me`, `he-beats-me`, `i want to he-beats-me`, `my-partner-hits-me`, `i want to my-partner-hits-me`, `scared-of-my-husband`, `i want to scared-of-my-husband`, `scared-of-my-wife`, `i want to scared-of-my-wife`, `scared-of-my-partner`, `i want to scared-of-my-partner`, `afraid-he-will-hurt-me`, `i want to afraid-he-will-hurt-me`, `afraid-of-my-partner`, `i want to afraid-of-my-partner`, `threatens-to-hurt-me`, `i want to threatens-to-hurt-me`, `im-being-abused`, `i want to im-being-abused`, `being-abused`, `i want to being-abused`, `physically-abused`, `i want to physically-abused`, `he-threatens-me`, `i want to he-threatens-me`, `i want to raped`, `was-raped`, `i want to was-raped`, `i want to rape`, `sexual-assault`, `i want to sexual-assault`, `sexually-assaulted`, `i want to sexually-assaulted`, `assaulted-me`, `i want to assaulted-me`, `sexual-abuse`, `i want to sexual-abuse`, `sexually-abused`, `i want to sexually-abused`, `i want to molested`, `without-my-consent`, `i want to without-my-consent`, `child-abuse`, `i want to child-abuse`, `child-is-being-hurt`, `i want to child-is-being-hurt`, `my-child-is-being-abused`, `i want to my-child-is-being-abused`, `worried-about-a-child`, `i want to worried-about-a-child`, `someone-is-hurting-my-child`, `i want to someone-is-hurting-my-child`, `child-is-in-danger`, `i want to child-is-in-danger`, `abusing-a-child`, `i want to abusing-a-child`, `i want to psychosis`, `i want to psychotic`, `i want to schizophrenia`, `having-a-breakdown`, `i want to having-a-breakdown`, `mental-breakdown`, `i want to mental-breakdown`, `losing-touch-with-reality`, `i want to losing-touch-with-reality`, `paranoid-delusions`, `i want to paranoid-delusions`, `they-are-watching-me`, `i want to they-are-watching-me`, `they-are-following-me`, `i want to they-are-following-me`, `voices-telling-me-to`, `i want to voices-telling-me-to`, `voices-tell-me-to-hurt`, `i want to voices-tell-me-to-hurt`, `cant-tell-what-is-real`, `i want to cant-tell-what-is-real`, `in-crisis`, `i want to in-crisis`, `emergency-mental-health`, `i want to emergency-mental-health`, `i-need-urgent-help`, `i want to i-need-urgent-help`

</details>

**Tests:**
- Website: 183 of 183 pass, and the safety suite passes 5 of 5.
- App on branch `release/1.0.2` (71fe01c, local): `flutter test` on the safety file passes 6 of 6.
- App on `main`: the same test **fails** against the new cases, as expected, because the app code there doesn't have the fix yet.

**App:** the fix is the first item in 1.0.2, already committed on the branch. 1.0.1 is untouched.
- The full 1.0.2 list is in README §18.7: this fix, then Near You, subject search and subject-page order.
- When 1.0.1 is approved, 1.0.2 starts from that branch.

**Not changed, for later:** "selfharm" written as one word is still not caught (it never was). If you want it, adding joined-up forms of the crisis phrases is a small follow-up on both platforms.

## 2. Paging fixes (website, live in 4bfa6b1)

- **Admin author picker** (`web/app/api/admin/submissions/route.js`): the picker now loads every healer, not just the first 1,000.
- **Discovery email and push** (`web/utils/discoveryData.js`, `pushRun.js`): every paged load is now ordered by a unique key (`id`; `user_id` for push_state and notification_preferences), so pages can't overlap or skip rows.
- **Subject pages:**
  - Books, courses and free resources are now paged like the teachers. The page used to stop at 1,000 rows without warning, and meditation has 2,068 live courses and 1,022 free resources.
  - The cards now load only the columns they use.

**One cost to know about: page weight.** /subject/meditation was already 13.5 MB on the live site. On the local server it went from 15 MB to 20 MB, because the missing rows now load. Trimming the columns barely helps: most of the weight is descriptions, rendered in full and sent twice (once in the page, once in the data the page carries).
- **Proposed fix (website only):** load the offerings and free-resources shelves in the browser, a page at a time, as the video shelves already do. That would cut the big subject pages to a fraction of their size.

## 3. YouTube Data API key

- **Variable name:** `YOUTUBE_API_KEY`
- **Files** (put the same key in both, one line each, no quotes needed):
  - `web/.env.local`, used by scripts run with `--env live`;
  - `web/.env.development.local`, used by scripts run with `--env dev`.
- **Not in Vercel:** only the research scripts use it, never the website. Never give it a `NEXT_PUBLIC_` name.
- **In Google Cloud** (`spiritpedia-ad62b`): enable "YouTube Data API v3", create an API key, and under API restrictions limit it to YouTube Data API v3. Application restrictions can stay "None", because it runs from this Mac's scripts.
- **Next:** I'll write the tier and channel reader against the API. It uses channels.list for subscriber counts and avatars, which costs 1 quota unit per call. It never reads channel pages.

README's env table is updated with these.

## 4. Kathie and Paul Scott

They're on the retry-another-day list, with a note to look for a photo of both of them first (README §18.7).

## 5. Amazon Associates check (report only, nothing changed)

### Verdicts

1. **Every Amazon link carries `tag=spiritpedia-20`: partly met.**
   - **On the tag:** all 2,111 amazon.com book links carry `spiritpedia-20`, on the live site and in the app's release config.
   - **Different by design:** the 184 amazon.co.uk book links carry the **UK tag `spiritpedia03-21`**, because tags are chosen per store.
   - **Untagged:** **4 offerings link to amazon.com with no tag** (web and app).
   - **No Amazon button:** 6 books.
2. **The disclosure on the website (footer and book pages) and in the app: partly met.**
   - **Book pages, web and app:** the exact sentence is shown whenever the link is tagged, which is every Amazon button.
   - **Website footer:** has only an "Affiliate Disclosure" link, **not the sentence**.
   - **App:** the sentence appears on the book screen. The menu and account screens link to the web disclosure page. The app has no footer.
   - **/affiliate-disclosure:** the page has the exact sentence. It is linked from the footer, book pages, Terms and the sitemap.

### Where links are built or shown

| Place | File | Tagged? | Disclosure |
| :-- | :-- | :-- | :-- |
| Tag logic (web) | `web/utils/affiliate.js` | Rebuilds the link as `www.<store>/dp/<ASIN>` and drops any stored query. Tags it if that store's `AMAZON_TAG_*` is set (US, UK, CA, ES and AU are set on Vercel; .de, .fr and .it are not). amzn.to, Goodreads or a bad ASIN gives no button | — |
| Website book page "Buy on Amazon" | `web/app/books/[slug]/page.js` | **Yes** (`rel="sponsored"`) | Sentence shown when tagged, with a link to /affiliate-disclosure |
| Website offering page button | `web/app/offerings/[slug]/page.js:143` | **No:** the raw `course_url` | None |
| Website footer | `web/components/SiteFooter.jsx:46` | — | **Link only, no sentence** |
| Emails, discovery, push, sitemap | — | No Amazon links (deliberate) | — |
| App tag logic | `app/lib/core/affiliate/amazon.dart` | A line-for-line port. Tags come from `--dart-define-from-file=config/prod.json`, which has all five | — |
| App book screen | `app/lib/features/detail/book_screen.dart` | **Yes** | Sentence shown when tagged |
| App offering screen | `app/lib/features/detail/offering_screen.dart:65` | **No:** raw URL | None |
| App menu and account | `app_menu.dart`, `account_screen.dart` | — | Link to the web disclosure page |

**Live site, checked:**
- /books/the-science-of-magic links to `amazon.com/dp/B0DWBLVQKG?tag=spiritpedia-20`, with the sentence.
- /books/another-kind-of-freedom links to `amazon.com/dp/1645473260?tag=spiritpedia-20`, with the sentence.
- A .co.uk book links with `tag=spiritpedia03-21`, with the sentence.
- The home page footer has the link but not the sentence.

**App 1.0.1 (build 28):** if it was built with the documented command (`--dart-define-from-file=config/prod.json`), it carries the US tag. The last iOS build's settings show APP_ENV=prod and all five tags. A build made without that flag would silently ship with no tags and no disclosure. Nothing in the build process guards against this.

### Data (live; dev is the same)

- **Books:** 2,355 in total.
  - amazon.com: 2,111
  - amazon.co.uk: 184
  - Goodreads: 5
  - us.amazon.com: 1
  - empty: 54
- **No stored affiliate tags** of anyone else's, and no amzn.to or a.co short links.
- **No button:** books 114, 115, 133, 169 and 171 have a Goodreads URL, and book 633 has a 9-character ASIN.
- **Offerings linking to Amazon:** 4, all untagged. They are the-game-of-life-and-how-to-play-it-audible-hillary-hawkins, food-of-the-gods-audiobook-tantor-audio, true-hallucinations-audiobook-tantor-media and true-hallucinations-the-talking-book-9-cds.
- **Other tables:** free resources, healer links and publishers have no Amazon links.
- **Images:** 1,941 book covers (plus 35 other images) are loaded straight from Amazon's image servers (m.media-amazon.com).

### Proposed fixes (your call)

| # | Fix | Needs |
| :-- | :-- | :-- |
| 1 | Add the sentence "As an Amazon Associate, Spiritpedia earns from qualifying purchases." to the site footer | Website only |
| 2 | The 184 amazon.co.uk books: rewrite each to its amazon.com ASIN, so every link is `spiritpedia-20`. UK-only editions need the US edition's ASIN checked one by one. Or keep the UK tag, which earns on the UK account. **Your decision.** | Data only (fixes web and app at once) |
| 3 | The 4 Amazon offerings: move them into books as amazon.com links (data only), or tag offering links on the website (website) and in the app (1.0.2) | Data, or website plus 1.0.2 |
| 4 | Find amazon.com ASINs for the 6 books with no button | Data only |
| 5 | The app: add the sentence beside the Affiliate Disclosure menu entry, so it's in the app generally and not only on book screens | App 1.0.2 |
| 6 | Release builds: a pre-release check (or a build script) that refuses to build without `config/prod.json`, so tags and the disclosure can't silently go missing | Process or script; no app change |
| 7 | Cover images: the Associates agreement generally allows Amazon's images only through its own tools (the Product Advertising API or SiteStripe). §17.6 already plans the API. Worth deciding before Amazon reviews the account. | Data or website, later |

Local env files have no `AMAZON_TAG_*`, so local runs show untagged links. Production is fine: the live pages carry the tags.

**A slip to report:** while reading `app/config/prod.json`, the helper's filter failed and the Supabase **anon** key was printed in its own tool output. That key is public by design (it's committed in that file and used by every browser), it went nowhere else, and it isn't repeated here.
