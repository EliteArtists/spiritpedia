# Channels and apps sprint: plan (6 Nov 2026)

**Planning only.** No channel or app was researched and nothing was written to either database.

**Today:** live has 1,013 listings: 988 teachers, 9 channels (including Spiritpedia's own), 1 app (Headspace), 11 organisations and 4 schools.

## Where the candidates come from

| Source | How | Raw names | Likely to pass | Expected listings |
| :--- | :--- | :--- | :--- | :--- |
| **1. Channels that host our teachers** | The channel name saved with each of the 6,500 videos in our plans. These are channels showing 2 or more of our teachers that aren't listed yet. | 102 | about 35–45% | **about 35–45** |
| **2. Other channels in our videos** | Channels with only one of our teachers whose name isn't that teacher's. Most are the teacher's own centre or project, or a one-off host, so a title screen comes first. | 698 | about 5% | **about 25–35** |
| **3. Well-known meditation and spiritual channels** | Up to 3 web searches per batch, plus channels named on the sites of teachers and hubs already listed. Never YouTube search (`/results` is blocked by robots.txt). | about 60 | about 30% | **about 15–20** |
| **4. Apps** | Known meditation, prayer and contemplative apps, each researched from its own website. | about 40 | about 50% | **about 20** |

**Rough total: 75–100 channels and about 20 apps.**

**Source 1 in more detail:**
- **Out by rule:**
  - TEDx Talks and Talks at Google show other people's talks;
  - Sounds True, New World Library, Banyen Books and Watkins are publishers;
  - Hay House UK is left out;
  - Esalen, Kripalu and Omega are already listed as hubs.
- **Likely in:** interview and podcast shows with their own presenter, for example Buddha at the Gas Pump, Michael Sandler's Inspire Nation, Next Level Soul, Lilou Mace, Science and Nonduality, The Weekend University and Wisdom 2.0.
- **Practice centres:** for example Insight Meditation Center, Common Ground and the Buddhist Society of Western Australia.
- **The full list** is in `docs/content-audits/channels-apps-plan-2026-11-06/channels-from-our-videos.json`.

**Teachers' own channels are not new listings.** Each one is already part of that teacher's listing, so listing it again would count the same people twice.

## Checks for each channel

1. **Original content only.**
   - **Out:** compilations of other teachers' talks, Alan Watts-style re-uploads, AI voice clones and faceless "wisdom" narration.
   - **Signs to look for:** titles built on another person's name; no named presenter on the channel or its site; voice-over over stock footage. Interviews the channel records itself count as original.
2. **A contact route outside YouTube's hidden business email:** a website, an email in the channel description, or a contact form. We never use "View email address".
3. **Tier:** all followers added together (§17.1), shown as Superstar, Shining Star or Rising Star.
   - YouTube subscribers come from the channel's own header row, plus any other platforms the channel or its site links.
   - The evidence and date go in the plan.
4. **Videos:** evergreen only. The health rule and the political rule apply as usual. Each video is checked through oEmbed.
5. **Photo:** the channel's own avatar (yt3.googleusercontent.com), or a logo from its site.

## Checks for each app

- A genuine spiritual, meditation or prayer app, with its own website and a contact route (an email or a form).
- **No health-claim apps.** Apps sold mainly on sleep, anxiety, depression or therapy are out.
- **App store pages:** read only where robots.txt allows. Ratings are not used as followers; the tier comes from the app's own social accounts.
- **Some candidates:**
  - meditation: Waking Up, Ten Percent Happier, Plum Village, Medito, Balance, Open, Sattva, Tergar, Liberate;
  - organisations' own apps: Heartfulness, Art of Living, Sahaja;
  - prayer and contemplation: Hallow, Abide, Lectio 365;
  - astrology and tarot (with the usual subject rules): CHANI, The Pattern, Labyrinthos.
- **Probably out:** Calm, Healthy Minds and Shine, which are sold on sleep, anxiety and stress.
- **Headspace:** already listed, but its marketing leads with mental health. Should it stay under the no-health-claim rule?

## Example check: youtube.com/@EyeofWisdom87

**Result: not finished, and it can't be finished from here.**
- **YouTube:** robots.txt allows channel pages, but the request was redirected to YouTube's cookie consent page (consent.youtube.com, for Portugal). We never accept consent pages and never retry with another tool or identity, so nothing from the channel itself was read.
- **Web search (1):** found no page from the channel. One marketing newsletter (adamdelduca.beehiiv.com) names "Eye of Wisdom" as an ad-income channel; the search summary says it calls the videos low-value. That page refused us (403), so it wasn't read, and the claim is unconfirmed.
- **Likely outcome:** the name and handle fit the faceless "wisdom" pattern, which would fail rule 1. **Not confirmed.**

## What I need from you

1. **How to read YouTube channel pages.** From this machine they redirect to the consent page.
   - **Option a:** helpers read channel pages with WebFetch as their one fetch. The sprint briefs already allow WebFetch as the one honest fetch, and earlier sprints recorded YouTube counts from channel pages. WebFetch doesn't run from this machine, so it may not meet the EU consent page; that is untested. It accepts nothing and, used first, isn't a retry of a refused page. For Eye of Wisdom it would be a second try, so I won't do that one without your OK.
   - **Option b:** you look at the channels yourself.

   With option a, Eye of Wisdom is checked first in the sprint.
2. **Practice centres** (Insight Meditation Center, Common Ground and others): list them as channels, or as organisations (hubs that teachers can be linked to)?
3. **Headspace:** keep it, or take it out under the no-health-claim rule?
4. **The order:** I suggest source 1 first, then apps, then sources 3 and 2, aiming for **50 new listings on dev** in the first run.
