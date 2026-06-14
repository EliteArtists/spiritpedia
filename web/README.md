This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

⸻

## 🌐 Supporting Web Client (Next.js Funnel Architecture)

The `/web` directory contains a premium, high-performance web explorer built with Next.js and Tailwind CSS to support content discovery and practitioner engagement.

### 🧱 Core Web Systems Engineered

#### 1. Dynamic 2+1 Matrix Healer Shelf
The profile grid splits database records dynamically utilizing the `is_famous` (Boolean) attribute:
* **Superheroes (`is_famous: true`)**: Configured in responsive card pairs with matching amber tags.
* **Local Healers (`is_famous: false`)**: Monetized tier practitioners tagged with high-contrast emerald green location markers.
* **Page Snapping Layout**: Items map horizontally using sliding contexts:
  $$Slide = [\text{Superhero}_1, \text{Superhero}_2, \text{LocalHealer}_1]$$
* **Conversion Spotlight Tile**: If a subject search yields 0 matching local heroes, a dashed-border gradient conversion card renders automatically to incentivize healer registration.

#### 2. Reusable Modular Media Components
* **`BookCard.js`**: Adaptive component accepting a `variant` prop. The `"light"` switch enforces high-contrast visibility on white subviews. Includes a full-width `+ Want to Read` tracking element.
* **`VideoPlayer.js` & `HealerCard.js`**: Client-side blocks optimized with absolute-positioned floating favorite heart toggles (`absolute top-3 right-3 z-30`) with custom filter shadows.

#### 3. Self-Organizing Dynamic Library System
Spiritpedia maps private collections dynamically by tracking state rows within user browser layers:
* **Data Streams**: Toggling saves pushes unique structural text keys across array blocks: `favorited_books`, `favorite_videos`, and `favorited_healers`.
* **Dynamic Reduction Parser Engine**: The page subview (`/library`) extracts global catalog arrays concurrently from Supabase server-side. The client loops match items against active tags, generating custom folders on the fly. Empty categories are dropped from the layout dynamically.
* **Tri-Tab Segment Views**: Clicking a generated subject folder shifts layouts down to display an admin-style navigation selector bar (**Healers**, **Books**, **Videos**) wrapping rows into a balanced matrix (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`).

#### 4. Direct Conversion Contact Funnels
Practitioner profile pages ingest direct contact attributes (`contact_email`, `contact_phone`, `booking_url`) from Supabase table rows:
* **Descriptive Availability Pills**: Replaces raw text arrays with clean status indicators: `In Person ({city})` and `Online Session available`.
* **Dynamic Content Cards**: Hides communication containers unless values exist. Formats action buttons saying `"Connect with [Name]"` pointing directly to scheduling portals.

### 📂 Key Web Component Map
* `web/app/library/page.js` — Hydrates site catalogs concurrently from database tables.
* `web/components/LibraryView.js` — Manages real-time bucket reduction algorithms.
* `web/components/HealerCard.js` — Isolated practitioner block handling floating favorite heart arrays.
* `web/components/BookCard.js` — Multi-theme affiliate asset supporting global library target array tracking.
* `web/components/HomePageContent.js` — Houses the primary 5-pillar taxonomy map and responsive row carousels.

