# Claim button, email 1 and image upload — 23 Nov 2026

## 1. Claiming made clear

**Claim this listing button (website).** Every public listing page shows **Is this
you? Claim this listing →** under the name and badges until the listing is claimed:
people, organisations, schools, channels, apps (`/healers/<slug>`) and publishers
(`/publishers/<slug>`). It's hidden when:
- the listing is claimed (✓ Verified: an approved account is linked);
- it's Spiritpedia's own listing;
- it's a person who has died (an Ascended Master, or a death year).

It opens the existing claim flow for that listing (`/auth/claim?slug=…`, with
`&kind=publisher` for a publisher):
- signed out, it goes through sign-up first;
- the listing's own email claims it at once;
- another address can ask, and the request lands in Admin → Claims.

**App:** the same button goes in 1.0.3 (README Start here); nothing in the app now.

**Email 1, both sequences.** The copy documents were changed first
(`docs/email-copy-2026-10-21.md` and `docs/email-copy-2026-11-11-shared-journey.md`,
each with a dated note), then the templates. It keeps its single listing link. Email 1
as a practitioner and an organisation receive it:

```
Subject: Jane, a question about your work

Hi Jane,

I came across your work on social sites and wanted to get in contact.

Spiritpedia is a place where people can discover spiritual teachers and practitioners, explore their work and find out how to book their services. It's free to use, on the web and on the App Store and Google Play. I'd love to interview you about what you do and the people you help. Would you be open to a conversation? You can simply reply to this email.

I've also made a short public listing for you from information available online. You can view it here: https://www.spiritpedia.co/healers/jane-example. You haven't joined Spiritpedia or approved the listing. If you'd like to take charge of it, so you can update the details, add photos and share news, just press 'Claim this listing' on the page. It's free and takes a minute.

If anything is inaccurate, or you'd rather I remove the listing, reply and I'll take care of it. The interview is entirely optional.

With love,
Ross
```

```
Subject: A question for Example Meditation Centre

Hello,

I came across your organisation and wanted to get in contact.

Spiritpedia is a place where people can discover spiritual teachings, communities and resources. It's free to use, on the web and on the App Store and Google Play. I'd love to speak with someone from your team about your work and the people it's intended for. Would you be open to a conversation? You can simply reply to this email.

I've made a free public listing for Example Meditation Centre from information available online: https://www.spiritpedia.co/healers/example-meditation-centre. You haven't joined Spiritpedia or approved the listing. If you'd like to take charge of it, so you can update the details, add photos and share news, just press 'Claim this listing' on the page. It's free and takes a minute.

To stop these emails, simply reply.

If anything is inaccurate, or you'd rather I remove the listing, reply and I'll take care of it. The interview is entirely optional.

With love,
Ross
```

Emails 2–8 are unchanged (they already carry the claim link).

## 2. Image upload in the admin

An **Upload** button sits beside every image link:
- Profile tab → Images (a listing's photos or logo);
- the Content tab (a book, offering or free resource image, from the row's picture or
  Edit);
- the Ingestion forms (new items, a new listing's photos, a publisher's logo).

How it works:
1. You pick a JPG, PNG or WebP from the Mac or the iPad.
2. The browser shrinks it before sending, because Vercel refuses anything over 4.5 MB.
3. `/api/admin/upload-image` (admin only) checks the file really is a picture by its
   bytes. It turns it upright, shrinks it to 1600 px on the longer side (never
   enlarges), removes the location and camera details, and saves a JPG, or a PNG when
   it has see-through parts.
4. The picture is stored in the new public bucket `listing-images`, under
   `<kind>/<listing>/…`. The link fills the box, with a preview.
5. Nothing changes until you press **Save**.

The old picture is kept in the change log:
- book, offering and free resource images were already logged with before and after;
- a listing's photos and a publisher's logo are now logged too, by the write route,
  which reads the old value first;
- the entry shows in the listing's Change log.

**Videos:** there's no upload. Videos have no image of their own; the thumbnail always
comes from YouTube. Say if you want a way to replace it.

## Checks

- **Tests:** 267 web tests pass. The new ones cover:
  - the claim-button rule;
  - email 1's new sentence;
  - recognising pictures by their bytes;
  - safe storage paths;
  - the 1600 px fit;
  - real pictures through the server's processing: a 4032×3024 sideways phone photo
    with GPS comes out upright, 1200×1600, with no location or camera details; a
    transparent logo stays a PNG; a fake JPG is refused.
- **Build and lint:** the build passes; lint shows no new problems.
- **Looked at on a local server against dev:**
  - a person's and an organisation's page show the button, linked to their claim;
  - a publisher's links with `&kind=publisher`;
  - Alan Watts (Ascended Master) has none;
  - an upload through the real picker reached the server, which answered "needs
    migration 0056" (dev has no bucket yet).

## For you: run 0056, dev then live

`supabase/migrations/0056_listing_images_bucket.sql`. **Check row: true, 5242880, 3,
0.** The four numbers are:
- public;
- 5 MB a picture;
- three image types;
- no write rules (only the website's server can store).

Until it runs, Upload says "needs migration 0056"; pasting a link works as before.
