# Spiritpedia admin guide

For whoever runs Spiritpedia's admin (`www.spiritpedia.co/admin`). The README
has the technical detail; this is how to use it.

## Badges explained

**Type:** what it is. Practitioner (shown as "Individual" in admin), Channel
(YouTube or podcast), App, Organisation, Publisher. Set at approval.

**Tier:** how big it is. Set in admin. **Never for sale:** paying for a
listing never buys a tier.

**✓ Verified:** the owner has confirmed it's theirs. Automatic, no checkbox.

**OFFICIAL:** Spiritpedia's own account only. Automatic, no checkbox.

### Tiers: same three levels and colours, two sets of names

| Colour | Practitioners | Channels, apps, organisations, publishers |
| :--- | :--- | :--- |
| Gold | Superhero | Superstar |
| Purple | Luminary | Shining Star |
| Green | Local Hero | Rising Star |

Ascended Master stays as it is, for people only.

Guidance (shown in admin beside the tier dropdown, the same measures as the
star's tips):
- **Superhero / Superstar:** worldwide reach, 1M+ followers across social media
- **Luminary / Shining Star:** hundreds of thousands of followers
- **Local Hero:** a practitioner available in their area
- **Rising Star:** growing, under 100k

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
- **OFFICIAL** belongs to the listing owned by love@spiritpedia.co, and only
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
| Superhero | A worldwide reach, with over a million followers across social media. |
| Luminary | Hundreds of thousands of followers: the superstars of the future. |
| Local Hero | A practitioner available in your area. |
| Superstar | A worldwide reach, with over a million followers across social media. |
| Shining Star | Hundreds of thousands of followers: the superstars of the future. |
| Rising Star | A rising voice, and worth finding early: under a hundred thousand followers, for now. |
| ✓ Verified | This page is run by [name] themselves. They've confirmed it's theirs, so what you see here comes straight from them. |
| OFFICIAL | This is my home: Spiritpedia's own page. Our videos, our reviews, and where you can always find us. |

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
   on Spiritpedia is live" with links to it and to their account page, where
   they can add their own content. The
   message at the top says whether the email went; if it didn't, tell them
   yourself. Pressing Approve twice sends nothing more.

Always approve or decline here in the Inbox. A person's record (People →
View) can only send someone back to the Inbox as pending: approving there
used to set the word "approved" without making the listing or sending the
email.

**Approving a claim** ("Approve claim", or a request in the Inbox): the
listing was public already, so the owner gets "Your claim to … is approved",
never "Your listing is live".

✓ Verified appears on the listing by itself.

## Content from owners

Verified owners manage their own content from their account page ("Your work"
→ Content). Publishers do it from their dashboard, under "Your books". It's
on the website only. The app's account page links there.

**What they can do:**
- **Add** a video, book, course, retreat, membership or free resource. A
  publisher adds books only, choosing one of its linked authors, or "Author not
  on Spiritpedia yet" with the name in the notes.
- **Edit** anything live on their listing, including what you added. The live
  version stays up, unchanged, until you approve. One edit per item can wait at
  a time.
- **Remove** anything live on their listing. It's gone at once, with no
  approval and no email, and its reviews and saves go with it. A publisher can
  edit and remove only the books it added. An author with their own account
  controls everything on their own listing.
- **Withdraw** something still waiting, and **edit and send again** something
  you turned down.

Images are uploaded (JPEG, PNG or WebP, up to 5 MB), never linked. They stay
private until you approve.

### Reviewing one

Admin → Inbox → Content (or "From owners" in the sidebar) → the item.

1. **Read the checks at the top:**
   - **Already on Spiritpedia:** Approve is blocked. Reject as "already listed".
   - **Removed by its owner:** someone removed this link before. Your call.
   - **Link check:** whether the link opens. Amazon and some sites refuse
     automatic checks, so open it yourself when it says so.
   - **Their notes.**
2. **Edit anything:** every field, and the subjects (1 to 5, from the list).
   For an edit, a changed field is outlined and shows what it "Was".
   "How it will look" shows the card as it will appear.
3. **Courses:** set the affiliate status. **Free resources:** Featured.
4. **Author not on Spiritpedia yet** (a publisher's book): create the author
   in Ingestion and link them to the publisher. Then press "Refresh list",
   choose them, and approve.
5. **Approve:** a new item goes live at once. For an edit, only the changed
   fields change. They're emailed (6c in `docs/emails.md`).
6. **Reject:** choose a reason, and add a note if you like (required for
   "something else"). They're emailed (6d) and can edit and send it again.

The message at the top says whether the email went; if it didn't, tell them
yourself.

### Removals

"From owners" lists everything owners removed: who, what, when, and how many
reviews and saves went with it. Ingestion won't add a removed link back. It
says who removed it and when.

### Retention

Decided submissions are deleted 12 months after the decision, and an image
uploaded but never sent after two days, by the daily clean-up. The Privacy
Policy says so.

## Changing a tier or type later

- **A practitioner, channel, app or organisation:** Admin → Content → the
  listing → Profile. Tier and Entity type are there; the tier names follow the
  type. "Badges" shows ✓ Verified or OFFICIAL, set automatically.
- **A publisher:** Admin → Ingestion → Publisher → choose it → Tier.

## Spiritpedia's own reviews

Reviews posted from the love@spiritpedia.co account show as **Spiritpedia
OFFICIAL**, linked to its profile. The database decides this, not the
device, and the name can't be changed on an edit. Nobody else can review as
"Spiritpedia" (in any capitals or spacing): the form asks them to use their
own name, and the database would save their review without one anyway.
