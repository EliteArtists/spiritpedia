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
* `/` — Homepage — masthead, emotional search, sticky subject pills, then two tabs: **Videos** and **Discover**. Discover is the billboard, healer and publisher shelves and on-demand Explore More; Videos is seven shelves fetched only when the tab is opened
* `/subject/[slug]` — Subject page — every healer, book and offering carrying that tag, then one video shelf per teacher
* `/healers/[slug]` — Individual healer profile with bio, photo mosaic, offerings, contact funnel
* `/books/[slug]` — Book detail page — cover, description, purchase links, Want to Read / Mark as Read, community reviews
* `/videos/[slug]` — Video detail page — 16:9 embed, teacher credit, share, community reviews
* `/offerings/[slug]` — Offering detail page (courses / retreats / downloads / memberships) with contextual CTA
* `/free-resources/[slug]` — Free resource detail page
* `/publishers/[slug]` — Publishing house profile — bio, linked authors, and one auto-curated book shelf per author
* `/library` — Personal saved library, auto-organised by subject
* `/privacy`, `/terms` — holding pages, `noindex` until written
* `/account` — account centre; becomes the Practitioner Dashboard for an approved practitioner. See Accounts & Authentication
* `/auth/*` — signup, verify, claim, practitioner-setup, pending
* `/admin` — CRM dashboard, ten sections. **Protected by password login** — a session-cookie auth screen at `/admin/login`, gated by `web/proxy.js`. The password lives only in the `ADMIN_PASSWORD` environment variable (never in the codebase); it must be set both locally in `web/.env.local` and in Vercel → Settings → Environment Variables. See Admin (CRM)

#### Key Components
| File | Purpose |
| :--- | :--- |
| web/components/HomePageContent.js | Homepage data layer + shelf composition (server component) |
| web/components/HomeMasthead.jsx | Navbar + search + subject pills, and the scroll handoff between them |
| web/components/SiteLogo.jsx | The gold star + "Spiritpedia" wordmark, as one link home — shared by every nav |
| web/components/SiteFooter.jsx | Site-wide footer — health disclaimer and legal links |
| web/components/LibraryBar.jsx | Floating "✦ My Library" button, fixed bottom-centre on every page |
| web/components/HomeTabs.jsx | The Videos / Discover tabs. Videos mounts on first click, then stays mounted and hidden |
| web/components/VideoShelves.jsx | Every video shelf — the seven defaults, the per-teacher shelves under a subject filter, and For You |
| web/components/ExploreMore.jsx | On-demand shelves — nothing below the healer rows is fetched until asked for |
| web/components/EmotionSearch.js | The emotional search bar and every gate in front of it |
| web/components/HeroBillboard.js | Rotating full-bleed feature — Superheroes interleaved with Ascended Masters |
| web/components/SubjectPills.js | 5-pillar subject nav with overlay sub-subject dropdown |
| web/components/ContentShelf.js | Reusable horizontal-scroll shelf — every homepage row is one |
| web/components/ShelfRow.js | Shared shelf heading (title / subtitle / "See all") |
| web/components/CardImage.js | Card artwork — lazy-loaded, and survives a dead image URL |
| web/components/HealerCard.js | Healer card — four-tier badge, tier tooltip, favourite toggle, portrait fallback |
| web/components/PublisherCard.jsx | Publishing house card — logo panel, author count, favourite toggle |
| web/components/BookCard.js | Book cover with synopsis popover and affiliate deep links |
| web/components/VideoPlayer.js | Video card — thumbnail routes to `/videos/[slug]`, heart saves without a page load |
| web/components/OfferingCard.js | Paid offering card — CTA varies by product_type |
| web/components/FreeResourceCard.js | Free resource card with resource_type badge |
| web/components/ShareButton.jsx | Share control — native OS sheet on touch devices, dropdown menu elsewhere |
| web/components/LibraryView.js | Dynamic library with subject parsing and tri-tab view |
| web/components/ReviewSection.jsx | Community reviews — the summary line, the list, and the submission form |
| web/components/admin/ConfirmDelete.jsx | The confirmation in front of every irreversible admin action |

`DeferredShelves.jsx` was the first attempt at deferring the lower shelves. It
deferred only the *rendering* — the data still arrived with the page — so it was
removed when `ExploreMore.jsx` replaced it with a genuine on-demand fetch.
`VideoGrid.js` went the same way: a flat paginated grid, replaced by
`VideoShelves.jsx` grouping videos per teacher.

#### Homepage Layout (Streaming Model)
The homepage is a Netflix-style shelf stack behind two tabs. Top to bottom:

`Navbar → Emotional search → Subject pills → Videos | Discover tabs → the chosen tab`

**Discover** is the default and is everything the homepage already was:
`Hero billboard → Healer & publisher shelves → Explore More`. It is passed into
the tab component as children, so it stays server-rendered and arrives in the
initial payload exactly as before.

**Videos** fetches nothing until its tab is clicked, then stays mounted and
hidden rather than unmounting — so a visitor who never opens it costs nothing,
and someone switching back and forth never refetches. See The Videos tab.

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

#### The Videos tab
2,269 videos, shelved three different ways depending on what the visitor has
asked for.

**No filter — seven shelves.** *New to Spiritpedia* (the 24 most recent), one per
pillar, and a mixed *Watch & Learn* catch-all. The pillar shelves do **not** lead
with the newest, and that is deliberate: they used to, and because the most
recent ingest was one large astrology batch whose videos each carry a second tag
landing in a different pillar, four of the five shelves opened with the same
batch. Each pillar now reads a random window inside its own result set, bounded
by its own count, and takes every third row of a window three shelves deep — ids
are sequential within an ingest and an ingest is one creator's back catalogue, so
twenty consecutive rows is twenty videos by the same person.

**With `?subject=` — one shelf per teacher**, biggest first. Entities with fewer
than three videos in that subject are dropped, each shelf caps at twelve cards and
is titled with a link to the teacher's profile, and fifteen shelves show before a
*Show N more*. A single paginated query grouped in the browser, rather than one
query per teacher.

**For You** — prepended for a signed-in member with enough signal. Subject
matching against what they have already saved, and the scoring is the whole of
it: ranking saved tags by raw count measures what the *catalogue* is tagged with,
not what the person likes. Across the healers and books people actually save
from, `self-healing` is on 50% of items, `spirituality` 43%, `consciousness` 37%
— every account came out with a top three inside the Consciousness pillar and two
came out identical. Dividing each tag by how common it is separates them. Two
guards keep it honest: four saves minimum, and at least one slug saved more than
once, because a single healer can carry 28 subject tags and breadth without depth
says nothing.

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
disappears once all five are open. Videos left this grid when they got their own
tab.

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

Every paged query in the codebase orders by `id`, never `created_at` alone. The
bulk import gave thousands of rows the same `created_at` to the microsecond, and
ordering on that leaves Postgres free to break ties differently per query — pages
overlap and some rows become unreachable. Measured before the fix: three pages of
videos returned 36 rows but only 28 distinct ones. `id` is unique, so it settles
every tie.

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

🔐 Accounts & Authentication
Email OTP only — no passwords, no social providers. Supabase Auth issues a
6-digit code (JWT expiry 24h; the length is the dashboard's "Email OTP Length"
setting, not ours, and `LENGTH` in the verify page must follow it).

#### Routes
* `/auth/signup` — email entry. `signInWithOtp` with `shouldCreateUser`, so sign-in and sign-up are one action
* `/auth/verify` — six code boxes, paste support, auto-submit. Also the magic-link landing page: a session present on mount means the link signed them in, so it completes instead of showing boxes
* `/auth/claim` — offered when an email matches an existing healer
* `/auth/practitioner-setup` — the application form; pre-loads existing answers so a rejected applicant edits rather than retypes
* `/auth/pending` — post-submission holding page
* `/account` — renders differently per state (see below)

#### Two Supabase clients, deliberately
* `utils/supabase.js` — anonymous, **stateless** (`persistSession: false`). Imported by server components, which share one long-running Node process; a client that persisted a session there could answer one visitor with another's identity
* `utils/supabaseAuth.js` — browser-only, holds the session (`persistSession`/`autoRefreshToken` true)

`utils/supabaseAdmin.js` is the service-role client. Server only, never imported by a client component.

#### AuthSync
`components/AuthSync.jsx` mounts from the root layout and creates the profile row
plus migrates localStorage favourites **whenever a session appears** — not just
on the verify page. Without it, a magic-link click or any returning visit left an
account with no profile. `INITIAL_SESSION` repairs existing damage on next visit.

#### The practitioner/explorer choice
`pending_user_types` carries it between submitting an email and verifying it,
keyed by email so it survives a magic link opened on another device.
sessionStorage alone cannot. Written via `/api/pending-user-type` (service role):
the table has no anon SELECT policy, which also makes an anonymous UPSERT fail
and an anonymous UPDATE silently match zero rows.

#### /account states
| State | Renders |
| :--- | :--- |
| explorer | account summary — email, type, sign out |
| practitioner · pending | "under review" notice |
| practitioner · approved | **Practitioner Dashboard** — Profile / Content / Settings tabs |
| rejected | notice + "update and resubmit" link. Rejection also reverts `user_type` to explorer |

A status badge is only ever shown for practitioners. An explorer is not pending anything.

⭐ Community Reviews
Live on books, videos, offerings and free resources. **Nothing is public until a
moderator approves it**, and that is enforced by the read policy rather than the
UI: `status = 'approved'`, so the anonymous key cannot see a pending review at
all. The author's own copy therefore needs their session, and so does every
write.

Three columns are never sent from the browser. `status` and `author_healer_slug`
belong to the table's trigger, which forces the first to `pending` and derives the
second from the submitter's own profile — a slug taken from the payload would let
anyone link their name to someone else's healer page. `author_name` is the one
field the trigger cannot fill, because `user_profiles` is readable only by its
owner and a public list has no way to join for it afterwards.

A second submission upserts on `(user_id, content_type, content_slug)`, so editing
a review is an edit rather than a second row. An approved practitioner's name on
a review links to their profile; everyone else's is plain text.

**The trigger freezes `status` for `anon` and `authenticated` and yields to the
service role.** Without that exemption nothing could ever be approved — a
`BEFORE UPDATE` trigger runs for every role, and the service role bypasses RLS,
not triggers. The first version of this reported "approved" on every press while
the review stayed in the queue, which is why `/api/admin/reviews` re-reads the row
and answers `409` rather than trusting a 200.

🛠️ Admin (CRM)
`/admin`, gated by `proxy.js` (session cookie from `ADMIN_PASSWORD`). Sidebar shell; ten sections.

| Section | State |
| :--- | :--- |
| Inbox | live — unified queue of applications, claims and pending reviews; three-pane reviewer; Approve / Reject / Approve & Next |
| People | live — Practitioners / Explorers tabs, search, 360° record with editable Profile, Content, Admin Notes, Activity, and a working Delete |
| Content | live — the **Healer Directory**: all 129 records, searchable, filterable by subject and claim state, each opening an editor |
| Reviews | live — Pending / Approved / Rejected, Approve and Reject, emails the reviewer |
| Claims | live — record of claimed profiles |
| Analytics | live — counts |
| Ingestion | live — the original ingestion form, unchanged |
| Messages · Flags · Mailshots · Settings | placeholders |

**The Healer Directory** was the gap behind "why don't pre-loaded healers appear
in People?". They never could: People lists *accounts* (`user_profiles`, 6 rows),
and a pre-loaded healer has none. The two populations meet only where an account
has claimed a profile. The directory pages on `id`, selects only the five columns
the list renders, and the record editor writes 21 fields through
`/api/admin/write`. `healer_slug` is **not** among them — videos and books find
their healer by that text, not a foreign key, so renaming it would orphan their
content and 404 the public page.

**Claimed status has no column.** `healers` carries no owner field; the link is
recorded only as `user_profiles.linked_healer_slug`, so the badge reads the
profiles the dashboard has already fetched. Where those cannot be read the badge
is absent rather than confidently wrong. A `claimed_at` column would make it a
property of the row.

**Deletes are wired, both behind the same confirmation dialog.** Deleting an
account removes the `auth.users` row — which is what actually removes the person,
since three foreign keys cascade off it, taking the profile, the saved library and
every internal note. Deleting a healer orphans its content and nothing in the
schema stops it, so the dialog counts the videos, books, offerings and resources
that will be left pointing at nobody before it asks.

**The Inbox badge counts everything pending**, applications and reviews alike, and
the same number feeds the top bar and the bell. A review in the queue carries an
`href` rather than a profile, which is what keeps it out of the three-pane
reviewer and sends it to the Reviews tab instead.

Needs `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_NAME` in the environment. Without
them the data sections show a named reason, never an empty list — an empty list
would claim nobody has signed up.

**Derived, not stored:** an application showing `incomplete` is a practitioner who
pressed "Skip for now", detected by the absence of `full_name`/`modality`. The
field-protection trigger pins `verification_status`, so the form could not write
such a state anyway. Approve is disabled for these — a healer with no name has no
reachable slug.

**Claimed vs admin-ingested** is decided by comparing `healers.created_at` with
`user_profiles.created_at`: approval creates the healer row, a claim links to one
that already existed. There is no claims table; a `claimed_at` column should
replace this.

🔒 Security model
Write access is the thing to understand before changing anything here.

* **The anon key ships in every page bundle.** Anything it may write, any visitor may write. It previously held UPDATE on `healers` and INSERT on four tables — fixed in `0007`
* **All content writes are server-side**, via `/api/admin/write` (admin cookie) and `/api/practitioner/profile` (user token). Reads stay in the browser
* **`user_profiles` carries a BEFORE INSERT OR UPDATE trigger** pinning `verification_status`, `linked_healer_slug`, `id` and `created_at` against ordinary callers. RLS is row-level and cannot express column limits. `service_role` and direct SQL pass through
* **`claim_healer_profile()`** is the only browser-reachable path to those two columns. It re-checks the caller's email server-side and never trusts a slug from the client. This is why `healers.contact_email` is read-only in the practitioner dashboard — an editable one would let a practitioner hand someone else a claim
* **`admin_notes` has RLS with no policies at all.** Notes *about* people; the subject must never be able to read them

#### API routes
| Route | Guard |
| :--- | :--- |
| `/api/admin/*` | admin session cookie, re-checked per route (`/api` is outside `proxy.js`'s matcher) |
| `/api/practitioner/profile` | user access token; slug read from their own profile row; writable fields are an allowlist |
| `/api/profile/resubmit` | user access token; only ever writes `pending` |
| `/api/pending-user-type` | open by design — pre-authentication, writes a value that grants nothing |
| `/api/admin/reviews` | admin cookie. `GET` returns the moderation queue (the anon key cannot see a pending review at all); `PATCH` sets the status **and** emails the reviewer |
| `/api/email/*` | user access token, verified against Supabase. **None of them take a user id** — identity comes from the token, because a route that emailed whichever id it was handed would be a way to send mail to any account on the platform |

📈 Analytics & SEO
* GA4 via `@next/third-parties`, excluded from `/admin`, rendered only when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set. **No consent gate yet** — see Next Steps
* Dynamic `sitemap.xml` (4,899 URLs, video pages included) and `robots.txt`. Paginated with an `id` tiebreaker: PostgREST caps responses at 1,000 rows and truncates silently
* Transactional email via Resend — see below

📧 Transactional Email
Five emails, all through `utils/email.js`, which decides the from address, the
reply-to, the BCC and the failure policy once.

| # | Email | Fires |
| :--- | :--- | :--- |
| 1 | Explorer welcome | account created, `user_type = explorer` |
| 2 | Practitioner welcome | account created, `user_type = practitioner` |
| 3 | Review received | a review is submitted |
| 4 | Review approved | a moderator approves it |
| 5 | Review rejected | a moderator rejects it |

From `Spiritpedia <hello@accounts.spiritpedia.co>` — a subdomain, so a
deliverability problem with transactional mail cannot damage the reputation of the
root domain the team send from by hand. Reply-to is `love@spiritpedia.co`, because
an email people cannot answer is a dead end. Every send is blind-copied to an
archive inbox, since nothing in the schema records that an email went out.

**A failed email never fails the action that triggered it.** Approving a
practitioner publishes them whether or not the congratulations arrived, so
`sendEmail` swallows everything and logs. It also inspects the SDK's `error`
field rather than only catching: **Resend resolves on a rejected send**, so an
unverified domain would otherwise be reported as success.

**The welcomes hang off the one signal that distinguishes a new account from a
returning one.** `ensureProfile` upserts `ON CONFLICT DO NOTHING` on every
sign-in, so treating that as a creation would email a welcome every time somebody
signed in. Adding `.select()` makes the insert return its row and the collision
return nothing — which also settles the race for free, since two callers run
`ensureProfile` concurrently by design and exactly one sees a row back.

**Email cannot be sent from the browser**: `RESEND_API_KEY` has no
`NEXT_PUBLIC_` prefix, deliberately. Each client-side trigger therefore has a thin
server route, and `utils/contentMeta.js` resolves a `content_type` + slug pair to
a title and creator name — three different joins, because books keep the author
inline, books and videos join `healers` by text slug, and courses and free
resources by bigint id. Nothing there throws; an unknown item falls back to its
slug and the templates drop the "by …" clause rather than render it empty.

`utils/resend.js` does **not** affect sign-in codes — those are sent by Supabase
Auth through its own SMTP.

🗄️ Migrations
Run in order from `supabase/migrations/`. There is no migration runner; paste into the Supabase SQL editor.

| File | Purpose |
| :--- | :--- |
| `0001_user_profiles` | profile table, RLS, field-protection trigger |
| `0002_user_favourites` | saved items, unique on (user, type, slug) |
| `0003_claim_healer_profile` | the claim RPC; replaces 0001's trigger function |
| `0004_pending_user_types` | practitioner/explorer choice across the verification gap |
| `0005_admin_notes` | internal notes; RLS on, no policies |
| `0006_lock_down_content_writes` | **superseded** — dropped policies by guessed name and silently did nothing |
| `0007_force_content_read_only` | enumerates `pg_policies` and drops by actual name. Ends with a SELECT so the result is visible rather than assumed |
| `0008_reviews` | the reviews table, its RLS, and the trigger that pins `status` and `author_healer_slug`. **Amended after the fact** to exempt the service role — the first version froze `status` against every caller, which meant no review could ever be approved |

🗄️ Database Structure (Supabase)
#### Tables
* **healers**: `id`, `name`, `healer_slug`, `bio`, `tier`, `entity_type`, `birth_year`, `death_year`, `image_urls[]`, `subject_slugs[]`, `availability_type`, `country`, `city`, `contact_email`, `contact_phone`, `booking_url`, `website_url`, `youtube_url`, `instagram_url`, `facebook_url`, `twitter_url`, `tiktok_url`
* **books**: `id`, `title`, `slug`, `author`, `description`, `mock_cover_url`, `amazon_url`, `goodreads_url`, `worldofbooks_url`, `subject_slugs[]`, `healer_slug`
* **videos**: `id`, `title`, `slug`, `platform_url`, `subject_slugs[]`, `healer_slug`
* **subjects**: `id`, `name`, `slug`
* **courses**: `id`, `title`, `description`, `course_url`, `price`, `image_url`, `product_type`, `affiliate_status`, `start_date`, `end_date`, `is_active`, `subject_slugs[]`, `healer_id`
* **free_resources**: `id`, `title`, `description`, `resource_url`, `resource_type`, `image_url`, `is_featured`, `is_active`, `start_date`, `end_date`, `subject_slugs[]`, `healer_id`
* **publishers**: `id` (uuid), `name`, `slug`, `description`, `website_url`, `logo_url`, `founded_year`, `subject_slugs[]`
* **publisher_healers**: `id`, `publisher_id` (→ publishers.id), `healer_id` (→ healers.id) — the many-to-many junction linking a publishing house to its authors
* **user_profiles**: `id` (→ auth.users), `user_type`, `verification_status`, `linked_healer_slug`, `full_name`, `modality`, `bio`, location, socials, `subject_slugs[]`, `image_urls[]`. Carries the field-protection trigger
* **user_favourites**: `user_id`, `content_type`, `content_slug` — unique together. `content_slug` is **three different shapes**: a text slug for healers and publishers, a bigint for books and videos, and a **UUID** for courses and free resources. (The migration comment calls the last two numeric. They are not.) `reviews.content_slug` deliberately does not inherit this — there it is always the slug
* **pending_user_types**: `email` (PK), `user_type` — consumed and deleted at verification
* **admin_notes**: `subject_user_id`, `body`, `created_by` — service role only. `subject_user_id` is a foreign key onto `auth.users`, so a note can only be attached to an account; an unclaimed healer cannot have one
* **reviews**: `id`, `user_id` (→ auth.users), `content_type`, `content_slug`, `rating` (1–5), `body`, `author_name`, `author_healer_slug`, `status`, `created_at`. Unique on (user, type, slug). Public read is `status = 'approved'`; the author can read their own whatever its state
* **emotion_mappings**: `id`, `emotion`, `subject_slug`, `weight` — powers the emotional search bar; one emotion maps to several weighted subjects. 3,488 rows covering 693 distinct emotions and all 42 subjects

#### Conventions worth knowing
* **`subject_slugs` is a Postgres array**, not a string. Every subject filter is an array-containment check (`.contains(...)` → the `@>` operator), which matches a slug as one whole element — that is what makes hyphenated tags like `eft-tapping` safe.
* **Healers, books, and videos link by `healer_slug`** (text). **Courses, free resources, and publishers link by `healer_id`** (bigint, via the `publisher_healers` junction for publishers). The two are not interchangeable.
* **Books resolve by `slug`**, not id — `/books/[slug]` is SEO-friendly, and `books.slug` is unique and backfilled from the title. Publishers and videos resolve by `slug` too. Checked across all 4,796 rows in the four content tables: no null slugs, no duplicates.
* **PostgREST caps a response at 1,000 rows and reports no error when it truncates.** Every query that can exceed it pages with `.range()` on `id`. `/subject/self-healing` was silently losing 45 of its 1,045 videos before its video query moved to the client.
* **`tier`** replaces the legacy `is_famous` boolean. Values: `superhero` / `ascended_master` / `luminary` / `local_hero`. Anything else — including NULL mid-backfill — still surfaces in the Practitioners Near You shelf so no practitioner silently vanishes, but the card renders a neutral grey "Teacher" badge rather than borrowing Local Hero's, so bad data is visible instead of mislabelled.
* **`entity_type`**: `individual` / `channel` / `app`. NULL is treated as `individual`. Channels and apps are filtered out of the tier shelves and the billboard in memory — no separate query.
* **`birth_year` / `death_year`** are optional integers, collected in the admin form only when the tier is Ascended Master. The profile shows `1931 — 2015` when both are set, `b. 1931` when only the birth year is known, and nothing when neither is.
* **`courses` stores every paid offering**, split by `product_type`: `course` / `download` / `membership` / `retreat`. An unset value is treated as a course, so legacy rows predating the column still surface.
* **`free_resources.resource_type`**: `meditation` / `download` / `mini_course` / `workshop` / `practice`.
* **Subject pages fetch no videos on the server.** They used to, and the whole matching pool was serialised into the HTML so that 24 of them could render — `/subject/self-healing` was 4.9 MB. Videos now load from the client and group into one shelf per teacher. The remaining four collections are still `select('*')` and still uncapped; there is a TODO on that query naming the numbers.
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
| Book detail pages (purchase links, Want to Read, Mark as Read, reviews) | ✅ Complete |
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
| Dynamic sitemap + robots.txt + canonical domain + GSC verification | ✅ Complete |
| Email OTP auth — signup, verify, magic link, session persistence | ✅ Complete |
| Practitioner onboarding — setup form, claim flow, resubmission after rejection | ✅ Complete |
| Admin CRM — sidebar shell, unified inbox queue, 360° people view, admin notes | ✅ Complete |
| Practitioner dashboard at /account — profile editing, content list, settings | ✅ Complete |
| All content writes moved server-side; anon write access closed | ✅ Complete |
| Video detail pages at `/videos/[slug]`, in the sitemap | ✅ Complete |
| Homepage Videos / Discover tabs — seven shelves, fetched on demand | ✅ Complete |
| Per-teacher video shelves under a subject filter, on the homepage and subject pages | ✅ Complete |
| "For You" personalised video shelf, rarity-weighted | ✅ Complete |
| Admin Healer Directory + record editor, editable People profiles | ✅ Complete |
| Working deletes for accounts and healer records, behind a confirmation | ✅ Complete |
| Community reviews — submission, moderation queue, public display | ✅ Complete |
| Pending reviews in the admin inbox; badge counts all pending actions | ✅ Complete |
| Transactional email via Resend — welcomes and review notices | ✅ Complete |
| GA4 analytics (no consent gate yet) | ⚠️ Partial |
| Content library (target: 5,000 videos + 5,000 books) | ⬜ Ongoing |
| Flutter native app | ⬜ Phase 2 |
| IAM notification system | ⬜ Phase 2 |

📊 Content Library
| Collection | Count |
| :--- | :--- |
| Healers | 129 |
| Videos | 2,269 |
| Books | 963 |
| Courses & offerings | 1,103 |
| Free resources | 461 |
| Publishing houses | 2 (Hay House, Sounds True) |
| Subjects | 42 |
| Emotion mappings | 3,488 rows · 693 emotions |
| Registered accounts | 6 (2 approved practitioners) |
| Saved items | 27 |
| Reviews | 2 |

💡 Immediate Next Steps
| Item | Status |
| :--- | :--- |
| Email OTP auth + practitioner onboarding | ✅ Complete |
| Admin CRM phases 1–3 | ✅ Complete |
| Practitioner dashboard | ✅ Complete |
| Anon write lockdown across content tables | ✅ Complete |
| **GA4 consent gate** — cookies are set with no consent on a UK/EU-facing site | ⬜ **Open** |
| Privacy Policy and Terms of Use — pages exist but are holding text, `noindex` | ⬜ Open |
| `content_submissions` staging table — needed before practitioners can add content. `videos`/`books` have no published flag and are read wholesale by the homepage, subject pages and sitemap | ⬜ Open |
| Reviews for healers and publishers — the table's constraint already allows both; only the UI is missing | ⬜ Open |
| `claimed_at` column to replace the `created_at` comparison | ⬜ Open |
| Delete account | ✅ Complete |
| **No record that an email was sent** — no table, no column. Approve a review twice and the reviewer is emailed twice; a failed send leaves nothing to retry from. Fine while these are courtesies, not before mailshots | ⬜ **Open** |
| Subject page payload — the four server-fetched collections are still `select('*')` and uncapped. `/subject/self-healing` is 4.7 MB | ⬜ Open |
| Admin phases 4+ — flags, messages, publisher claims. Each needs its own table | ⬜ Next |
| Ancient Teachers tier | ⬜ Next |
| Content library (target: 5,000 videos + 5,000 books) | ⬜ Ongoing |
| Flutter app build | ⬜ Phase 2 |

#### Environment variables
`NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `ADMIN_PASSWORD` ·
`SUPABASE_SERVICE_ROLE_KEY` · `ADMIN_NAME` · `RESEND_API_KEY` ·
`NEXT_PUBLIC_GA_MEASUREMENT_ID`

`SUPABASE_SERVICE_ROLE_KEY` bypasses every RLS policy. It must never carry a
`NEXT_PUBLIC_` prefix, and must be set in Vercel or the admin data sections stay
empty.

Made with love in Tavira 💫
