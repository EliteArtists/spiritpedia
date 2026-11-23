# Flying Cloud Zen claim and near addresses — 23 Nov 2026

Busshō Lahn (bussholahn@gmail.com) applied as a new organisation, "Flying Cloud Zen",
instead of claiming `flying-cloud-zen-community`. The link he was sent,
`/healers/flying-cloud-zen`, didn't exist (404 on live).

## 1. The wrong address

`/healers/flying-cloud-zen` now redirects to `/healers/flying-cloud-zen-community`. The
general rule in section 4 covers it, so no special case was needed.

## 2. His application approved as a claim (live, done)

- **No new listing.** There is still only `flying-cloud-zen-community`.
- **His account** is linked to the listing and the application is approved. The listing
  shows **✓ Verified** (claimed).
- **The journey** is stopped as "claimed". It was running, with email 1 sent on 20 Nov.
- **Admin → Claims** records an approved request: "Applied as a new organisation (23 Nov
  2026); approved as a claim of this existing listing at the owner's request."
- **No email or notification went to him.** You didn't ask for one. The admin button
  would send "Your claim to Flying Cloud Zen is approved"; say if you want it sent.

## 3. The listing updated from his application (live, done)

- **Bio:** his own three paragraphs replace ours. Ours is in the Change log.
- **Place:** Minneapolis, United States.
- **Availability:** "Local & Online Sessions". It said "Worldwide (Famous Names)".
- **Logo:** already his. The picture you uploaded this morning is the same logo, so it
  wasn't changed.
- **Unchanged:** videos, offerings, free resources, subjects and the listing's email
  (bussho@flyingcloudzen.org). His application picked other subjects (including shadow
  work and self-healing); the listing keeps meditation, mindfulness and ancient wisdom.

## 4. Approve as a claim, in the admin

Inbox → the application → **Listing** → **Claim of …** (or **Claim of another
listing…** with its address) → **Approve as a claim**.

- An amber box warns when an application looks like a listing we have: the same
  website, the same email, an email on the listing's own domain (not Gmail and the
  like) or the same name.
- **Use what they wrote on the listing** is ticked to start with. It brings over their
  bio, pictures (put first), place, and in person / online. Old values are logged.
- A listing someone already manages, or Spiritpedia's own, is refused.
- They get the claim approved email and notification, not "Your listing is live".

It's in the admin guide (Inbox, and "Approving a listing").

## 5. Near addresses redirect

On `/healers/…` and `/publishers/…`, an address that doesn't exist goes to the one
real listing it is very close to. Very close means:

- the same apart from capitals, spaces or hyphens;
- one letter wrong, missing or extra;
- whole words missing or added at the end (two words or more).

There's no redirect when two listings are equally close (`/healers/sri-sri` stays a
404). Two letters different never counts, because `sam-harris` and `dan-harris` are
two people. What comes after the "?" is kept.

**One risk:** a deleted listing's old address could be one letter from a different
listing. Two such pairs exist today: `brother-phap-huu` / `brother-phap-luu`, and
`buddha-haus` / `buddha-house`.

**Tested on live's 1,528 addresses:** dropping the last word of each 3+ word address
found the right listing 432 times, made no guess 50 times, and was never wrong.

## Checks

- Web tests: **279 pass** (12 new: near addresses; application to listing matching and
  filling). Lint: no new problems. The build passes.
- Dev, local server:
  - `/healers/flying-cloud-zen?from=/x` gave 307 to the real listing with `?from` kept;
  - `/publishers/hay-hous` gave 307 to hay-house;
  - an unrelated address gave 404.
- **Dev, approve as a claim through the Inbox**, with a test account
  (rossbaiken+journeytest@gmail.com; nothing sent, no email key locally) and a test
  journey:
  - account linked and listing ✓ Verified;
  - bio, place and availability changed and logged;
  - claim record made and journey stopped;
  - no second listing.

  Afterwards the test account, the claim record and the journey were removed, and the
  dev listing was restored.
