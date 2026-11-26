# Email 1 wording, Nigel Gee, Kaedrich Olsen — 26 Nov 2026

## Urgent first: can a claimed owner blank their public listing? No.

- **My Account → listing editor** (website): it fills from the **public listing itself**
  (`healers`), not from the account profile, and saves back only the fields shown there.
  For Kaedrich it opens with his real bio, links and photos, so saving changes nothing he
  didn't change.
- **The app** has no listing editor. It only reads.
- **Nothing in the database** copies the account profile onto a listing.

So the blank account profile can't overwrite his listing.

**One related hole, closed straight away** (commit 238451e1, live):

- **What could happen:** a claimed owner who reached the sign-up form again (it's
  where the "verify your email" page sends a practitioner) could press Submit.
- **What that did:** it put the account back to "pending", which took away ✓ Verified
  and their editor until you approved them again. It never touched the listing's
  content.
- **Now:** the form sends anyone who already manages a listing to My Account, and the
  server refuses the resubmission.

## 1. Email 1: the new three paragraphs (done, live)

**Copy first:** both copy documents now carry the three paragraphs:

- `docs/email-copy-2026-10-21.md` (C1);
- `docs/email-copy-2026-11-11-shared-journey.md` (C1).

**Templates second:** both email 1 templates in `web/utils/emailTemplates.js` match
them, and the tests are updated.

**Notes on the new wording:**

- **One link only:** the listing.
- **Paragraphs replaced:** the three take the place of the old listing and claim
  paragraph and the "If anything is inaccurate…" paragraph. The second already says it.
- **Kept:** the organisation email still ends with "To stop these emails, simply
  reply." I moved it after the three paragraphs.

**The button:** it was under the name, but below the badges and the app line. It's now
straight under the name and badges, above the app line, on every listing page.
Publishers already had it there. On a phone the photo comes first, then the name, then
the button.

### Practitioner

Subject: Jane, a question about your work

> Hi Jane,
>
> I came across your work on social sites and wanted to get in contact.
>
> Spiritpedia is a place where people can discover spiritual teachers and practitioners, explore their work and find out how to book their services. It's free to use, on the web and on the App Store and Google Play. I'd love to interview you about what you do and the people you help. Would you be open to a conversation? You can simply reply to this email.
>
> I've also made a short public listing for you from information available online: https://www.spiritpedia.co/healers/jane-example
>
> The listing is yours to manage, for free. Just press 'Is this you? Claim this listing' at the top of the page and sign in with this email address. You can then change, add or remove anything on it yourself, whenever you like.
>
> You haven't joined Spiritpedia or approved the listing, so if you'd rather I took it down, or something isn't right, just reply and I'll sort it. The interview is entirely optional.
>
> With love,
> Ross

### Organisation

Subject: A question for Example Meditation Centre

> Hello,
>
> I came across your organisation and wanted to get in contact.
>
> Spiritpedia is a place where people can discover spiritual teachings, communities and resources. It's free to use, on the web and on the App Store and Google Play. I'd love to speak with someone from your team about your work and the people it's intended for. Would you be open to a conversation? You can simply reply to this email.
>
> I've made a free public listing for Example Meditation Centre from information available online: https://www.spiritpedia.co/healers/example-meditation-centre
>
> The listing is yours to manage, for free. Just press 'Is this you? Claim this listing' at the top of the page and sign in with this email address. You can then change, add or remove anything on it yourself, whenever you like.
>
> You haven't joined Spiritpedia or approved the listing, so if you'd rather I took it down, or something isn't right, just reply and I'll sort it. The interview is entirely optional.
>
> To stop these emails, simply reply.
>
> With love,
> Ross

## 2. Nigel Gee: what happened (nothing changed yet)

**One listing, not two.** There is only `nigel-gee` (id 9), and it has two journeys.
Nothing to merge.

**Your guess is right.** Our email service (Resend) shows where each email went:

| Journey | Email 1 went to | What happened |
|---|---|---|
| Started 18 Nov | `nigelgee@testcoaching.com` (the old address) | Delivered, then a bounce 14 hours later |
| Started 23 Nov | `journeyhome1111@gmail.com` (the new address) | Delivered |

Outreach shows `journeyhome1111@gmail.com` on both rows because it shows the
listing's **current** email. Spiritpedia doesn't store the address each journey was
sent to.

**The 18 Nov bounce was temporary, not permanent.** Resend reported it as "Transient".
The rule that applies:

- only a **permanent** bounce stops a journey and blocks an address
  (`isPermanentBounce`);
- so this one blocked nothing, and the 18 Nov journey kept running;
- the red "bounced" word in Outreach shows for **any** bounce, temporary or permanent.

Since 18 Nov, 21 emails have bounced: 5 permanent, 16 temporary.

**Something you'd want to know:** from 23 Nov until he claimed, Nigel had **two
journeys running at once**. Start didn't stop the older one. Both would have sent their
next emails to the new address, but he claimed before either sent email 2. Both are
now stopped as "claimed".

**Your email change wasn't logged.** The listing's change log has no entry for it. The
admin's ordinary edit only logs pictures.

**Proposed fixes, waiting for your yes:**

1. **Record the address on each journey.** Every journey and email would store the
   address it was actually sent to. Outreach shows that address, not the listing's
   current one. For past journeys I'd fill it in from Resend (read-only, as above).
   This needs a small migration.
2. **Count each listing once in Claimed.** One row per listing, however many journeys
   it has had. An older journey shows as "replaced by a newer journey".
3. **Starting a new journey stops any running one** for that listing, as "replaced by a
   newer journey". That way two can't run at once again.
4. **Show bounces as "bounced (temporary)" or "bounced (permanent)".** Only permanent
   bounces stop or block, as now.
5. **When you change a listing's contact email**, the change is logged. The admin also
   lists every other field that still holds the old address so you can update it there
   and then. That covers booking and website links (including `mailto:`), the contact
   form, publishers, and offerings and free resources with a link to it.

## 3. Kaedrich Olsen: why the public listing is full but his account profile is empty

**Two different records.**

- **The listing** (`healers`) is what the public page shows and what the owner edits in
  My Account. That's where his name, bio, photos and links are.
- **The account profile** (`user_profiles`) is the **application form**. Only someone
  who applies as new fills it in.
- **A claim only links the account to an existing listing.** It doesn't fill in the
  application. Admin → People → Profile shows the application, so it's blank for
  everyone who claimed.
- **The Content tab is full** because it reads from the listing.

**Every claimed listing has the same pattern, and none has a problem:**

| Listing | Account profile | Public listing |
|---|---|---|
| Kaedrich Olsen | empty (claimed) | full, ✓ Verified |
| Mike Maher | empty (claimed) | full, ✓ Verified |
| Cambridge Zen Center | empty (claimed) | full, ✓ Verified |
| Nigel Gee | empty (claimed) | full, ✓ Verified |
| Flying Cloud Zen | filled (he applied) | full, ✓ Verified |
| Spiritpedia | filled (applied) | full, Official |

**Should a claim fill the account profile from the listing? I'd say no.** Two copies
would drift apart, and the copy nobody edits would go stale.

**Proposed fix, waiting for your yes:** for an account that manages a listing, Admin →
People → Profile shows the **listing's** details, labelled "From the listing", with a
link to edit it there. The application fields go under "What they applied with", empty
for a claim. This is display only: no data is copied or changed, and the public content
stays exactly as it is.

## Checks

- Web tests: **279 pass**. The build passes.
- Every look at the live data was read-only. Reading Resend's two message records
  sent nothing.
