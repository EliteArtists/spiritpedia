# Morning, 12 Nov 2026: broken images, then the night's decisions

**Migration 0049 is ready to run** (dev, then live).
- **New Lebanon** points to Pittsfield, as you asked.
- **Vrážné** is added, because it went in today.
- **Check row:** aliases go up by 16 (15 places, plus a plain spelling of Vrážné). Listings with a town but no place: 1 on dev (Salmon, Idaho); live may differ.

**Live now has 1,404 listings** (1,388 last night + 16 today). Admin → Ops is synced: 72 held plans, 0 on dev only.

## 1. Broken images (the morning job)

The live queue had **102** rows. It now has **93**.

**Fixed (4 offerings).** Each now shows the teacher's own photo, under your standing OK:
- Michael Harner, *Shamanic Journey Solo and Double Drumming*: the store logo is gone (404), and there's nothing on its page. Now uses his photo from shamanism.org.
- Juha Penttilä, two Gaia House retreats, and Bernat Font, one: Gaia House's page image is a placeholder GIF. Now uses their own sites' photos.
- Log: `docs/image-fixes/2026-11-12.live.applied.json`. Each change can be undone with `--rollback`.

**Healthy again, rows cleared (5):** these load again, so I took them off the queue.
- the Wayne Dyer audio offering;
- the photos of Francie La Flow, Rose Cole, Chris Niebauer and Prashanti Paz.

The script suggested new photos for Francie, Rose and Prashanti. Their current photos work, so I changed nothing.

**Not changed:**
- **Miracles Mastermind (Joe Vitale):** the only image found is a Zero Limits banner, not this programme. Skipped, as on 27 Oct.

**Videos for you to remove (2):** YouTube no longer has them.
- Michael Sealey, "Wind and Rain Relaxation Two Hours…": https://www.youtube.com/watch?v=j3NU4sMcVEQ
- Wim Hof, "Brain over Body Michigan Study": https://www.youtube.com/watch?v=YficWbO6nMw

Delete them in Admin → the teacher → Content, or tell me to.

**Really broken, no fix found (about 13).** Each needs an image from you, or the item removed:
- **Karina Grant, 9 offerings:** the image URL now returns a web page.
- **The Untethered Soul Lecture Series (Michael Singer) and Ask Pema (2026):** both 404.
- **Barbara Brennan, *Seeds of the Spirit 2001*:** the "image" is the product page (403).
- **5 books with no cover:** they still point to a "no cover" placeholder (Ra Uru Hu ×2, Dan Brulé, Terence McKenna, Florence Scovel Shinn).

Michael Singer's, Pema Chödrön's and Karina Grant's own photos are Google thumbnails, so I didn't use them as fallbacks.

**Hosts that refuse our checker (78: 36 teacher photos, 27 offerings, 10 free resources, 5 books):**
- **What happens:** these sites' firewalls drop any request that names itself a bot, at robots.txt or at the image. Our ingest and the daily audit both name themselves (SpiritpediaIngest and SpiritpediaImageAudit). The audit logs the drop as a failure, so the rows come back every week.
- **Visitors:** they get the images. The website shows these as plain links to the image, which the visitor's browser loads.
- **Sites:** mostly small WordPress sites. Also ymaa.com (8, blocks Claude), dharma.org (5) and Google Drive (2).
- **No retries:** under your rule I didn't try any of them another way.

**Proposal, for your OK:** have the daily audit count a refused robots.txt or a dropped connection as "can't tell", as it already does for bot-check pages. These rows would leave the Inbox, and real 404s would still be caught.

**Worth a look while there:** some older offerings break today's health rule:
- Marisa Cranfill's YoQi titles, such as "Stress & Anxiety Relief", "Boost the Immune System" and "Six Healing Sounds";
- Karina Grant's "Permission to Reset Anxiety", "Sleep" and "Brain Healing".

They went in before the rule. Remove them?

## 2. The night's decisions, done

**Photos accepted, on dev and live (4):** Zen Center of Spokane, Zen Montañas y Mar, Melbourne Zen Group, Green Mountain Zen.

**Thin, listed as they are, on dev and live (8):**
- Great Lake Zen Center
- Vrážné Zen Center (the retreat is undated)
- Inayatiyya UK
- Fazal Manzil
- Sufi Earth Spirit (Cala Jami): city set to Olbia, since San Pantaleo is a village in that municipality and Olbia lets Near You find it
- Phuntsok Choeling
- Ewam Choden
- Sakya Künga Chöling

**Il Cerchio's sister temples and Centro Zen L'Arco, researched this morning, on dev and live (4):**

| Listing | V/B/O/F | Notes |
| :-- | :-- | :-- |
| [Tempio Zen OraZen Sokuzen-ji](https://www.spiritpedia.co/healers/tempio-zen-orazen-sokuzen-ji) | 0/0/2/2 | No channel of its own (the linked one is Il Cerchio's old channel). Shiatsu left out |
| [Ten Shin – Tempio Zen di Napoli](https://www.spiritpedia.co/healers/ten-shin-tempio-zen-di-napoli) | 9/0/2/1 | Its calligraphy course left out: this year's course began on 27 Sep |
| [Centro Buddhista Zen Gyosho](https://www.spiritpedia.co/healers/centro-buddhista-zen-gyosho) | 8/0/1/1 | Site partly stale (weekly zazen is the only current item). A photo may show its pre-2019 premises. Shiatsu and counselling left out |
| [Centro Zen L'Arco](https://www.spiritpedia.co/healers/centro-zen-l-arco) | 0/0/1/3 | No videos, as you said. The photo is its channel's logo |

- **L'Arco teacher link:** Reb Anderson is on Spiritpedia and is named as one of L'Arco's abbot's teachers, but not as teaching there. Not linked, under the guests rule.
- **L'Arco tier:** it's affiliated with San Francisco Zen Center. A possible stature raise, not made.

**Dropped (18), moved to `night-sprint-2026-11-09/dropped/` with your reasons:**
- E-Vam Institute and Ramana Maharshi Foundation UK (contact rule)
- Ananda Sangha Bangalore (hacked site)
- the 3 Kriya Yoga network plans
- The Astana
- all 11 WCCM national communities, including Singapore and Canada (WCCM stays one listing)

**Still held, until a photo turns up (9):**
- no usable photo: Brussels Zen Center, Dhargyey, Iyengar Wellington, Dorje Chang, Tapas Yoga HK, Garchen;
- teacher or guru portraits only: Chinmaya Mission Houston, Ananda Sangha Delhi, Tara Institute.

**Raised to Luminary on dev and live:** Providence Zen Center, Berlin Zen Center, Iyengar Yoga Centre of Victoria, Satchidananda Ashram–Yogaville. Each plan has `tier_override` with your reason: "on editorial stature (12 Nov 2026)".

**Queued** (README §18.7, single names): Pir Zia Inayat Khan, Geoff Dawson, Gabriella Giubilaro, Shirley Daventry French.

**Guests stay unlinked,** as you said; the rule is unchanged.

## 3. Checks and rule slips

- **Checks:**
  - every insert ran one at a time, dev then live;
  - all 16 have inserted logs for both;
  - four random new or raised pages return 200 on live.
- **My slip, image check:** before I knew these hosts refuse our bot identity, I loaded 3 of the queued photos (laurenrainbow.com, joanranquet.com, kisetsu.es) with plain curl, a different identity from our checker's. All three returned 200. I stopped there and fetched nothing else from those hosts.
- **My slip, insert loop:** the first insert command for the 12 released plans failed because zsh didn't split the list. Nothing was inserted, and the rerun was clean.
- **Helper:**
  - read yt3.ggpht.com's robots.txt (400), then used the two channel avatars;
  - priced OraZen's weekly evenings from its membership fee, published on another of its pages;
  - took a few bio details from photos (for example, "a wooden-floored hall").
