import { getContentBySubjectSlug, getAllSubjects, getHealerNames } from '../../../data/subjects.js';
import BookCard from '../../../components/BookCard.js';
import ContentShelf from '../../../components/ContentShelf.js';
import FreeResourceCard from '../../../components/FreeResourceCard.js';
import HealerCard from '../../../components/HealerCard.js';
import OfferingCard from '../../../components/OfferingCard.js';
import VideoGrid from '../../../components/VideoGrid.js';
import ShareButton from '../../../components/ShareButton.jsx';
import SiteLogo from '../../../components/SiteLogo.jsx';
import { buildMetadata, SITE_URL } from '../../../utils/seo.js';

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
    description: `Healers, books, videos, courses and free resources on ${name} — curated by Spiritpedia.`,
    path: `/subject/${slug}`,
  });
}

export default async function SubjectPage({ params }) {
  // In Next.js 16 params is a Promise and must be awaited before access. Reading
  // it synchronously yielded an undefined slug, which crashed prerendering on
  // slug.replace(). The ?. guards below keep the page renderable even if a route
  // is ever hit without a slug.
  const { slug } = await params;

  const [content, subjects, healerNameById] = await Promise.all([
    getContentBySubjectSlug(slug),
    getAllSubjects(),
    getHealerNames(),
  ]);

  const { healers, books, videos, courses, freeResources } = content;

  // Prefer the subject's real display name ("EFT / Tapping") over a de-hyphenated
  // slug ("eft tapping"), which mangles anything with punctuation or casing.
  const title = subjects.find((s) => s.slug === slug)?.name || slug?.replace(/-/g, ' ') || 'Subject';

  // The single `courses` table stores every paid offering, distinguished by
  // product_type. Legacy rows predate the column, so an unset value is treated as
  // a course (the admin default) rather than being silently dropped.
  const courseOfferings = courses.filter((c) => !c.product_type || c.product_type === 'course');
  const retreatOfferings = courses.filter((c) => c.product_type === 'retreat');
  const downloadOfferings = courses.filter((c) => c.product_type === 'download');

  // Detail-page cards on this subject page carry the subject as their back-context.
  const fromSubject = `/subject/${slug}`;

  const renderOffering = (item) => (
    <OfferingCard
      item={item}
      healerName={healerNameById.get(item.healer_id)}
      from={fromSubject}
      fromTitle={title}
    />
  );

  const isEmpty =
    healers.length === 0 &&
    books.length === 0 &&
    videos.length === 0 &&
    courses.length === 0 &&
    freeResources.length === 0;

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
            <ContentShelf
              title="Healers"
              subtitle="Practitioners & Teachers"
              items={healers}
              renderItem={(healer) => <HealerCard healer={healer} />}
              itemWidthClass="w-[260px]"
            />

            <ContentShelf
              title="Free Resources"
              subtitle="No Cost, No Catch"
              items={freeResources}
              renderItem={(item) => (
                <FreeResourceCard
                  item={item}
                  healerName={healerNameById.get(item.healer_id)}
                  from={fromSubject}
                  fromTitle={title}
                />
              )}
            />

            <ContentShelf
              title="Books & Literature"
              subtitle="The Curated Archive"
              items={books}
              renderItem={(book) => <BookCard book={book} from={fromSubject} fromTitle={title} />}
              itemWidthClass="w-[200px]"
            />

            <ContentShelf
              title="Courses & Programmes"
              subtitle="Go Deeper"
              items={courseOfferings}
              renderItem={renderOffering}
            />

            <ContentShelf
              title="Retreats & Live Events"
              subtitle="In Person"
              items={retreatOfferings}
              renderItem={renderOffering}
            />

            <ContentShelf
              title="Downloads & Audio"
              subtitle="Take It With You"
              items={downloadOfferings}
              renderItem={renderOffering}
            />

            {/* Videos are the one high-volume collection — a popular subject
                matches hundreds — so they get the homepage's paginated vertical
                grid rather than a scroll track that would mount every card at
                once. Same component, so the two pages cannot drift apart. */}
            <VideoGrid videos={videos} />
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
