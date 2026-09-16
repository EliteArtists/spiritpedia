import { supabase } from '@/utils/supabase';
import BookCard from '@/components/BookCard';
import BackButton from '@/components/BackButton';
import ContentShelf from '@/components/ContentShelf';
import FreeResourceCard from '@/components/FreeResourceCard';
import HeroImageRotator from '@/components/HeroImageRotator';
import OfferingCard from '@/components/OfferingCard';
import VideoPlayer from '@/components/VideoPlayer';
import { buildMetadata, notFoundMetadata, pickImage } from '@/utils/seo';

// Hourly ceiling on staleness — see the note in app/page.js. Reading
// searchParams for the back link already makes this route per-request, so this
// is a guard against a future refactor silently freezing the profile.
export const revalidate = 3600;

// Social-link glyphs. Sized via className (w-5 h-5) and drawn in currentColor so
// each inherits the button's white text; no fixed pixel dimensions to fight the
// Tailwind sizing the brief specifies.
const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: 'w-5 h-5 text-white',
};

function GlobeIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-2C18.88 4 12 4 12 4s-6.88 0-8.59.42a2.78 2.78 0 0 0-1.95 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.41 19c1.71.46 8.59.46 8.59.46s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" stroke="none" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg {...iconProps}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg {...iconProps}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg {...iconProps}>
      <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg {...iconProps}>
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

// Envelope + handset glyphs for the contact rows — smaller than the social set so
// they read as an inline prefix to the address/number text.
function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="w-4 h-4 shrink-0"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="w-4 h-4 shrink-0"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

// Tier badge — matched to the homepage/billboard motif. An unknown or NULL tier
// gets a neutral "Teacher" badge rather than borrowing Local Hero's, so a tier
// that reaches the database before the UI is visibly unstyled, not mislabelled.
function TierBadge({ tier }) {
  if (tier === 'superhero') {
    return (
      <span className="inline-block rounded-full bg-[#fef08a] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#78350f] shadow-sm">
        Superhero
      </span>
    );
  }
  if (tier === 'ascended_master') {
    return (
      <span className="inline-block rounded-full bg-[#c9a84c] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#1a1a1a] shadow-sm">
        Ascended Master
      </span>
    );
  }
  if (tier === 'luminary') {
    return (
      <span className="inline-block rounded-full bg-violet-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
        Luminary
      </span>
    );
  }
  if (tier === 'local_hero') {
    return (
      <span className="inline-block rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
        Local Hero
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-gray-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
      Teacher
    </span>
  );
}

// Share card: name, opening of the bio, first portrait. og:type 'profile'
// tells crawlers this is a person page. A missing slug yields a noindex head.
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { data: healer } = await supabase
    .from('healers')
    .select('name, bio, image_urls, image_url')
    .eq('healer_slug', slug)
    .single();
  if (!healer) return notFoundMetadata('Healer');

  return buildMetadata({
    title: healer.name,
    description: healer.bio,
    path: `/healers/${slug}`,
    image: pickImage(healer.image_urls?.[0], healer.image_url),
    type: 'profile',
  });
}

export default async function HealerProfile({ params, searchParams }) {
  const { slug } = await params;
  // Contextual back navigation — whatever page linked here supplies its path + label.
  const { from, fromTitle } = await searchParams;

  const { data: healer, error } = await supabase.from('healers').select('*').eq('healer_slug', slug).single();

  if (error || !healer) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center p-20 text-center font-bold uppercase tracking-widest text-gray-300">
        Healer not found.
      </div>
    );
  }

  // Books and videos relate to a healer via the relational `healer_slug` column
  // written by the admin "Link Healer / Author" system.
  const { data: books } = await supabase.from('books').select('*').eq('healer_slug', slug);
  const { data: videos } = await supabase.from('videos').select('*').eq('healer_slug', slug);

  // EXPIRATION WINDOW — offerings surface only while live: the row must be
  // is_active, and either evergreen (end_date IS NULL) or not yet past its end
  // date. today is a YYYY-MM-DD string to match the DATE column format.
  const today = new Date().toISOString().slice(0, 10);
  const liveWindow = `end_date.is.null,end_date.gte.${today}`;

  // Courses relate to a healer through the relational bigint `healer_id` FK (not
  // the slug), so key the lookup off the resolved healer record's id.
  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('healer_id', healer.id)
    .eq('is_active', true)
    .or(liveWindow);

  // Free resources are also keyed off the bigint healer_id and carry the same
  // live-window filter. A missing/empty table yields null → the shelf hides.
  const { data: freeResources } = await supabase
    .from('free_resources')
    .select('*')
    .eq('healer_id', healer.id)
    .eq('is_active', true)
    .or(liveWindow);

  // The single `courses` table stores every paid offering, split by product_type.
  // Legacy rows predate the column, so an unset value is treated as a course (the
  // admin default) rather than being silently dropped.
  const offerings = Array.isArray(courses) ? courses : [];
  const courseOfferings = offerings.filter((c) => !c.product_type || c.product_type === 'course');
  const retreatOfferings = offerings.filter((c) => c.product_type === 'retreat');
  const downloadOfferings = offerings.filter((c) => c.product_type === 'download');
  const membershipOfferings = offerings.filter((c) => c.product_type === 'membership');

  // Up to 3 portraits feed the crossfade hero rotator.
  const portraits = Array.isArray(healer.image_urls) ? healer.image_urls.filter(Boolean).slice(0, 3) : [];

  const firstName = healer.name?.split(' ')[0] || healer.name;

  // Every detail-page card on this profile carries the healer as its back-context,
  // so tapping a book/offering/resource and pressing back returns here, not home.
  const fromHealer = `/healers/${slug}`;

  // SOCIAL + WEB LINKS — only entries with a populated column survive, so an icon
  // button renders solely for channels the healer actually filled in.
  const socialLinks = [
    { key: 'website', label: 'Website', url: healer.website_url, icon: GlobeIcon },
    { key: 'youtube', label: 'YouTube', url: healer.youtube_url, icon: YoutubeIcon },
    { key: 'instagram', label: 'Instagram', url: healer.instagram_url, icon: InstagramIcon },
    { key: 'facebook', label: 'Facebook', url: healer.facebook_url, icon: FacebookIcon },
    { key: 'twitter', label: 'Twitter', url: healer.twitter_url, icon: TwitterIcon },
    { key: 'tiktok', label: 'TikTok', url: healer.tiktok_url, icon: TikTokIcon },
  ].filter((link) => link.url);

  // The contact funnel is the Local Hero directory feature — it only appears when
  // the healer actually has an email, phone, or booking link on file. Ascended
  // Masters are deceased, so the whole card (availability pills, email, phone,
  // booking button) is suppressed for them even if legacy contact data exists.
  const hasContact =
    healer.tier !== 'ascended_master' &&
    Boolean(healer.contact_email || healer.contact_phone || healer.booking_url);

  // NOTE ON THE BIO SCROLL BOX
  // The brief asked for a word-count trigger (>300 words → scroll). That was
  // tried and abandoned: word count is a poor proxy for rendered height in a
  // narrow column. Wim Hof's bio is 289 words — under the threshold — yet wraps
  // to roughly 800px here and pushed the shelves off the fold, which is the
  // exact failure the scroll box exists to prevent.
  //
  // Capping the height unconditionally instead lets CSS measure the real
  // overflow: a bio only scrolls when it genuinely exceeds 300px, whatever its
  // word count, font size, or column width. Short bios (Eckhart Tolle, 55 words)
  // render as plain flowing text with no scrollbar, exactly as before.

  return (
    <main className="min-h-screen bg-[#0a0f1d] text-white font-sans">
      {/* ── SECTION 1 · TWO-COLUMN PROFILE HERO ──────────────────────────── */}
      {/* Portrait left (~40%), identity + bio + contact right (~60%). Replaces
          the old full-bleed cinematic banner, which cropped faces and stretched
          images inconsistently across the directory. */}
      <section className="bg-[#0a0f1d] px-6 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Back link — very top left, context-aware, above the columns. */}
          <div className="mb-8">
            <BackButton from={from} fromTitle={fromTitle} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-10">
            {/* 1a · LEFT — contained rotating portrait + indicator dots. */}
            <HeroImageRotator images={portraits} alt={healer.name} />

            {/* 1b · RIGHT — name, tier, social, bio, contact. */}
            <div className="min-w-0">
              <h1 className="text-4xl font-bold text-white">{healer.name}</h1>

              <div className="mt-3">
                <TierBadge tier={healer.tier} />
              </div>

              {/* Lifespan — only when a birth year is recorded. A death year
                  closes the range; without one the person is presumed living. */}
              {healer.birth_year && (
                <p className="text-sm text-gray-400 mt-1">
                  {healer.death_year
                    ? `${healer.birth_year} — ${healer.death_year}`
                    : `b. ${healer.birth_year}`}
                </p>
              )}

              {/* Social row — the same frosted-glass icon buttons as before,
                  moved off the image and onto the dark column. Hidden entirely
                  when the healer has no populated channels. */}
              {socialLinks.length > 0 && (
                <div className="flex items-center gap-3 mt-5 flex-wrap">
                  {socialLinks.map(({ key, label, url, icon: Icon }) => (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      title={label}
                      className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm transition-colors duration-200 flex items-center justify-center"
                    >
                      <Icon />
                    </a>
                  ))}
                </div>
              )}

              {/* Bio — long ones scroll in place so the two columns stay aligned
                  and the shelves below never get pushed off the fold. pr-4 keeps
                  the text clear of the scrollbar gutter when one appears. */}
              {healer.bio && (
                <div className="mt-6 max-h-[300px] overflow-y-auto pr-4">
                  <p className="text-base leading-relaxed text-gray-300 whitespace-pre-line">
                    {healer.bio}
                  </p>
                </div>
              )}

              {/* Contact funnel — the Local Hero directory feature, shown only
                  when the healer has an email, phone, or booking link on file.
                  Left-aligned here to sit with the rest of the column rather
                  than centred as it was when it spanned the page. */}
              {hasContact && (
                <section className="mt-8 bg-[#111827] rounded-2xl p-6 shadow-xl">
                  {(healer.city || healer.availability_type?.includes('Online')) && (
                    <div className="flex flex-wrap gap-2 mb-5">
                      {healer.city && (
                        <span className="bg-indigo-950/60 text-indigo-300 text-xs px-3 py-1 rounded-full font-medium">
                          In Person ({healer.city})
                        </span>
                      )}
                      {healer.availability_type?.includes('Online') && (
                        <span className="bg-purple-950/60 text-purple-300 border border-purple-500/30 text-xs px-3 py-1 rounded-full font-medium">
                          Online Session available
                        </span>
                      )}
                    </div>
                  )}

                  {/* Email + phone — stacked, since the column is too narrow to
                      sit them side by side without truncating the address. */}
                  {(healer.contact_email || healer.contact_phone) && (
                    <div className="flex flex-col gap-3 mb-5 text-sm text-gray-300">
                      {healer.contact_email && (
                        <a
                          href={`mailto:${healer.contact_email}?subject=Inquiry via Spiritpedia`}
                          className="flex items-center gap-2 font-medium transition-colors hover:text-emerald-300"
                        >
                          <MailIcon />
                          <span className="truncate">{healer.contact_email}</span>
                        </a>
                      )}
                      {healer.contact_phone && (
                        <a
                          href={`tel:${healer.contact_phone}`}
                          className="flex items-center gap-2 font-medium transition-colors hover:text-emerald-300"
                        >
                          <PhoneIcon />
                          <span>{healer.contact_phone}</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Booking button — full-width purple CTA. */}
                  {healer.booking_url && (
                    <a
                      href={healer.booking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm rounded-xl shadow-lg transition-all hover:scale-[1.01] active:scale-95 block"
                    >
                      Book with {firstName} &rarr;
                    </a>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4 · CONTENT SHELVES ──────────────────────────────────── */}
      {/* grid-cols-1 is load-bearing (same as the homepage/subject page): an
          implicit auto column would size to each shelf's un-wrapped max-content
          width and stop the tracks from scrolling. Each ContentShelf hides itself
          when empty, so zero-content categories leave no orphaned headers. */}
      <div className="mx-auto max-w-7xl px-6 pb-20 grid grid-cols-1 gap-14">
        {/* 4a · Videos */}
        <ContentShelf
          title="Videos"
          subtitle="Teachings & Talks"
          items={videos}
          renderItem={(video) => <VideoPlayer video={video} variant="dark" />}
          itemWidthClass="w-[320px]"
        />

        {/* 4b · Books */}
        <ContentShelf
          title="Books & Literature"
          subtitle="The Curated Archive"
          items={books}
          renderItem={(book) => <BookCard book={book} from={fromHealer} fromTitle={healer.name} />}
          itemWidthClass="w-[200px]"
        />

        {/* 4c · Free Resources */}
        <ContentShelf
          title="Free Resources"
          subtitle="No Cost, No Catch"
          items={freeResources}
          renderItem={(item) => <FreeResourceCard item={item} from={fromHealer} fromTitle={healer.name} />}
        />

        {/* 4d · Courses (product_type = 'course') */}
        <ContentShelf
          title="Courses & Programmes"
          subtitle="Go Deeper"
          items={courseOfferings}
          renderItem={(item) => <OfferingCard item={item} from={fromHealer} fromTitle={healer.name} />}
        />

        {/* 4e · Retreats (product_type = 'retreat') */}
        <ContentShelf
          title="Retreats & Events"
          subtitle="Live Experiences"
          items={retreatOfferings}
          renderItem={(item) => <OfferingCard item={item} from={fromHealer} fromTitle={healer.name} />}
        />

        {/* 4f · Downloads (product_type = 'download') */}
        <ContentShelf
          title="Downloads & Audio"
          subtitle="Take It With You"
          items={downloadOfferings}
          renderItem={(item) => <OfferingCard item={item} from={fromHealer} fromTitle={healer.name} />}
        />

        {/* 4g · Memberships (product_type = 'membership') */}
        <ContentShelf
          title="Memberships"
          subtitle="Ongoing Journey"
          items={membershipOfferings}
          renderItem={(item) => <OfferingCard item={item} from={fromHealer} fromTitle={healer.name} />}
        />
      </div>
    </main>
  );
}
