import { getContentBySubjectSlug, getAllSubjects } from '../../../data/subjects.js';
import Link from 'next/link';
import BookCard from '../../../components/BookCard.js';
import ContentShelf from '../../../components/ContentShelf.js';
import HealerCard from '../../../components/HealerCard.js';
import VideoPlayer from '../../../components/VideoPlayer.js';

export default async function SubjectPage({ params }) {
  // In Next.js 16 params is a Promise and must be awaited before access. Reading
  // it synchronously yielded an undefined slug, which crashed prerendering on
  // slug.replace(). The ?. guards below keep the page renderable even if a route
  // is ever hit without a slug.
  const { slug } = await params;

  const [{ books, videos, healers }, subjects] = await Promise.all([
    getContentBySubjectSlug(slug),
    getAllSubjects(),
  ]);

  // Prefer the subject's real display name ("EFT / Tapping") over a de-hyphenated
  // slug ("eft tapping"), which mangles anything with punctuation or casing.
  const title = subjects.find((s) => s.slug === slug)?.name || slug?.replace(/-/g, ' ') || 'Subject';

  const isEmpty = healers.length === 0 && books.length === 0 && videos.length === 0;

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white font-sans">
      {/* Same sticky chrome as the homepage, so crossing between the two no
          longer drops the user from a dark canvas onto a white one. */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0f1d]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="bg-gradient-to-r from-sky-500 via-purple-500 to-pink-500 bg-clip-text text-2xl font-extrabold tracking-wider text-transparent"
          >
            SPIRITPEDIA
          </Link>
          <Link
            href="/library"
            className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-white/20 active:scale-95"
          >
            ✦ My Library
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <Link
          href="/"
          className="mb-8 inline-block text-sm font-semibold text-[#7c3aed] transition-colors hover:text-[#a78bfa]"
        >
          &larr; Back to Home
        </Link>

        <header className="mb-14">
          <h1 className="text-5xl font-bold capitalize text-white">{title}</h1>
          <p className="mt-3 text-xl text-gray-400">
            Curated content for your journey in {title}.
          </p>
        </header>

        {isEmpty ? (
          <p className="rounded-2xl border border-white/10 bg-[#111827] p-10 text-center text-gray-400">
            Nothing here yet — this subject is still being curated.
          </p>
        ) : (
          // grid-cols-1 is load-bearing, exactly as on the homepage: an implicit
          // auto column sizes to its items' max-content width, which would stretch
          // the page to the full un-wrapped width of every shelf.
          <main className="grid grid-cols-1 gap-14">
            <ContentShelf
              title="Healers"
              subtitle="Practitioners & Teachers"
              items={healers}
              renderItem={(healer) => <HealerCard healer={healer} />}
              itemWidthClass="w-[260px]"
            />

            <ContentShelf
              title="Books & Literature"
              subtitle="The Curated Archive"
              items={books}
              renderItem={(book) => <BookCard book={book} />}
              itemWidthClass="w-[200px]"
            />

            <ContentShelf
              title="Videos"
              subtitle="Watch & Learn"
              items={videos}
              renderItem={(video) => <VideoPlayer video={video} variant="dark" />}
              itemWidthClass="w-[320px]"
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
