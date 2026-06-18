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
* `/` — Homepage — emotional search, subject filters, healer carousel, books, videos
* `/healers/[slug]` — Individual healer profile with bio, photo mosaic, contact funnel
* `/library` — Personal saved library, auto-organised by subject
* `/admin` — Content management dashboard

#### Key Components
| File | Purpose |
| :--- | :--- |
| web/components/HomePageContent.js | Homepage layout, 2+1 healer matrix, subject carousels |
| web/components/HealerCard.js | Healer card with tier badge and favourite toggle |
| web/components/BookCard.js | Book card with light/dark variant and affiliate links |
| web/components/VideoPlayer.js | Video card with thumbnail and favourite toggle |
| web/components/LibraryView.js | Dynamic library with subject parsing and tri-tab view |
| web/app/healers/[slug]/page.js | Healer profile page with contact panel |
| web/app/library/page.js | Library page — hydrates from Supabase |
| web/app/admin/page.js | Admin dashboard |

#### 2+1 Healer Matrix
The homepage healer shelf renders in groups of three:
`[ Superhero / Luminary | Superhero / Luminary | Local Hero ]`

If a filtered subject has no Local Heroes, a conversion tile renders automatically to drive healer registrations.

#### My Library
The library at `/library` reads saved items from local storage (`favorited_books`, `favorite_videos`, `favorited_healers`), maps them against Supabase subject slugs, and generates folders dynamically. Empty categories are hidden automatically.

🗄️ Database Structure (Supabase)
#### Tables
* **healers**: `id`, `name`, `slug`, `bio`, `tier`, `images[]`, `availability_type`, `contact_email`, `contact_phone`, `booking_url`
* **books**: `id`, `title`, `slug`, `cover_url`, `amazon_asin`, `subject_slug`, `healer_id`
* **videos**: `id`, `title`, `youtube_id`, `thumbnail_url`, `subject_slug`, `healer_id`
* **subjects**: `id`, `name`, `slug`, `parent_category`

*Note: The legacy is_famous boolean field has been replaced by the tier field (values: superhero / luminary / local_hero). Badge colour and display logic are driven by this field across all components.*

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
| Homepage with emotional search bar | ✅ Complete |
| Subject-based filtering with dropdowns | ✅ Complete |
| Healer profiles with contact funnels | ✅ Complete |
| Books carousel with affiliate links | ✅ Complete |
| Video grid with thumbnails | ✅ Complete |
| My Library with dynamic subject folders | ✅ Complete |
| Admin dashboard | ✅ Complete |
| URL parsing automation (YouTube + Amazon) | ✅ Complete |
| Three-tier healer system (Superhero / Luminary / Local Hero) | ⬜ In progress |
| is_famous → tier field migration | ⬜ In progress |
| Emotion-to-subject mapping wired to search | ⬜ In progress |
| Vercel production deployment | ⬜ Next |
| Content library (target: 5,000 videos + 5,000 books) | ⬜ Ongoing |
| Flutter native app | ⬜ Phase 2 |
| IAM notification system | ⬜ Phase 2 |

💡 Immediate Next Steps
1. Wire "How are you feeling today?" search bar to emotion → subject mapping
2. Implement Luminary tier (third healer category between Superhero and Local Hero)
3. Deploy to Vercel (production)
4. Begin content build — target 200 videos/week

Made with love in Tavira 💫
