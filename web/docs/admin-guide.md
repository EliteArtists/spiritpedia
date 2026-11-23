# Spiritpedia admin guide

For whoever runs Spiritpedia's admin (`www.spiritpedia.co/admin`). It tells
you what each screen is for, what to do there and how often to look. The
README has the technical detail; this is how to use it.

You'll find this guide in the admin too: **Help**, at the bottom of the
sidebar.

**The short version.** Every morning, open the **Inbox** and clear it,
broken images first. Check **Reports** every day: a reported review needs a
decision within 24 hours. After the night sprint, read the report and look at
**Ops**. Look at **Activity** once a week. Everything else is there when you
need it.

The screens below are in the same order as the sidebar.

## Inbox

**What it's for:** everything waiting on you, in one list. **What it shows:**
the totals at the top (healers, videos, books, courses, resources, publishers,
schools, users), then one row per thing to do: new applications, claim
requests, reviews, content from owners, reported reviews, broken images and
listings whose owner closed their account. The filters along the top show one
kind at a time. A line under them says when the broken-image check last ran
(it runs every morning at 7). The number on the sidebar badge is the same
count, except that closed accounts and stand-in pictures are listed but not
counted. **What you do:** open an application to set its listing type and
tier, then **Approve**, **Approve & Next** or **Decline** (Decline asks for a
reason and emails it to them). Open a claim request to send the ownership
check to the listing's published address, or make a code, then approve or
decline. Other rows take you to the right place: reviews to Reviews, reports
to Reports, owners' content to its review page, a broken image to the
listing's Profile or Content tab, and a closed account to the listing so you
can remove their details and press **Mark reviewed**. Press the refresh button
to read it again. **How often:** every morning, first thing. Broken images
first (README §19), then the rest.

## People

**What it's for:** everyone with an account. **What it shows:** how many
accounts there are and how many explorer accounts their owners have deleted
(a count only, no names), then two tabs,
**Practitioners** and **Explorers**, with a search box and, for
practitioners, a status filter (pending, incomplete, approved, rejected).
**View** opens a person's record: their photos, when they joined and last
signed in, and tabs for **Profile** (practitioners: name, links, bio,
subjects), **Content** (practitioners: what's on their listing),
**Discoveries** (explorers: their next personal discovery email, a test send
to love@ and the send log) and **Admin Notes** (private notes about them).
**What you do:** correct a practitioner's details and **Save**, add a note,
send an approved or declined person **back to the Inbox**, or **Delete
account** (you'll be asked to confirm, and you can email them a
confirmation). Approving and declining happen only in the Inbox. **How
often:** when you need to look someone up, or when the Inbox sends you here.

## Content

**What it's for:** the directory of every listing: practitioners, channels,
apps, organisations and schools. **What it shows:** each listing's name, kind,
tier, whether it's claimed, and a **Form only** or **No contact** badge when
there's no email. You can search by name and filter by kind, subject, claimed
or not, and contact route. **Edit** opens the listing, with four tabs:
**Profile** (every field: name, contact details, links, tier, kind, bio,
photos, subjects, and teachers for a school or organisation), **Content**
(its videos, books, courses, retreats, downloads and free resources: see
"Editing a listing's items" below), **Outreach** (the email journey for
this listing) and **Admin Notes** (not possible on a listing yet: if
someone has claimed it, a link takes you to notes on their account). **What
you do:** fix details, change a tier
or kind, replace a broken picture, remove a video or an item, or delete the
whole listing. **How often:** when something needs fixing, usually from an
Inbox row or the night sprint's report.

**Uploading a picture** (from 23 Nov 2026, once migration 0056 has run):
beside every image link there's an **Upload** button. That covers:
- a listing's photos or logo (Profile tab → Images, and the Ingestion form);
- a publisher's logo (Ingestion → Publishers → edit);
- each book, offering and free resource image: press the row's picture or
  **Edit** on the Content tab, or use the Ingestion form.

Press **Upload** and pick a JPG, PNG or WebP from the Mac, or from the iPad's
photos or files (an iPad photo arrives as a JPG). The picture is shrunk so
its longer side is at most 1600 px. It's also turned the right way up and
loses its hidden details (where and on what it was taken). Logos with
see-through parts stay see-through. It's stored on Spiritpedia's own storage,
and its link fills the box, with a **preview** under it.

Check the preview, then press the form's own **Save**: nothing changes on the
listing until you do. The old picture stays in the listing's **Change log**
(Content tab), with its link under "Before and after", so it can be put back.
Videos have no upload: their picture always comes from YouTube. A picture
uploaded but never saved just sits unused in storage.

**Deleting a listing at the owner's request** (from 20 Nov 2026): open the
listing → **Delete healer**. The dialog has two choices before you confirm:
- **Removed at owner's request — never re-add:** puts the listing on the
  do-not-revive list (by name, slug and website), so no night sprint or
  ingest ever adds it back. The database refuses it too.
- **Do not contact** its address (shown when it has one): the same as the
  Outreach button above, so no other listing with that address is written to.

Tick what applies, then **Delete healer**. Both lists are done first: if one
fails, nothing is deleted and the dialog says why. The lists are at the bottom
of Outreach (**Never again**). A teacher on the same website (bswa.org/teachers/…
for bswa.org) isn't caught by the website match: their listing is separate.

### Editing a listing's items (from 18 Nov 2026)

On a listing's **Content** tab (pictures can be uploaded too: see "Uploading
a picture" above):
- **Edit** on any row opens its fields under it: title, description, price
  (offerings), link and image, as the item has them (a video has a title and
  link only; its picture comes from YouTube). Save changes only what you
  changed. On a phone the Edit and remove (×) buttons are always shown; on a
  computer they appear when you point at the row.
- **×** removes one item, after a confirm.
- **Remove all** removes every item of one type at once (videos, books,
  offerings, free resources; "offerings" means courses, retreats and
  downloads together), after a confirm that says how many.
- **The lock** at the top: **Switch lock on** marks the listing "keep
  minimal" (the note box starts with "owner request — keep minimal" and
  today's date; write your own if you like). While it's on, nothing new can
  be added to the listing by anyone or anything: the sprints, restores, image
  fixes and the Ingestion form are all refused. Editing and removing still
  work. **Switch lock off** (with a note, if you like) when the owner is
  happy for items to come back. A locked listing shows a **Keep minimal**
  badge beside its name, and is listed in Ops → Locked listings.
- **Change log** at the bottom: every edit, removal and lock change made
  here, newest first, with the date and time. "Before and after" shows what
  an edit changed; "What was removed" keeps a full copy of what went, so the
  assistant can put anything back.

The lock and the change log need migration 0053; until it has run, the tab
says so and edits and removals aren't logged.

**When a listing's owner asks for changes or removals** (standing rule): do
them within a day, switch the lock on, mark their journey replied (Outreach
tab), and the assistant logs the request in `docs/owner-requests/README.md`.

## From owners

**What it's for:** content that verified owners add or change from their own
account page. **What it shows:** **Waiting**, everything not yet decided, and
**Removed by their owners**, a record of what owners took down themselves
(with how many reviews and saves went with it). **What you do:** open a
waiting item to see the checks (already listed, removed before, link check),
how the card will look and their notes. Edit any field, then **Approve** or
**Reject** with a reason. They're emailed either way. **How often:** daily;
the same items appear in the Inbox.

## Messages

**What it's for:** conversations between users and you, once messaging
exists. **What it shows:** a "coming soon" panel. Nothing works here yet.
**What you do:** nothing for now; messages still arrive at love@. **How
often:** no need to check.

## Publishers

**What it's for:** the directory of publishers. **What it shows:** every
publisher with its tier, **Verified**, **No email** and whether someone has
claimed it, with a search box. **View** opens its public page. **What you
do:** look things up. To edit a publisher, use **Ingestion → Edit
Publisher**. **How often:** when you need to find one.

## Outreach

**What it's for:** the eight-email journey that invites listings to claim
their page, and contacts made by hand through a listing's contact form.
**What it shows:** every journey ever started: the listing, its kind, when it
started, each email (sent, delivered or bounced) and how it ended (running,
paused, replied, claimed, form contact, complete, do not contact, stopped).
Filter by kind (practitioners, channels, apps, organisations, schools,
publishers) and by state. **What you do:**
- **The day's outreach (from 18 Nov 2026): Up next**, at the top. Every
  listing with an email that has never been contacted, organisations and
  schools first, then practitioners (by tier, then name), then channels, apps
  and publishers, each with its own **Start**, and "Started today: X of 50".
  At 50 the Start buttons there rest until tomorrow. A started row stays,
  marked, until you press Refresh the list. Left out: anything contacted
  before (a form contact too), claimed listings, people who have died, and an
  address already written to through another listing (two new listings with
  one address show once, naming the other).
- **Or start a journey** from the listing's own page: Content → search for the
  listing → open it → the **Outreach** tab → **Start email journey**. It shows
  the address email 1 goes to, or why it can't start (claimed, no address,
  asked to stop, an inbox type that isn't allowed).
- **A publisher** has no listing page in the admin: Publishers → **Email
  journey** on its row opens this page with it picked; or search for it in
  the panel at the top.
- **Mark replied** when someone writes back, and pause, resume or stop a
  journey from the listing's own Outreach tab.
- **A claim stops its journey at once** (18 Nov 2026): when anyone claims a
  listing, its journey ends "claimed" straight away, so they get no further
  email. **Claimed wins** (20 Nov 2026): a journey you'd already marked replied,
  or a form contact, also becomes Claimed when they claim, and the row still
  shows the date they replied.
- **Do not contact this email address** (20 Nov 2026): for an address that
  must never hear from Spiritpedia again, for example someone who asked to be
  removed. The red button is on each Up next row ("Do not contact"), on each
  journey here (click the row to open it), and on a listing's own
  **Outreach** tab, under everything else. It asks first, with a box for why.
  Then:
  - nothing from Spiritpedia is ever sent to that address again, outreach or
    any other email, even if the listing is deleted later;
  - it comes off every listing that shows it (each change is in the listing's
    edit log);
  - any running or paused journey to it stops ("Address marked do not
    contact");
  - it's left out of Up next, Start refuses it, and if a sprint or ingest
    ever adds it to a listing, the database clears it.
- **Never again**, at the bottom of this page: the do-not-contact addresses
  and the do-not-revive listings (see Content → deleting a listing). Type an
  address in the box to block one no listing shows any more. **Take off the
  list** (press twice) undoes a mistake; a listing doesn't get its address
  back by itself, so add it again on the Profile tab if you want it.

Every kind can be started (switched on 17 Nov 2026). Every outreach email
comes from "Ross at Spiritpedia", signed Ross (18 Nov 2026). Email 1 has one
link (the listing) and, since 23 Nov 2026, tells them to press "Claim this
listing" on the page. If someone still asks, send them
`https://www.spiritpedia.co/auth/claim?slug=<their slug>` (the slug is the end
of their listing's address). Emails 2–8 carry the claim link and
end with "Spiritpedia is even better on the app: spiritpedia.co/get-app".
**The Shift Network and Insight Timer** are partnerships, no cold email: they
aren't in Up next and Start refuses them.

**Claiming** (from 23 Nov 2026): every public listing page (people,
organisations, schools, channels, apps and publishers) has an **Is this you?
Claim this listing** button under the name. It goes away once the listing is
claimed (✓ Verified), and never shows for Spiritpedia's own listing or for
someone who has died. It opens the usual claim: sign up or sign in with the
listing's own email and it's theirs at once. With another address they can
ask, and the request comes to **Claims**. Email 1 now says "just press 'Claim
this listing' on the page" instead of offering the link by reply. So when
someone replies "what do we need to do?", point them to that button, or send
the claim link as before. The app gets the same button in 1.0.3.
**How often:** once a week while journeys are running.

## Claims

**What it's for:** the record of who manages which listing or publisher.
**What it shows:** every account linked to a listing or publisher, and every
claim request with what became of it, filtered by kind. A link at the top
shows how many requests are still waiting. **What you do:** decide waiting
requests in the Inbox (the link takes you there). Here you can **Revoke
Claim** to unlink an account from a listing. **How often:** now and then, or
when a claim looks wrong.

## Reviews

**What it's for:** members' reviews of videos, books, courses and free
resources. Nothing goes public until you approve it. **What it shows:**
**Pending**, **Approved** and **Rejected** tabs, each review with its rating,
text, author and a link to what it's about. **What you do:** **Approve** it,
or **Reject** it with a reason (the reviewer is emailed). You can change your
mind later from the other tab. **How often:** daily; new reviews also appear
in the Inbox.

## Reports

**What it's for:** reviews that members have reported, from the app or the
website. The
Terms promise a decision within 24 hours, and love@ is emailed as soon as one
comes in. **What it shows:** **Open**, **Resolved** and **Dismissed**
reports, each with the review as it was when reported and as it is now, the
reason, the reporter's note and how long it has waited; and **Banned
reviewers**. **What you do:** **Take review down** (the reviewer is
emailed), **Ban reviewer** (they can't post or edit reviews, and all their
reviews come down), or **Dismiss**. Lift a ban from the Banned reviewers tab.
**How often:** every day, without fail.

## Mailshots

**What it's for:** sending emails to groups of healers and practitioners, in
future. **What it shows:** a "coming soon" panel with the form switched off.
**What you do:** nothing yet. **How often:** no need to check.

## Notifications

**What it's for:** push messages to the app. **What it shows:** a form for a
new message (title, the message with `{name}`, a version for people who gave
no name, and an optional screen it opens), and counts of what was sent in the
last 7 days. **What you do:** **Send test** to one account first, then **Who
would get it?** to see the numbers, then **Send to everyone with Discoveries
on**. Anyone who had a discovery this week is skipped, and anyone in quiet
hours gets it at 8 in the morning. **How often:** only when you have
something to send. A glance at the 7-day counts once a week.

## Activity

**What it's for:** how the website and app are used, as totals across
everyone and never one person's browsing. **What it shows:** for 7, 30 or 90
days, and for the website, the app or both: pages opened, videos watched,
saves and shares; most opened and most saved; rising subjects; searches that
found nothing; taps on Buy on Amazon (clicks, not sales); taps on the App
Store and Google Play links ("Get the app": which place on the site, which
store, which kind of device, and how often the Android strip is closed);
sign-ups over time;
and, at the foot, what's in the database. It updates itself every minute.
**What you do:** read it. "Searches with no results" is a ready-made list of
content to add. **How often:** once a week.

## Ingestion

**What it's for:** adding content by hand. **What it shows:** tabs for **Add
Video**, **Add Book**, **Add Course** (also retreats, downloads and
memberships), **Add Listing** (a person, channel, app, organisation, school
or publisher) and **Add Free Resource**, plus **Edit Publisher**. Each form
checks for duplicates and fills in tags. **What you do:** add one thing at a
time, or edit a publisher's details, tier, contact email and linked
authors. Most content
arrives through the night sprint instead. **How often:** when you want to add
something yourself.

## Ops

**What it's for:** what the content work has left waiting on you. **What it
shows:** **Locked listings** (kept minimal at their owner's request; each
links to the listing, read live, not copied), **Held plans** (listings
waiting on your decision), **On dev, not on live**, **Retry another day** and
the **Sprint reports**, with a filter box.
The heading says when it was last copied from the project files. **What you
do:** read it; it can't be changed here. Give your decisions in the chat, and
the assistant acts on them and refreshes this page. **How often:** each
morning, alongside the night sprint's report.

## Settings

**What it's for:** dashboard settings, in future. **What it shows:** a
"coming soon" panel. **What you do:** nothing yet. **How often:** no need to
check.

## Help

This guide.

## More detail: badges, approvals and owners' content

The finer points that the screens above rely on.

### Badges explained

**Type:** what it is. Practitioner (shown as "Individual" in admin), Channel
(YouTube or podcast), App, Organisation, Publisher. Set at approval.

**Tier:** how big it is. Set in admin. **Never for sale:** paying for a
listing never buys a tier.

**✓ Verified:** the owner has confirmed it's theirs. Automatic, no checkbox.

**OFFICIAL:** Spiritpedia's own account only. Automatic, no checkbox.

#### Tiers: same three levels and colours, two sets of names

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

How the numbers are counted: followers on all their own accounts are added
together (1M+ Superhero / Superstar, 100k–999,999 Luminary / Shining Star,
under 100k Local Hero / Rising Star), with editorial stature or published
student counts the only reasons to go higher. The full rule is README §17.1.

#### Where each badge shows

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

#### Button wording

- Practitioners: **Book with [first name] →** (their booking link).
- Everyone else, Spiritpedia included: **Visit [name] →** (their booking link,
  or their website if they have none).

#### The star's tips

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

### Approving a listing

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

### Content from owners

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

#### Reviewing one

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

#### Removals

"From owners" lists everything owners removed: who, what, when, and how many
reviews and saves went with it. Ingestion won't add a removed link back. It
says who removed it and when.

#### Retention

Decided submissions are deleted 12 months after the decision, and an image
uploaded but never sent after two days, by the daily clean-up. The Privacy
Policy says so.

### Changing a tier or type later

- **A practitioner, channel, app or organisation:** Admin → Content → the
  listing → Profile. Tier and Entity type are there; the tier names follow the
  type. "Badges" shows ✓ Verified or OFFICIAL, set automatically.
- **A publisher:** Admin → Ingestion → Edit Publisher → choose it → Tier.

### Spiritpedia's own reviews

Reviews posted from the love@spiritpedia.co account show as **Spiritpedia
OFFICIAL**, linked to its profile. The database decides this, not the
device, and the name can't be changed on an edit. Nobody else can review as
"Spiritpedia" (in any capitals or spacing): the form asks them to use their
own name, and the database would save their review without one anyway.

## Gaps: things you still can't see or do

Found by reading the admin's code on 16 November 2026. Each of these needs
the assistant, a script or the Supabase dashboard today.

- **Messages, Mailshots and Settings are empty.** They're placeholders.
  There is no messaging table yet, so the **Message** button on a person's
  record and the Messages filter in the Inbox are switched off too.
- **The search box and the bell in the top bar do nothing.** They're
  placeholders; use the search on each screen instead.
- **No notes on a listing nobody has claimed.** Admin Notes only attach to
  an account, so the Admin Notes tab on a listing is empty unless someone
  has claimed it.
- **An item's dates and subjects can't be edited.** Since 18 Nov 2026 you
  can edit an item's title, description, price, link and image (Content tab
  → Edit), but an offering's start and end dates, its type, and any item's
  subjects still need the assistant.
- **You can't rename a listing's web address (its slug).** It's shown as
  fixed; changing it needs the assistant.
- **Deleting a listing leaves its content behind.** Its videos, books,
  courses and free resources stay in the database with nobody attached,
  and nothing in the admin shows these leftovers.
- **Publishers have no page of their own in the admin.** You can view and
  edit one (Ingestion → Edit Publisher), but you can't see its books in one
  place, and there's no way to delete a publisher.
- **Ops is read-only, and only as fresh as its last sync.** Held plans
  can't be approved or dropped here; that happens in the chat, and the page
  updates only when `node scripts/ops-sync.mjs --env live` is run.
- **Turning outreach off for a kind is a change to the code**
  (`OUTREACH_KINDS_APPROVED` in `web/utils/journey.js`); there's no switch in
  the admin.
- **No list of the automatic emails someone was sent.** The database keeps
  a record of emails such as the welcome and Day 4 emails, but the admin
  shows only the outreach journey, an explorer's discovery editions and
  whether an ownership check went.
- **You can't see who has unsubscribed** from the Day 4 and discovery
  emails, or change it for them.
- **You can't change someone's sign-in email** or edit an explorer's name.
  An explorer's record has no Profile tab, and the email is shown but not
  editable. That needs the Supabase dashboard.
- **No way to suspend an account.** You can delete it, or ban the person
  from reviews, but not block them from signing in for a while.
- **Members' blocks aren't visible.** When a member blocks a reviewer, the
  admin doesn't show it.
- **Subjects, search words and place names can't be managed here.**
  Adding or renaming a subject, changing which subjects a feeling word in
  search leads to, or adding another spelling of a place all need the
  assistant.
- **Amazon sales aren't shown.** Activity counts taps on Buy on Amazon;
  what actually sold is only in Amazon's own reports.
- **Buy on Amazon taps in the app aren't counted yet.** Only the website's
  taps reach Activity until app 1.0.2 is in the stores (the fix is built on
  the 1.0.2 branch, 16 Nov 2026).
- **Taps on Apple's own banner aren't counted.** Safari doesn't tell us; App
  Store Connect → App Analytics → Sources → Web Referrer shows them.
