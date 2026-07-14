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
| Web App (Next.js) | Primary product — full discovery experience | ✅ Active development |
| Native App (Flutter) | Phase 2 — iOS & Android with push notifications | ⬜ Planned |

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
Spiritpedia uses a three-tier system to classify all practitioners and teachers on the platform. Tiers reflect reach and recognition — and crucially, they are not fixed. Every healer on Spiritpedia has the opportunity to grow and graduate to a higher tier as their audience and impact grows.

This graduation mechanic is intentional. Spiritpedia is not just a directory — it is a career platform for spiritual practitioners.

#### ⭐ Superhero (Amber badge)
Global household names. Mainstream recognition beyond the spiritual community. Their books are in every bookshop. A person with no interest in spirituality has likely heard of them.
* **Threshold**: 500,000+ followers on a single platform, OR mainstream name recognition regardless of follower count.
* **Examples**: Eckhart Tolle, Abraham Hicks, Joe Dispenza, Deepak Chopra, Wayne Dyer
* *Superheroes are listed for platform authority and content value. They do not pay for listings.*

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
| ✨ Luminary | Violet | 50k–499k on one platform | Eventually yes (nominal) |
| 🌿 Local Hero | Emerald | Under 50k across all platforms | Yes — £5–£10/month |

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
* `/` — Homepage — emotional search, subject pills, hero billboard, content shelves, video grid
* `/subject/[slug]` — Subject page — every healer, book, and video carrying that subject tag
* `/healers/[slug]` — Individual healer profile with bio, photo mosaic, offerings, contact funnel
* `/library` — Personal saved library, auto-organised by subject
* `/admin` — Content ingestion dashboard

#### Key Components
| File | Purpose |
| :--- | :--- |
| web/components/HomePageContent.js | Homepage data layer + shelf composition |
| web/components/HeroBillboard.js | Rotating full-bleed Superhero feature (fixed 450px frame) |
| web/components/SubjectPills.js | 5-pillar subject nav with overlay sub-subject dropdown |
| web/components/ContentShelf.js | Reusable horizontal-scroll shelf — every homepage row is one |
| web/components/ShelfRow.js | Shared shelf heading (title / subtitle / "See all") |
| web/components/VideoGrid.js | Vertical video grid with progressive "Load more" reveal |
| web/components/HealerCard.js | Healer card — tier badge, favourite toggle, portrait fallback |
| web/components/BookCard.js | Book cover with synopsis popover and affiliate deep links |
| web/components/VideoPlayer.js | Thumbnail that swaps to an inline YouTube iframe on click |
| web/components/OfferingCard.js | Paid offering card — CTA varies by product_type |
| web/components/FreeResourceCard.js | Free resource card with resource_type badge |
| web/components/LibraryView.js | Dynamic library with subject parsing and tri-tab view |

#### Homepage Layout (Streaming Model)
The homepage is a Netflix-style shelf stack. Top to bottom:

`Nav → Emotional search → Subject pills → Hero billboard → Content shelves → Video grid`

The billboard rotates through Superheroes every 8 seconds inside a fixed 450px frame. Below it, each shelf is a `ContentShelf` — Featured Healers, Luminaries, Free Resources, Books, Courses, Retreats, Downloads, Local Heroes — and a shelf whose query returns nothing renders nothing at all rather than an empty heading. The subject filter (`?subject=`) narrows *every* collection on the page, not just the healer rows.

#### 5-Pillar Subject Taxonomy
The subject pills cluster database subject slugs under five Master Keys, defined in `SUBJECT_TAXONOMY` at the top of `web/components/SubjectPills.js`:

**Emotional Healing · Consciousness · Manifestation & Creation · Mystical & Spiritual Exploration · Body & Energy**

Hovering (or tapping) a pillar floats a panel of its sub-subjects over the billboard. Adding a new subject to a pillar means adding its slug to that map — the pill nav is driven by the taxonomy, while the sub-subject links are driven by the `subjects` table.

#### My Library
The library at `/library` reads saved items from local storage (`favorited_books`, `favorite_videos`, `favorited_healers`), maps them against Supabase subject slugs, and generates folders dynamically. Empty categories are hidden automatically.

🗄️ Database Structure (Supabase)
#### Tables
* **healers**: `id`, `name`, `healer_slug`, `bio`, `tier`, `image_urls[]`, `subject_slugs[]`, `availability_type`, `country`, `city`, `contact_email`, `contact_phone`, `booking_url`, `website_url`, `youtube_url`, `instagram_url`, `facebook_url`, `twitter_url`, `tiktok_url`
* **books**: `id`, `title`, `author`, `description`, `mock_cover_url`, `amazon_url`, `goodreads_url`, `worldofbooks_url`, `subject_slugs[]`, `healer_slug`
* **videos**: `id`, `title`, `platform_url`, `subject_slugs[]`, `healer_slug`
* **subjects**: `id`, `name`, `slug`
* **courses**: `id`, `title`, `description`, `course_url`, `price`, `image_url`, `product_type`, `affiliate_status`, `start_date`, `end_date`, `is_active`, `subject_slugs[]`, `healer_id`
* **free_resources**: `id`, `title`, `description`, `resource_url`, `resource_type`, `image_url`, `is_featured`, `is_active`, `start_date`, `end_date`, `subject_slugs[]`, `healer_id`

#### Conventions worth knowing
* **`subject_slugs` is a Postgres array**, not a string. Every subject filter is an array-containment check (`.contains(...)` → the `@>` operator), which matches a slug as one whole element — that is what makes hyphenated tags like `eft-tapping` safe.
* **Healers, books, and videos link by `healer_slug`** (text). **Courses and free resources link by `healer_id`** (bigint). The two are not interchangeable.
* **`tier`** replaces the legacy `is_famous` boolean. Values: `superhero` / `luminary` / `local_hero`. Anything else — including NULL mid-backfill — falls back to Local Hero, so no practitioner silently vanishes.
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
| Three-tier healer system (Superhero / Luminary / Local Hero) | ✅ Complete |
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
| Emotion-to-subject mapping wired to search | ⬜ Not started — the search bar is still an inert input |
| Vercel production deployment | ⬜ Next |
| Content library (target: 5,000 videos + 5,000 books) | ⬜ Ongoing |
| Flutter native app | ⬜ Phase 2 |
| IAM notification system | ⬜ Phase 2 |

💡 Immediate Next Steps
1. **Wire "How are you feeling today?" to emotion → subject mapping.** The input renders but has no handler — this is the one core promise of the product that is not yet built.
2. Deploy to Vercel (production)
3. Begin content build — target 200 videos/week

Made with love in Tavira 💫
