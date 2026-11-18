# Morning, 18 Nov 2026: broken images, Up next, deliverability

**New daily routine is in the README (§20, and the jobs table at the top).**
- Night sprints are paused until every current listing has been contacted.
- Each morning starts with the broken images.
- You start up to 50 journeys a day.

The night-sprint skill also says it's paused, so it won't run by accident.

## 1. Broken images

The live queue had **32** rows. It now has **31**.

- **Nothing swapped.** The only candidate was again the Zero Limits banner for
  Joe Vitale's *Miracles Mastermind*, which isn't that programme, so I skipped
  it (as on 27 Oct and 12 Nov).
- **Row cleared (1):** Russ Hudson's photo. It was the only new row since
  12 Nov, and it loads again (the error was a passing server fault on his
  site), so nothing needed changing.
- **No videos to remove.**
- **The other 30 are the same ones as on 12 Nov, still with no fix found.**
  Visitors don't see a broken image for any of them: since 12 Nov a dead item
  image shows the teacher's photo, or a neutral Spiritpedia tile. Each needs
  an image from you, or the item removed:
  - **Karina Grant, 9 offerings:** her image address now returns a web page.
  - **Marisa Cranfill, 9 YoQi offerings:** ymaa.com refuses us (403). Under
    your rule I didn't try another way.
  - **404s, gone from their sites:** Michael Singer's *Untethered Soul Lecture
    Series*, Pema Chödrön's *Ask Pema (2026)*, Andrea Kennedy's *Mainstream
    Reiki Community Membership*.
  - **6 books with no cover anywhere:**
    - Ra Uru Hu ×2, Dan Brulé, Terence McKenna, Florence Scovel Shinn;
    - Barbara Brennan's *Seeds of the Spirit 2001*, whose "image" is its
      product page.
  - **Refused (403):**
    - The Tapping Solution's *Tapping Insiders Club*;
    - Sue Frederick's and Jeff Warren's free resources (Google Drive);
    - Tasha Judson's photo.
- **Plan:** `docs/image-fixes/2026-11-18.json`. Nothing was applied, so there
  is no applied log.

## 2. Admin → Outreach → Up next (built; deploys with this push)

At the top of Admin → Outreach, above the publisher panel:

- **"Started today: X of 50"** counts email journeys started today on UK and
  Portugal time.
  - A form contact doesn't count.
  - A journey that bounced straight away does still count.
- **The list** holds every listing with an email that has never been
  contacted. Each row has its own **Start**, which sends email 1 at once
  through the same checks as the listing's Outreach tab.
  - Each row shows the address, whose inbox it is, and whether the page it's
    published on is recorded.
  - It shows 20 at a time, with "Show 20 more".
  - Click a name to open the listing.
- **Order:**
  1. organisations;
  2. schools;
  3. practitioners;
  4. channels, apps, publishers.

  Within each kind, Superhero → Ascended Master → Luminary → Local Hero, then
  by name.
- **Left out:**
  - anything contacted before, a form contact included;
  - claimed listings;
  - people who have died;
  - an address already written to through another listing.
  - Two new listings with one address show once, and the row names the other.
    For example, the Buddhist Society of Western Australia also covers Ajahn
    Brahm and Ajahn Brahmali.
- **At 50**, the Start buttons in Up next stop until tomorrow. A listing's own
  Outreach tab still works if you need one more. Say if you'd rather the
  counter only warn.
- **A started row** stays in place, marked "Email 1 sent to …", until you
  press Refresh the list. That way the next row doesn't jump under your
  pointer.

**On live data right now:**
- **1,163 to go:** 225 organisations, 79 schools, 837 practitioners, 14
  channels and 8 apps. No publisher has an email yet.
- **Started today: 10.** Amanda Johnson, Nigel Gee, Luchin, Mike Maher, Marisa
  Cranfill, Leia Cohen, Andrea Kennedy, ASA Source Vibrations, Meditation
  Vacation and Dr Paul Lam.
  - **Leia Cohen's address bounced.** Her journey stopped on its own.
- **Also left out:** 23 listings share an address that's already on the list
  or already written to, and 1 listing is claimed.

**Checked:**
- 239 website tests pass, 5 of them new, for the order, what's left out, shared
  addresses and today's count.
- The build passes.
- I looked at it on a local copy at desk and phone width. Start was never
  pressed.

**Worth a look before you press Start:**
- **The Shift Network (6th) and Insight Timer (3rd)** are near the top. Both
  are partnerships on your own jobs list (the referral programme and the
  partnership email), so a cold invitation may not be what you want there.
- **Some top organisations publish a department address.** Email 1 would go
  to Commune's `privacy@`, Kripalu's `registration@`, Omega's `membership@`
  and Findhorn's `bookings@`. Open the listing and change the address if
  there's a better one.
- **Every live listing shows "Inbox type not set"**, because the recipient type
  hasn't been filled in on any of them yet. That is a warning, not a block.

## 3. Deliverability (report only: nothing changed)

### SPF, DKIM and DMARC for spiritpedia.co

Your outreach comes from `Spiritpedia <love@spiritpedia.co>` through Resend.
Account emails come from `hello@accounts.spiritpedia.co`.

| Record | What's there | Verdict |
| :--- | :--- | :--- |
| SPF, spiritpedia.co | `v=spf1 include:_spf.google.com ~all` | ✅ Right for Google Workspace. Resend doesn't need to be in it: it sends from its own bounce subdomain. |
| SPF, send.spiritpedia.co (Resend's bounce subdomain) | Points to `send.forge.rmta.net`, which lists its sending servers | ✅ Set up as Resend gives it. Resend refuses to send from an unverified domain, and your test emails went, so it's verified. |
| DKIM for Resend, spiritpedia.co | `resend._domainkey` key present | ✅ |
| DKIM for Resend, accounts.spiritpedia.co | `resend._domainkey.accounts` key present | ✅ |
| **DKIM for Google Workspace** | **Nothing at `google._domainkey`** | ⚠️ **Missing.** The mail you send yourself from love@ in Gmail (your replies to the people who answer) is signed by nothing. Forwarded copies can then fail DMARC. |
| DMARC | `p=none; adkim=s; aspf=s; rua=postmaster@, dmarc@` | ⚠️ Works, but only watches. |

**What that means for the outreach emails:**
- They pass DMARC through DKIM. Resend signs them as spiritpedia.co, which is
  exactly the From domain, so the strict rule passes.
- SPF can't line up under the strict setting (`aspf=s`), because Resend's
  bounce address is on `send.spiritpedia.co`. It doesn't need to, because DKIM
  carries it.

**Suggestions (for your OK; each is a DNS or Google Admin change you'd make):**
1. **Turn on DKIM in Google Workspace.** This is the important one.
   1. Google Admin → Apps → Google Workspace → Gmail → **Authenticate email**.
   2. **Generate new record** (2048-bit).
   3. Add the TXT record it gives you at your DNS host.
   4. Back in Google Admin, press **Start authentication**.

   I only checked the usual name (`google._domainkey`). If you chose a
   different one, Admin will show it as already on.
2. **DMARC:** change `aspf=s` to `aspf=r`. Then Resend's mail passes SPF
   alignment too, not only DKIM. It is one edit to the `_dmarc` TXT record.
3. **Later, after 2–3 weeks of clean reports**, move DMARC from `p=none` to
   `p=quarantine`. Check first that the `postmaster@` and `dmarc@` mailboxes
   exist, because the reports go there.

### Getting email 1 into Primary rather than Promotions

Gmail's tabs mostly follow how the message looks and how people respond to
the sender. What helps, roughly in order:

1. **People replying.** This is the strongest signal of all. Email 1 already
   asks for a reply, twice. Answering quickly from love@ (with DKIM on, point 1
   above) builds on it.
2. **A person as the sender.** "Ross at Spiritpedia" reads as a letter;
   "Spiritpedia" reads as a brand. Sign off as Ross too, so the name matches.
3. **Fewer links.** Email 1 has three today: the listing, the claim link and
   the app footer. One link reads as personal mail; three, with a footer under
   a dash, reads as a newsletter.
4. **It's already plain text** with no images, no tracking and no unsubscribe
   header. Those are all right for one-to-one mail. Keep them.
5. **A personal subject line.** "An invitation from Spiritpedia" is the kind of
   wording Promotions sorts. Something like "Karina, a question about your
   work" or "Interview for Spiritpedia?" looks like a person writing.
6. **Spread the 50 through the day.** This morning's 10 went in 11 minutes.
   Twenty in the morning and the rest later looks less like a blast. Watch
   bounces: one in ten bounced today (Leia Cohen).

### Email 1 with one link, from "Ross at Spiritpedia"

This is a draft for your OK. The approved copy is unchanged. What's different
from today's email 1:
- the sender and sign-off are Ross;
- the claim link and the app footer are gone, and the claim link is offered by
  reply instead (the listing page has no Claim button);
- the app is still mentioned in words, without a link.

The subject is shown two ways.

```
From: Ross at Spiritpedia <love@spiritpedia.co>
Subject: An invitation from Spiritpedia
   (or, more personal: Karina, a question about your work)

Hi Karina,

We came across your work on social sites and wanted to get in contact.

Spiritpedia is a place where people can discover spiritual teachers and practitioners, explore their work and find out how to book their services. It's free to use, on the web and on the App Store and Google Play. We'd love to interview you about what you do and the people you help. Would you be open to a conversation? You can simply reply to this email.

We've also made a short public listing for you from information available online: https://www.spiritpedia.co/healers/karina-grant. You haven't joined Spiritpedia or approved the listing. If you'd like to take charge of it, reply and we'll send you the link to claim it.

If anything is inaccurate, or you'd rather we remove the listing, reply and we'll take care of it. The interview is entirely optional.

With love,
Ross
Spiritpedia
```

**For an organisation**, the same changes apply to its email 1: the sender,
one link (the listing), the claim offered by reply, no footer, and signed by
Ross.

**If you say yes**, I'll do it in this order:
1. Update the copy documents.
2. Change the sender for all eight emails or only email 1, as you choose.
3. Drop the claim link and footer from email 1 only. Emails 2–8 keep the claim
   link and the app footer.
4. Update the tests.

**Choices for you:**
- the sender for every outreach email, or email 1 only;
- the subject line;
- "we" or "I" in the body. Signed by Ross, "I" reads more naturally, but it
  changes approved wording.

## 4. App 1.0.2

- Google Play already has build 29.
- **Apple:** you'll submit build 29 when their outage clears. It is still in
  Xcode's Organizer, and the IPA is at
  `~/Sites/spiritpedia-1.0.2/app/build/ios/ipa/Spiritpedia.ipa`.
- **Once both are approved**, tell me, and I'll merge `release/1.0.2` into
  `main` and update README §10.7's Near You notes. The README's jobs table says
  so.

## For you to decide

- **Up next at 50:** keep the Start buttons stopping at 50, or only warn.
- **Before starting them:** whether The Shift Network and Insight Timer should
  get the cold email 1.
- **Deliverability:**
  - Google Workspace DKIM (recommended);
  - DMARC `aspf=r`;
  - `p=quarantine` later.
- **The one-link email 1:** yes or no, and if yes:
  - the sender for all eight emails or only email 1;
  - the subject line;
  - "we" or "I".
