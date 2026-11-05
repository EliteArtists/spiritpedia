# Email pass (5 Nov 2026)

**220 living listings had no email, the same 220 on dev and live.** Ascended Masters are left out, and no estate is among them. All 220 were researched again:

| Outcome | Count | Notes |
| :--- | :--- | :--- |
| **Published email found** | **53** | 16 their own, 18 business, 12 a centre they founded or co-lead, 5 press, 2 booking |
| **Contact form only** | **150** | Each is their own form URL (or their agent's, centre's or team's). 1 is held: Adam Dacey (below) |
| **Nothing at all** | **17** | Names below |

**Nothing is written yet, even on dev.** Two columns are needed first:
- the page where the email is published;
- the contact-form URL.

These come in migration `0039`. Everything else is ready: verified results, the apply script with a log and rollback, and the admin filter.

## Your steps

1. **Run `supabase/migrations/0039_contact_sources.sql` on dev** (SQL editor, whole file).
   - It adds `contact_email_source` and `contact_form_url` to `healers`.
   - There are no policy changes; healers stay public-read, as before.
   - The check row should read **2, 220**.
2. **Tell me it's done.** I then apply on dev:
   - 53 emails with their sources;
   - 149 contact forms (all but Adam Dacey's).

   After that, the check row's second number reads **167**.
3. **Look at Admin → Content on localhost** with the new **contact** filter. Its options are:
   - Any contact;
   - No email;
   - No email: contact form only;
   - No email: nothing at all.

   "No email" leaves out Ascended Masters, and rows with no email show a "Form only" or "No contact" badge. The edit page also gets the two new fields.
4. **Answer the decisions below.** After your OK:
   - you run 0039 on **live** (check row 2, 220);
   - I apply on live;
   - then the admin change can be pushed. The admin page reads `contact_form_url`, so **don't push `web/` before 0039 is on live**.

## Nothing at all (17)

Each was checked on their own site, any hub we may read, and up to 2 web searches.

**Their site refuses us (403, 406 or a bot check), so it was skipped under the standing rule.** A quick look in your own browser would probably find a route for most of these:
- **Adyashanti:** try his Open Gate Sangha press page.
- **Gangaji:** a search summary shows info@gangaji.org (her foundation); confirm it on gangaji.org.
- **Pema Chödrön:** her foundation site.
- **Elizabeth Gilbert.**
- **Stanislav Grof:** his site shows a Sucuri bot check. Grof Legacy Training shows nothing.
- **Robert Moss:** mossdreams.com.
- **John Douillard:** search snippets show admin@lifespa.com for press and speaking, but we couldn't open the page.

**No route published anywhere we can read:**
- **Jon Kabat-Zinn:** no contact page, form or email.
- **Dr Brian Weiss:** his site says he can no longer reply to messages.
- **Deepak Chopra:** his only form is for help with past purchases.
- **Justin Perry:** a bare Teachable school.
- **Jake Mace:** jakemace.com is now a parked domain, so his `website_url` needs fixing.
- **Amron Bevels:** a text and WhatsApp number only.
- **Marjorie Warkentin:** no website, only YouTube.
- **Bronwen Logan:** no email or form; the International House of Reiki inbox might still reach her.
- **Daisy Lee:** a newsletter sign-up only.
- **Tom Evans:** the old form at tomevans.co/contact-me/ is gone. It may now load by script.

## For you to decide

1. **Adam Dacey (held):** the About page on mindspace.org.uk carries casino spam links, so the site may be hacked. His contact form is there. Should we use it, or treat the site as hacked (website and booking links stay empty, which they already are)?
2. **Inboxes the rules allow but that may not reach the person.** Written on dev unless you say otherwise:
   - **Company support inboxes:** Abraham Hicks, Wim Hof (named for media), Dawson Church, Joe Vitale, Donna Eden, Paul Stamets (Fungi Perfecti), Tyler Henry (membership support), Esther Perel (support@; press@ also listed).
   - **Theresa Caputo:** club@, a fan-club inbox.
   - **Centres they founded or co-lead:**
     - Sharon Salzberg (IMS front office);
     - Byron Katie (customer care);
     - Russ Hudson (Enneagram Institute support; he also has his own form, recorded);
     - Jonathan Goldman (Sound Healers Association);
     - Tevia Feng (White Tiger Qigong);
     - Anodea Judith (her academy's coordinator, a gmail address);
     - Frans Stiene (IHReiki);
     - Bernat Font (Espai Sati);
     - Martin Aylward (Moulin de Chaves office);
     - Pascal Auclair and Daryl Lynn Ross (True North Insight's inbox, shown on her site).
   - **Press-only addresses:** Shamini Jain (a named CHI staff member), Cristi Christensen (her PR agency), Danielle MacKinnon (media@).
   - **Dr Gary Chapman:** his Moody Radio programme's listener inbox. There's also a form on 5lovelanguages.com.
   - **Assistants:** Sonia Choquette (assistant@) and Pea Horsley (reaches "Pea's team").
3. **Addresses that are clickable but not printed as text:**
   - Emma Estrela: a mailto button on her home page;
   - Will Caminada: an email button on his link page.

   I counted both as published. Rupert Sheldrake's address is assembled by a short script but shows as text when the page loads, which I confirmed on the saved page. OK?
4. **Addresses I did not use** (the contact form is recorded instead):
   - **Tony Robbins:** his PR agency's address appears only after submitting the form.
   - **Nicole Bayliss:** her address is only in hidden page data.
   - **Judy Wilkins-Smith:** her address is only in the page's meta description.
   - **Laura Berman Fortgang:** the address is Speakers.com's general inbox, not her agent's.
   - **Not used for the same reasons** (all forms):
     - Michelle Robertson, Christine Page, Walt Opie: hidden page data or an invisible link;
     - Eric Zimmer: guest@oneyoufeed.net, for podcast pitches only.

   Say if you'd like any of these used.
5. **Forms that may not reach the person, or not re-confirmed today:**
   - **Organisation forms:**
     - Plum Village (Brother Phap Huu, Brother Phap Linh);
     - Jewel Heart (Demo Rinpoche);
     - Gottman Institute;
     - Gene Keys support (Richard Rudd);
     - Isha Help Center (Sadhguru);
     - Joe Dispenza's support desk;
     - Bashar's helpdesk;
     - Dharma Ground (Tuere Sala);
     - Yogam Yoga (Duncan Rice);
     - The Reiki Academy (Torsten Lange);
     - CymaScope (John Stuart Reid).
   - **Melissa Crowhurst:** her chat widget says it doesn't reach her.
   - **Gabby Bernstein:** her speaking agent's form (Harry Walker); her own site refuses us.
   - **Marie Mbouni:** an application-call booking.
   - **Gregg Braden:** the form may add you to his list.
   - **Not re-confirmed** (their sites now refuse us or rate-limit us), so these keep the form URL from last week's research:
     - Matthew Duplessie, Jim Rajan, Perdita Finn, Hawah Kasat, Philip Shepherd, Laura Berman Fortgang.

**Also found:** Nassim Haramein's `website_url` (resonancescience.org) no longer resolves; nassimharamein.com is live. Jake Mace's site is parked. Neither is changed; say if you'd like them fixed.

## Research slips (reported; nothing from them used)

- **Second requests to a site that had just refused us.** Each used the same plain curl, never another identity:
  - takebackthemagic.com: a contact page queued after the home page returned 403;
  - hawahkasat.com: same pattern;
  - greggbraden.com: /press after a 406;
  - resonancescience.org: robots.txt retried once after a DNS failure.
- **Robots.txt not read first on a redirect host:**
  - Most www/bare-domain redirects and iRest's shop host had their robots.txt read only after landing. All of these allowed us.
  - Two redirects landed on paths robots.txt disallows (CIIS /profiles/, retreat.guru /search). Both copies were deleted and nothing from them was used.
  - One robots.txt and HEAD request went out in the same command (forms.deepakchopra.com); robots.txt allowed it.
- **One page re-fetched with `--compressed`** (Ken Nelson's team site), after it came back gzip-compressed and unreadable. It was not a refusal, and the user agent was the same.
- **Crawl delays missed** between two quick requests at Ken Honda's (30 s) and Jon Kabat-Zinn's (3 s) sites.
- **Guessed URLs on Sadhguru's site:** four guessed page paths (contact, media and similar), not email addresses.
- **bashar.org's robots.txt names ClaudeBot and Claude-Web** but not curl. We read it under the `*` group, as the brief allows. Say if you'd rather we skip sites that name Claude's agents at all.
- **Search budget:** a few listings had a third search.
- **Rules kept:** no fake user agents, proxies, archives, logins, contact-finder sites or forms submitted, and no off-limits site fetched.
- **Text on pages kept as data:** theresacaputo.com's robots.txt tells AI agents to use its own endpoints. It was ignored.

## Files

- **`docs/content-audits/email-pass-2026-11-05/`:**
  - `BRIEF.md`;
  - `queue.json` (the 220);
  - `results/` (one file per listing, with every URL checked);
  - `verify.py`: each address must appear on its saved source page;
  - `checked.json`;
  - `approved.json`: the doubtful ones written on dev (all but Adam Dacey);
  - `apply.mjs`: dry run, `--apply`, `--rollback`; logs each run.
- **Migration `0039_contact_sources.sql`.**
- **Admin:** `web/app/admin/content/page.js` has the "No email" filter; the edit page has the two new fields.
- **Ingestion:** it doesn't write the two new columns yet, so a live insert can't fail before 0039 is on live. Once 0039 is on both, I'll have it save each plan's email source and form URL.
