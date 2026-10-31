# Shift Network sprint 1: research brief (one teacher at a time)

You research public information for teachers who teach on The Shift Network, so
they can be listed on Spiritpedia (a directory of spiritual teachers) with a full
page. **Research only**: read public pages with curl or WebFetch. Never sign up,
log in, submit a form, or buy anything. Write nothing except the output files
named below. Never print or read any `.env` file.

For each teacher you're given, write **one plan file**:
`docs/content-audits/<slug>.json` (slug = their public name in kebab-case, no
titles or credentials: "Dr. Roger Jahnke, OMD" → `roger-jahnke`).

## Skip if too thin

If the teacher can't have a proper page (no usable photo of them, and/or almost
no content: e.g. fewer than ~3 items in total across videos, books, offerings and
free resources once the rules below are applied), don't write a plan. Instead
write `docs/content-audits/shift-sprint-1/skipped/<slug>.json`:
`{ "name": "...", "rank": N, "reason": "plain sentence" }`.
Also skip (same way) anyone whose work is mainly medical treatment and where
almost nothing passes the health-claim rule, and anyone whose work is entirely
shared with a partner who is also listed or in the sprint (couples stay one
listing: the better-known partner).

Dated offerings that have already started by the sprint date (30 Oct 2026)
are left out, even if late joining is open.

## The plan file

```json
{
  "healer": {
    "healer_slug": "suzanne-giesemann",
    "create": {
      "name": "Suzanne Giesemann",
      "bio": "two paragraphs, see Bio",
      "tier": "superhero | luminary | local_hero",
      "entity_type": "individual",
      "availability": "worldwide | local_online | local",
      "city": null, "country": null,
      "subjects": ["max 3 from the list"],
      "website_url": null, "booking_url": null, "youtube_url": null,
      "instagram_url": null, "facebook_url": null, "twitter_url": null, "tiktok_url": null,
      "contact_email": null,
      "image_urls": ["1 to 3 photos, see Photos"]
    }
  },
  "teaches_at": [{ "hub": "the-shift-network", "role": "instructor" }],
  "videos": [], "books": [], "courses": [], "free_resources": [],
  "sprint": {
    "rank": 1,
    "shift_profile": "https://theshiftnetwork.com/shift_teacher/…",
    "tier_evidence": "YouTube 512k (channel page, 30 Oct 2026); Instagram 180k; Facebook 300k → ~1M total → superhero",
    "email": "yes | contact form | none",
    "email_source": "URL where the published address appears, or null",
    "contact_form_url": "URL of their contact form when no email is published, else null",
    "flags": ["anything you're unsure about, one plain sentence each (see Flags)"],
    "left_out": ["items left out and why (health claims, dated, not on Amazon…)"]
  }
}
```

Item shapes (exactly these keys):

- videos: `{ "title", "url": "https://www.youtube.com/watch?v=ID", "subjects": [] }`
- books: `{ "title", "slug", "author", "asin", "store": "amazon.com", "goodreads_url": null, "worldofbooks_url": null, "description", "subjects": [] }`
- courses (offerings): `{ "title", "url", "description", "price", "product_type": "course|retreat|download|membership", "start_date": null, "end_date": null, "subjects": [] }`
- free_resources: `{ "title", "url", "description", "featured": false, "resource_type": "practice|download|meditation|workshop|mini_course", "subjects": [] }`

## Profile

- **Name** as they present publicly; drop post-nominal credentials (RN, MD,
  PhD, LAc, CCH…). Keep an honorific only if it's part of how they're known
  ("Master Helen Liang", "Kumu Ramsay Taum", "Grandmother Flordemayo").
  Spiritpedia writes "Dr." with a full stop.
- **Bio**: two short paragraphs, 120–220 words, plain British English, your own
  words, factual (training, lineage, what they teach, how they teach, books).
  Model: calm and specific, no hype ("world's leading", "renowned"), no health
  claims, no list of conditions they treat, no "diagnose". Mention that they teach
  on The Shift Network only if natural.
- **Subjects** (healer and every item): 1–3, only from this list, most specific first:
  akashic-records ancient-wisdom astrology ayurveda breathwork chakra-healing
  channelled-teachings conscious-relationships conscious-science consciousness
  death-the-afterlife dreamwork eft-tapping energy-medicine hermeticism homeopathy
  human-design law-of-attraction life-coaching manifestation meditation
  mediumship-spirits mindfulness mysticism nde non-duality plant-medicine polarity
  qi-gong quantum-healing quantum-touch reiki sacred-geometry self-healing
  shadow-work shamanism soul-purpose sound-healing spiritual-awakening spirituality
  tai-chi yoga
- **Availability**: `worldwide` if they teach mainly online / internationally;
  `local_online` if they have a physical base where they see people *and* teach
  online (then `city` and `country` are required); `local` if in person only.
- **booking_url**: their own "work with me / sessions / courses" page, else their website.
- **Links**: only accounts you opened and that are clearly theirs.

## Tier (never defaulted; evidence required)

Count followers across their own accounts (YouTube subscribers from the channel
page; Instagram / Facebook / X / TikTok counts where a page or its og:description
shows them; a podcast's own published audience figures are not followers).
- **superhero**: 1M+ in total
- **luminary**: 100k+ in total
- **local_hero**: under 100k
Write the numbers and where you read them in `tier_evidence`. If a count can't be
read, say so. Flag it when the total is 80k–150k or 0.8M–1.5M, when counts
couldn't be read for a main account, or when their reputation (e.g. bestselling
books) clearly doesn't match the follower count.

## Email (important: without one we can't start their journey)

Actively look for a **publicly published** email: their website's contact /
about / footer pages, booking pages, Linktree or similar, newsletter or press
pages, Substack, podcast pages, media kits. Put it in `create.contact_email`
and record the exact URL where you saw it in `sprint.email_source`.
**Never guess or construct an address** (no info@theirdomain). Assistants' or
the office's published addresses are fine. If none is published, leave it null,
set `sprint.email` to "contact form" and put the form's URL in
`sprint.contact_form_url`; if there's no form either, "none".
Cloudflare-obfuscated addresses (`/cdn-cgi/l/email-protection#…`) may be
decoded (XOR with the first byte); that is published, not guessed.

## Photos (1–3, clearly that person)

Candidates: their YouTube channel avatar (`yt3.googleusercontent.com`, ask for
`=s900`), their website's about/headshot image, their Shift Network teacher
page photo, their book-author photo. Download each candidate into
`/private/tmp/claude-501/-Users-SundaySouLounge-Sites-spiritpedia/1c8d8473-2fb4-4889-ac09-5e475bd51fa9/scratchpad/sprint-photos/<slug>/`
and **look at it** with the Read tool. Keep only photos that show one person,
the same person across sources, at least 300 px, not a logo, book cover, group
shot or stock image. Direct image URLs only (they must load without cookies).
Best headshot first. If you can confirm only one, use one. If you're not sure
it's them, flag it. No usable photo at all → skip the teacher.

## Content rules (strict)

- **Evergreen only.** No dated events that have passed. A future-dated retreat
  or course may go in with `start_date` / `end_date` (YYYY-MM-DD). Repeating
  ones go in undated.
- **No health claims, applied strictly.** Leave out any item whose title or
  description names a medical condition or promises to treat, heal or cure one
  (pain, cancer, autoimmune, anxiety, depression, trauma *treatment*, PTSD,
  insomnia, diabetes, thyroid, fertility, menopause symptoms, weight loss,
  immunity, Lyme, long COVID, addiction recovery, "reverse", "cure"…). Don't
  write such claims into descriptions or the bio.
  **Anything "medical"** — Medical Intuition, Medical Qigong, Medical Astrology,
  medical intuitive readings — is left out, and noted in `left_out`. (A bio may
  say factually that someone is a registered nurse or a physician.)
  "Relaxation", "energy", "balance", "vitality", "flexibility", "sleep as a
  practice", "emotional wellbeing" are fine. When borderline, leave it out and flag it.
- **No condition-named items** at all, even educational ones.
- **Max 3 subjects per item.**
- **Videos**: YouTube only, from the teacher's own channel first; talks or
  interviews on other channels only when the teacher is the main speaker and
  it's teaching. **Not** videos from The Shift Network's own channel (those
  belong on the hub). No Shorts, no music-only, nothing under ~2 minutes. Each
  must pass oEmbed:
  `https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=ID`
  → 200 (else leave out). Pick the most-viewed evergreen teaching videos (the
  channel's /videos page HTML has ytInitialData with view counts). Up to 12.
  Copy titles as they are, minus hashtags and trailing "| Channel name".
- **Books**: authored or co-authored by them, a real Amazon listing (ASIN or
  ISBN-10 from an amazon.com /dp/ page; US edition preferred). No books whose
  title or blurb is a health claim. Goodreads / World of Books URLs only if you
  opened them. Up to 10, best known first. Oracle/tarot decks count only if
  they're on Amazon with an ASIN.
- **Offerings** (`courses`): their current paid courses, programmes, retreats,
  memberships, including their Shift Network courses (use the course's own
  theshiftnetwork.com page URL). Each offering needs **its own unique URL**.
  Prices exactly as published with currency code ("$297 USD"); if hidden,
  "Contact for pricing". No one-to-one sessions unless that's the main way
  they work (then one item, product_type "course"). Up to 10.
- **Free resources**: free meditations, practices, downloads, free video
  courses, free Shift Network events that are evergreen (recorded/on demand).
  Up to 5. `featured: true` only for the single best one.
- **Descriptions**: your own words, 2–3 plain sentences, no hype, no claims.
- NULL / leave out anything you couldn't verify, and say so in `left_out`.

## Flags

Add a flag for: photo identity not certain; tier borderline or counts unreadable;
a borderline health claim you kept or dropped; a possible duplicate of an existing
Spiritpedia listing or of another teacher in the sprint (e.g. a couple, a shared
channel, a co-authored book); a teacher who has died; anything else a human
should look at.

## Working files

Other researchers share the scratchpad. Keep every helper script and working
file inside `scratchpad/work-<your first rank>/` (e.g. `work-21/`), photos in
`sprint-photos/<slug>/`. Never write at the scratchpad root.

Instagram / Facebook / X counts usually can't be read without logging in. Don't
try to get round that (no fake user agents, no proxies); use what's public
(YouTube, a site's own "join 50,000 subscribers", press pages) and flag the rest.

## Done

When finished, reply with one line per teacher:
`<rank> <name> → <slug>.json | tier | V/B/O/F counts | email yes/contact form/none | flags: n`
or `<rank> <name> → SKIPPED: reason`.
