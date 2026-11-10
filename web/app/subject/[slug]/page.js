import { getContentBySubjectSlug, getAllSubjects, getHealerNames } from '../../../data/subjects.js';
import { isPlatform, officialFirst } from '../../../utils/listings.js';
import BookCard from '../../../components/BookCard.js';
import ContentShelf from '../../../components/ContentShelf.js';
import HealerCard from '../../../components/HealerCard.js';
import SubjectHealersShelf from '../../../components/SubjectHealersShelf.jsx';
import SubjectPagedShelf from '../../../components/SubjectPagedShelf.jsx';
import VideoShelves from '../../../components/VideoShelves.jsx';
import ShareButton from '../../../components/ShareButton.jsx';
import SiteLogo from '../../../components/SiteLogo.jsx';
import { buildMetadata, SITE_URL } from '../../../utils/seo.js';
import { MEDICAL_NOTE, needsMedicalNote } from '../../../utils/medicalNote.js';

// Subject pages stay statically generated (they are the same for every visitor),
// but they must not be frozen at build time. Supabase queries run through fetch,
// so without this the Data Cache pins each page to the catalog as it stood at the
// last deploy — and with content landing continuously, newly-ingested healers,
// books and videos would never appear until someone happened to rebuild.
// Regenerate hourly instead.
export const revalidate = 3600;

// Share card: the subject's display name and a line describing what the page
// collects. No entity image — the site-wide default share image applies. An
// unknown slug is not a 404 (the page renders empty shelves), so the title
// simply falls back to the de-hyphenated slug like the page heading does.
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const subjects = await getAllSubjects();
  const name = subjects.find((s) => s.slug === slug)?.name || slug?.replace(/-/g, ' ') || 'Subject';

  return buildMetadata({
    title: name,
    description: `Teachers, channels, books, videos, courses and free resources on ${name} — curated by Spiritpedia.`,
    path: `/subject/${slug}`,
  });
}

export default async function SubjectPage({ params }) {
  // In Next.js 16 params is a Promise and must be awaited before access. Reading
  // it synchronously yielded an undefined slug, which crashed prerendering on
  // slug.replace(). The ?. guards below keep the page renderable even if a route
  // is ever hit without a slug.
  const { slug } = await params;

  const [content, subjects, healerNames] = await Promise.all([
    getContentBySubjectSlug(slug),
    getAllSubjects(),
    getHealerNames(),
  ]);

  const { healers, places, books, counts } = content;
  // The video cards name their healer by slug. See getHealerNames(); the
  // offering and free-resource shelves bring their own names.
  const { bySlug: healerNamesBySlug } = healerNames;

  // Prefer the subject's real display name ("EFT / Tapping") over a de-hyphenated
  // slug ("eft tapping"), which mangles anything with punctuation or casing.
  const title = subjects.find((s) => s.slug === slug)?.name || slug?.replace(/-/g, ' ') || 'Subject';

  // Detail-page cards on this subject page carry the subject as their back-context.
  const fromSubject = `/subject/${slug}`;

  // Offerings and free resources load in the browser (SubjectPagedShelf); the
  // server only counts them. The single `courses` table holds every paid
  // offering, one shelf per product_type (utils/subjectShelves.js).
  const pagedShelf = (kind, shelfTitle, subtitle) => (
    <SubjectPagedShelf
      kind={kind}
      subjectSlug={slug}
      total={counts[kind]}
      title={shelfTitle}
      subtitle={subtitle}
      from={fromSubject}
      fromTitle={title}
    />
  );

  // Videos are no longer counted here — they are not fetched on the server any
  // more. A subject carrying videos and nothing else would therefore read as
  // empty; there is no such subject today (homeopathy is the only one with none
  // of the four, and its single video is below the shelf threshold anyway), but
  // it is the one case this branch now gets wrong.
  const isEmpty =
    healers.length === 0 &&
    books.length === 0 &&
    Object.values(counts).every((n) => !n);

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white font-sans">
      {/* Same sticky chrome as the homepage, so crossing between the two no
          longer drops the user from a dark canvas onto a white one. */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0f1d]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* My Library lives in the floating button now, which is on every
              page — a second copy here was the same link twice on one screen. */}
          <SiteLogo />
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <header className="mb-14 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-5xl font-bold capitalize text-white">{title}</h1>
            <p className="mt-3 text-xl text-gray-400">
              Curated content for your journey in {title}.
            </p>
            {needsMedicalNote([slug]) && <p className="mt-2 text-sm text-gray-500">{MEDICAL_NOTE}</p>}
          </div>
          <ShareButton
            className="shrink-0 mt-2"
            url={`${SITE_URL}/subject/${slug}`}
            title={`${title} on Spiritpedia`}
          />
        </header>

        {isEmpty ? (
          <p className="rounded-2xl border border-white/10 bg-[#111827] p-10 text-center text-gray-400">
            Nothing here yet — this subject is still being curated.
          </p>
        ) : (
          // grid-cols-1 is load-bearing, exactly as on the homepage: an implicit
          // auto column sizes to its items' max-content width, which would stretch
          // the page to the full un-wrapped width of every shelf.
          // Shelf order mirrors the homepage so the two pages read identically.
          <main className="grid grid-cols-1 gap-14">
            {/* Tier order, then by name; nearest first within each tier once
                the visitor has set an area (a client component, because the
                area lives in the browser). */}
            <SubjectHealersShelf healers={healers.filter((h) => !isPlatform(h))} places={places} />

            {/* Channels, apps and organisations apart from the teachers, as on
                the homepage; Spiritpedia's own first, then by tier and name. */}
            <ContentShelf
              title="Channels"
              subtitle="Channels, Apps & Organisations"
              items={officialFirst(healers.filter(isPlatform))}
              renderItem={(healer) => <HealerCard healer={healer} />}
              itemWidthClass="w-[260px]"
            />

            {pagedShelf('free', 'Free Resources', 'No Cost, No Catch')}

            <ContentShelf
              title="Books & Literature"
              subtitle="The Curated Archive"
              items={books}
              renderItem={(book) => <BookCard book={book} from={fromSubject} fromTitle={title} />}
              itemWidthClass="w-[200px]"
            />

            {pagedShelf('course', 'Courses & Programmes', 'Go Deeper')}

            {pagedShelf('retreat', 'Retreats & Live Events', 'In Person')}

            {pagedShelf('download', 'Downloads & Audio', 'Take It With You')}

            {/* Videos are the one high-volume collection — a popular subject
                matches hundreds, self-healing over a thousand — so they are
                fetched from the client rather than shipped in this page's HTML,
                and grouped into a shelf per teacher rather than listed flat.
                The same component the homepage's Videos tab uses, given the
                same subject slug, so the two cannot drift apart.

                from/fromTitle give each card its back-context, so a video
                opened from here offers "Back to {title}" rather than the
                generic "Back to Videos". */}
            <VideoShelves
              subjectSlug={slug}
              healerNames={healerNamesBySlug}
              from={fromSubject}
              fromTitle={title}
            />
          </main>
        )}
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  const subjects = await getAllSubjects();
  return subjects.map((subject) => ({
    slug: subject.slug,
  }));
}
