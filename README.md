Spiritpedia
A spiritual encyclopedia for the modern age — uniting timeless wisdom with personalised, AI-powered tools to help humans raise their vibration, find healing, and live in harmony.

🌌 Vision
Spiritpedia is not just a content hub or search engine — it's a personalised spiritual companion, designed to evolve with each user's unique path.

* Visitors can explore freely via subject-based discovery, curated content, and emotional search
* Registered users unlock a fully immersive experience: saved content, personal library, AI notifications, and a curated journey of healing and expansion

🧭 Core Philosophy
"Don't show them everything. Show them exactly what they need."
Spiritpedia isn't about information overload — it's about calm, resonance, and alignment. It meets users exactly where they are, emotionally and spiritually, and gently supports their next step in evolution.

The entry point is always emotional:
"How are you feeling today?" → "Lost" → Curated videos, books, and healers appear instantly.

📲 Platform Model
| Platform | Role | Status |
| :--- | :--- | :--- |
| Web App (Next.js) | Primary product — full discovery experience | ✅ Live at [spiritpedia.co](https://spiritpedia.co) |
| Native App (Flutter) | Phase 2 — iOS & Android with push notifications | ⬜ Planned |

#### Domains
`spiritpedia.co` is the primary domain and the one to share. The original
`spirit-pedia.com` still resolves and serves the same Vercel deployment.

#### Why Web First
The Next.js web app delivers the full Spiritpedia experience and allows rapid content building and iteration. The Supabase backend is shared — when the Flutter app is built, it connects to the same database. Nothing is rebuilt, only extended.

#### Why Flutter Next
Push notifications are a core part of the Spiritpedia experience — the IAM (I AM) affirmation system requires reliable native push. Web push on iOS is unreliable. Flutter is the right long-term home for Spiritpedia.

 Bento Subject-Based Navigation (The Just Eat Model)
Spiritpedia is structured like a spiritual discovery app. Instead of "Pizza" or "Thai Food," users explore subjects such as:

🌿 Practices & Modalities
Tai Chi · Reiki · EFT / Tapping · Breathwork · Meditation · Yoga · Sound Healing · Homeopathy · Hypnotherapy · Astrology · Quantum Healing · Energy Medicine · Herbalism · Crystal Healing · Chakra Work

🧠 Teachings & Philosophies
Law of Attraction · Non-Duality · Conscious Science · Spiritual Psychology · Timeline Shifting · Ancient Wisdom (Taoism, Vedic, Hermetic) · Lightwork & Shadow Work · Inner Child Healing · Akashic Records · Soul Contracts & Reincarnation · Sacred Masculine & Feminine

💫 Themes & Focus Areas
Manifestation & Abundance · Healing from Trauma · Raising Your Vibration · Emotional Mastery · Grief & Death · Self-Love & Boundaries · Nervous System Healing · Purpose & Life Direction · Relationships & Conscious Partnership

Each subject acts as an entry point. When a user selects "Reiki," they instantly see:
* 🎥 Related videos
* 📚 Related books
* 🧘 Local & online healers
* ✨ Related quotes and disciplines

👥 Healer Tiers
Spiritpedia uses a four-tier system to classify all practitioners and teachers on the platform. Three tiers reflect reach and recognition — and crucially, they are not fixed. Every living healer on Spiritpedia has the opportunity to grow and graduate to a higher tier as their audience and impact grows. The fourth tier, Ascended Master, honours teachers who have passed on and sits outside the graduation ladder.

This graduation mechanic is intentional. Spiritpedia is not just a directory — it is a career platform for spiritual practitioners.

#### ⭐ Superhero (Amber badge)
Global household names. Mainstream recognition beyond the spiritual community. Their books are in every bookshop. A person with no interest in spirituality has likely heard of them.
* **Threshold**: 500,000+ followers on a single platform, OR mainstream name recognition regardless of follower count.
* **Examples**: Eckhart Tolle, Abraham Hicks, Joe Dispenza, Deepak Chopra
* *Superheroes are listed for platform authority and content value. They do not pay for listings.*

#### 🕊️ Ascended Master (Gold badge)
Teachers who have passed on but whose work remains foundational. They are shown in the **Timeless Teachers** shelf on the homepage rather than alongside living practitioners, and their profile carries a lifespan (`1931 — 2015`, or `b. 1931` when only the birth year is known).
* **Threshold**: Deceased, with a body of work that still shapes the field.
* **Examples**: Wayne Dyer, Louise Hay, Ram Dass
* *Ascended Masters are listed for their legacy and content value. They do not pay for listings, and they are not part of the graduation ladder.*

#### ✨ Luminary (Violet badge)
Respected teachers and practitioners with a real, established audience within the spiritual world. They are known and trusted in the community. They may not yet have crossed into mainstream consciousness, but within their field they carry genuine authority.
* **Threshold**: 50,000+ followers on a single platform (YouTube, Instagram, Facebook, or equivalent).
* **Examples**: Teal Swan, Kyle Cease, Matt Kahn, Lu Chin (Qi Yoga)
* *Luminaries are listed for content and community value. As the platform grows and delivers measurable value to them — bookings, traffic, visibility — a nominal listing fee may apply.*
* **Graduation**: A Luminary who reaches 500,000+ followers on a single platform, or achieves mainstream name recognition, graduates to Superhero. Their badge updates automatically when an admin updates their tier in the dashboard.

#### 🌿 Local Hero (Emerald badge)
Practitioners operating locally or with a small online presence. This is the grassroots heart of Spiritpedia — the healers, coaches, and teachers working directly with people in their communities.
* **Threshold**: Under 50,000 followers across all platforms.
* **Examples**: Karina Grant (London), local Reiki practitioners, EFT coaches, breathwork facilitators
* *Local Heroes pay a monthly listing fee (£5–£10/month) to be featured in the directory. Their profile includes contact details, availability, and a direct booking link.*
* **Graduation**: A Local Hero who reaches 50,000+ followers on a single platform graduates to Luminary. Their badge updates automatically when an admin updates their tier in the dashboard.

#### Tier Summary Table
| Tier | Badge | Follower Threshold | Pays? |
| :--- | :--- | :--- | :--- |
| ⭐ Superhero | Amber | 500k+ on one platform OR mainstream recognition | No |
| 🕊️ Ascended Master | Gold | Deceased; foundational body of work | No |
| ✨ Luminary | Violet | 50k–499k on one platform | Eventually yes (nominal) |
| 🌿 Local Hero | Emerald | Under 50k across all platforms | Yes — £5–£10/month |

#### Entity Types
Not every entry in the healers table is a person. `entity_type` separates the two:
* **individual** — a practitioner or teacher. Appears in the tier shelves and, for Superheroes, the hero billboard.
* **channel** — a YouTube channel, podcast, or collective.
* **app** — a wellness or meditation app (e.g. Headspace).

Channels and apps keep their `tier` but are pulled out of the tier shelves into the **Explore These Channels** shelf. They have no availability of their own and always save as Worldwide. A NULL `entity_type` is treated as individual.

🧱 Core Modules
| Module | Description | Platform |
| :--- | :--- | :--- |
| Emotional Search | "How are you feeling today?" → mapped content | Web + App |
| Books Library | Curated archive sorted by subject | Web + App |
| Videos Library | Tagged content from top teachers | Web + App |
| Healer Directory | Global directory with contact funnels | Web + App |
| My Library | Personal saved archive, organised by subject | Web + App |
| IAM Notifications | AI-driven affirmation reminders | App Only |
| User Dashboard | Saved items, emotional trends, journey timeline | App Only |

🗄️ Tech Stack
| Layer | Technology |
| :--- | :--- |
| Web Frontend | Next.js (React) + Tailwind CSS |
| Web Hosting | Vercel |
| Native App (Phase 2) | Flutter (iOS & Android) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Content Ingestion | URL parsing — YouTube ID + Amazon ASIN extraction |
| AI Layer | Custom GPT (dual role: user guide + content curator) |
| Dev Environment | VS Code + Claude Code |

🌐 Web App Architecture
The `/web` directory contains the full Next.js application.

#### Key Pages
* `/` — Homepage — masthead, emotional search, sticky subject pills, hero billboard, healer and publisher shelves, on-demand Explore More
* `/subject/[slug]` — Subject page — every healer, book, and video carrying that subject tag
* `/healers/[slug]` — Individual healer profile with bio, photo mosaic, offerings, contact funnel
* `/books/[slug]` — Book detail page — cover, description, purchase links, Want to Read / Mark as Read, reviews placeholder
* `/offerings/[slug]` — Offering detail page (courses / retreats / downloads / memberships) with contextual CTA
* `/free-resources/[slug]` — Free resource detail page
* `/publishers/[slug]` — Publishing house profile — bio, linked authors, and one auto-curated book shelf per author
* `/library` — Personal saved library, auto-organised by subject
* `/admin` — Content ingestion dashboard (videos, books, courses, healers, free resources, publishers). **Protected by password login** — a session-cookie auth screen at `/admin/login`, gated by `web/proxy.js`. The password lives only in the `ADMIN_PASSWORD` environment variable (never in the codebase); it must be set both locally in `web/.env.local` and in Vercel → Settings → Environment Variables.

#### Key Components
| File | Purpose |
| :--- | :--- |
| web/components/HomePageContent.js | Homepage data layer + shelf composition (server component) |
| web/components/HomeMasthead.jsx | Navbar + search + subject pills, and the scroll handoff between them |
| web/components/SiteLogo.jsx | The gold star + "Spiritpedia" wordmark, as one link home — shared by every nav |
| web/components/SiteFooter.jsx | Site-wide footer — health disclaimer and legal links |
| web/components/LibraryBar.jsx | Floating "✦ My Library" button, fixed bottom-centre on every page |
| web/components/ExploreMore.jsx | On-demand shelves — nothing below the healer rows is fetched until asked for |
| web/components/EmotionSearch.js | The emotional search bar and every gate in front of it |
| web/components/HeroBillboard.js | Rotating full-bleed feature — Superheroes interleaved with Ascended Masters |
| web/components/SubjectPills.js | 5-pillar subject nav with overlay sub-subject dropdown |
| web/components/ContentShelf.js | Reusable horizontal-scroll shelf — every homepage row is one |
| web/components/ShelfRow.js | Shared shelf heading (title / subtitle / "See all") |
| web/components/CardImage.js | Card artwork — lazy-loaded, and survives a dead image URL |
| web/components/VideoGrid.js | Vertical video grid with progressive "Load more" reveal |
| web/components/HealerCard.js | Healer card — four-tier badge, tier tooltip, favourite toggle, portrait fallback |
| web/components/PublisherCard.jsx | Publishing house card — logo panel, author count, favourite toggle |
| web/components/BookCard.js | Book cover with synopsis popover and affiliate deep links |
| web/components/VideoPlayer.js | Thumbnail that swaps to an inline YouTube iframe on click |
| web/components/OfferingCard.js | Paid offering card — CTA varies by product_type |
| web/components/FreeResourceCard.js | Free resource card with resource_type badge |
| web/components/ShareButton.jsx | Share control — native OS sheet on touch devices, dropdown menu elsewhere |
| web/components/LibraryView.js | Dynamic library with subject parsing and tri-tab view |

`DeferredShelves.jsx` was the first attempt at deferring the lower shelves. It
deferred only the *rendering* — the data still arrived with the page — so it was
removed when `ExploreMore.jsx` replaced it with a genuine on-demand fetch.

#### Homepage Layout (Streaming Model)
The homepage is a Netflix-style shelf stack. Top to bottom:

`Navbar → Emotional search → Subject pills → Hero billboard → Healer & publisher shelves → Explore More`

**The navbar** carries the logo on the left, and a share button plus an account
icon on the right. The share button is desktop and tablet only — on a phone the
OS share sheet is one tap away on every detail page, and the header needs the
room. The account icon is a placeholder holding its position in the bar until
the account area is built; it links nowhere yet.

**The pills stay at the top.** The navbar is pinned while you scroll the search
bar away, then slides up and out at the exact moment the subject pills reach the
top, leaving the pills docked in its place. One bar is always at the top of the
viewport and the two never overlap. The trigger is a zero-height sentinel in
normal flow directly above the pills — a sticky element cannot be observed for
this itself, because once docked it stays in view and never reports leaving.
Both bars use `position: sticky`, so neither leaves the document flow and
nothing below them can jump when they dock.

**The floating library button** — `✦ My Library`, violet, fixed bottom-centre —
renders from the root layout, so it follows the visitor across every page except
`/admin`. It replaced the per-page My Library links that used to sit in each
navbar.

The billboard rotates every 8 seconds inside a fixed frame (450px desktop, 300px
mobile) through Superheroes and Ascended Masters interleaved three-to-one, so a
Timeless Teacher surfaces early instead of after fifty Superheroes. The opening
slide is chosen on the server, so each visit leads with a different face and
there is no jump after hydration.

Below it, each shelf is a `ContentShelf`, in this order:

| Shelf | Who appears |
| :--- | :--- |
| **Worldwide** | Superheroes (individuals) |
| **Rising Voices** | Luminaries (individuals) |
| **Practitioners Near You** | Local Heroes |
| **Timeless Teachers** | Ascended Masters |
| **Publishing Houses** | Publishers, with their author counts |
| **Explore These Channels** | Channels and apps, regardless of tier |
| **Explore More** | Free Resources · Books & Literature · Courses & Programmes · Retreats & Live Events · Downloads & Audio · Videos — **fetched on demand** |

A shelf whose query returns nothing renders nothing at all rather than an empty heading. The subject filter (`?subject=`) narrows *every* collection on the page, not just the healer rows.

#### 5-Pillar Subject Taxonomy
The subject pills cluster database subject slugs under five Master Keys, defined in `SUBJECT_TAXONOMY` at the top of `web/components/SubjectPills.js`:

**Emotional Healing · Consciousness · Manifestation & Creation · Mystical & Spiritual Exploration · Body & Energy**

Hovering (or tapping) a pillar floats a panel of its sub-subjects over the billboard. Adding a new subject to a pillar means adding its slug to that map — the pill nav is driven by the taxonomy, while the sub-subject links are driven by the `subjects` table.

#### Explore More — On-Demand Shelves
Everything below the healer rows is fetched by the client only when a visitor
asks for it. A card grid — *"What would you like to discover?"* — offers the
sections not yet open; pressing one fetches that shelf's rows and opens it
beneath a skeleton placeholder. Shelves stack in the order they were chosen and
stay open, the chooser follows the last one carrying whatever is left, and it
disappears once all six are open.

This is what fixed the homepage's weight. The page used to fetch and render
every shelf on arrival — books, videos, courses, retreats, downloads and free
resources — for content most visitors never scrolled to:

| | Before | After |
| :--- | :--- | :--- |
| First-load payload | ~8 MB | ~824 KB |
| Image requests | 2,142 | 17 |

Two changes got there. The server component now fetches only subjects, healers
and publishers; and every card image goes through `CardImage`, which carries
`loading="lazy"` and `decoding="async"` so artwork is fetched as it nears the
viewport. The hero billboard stays eager — it is the page's LCP element.

Videos page in batches of 12 via a **Load more videos** button, each press
fetching the next page rather than slicing a pre-loaded pool. The order is
`created_at DESC, id DESC`: the bulk import gave thousands of videos the same
`created_at` to the microsecond, and ordering on that alone left Postgres free to
break ties differently per query — pages overlapped and some rows became
unreachable. Measured before the fix: three pages returned 36 rows but only 28
distinct videos. `id` is unique, so it settles every tie.

#### Emotional Search & the Mapping System
The search bar is the sacred entry point, and it is also where the platform is
most exposed. Someone typing how they feel may be looking for a meditation — or
may be in real trouble. The mapping system lives in
`web/utils/emotionSearchPatterns.js` (pure, no database, no network) and is wired
into `web/components/EmotionSearch.js`.

The gates run in a fixed order, and the order is not negotiable:

1. **Normalise.** Lowercase, strip accents and apostrophe variants, then peel
   112 lead-in phrases (`i feel`, `i have been feeling`, `why do i always`),
   determiners and trailing filler until a bare emotion is left.
2. **Crisis intercept.** 103 phrases across seven categories — suicidal
   ideation, self-harm, eating disorder, active abuse, sexual assault, child
   protection, acute crisis. A match suppresses *everything*, including
   universal search, and renders an interstitial pointing to
   [findahelpline.com](https://findahelpline.com/) — free, confidential support
   in the visitor's own country. No carousels render on that screen, no clinical
   vocabulary, no red, and "Take me back to Spiritpedia" is a real, unshamed way
   out. The intercept also guards the Enter key, not just the debounced
   keystroke path.
3. **Dual path.** 16 phrases — "hearing voices" chief among them — mean
   channelling to one person and psychosis to another. Rather than guess, the
   bar asks, warmly and with both options carrying equal weight, and maps on the
   answer.
4. **Soft tier.** Phrases that are heavy but not emergencies ("hopeless", "i
   hate myself") return results with a gentler framing line above them.
5. **Lookup.** A candidate cascade from the normalised query, exact match first;
   a partial (`ilike`) match is the last resort, never the first.
6. **Medical disclaimer.** Results weighted towards quantum healing, homeopathy,
   energy medicine or ayurveda carry *"Complementary to, not a replacement for,
   medical care."*

The mapping data lives in `emotion_mappings`: **693 distinct emotions** across
**3,488 weighted rows**, covering **all 42 subjects**.

#### Publishing Houses
A publishing house is a first-class entity, not a text field on a book. Houses
appear in their own homepage shelf, each card showing the logo and a live author
count read straight from the `publisher_healers` junction in the same query.

A profile at `/publishers/[slug]` carries the house's bio (paragraph breaks
preserved, capped and scrollable so a long history cannot push the catalogue off
the fold), a row of linked authors, and then **one book shelf per author**,
ordered by tier — Superhero first, an unknown tier last rather than dropped. A
single combined shelf buried every author but the few whose titles happened to
sort first.

Publishers can be favourited like anything else, and saved houses get their own
**Saved Publishers** section in My Library. Every link out of a publisher profile
carries `?from=` / `?fromTitle=`, so a healer opened from Hay House offers its
way back to Hay House rather than the homepage.

#### Site-wide Footer
Rendered once from the root layout, so it appears on every page except `/admin`.
It carries a health disclaimer — warm rather than legalistic, framing informed
choice and professional advice as part of the journey rather than a warning
against it — a copyright line, and placeholder Privacy Policy and Terms of Use
links. **Those two links are `href="#"` and go nowhere yet; the pages still need
writing.**

#### My Library
The library at `/library` reads saved items from local storage (`favorited_healers`, `favorited_publishers`, `favorited_books`, `favorite_videos`, `favorited_courses`, `favorited_free_resources`), maps them against Supabase subject slugs, and generates folders dynamically. Empty categories are hidden automatically.

🗄️ Database Structure (Supabase)
#### Tables
* **healers**: `id`, `name`, `healer_slug`, `bio`, `tier`, `entity_type`, `birth_year`, `death_year`, `image_urls[]`, `subject_slugs[]`, `availability_type`, `country`, `city`, `contact_email`, `contact_phone`, `booking_url`, `website_url`, `youtube_url`, `instagram_url`, `facebook_url`, `twitter_url`, `tiktok_url`
* **books**: `id`, `title`, `slug`, `author`, `description`, `mock_cover_url`, `amazon_url`, `goodreads_url`, `worldofbooks_url`, `subject_slugs[]`, `healer_slug`
* **videos**: `id`, `title`, `platform_url`, `subject_slugs[]`, `healer_slug`
* **subjects**: `id`, `name`, `slug`
* **courses**: `id`, `title`, `description`, `course_url`, `price`, `image_url`, `product_type`, `affiliate_status`, `start_date`, `end_date`, `is_active`, `subject_slugs[]`, `healer_id`
* **free_resources**: `id`, `title`, `description`, `resource_url`, `resource_type`, `image_url`, `is_featured`, `is_active`, `start_date`, `end_date`, `subject_slugs[]`, `healer_id`
* **publishers**: `id` (uuid), `name`, `slug`, `description`, `website_url`, `logo_url`, `founded_year`, `subject_slugs[]`
* **publisher_healers**: `id`, `publisher_id` (→ publishers.id), `healer_id` (→ healers.id) — the many-to-many junction linking a publishing house to its authors
* **emotion_mappings**: `id`, `emotion`, `subject_slug`, `weight` — powers the emotional search bar; one emotion maps to several weighted subjects. 3,488 rows covering 693 distinct emotions and all 42 subjects

#### Conventions worth knowing
* **`subject_slugs` is a Postgres array**, not a string. Every subject filter is an array-containment check (`.contains(...)` → the `@>` operator), which matches a slug as one whole element — that is what makes hyphenated tags like `eft-tapping` safe.
* **Healers, books, and videos link by `healer_slug`** (text). **Courses, free resources, and publishers link by `healer_id`** (bigint, via the `publisher_healers` junction for publishers). The two are not interchangeable.
* **Books resolve by `slug`**, not id — `/books/[slug]` is SEO-friendly, and `books.slug` is unique and backfilled from the title. Publishers resolve by `slug` too.
* **`tier`** replaces the legacy `is_famous` boolean. Values: `superhero` / `ascended_master` / `luminary` / `local_hero`. Anything else — including NULL mid-backfill — still surfaces in the Practitioners Near You shelf so no practitioner silently vanishes, but the card renders a neutral grey "Teacher" badge rather than borrowing Local Hero's, so bad data is visible instead of mislabelled.
* **`entity_type`**: `individual` / `channel` / `app`. NULL is treated as `individual`. Channels and apps are filtered out of the tier shelves and the billboard in memory — no separate query.
* **`birth_year` / `death_year`** are optional integers, collected in the admin form only when the tier is Ascended Master. The profile shows `1931 — 2015` when both are set, `b. 1931` when only the birth year is known, and nothing when neither is.
* **`courses` stores every paid offering**, split by `product_type`: `course` / `download` / `membership` / `retreat`. An unset value is treated as a course, so legacy rows predating the column still surface.
* **`free_resources.resource_type`**: `meditation` / `download` / `mini_course` / `workshop` / `practice`.
* **Expiration is enforced at query level.** Courses and free resources only surface while live: `is_active` is true, and `end_date` is either NULL (evergreen) or not yet past. The window is recomputed per request, so it rolls forward on its own.

💰 Monetisation
* **Local Hero directory listings**: £5–£10/month per practitioner
* **Luminary listings (future)**: Nominal fee once platform delivers measurable value
* **Affiliate links**: Amazon books embedded in content cards
* **Premium features (Phase 2)**: Personalised journeys, AI coaching, advanced library

✅ Project Status
| Milestone | Status |
| :--- | :--- |
| Supabase backend live | ✅ Complete |
| Next.js web app core | ✅ Complete |
| Four-tier healer system (Superhero / Ascended Master / Luminary / Local Hero) | ✅ Complete |
| is_famous → tier field migration | ✅ Complete |
| Netflix-style homepage (billboard + shelves + video grid) | ✅ Complete |
| 5-pillar subject pill navigation | ✅ Complete |
| Subject pages on the shared dark shelf layout | ✅ Complete |
| Healer profiles with contact funnels and offerings | ✅ Complete |
| Courses / retreats / downloads / memberships | ✅ Complete |
| Free resources shelf | ✅ Complete |
| Query-level expiration filtering | ✅ Complete |
| Books with affiliate deep links | ✅ Complete |
| My Library with dynamic subject folders | ✅ Complete |
| Admin ingestion dashboard + duplicate guards | ✅ Complete |
| URL parsing automation (YouTube + Amazon) | ✅ Complete |
| Emotional search bar — emotion → subject mapping wired to the input | ✅ Complete |
| Animated typewriter homepage search bar | ✅ Complete |
| Universal search across healers, books, videos, and subjects | ✅ Complete |
| Offering detail pages (courses / retreats / downloads / free resources) | ✅ Complete |
| Book detail pages (purchase links, Want to Read, Mark as Read, reviews placeholder) | ✅ Complete |
| Publisher admin tab + public publisher profile pages | ✅ Complete |
| Book URLs migrated to SEO-friendly slugs | ✅ Complete |
| Admin authentication — password login + session cookie (`ADMIN_PASSWORD` env var) | ✅ Complete |
| Entity types — channels and apps split into their own shelf | ✅ Complete |
| Ascended Master tier — gold badge, Timeless Teachers shelf, lifespan | ✅ Complete |
| Vercel production deployment — live at [spiritpedia.co](https://spiritpedia.co) | ✅ Complete |
| Open Graph + Twitter card metadata across every page | ✅ Complete |
| Share button — native OS sheet on mobile, dropdown on desktop | ✅ Complete |
| Brand identity — gold star mark, Spiritpedia wordmark, circular favicon | ✅ Complete |
| Emotional mapping system — crisis intercept, dual path, soft tier, medical disclaimer | ✅ Complete |
| Publishing Houses — homepage shelf, profiles, per-author shelves, favourites | ✅ Complete |
| Homepage performance — on-demand shelves, lazy images, video pagination | ✅ Complete |
| Sticky subject pills + navbar handoff + floating My Library button | ✅ Complete |
| Site-wide footer with health disclaimer | ✅ Complete |
| Content library (target: 5,000 videos + 5,000 books) | ⬜ Ongoing |
| Flutter native app | ⬜ Phase 2 |
| IAM notification system | ⬜ Phase 2 |

📊 Content Library
| Collection | Count |
| :--- | :--- |
| Healers | 127 |
| Videos | 2,269 |
| Books | 963 |
| Courses & offerings | 1,103 |
| Free resources | 461 |
| Publishing houses | 2 (Hay House, Sounds True) |
| Subjects | 42 |
| Emotion mappings | 3,488 rows · 693 emotions |

Healers by tier: 62 Superhero · 48 Luminary · 14 Ascended Master · 3 Local Hero.

💡 Immediate Next Steps
| Item | Status |
| :--- | :--- |
| Ascended Masters tier — Wayne Dyer, Louise Hay, Ram Dass | ✅ Complete |
| Publishing Houses — shelf, profiles, per-author book shelves, favourites | ✅ Complete |
| Emotional mapping system — crisis intercept, dual path, soft tier, disclaimer | ✅ Complete |
| Homepage performance fix — 8MB → 824KB | ✅ Complete |
| Social sharing — Open Graph tags and share buttons | ✅ Complete |
| Site-wide footer + health disclaimer | ✅ Complete |
| [spiritpedia.co](https://spiritpedia.co) live | ✅ Complete |
| **User Onboarding Flow** | ⬜ **Current task** |
| Backend / Admin System | ⬜ Next |
| Google Analytics GA4 | ⬜ Next |
| Ancient Teachers — Jesus, Buddha, Lao Tzu; needs its own tier infrastructure | ⬜ Next |
| Privacy Policy and Terms of Use pages — the footer links are placeholders | ⬜ Open |
| `SITE_URL` still points at `www.spirit-pedia.com` — canonical and og:url tags on spiritpedia.co name the old domain | ⬜ Open |
| Content library (target: 5,000 videos + 5,000 books) | ⬜ Ongoing |
| Flutter app build | ⬜ Phase 2 |

Made with love in Tavira 💫
