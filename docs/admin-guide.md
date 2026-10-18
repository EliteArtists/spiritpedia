# Spiritpedia admin guide

For whoever runs Spiritpedia's admin (`www.spiritpedia.co/admin`). The README
has the technical detail; this is how to use it.

## Badges explained

**Type:** what it is. Practitioner (shown as "Individual" in admin), Channel
(YouTube or podcast), App, Organisation, Publisher. Set at approval.

**Tier:** how big it is. Set in admin. **Never for sale:** paying for a
listing never buys a tier.

**✓ Verified:** the owner has confirmed it's theirs. Automatic, no checkbox.

**✦ OFFICIAL:** Spiritpedia's own account only. Automatic, no checkbox.

### Tiers: same three levels and colours, two sets of names

| Colour | Practitioners | Channels, apps, organisations, publishers |
| :--- | :--- | :--- |
| Gold | Superhero | Superstar |
| Purple | Luminary | Shining Star |
| Green | Local Hero | Rising Star |

Ascended Master stays as it is, for people only.

Guidance for channels (shown in admin beside the tier dropdown):
- **Superstar:** a household name, ~1M+ followers
- **Shining Star:** established, ~100k–1M
- **Rising Star:** growing, under ~100k

### Where each badge shows

- Every listing except Spiritpedia shows its tier, on cards and profiles, on
  the website and in the app.
- Channels, apps and organisations also show their type, alongside the tier,
  never instead of it. (A publisher's card and page already say it's a
  publisher, so they show no type badge.)
- **✓ Verified** appears beside the tier when you approve a claim, or approve
  someone who signed up and created their own listing. It switches off by
  itself if the owner deletes their account, the listing is unlinked, or the
  account is rejected.
- **✦ OFFICIAL** belongs to the listing owned by love@spiritpedia.co, and only
  that one. It shows no tier. There is no checkbox: nobody can give it to
  another listing, admin included.

### Button wording

- Practitioners: **Book with [first name] →** (their booking link).
- Everyone else, Spiritpedia included: **Visit [name] →** (their booking link,
  or their website if they have none).

### The star's tips

Every badge can be tapped (or hovered, on the website), and the star explains
it:

| Badge | The star says |
| :--- | :--- |
| Superhero | One of the most influential spiritual teachers in the world. |
| Luminary | A respected and established spiritual teacher. |
| Local Hero | A practitioner available in your area. |
| Superstar | A household name: one of the most-followed voices in spirituality, with a million or more people following along. |
| Shining Star | Established and much loved, with hundreds of thousands of people following along. |
| Rising Star | A rising voice, and worth finding early: under a hundred thousand followers, for now. |
| ✓ Verified | This page is run by [name] themselves. They've confirmed it's theirs, so what you see here comes straight from them. |
| ✦ OFFICIAL | This is my home: Spiritpedia's own page. Our videos, our reviews, and where you can always find us. |

The wording lives in `web/utils/badges.js` and `app/lib/data/badges.dart`.
Change both together.

## Approving a listing

Admin → Inbox → the application.

1. **Listing type.** Pre-filled from their answer; below the dropdown it says
   "They described themselves as: …". Choose Individual, Channel or podcast,
   App, Organisation, or Publisher.
2. **Tier.** The names follow the type (Superhero… for an Individual;
   Superstar… for everything else), with the guidance underneath for channels.
3. **Approve.** The listing goes live, and the owner is emailed "Your listing
   on Spiritpedia is live" with links to it and to their account page. The
   message at the top says whether the email went; if it didn't, tell them
   yourself. Approving a resubmitted listing emails them again; pressing
   Approve twice does not.

✓ Verified appears on the listing by itself.

## Changing a tier or type later

- **A practitioner, channel, app or organisation:** Admin → Content → the
  listing → Profile. Tier and Entity type are there; the tier names follow the
  type. "Badges" shows ✓ Verified or ✦ Official, set automatically.
- **A publisher:** Admin → Ingestion → Publisher → choose it → Tier.

## Spiritpedia's own reviews

Reviews posted from the love@spiritpedia.co account show as **Spiritpedia
✦ OFFICIAL**, linked to its profile. The database decides this, not the
device, and the name can't be changed on an edit. Nobody else can review as
"Spiritpedia" (in any capitals or spacing): the form asks them to use their
own name, and the database would save their review without one anyway.
