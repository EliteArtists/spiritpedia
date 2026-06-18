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
Push notifications are a core part of the Spiritpedia experience — the IAM (I AM) affirmation system requires reliable native push. Web push on iOS is unreliable. Flutter is the right long-term home.

 Bento Subject-Based Navigation (The Just Eat Model)
Spiritpedia is structured like a spiritual delivery app. Instead of "Pizza" or "Thai Food," users explore subjects such as:

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
All practitioners on Spiritpedia are classified into one of three tiers:

| Tier | Badge | Who They Are |
| :--- | :--- | :--- |
| ⭐ Superhero | Amber | Global household names. Millions of followers. Books in every bookshop. (Eckhart Tolle, Abraham Hicks, Joe Dispenza) |
| 🌟 Guide | Blue/Purple | Respected teachers with real audiences. Published or significant YouTube presence. 50k–500k followers. (Teal Swan, Matt Kahn, Kyle Cease) |
| 🌿 Local Hero | Emerald | Practitioners operating locally or with a small online presence. Paid directory tier. |

*Only Local Heroes pay for their listing (£5–£10/month). Superheroes and Guides are listed for content value.*

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
* `/` — Homepage: emotional search, subject filters, healer carousel, books, videos
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
`[ Superhero | Superhero | Local Hero ]`
If a filtered subject has no Local Heroes, a conversion tile renders automatically to drive healer registrations.

#### My Library
The library at `/library` reads saved items from local storage (`favorited_books`, `favorite_videos`, `favorited_healers`), maps them against Supabase subject slugs, and generates folders dynamically. Empty categories are hidden automatically.

🗄️ Database Structure (Supabase)
#### Tables
* **healers**: `id`, `name`, `slug`, `bio`, `is_famous`, `tier`, `images[]`, `availability_type`, `contact_email`, `contact_phone`, `booking_url`
* **books**: `id`, `title`, `slug`, `cover_url`, `amazon_asin`, `subject_slug`, `healer_id`
* **videos**: `id`, `title`, `youtube_id`, `thumbnail_url`, `subject_slug`, `healer_id`
* **subjects**: `id`, `name`, `slug`, `parent_category`

#### Content Ingestion
Paste a URL → system extracts:
* YouTube URL → video ID → thumbnail generated automatically
* Amazon URL → ASIN → book cover generated automatically

💰 Monetisation
* **Healer directory listings**: £5–£10/month per Local Hero
* **Affiliate links**: Amazon books embedded in content cards
* **Premium features (Phase 2)**: Personalised journeys, AI coaching, advanced library

✅ Project Status
* [x] Supabase backend live
* [x] Next.js web app core
* [x] Homepage with emotional search
* [x] Subject-based filtering
* [x] Healer profiles with contact funnels
* [x] Books carousel with affiliate links
* [x] Video grid with thumbnails
* [x] My Library with dynamic subject folders
* [x] Admin dashboard
* [x] URL parsing automation
* [ ] Emotion-to-subject mapping (wired)
* [ ] Guide tier implementation
* [ ] Vercel production deployment
* [ ] Content library (target: 5,000 videos + 5,000 books)
* [ ] Flutter native app (Phase 2)
* [ ] IAM notification system (Phase 2)

💡 Immediate Next Steps
1. Wire "How are you feeling today?" search bar to emotion → subject mapping
2. Implement Guide tier (third healer category between Superhero and Local Hero)
3. Deploy to Vercel (production)
4. Begin content build — target 200 videos/week

Made with love in Tavira 💫
