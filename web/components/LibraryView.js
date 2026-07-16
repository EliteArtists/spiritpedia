'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import BookCard from './BookCard.js';
import ContentShelf from './ContentShelf.js';
import FreeResourceCard from './FreeResourceCard.js';
import HealerCard from './HealerCard.js';
import OfferingCard from './OfferingCard.js';
import SubjectPills from './SubjectPills.js';
import VideoPlayer from './VideoPlayer.js';
import { FAVORITE_KEYS, readFavorites } from '../utils/favorites.js';

// My Library — the same streaming shelf language as the homepage, but every shelf
// is drawn from what this visitor actually saved. No billboard: the library is a
// workspace, not a storefront, and there is nothing here to promote.
//
// Favourites live in localStorage, so the server ships the full catalog and this
// client component intersects it against the saved ids.
export default function LibraryView({
  books = [],
  videos = [],
  healers = [],
  subjects = [],
  courses = [],
  freeResources = [],
  healerNames = [],
}) {
  // null = still reading localStorage. Distinct from "read it, found nothing" —
  // rendering the empty state during that gap would flash "your library is empty"
  // at someone whose library is full.
  const [saved, setSaved] = useState(null);
  const [activeSubject, setActiveSubject] = useState(null);

  const healerNameById = useMemo(
    () => new Map(healerNames.map((h) => [h.id, h.name])),
    [healerNames]
  );

  useEffect(() => {
    const savedHealerKeys = readFavorites(FAVORITE_KEYS.healers).map(String);
    const savedBookIds = readFavorites(FAVORITE_KEYS.books).map(String);
    const savedVideoIds = readFavorites(FAVORITE_KEYS.videos).map(String);
    const savedCourseIds = readFavorites(FAVORITE_KEYS.courses).map(String);
    const savedResourceIds = readFavorites(FAVORITE_KEYS.freeResources).map(String);

    setSaved({
      // Healers are keyed by slug, but older entries were written by id — accept
      // either so a long-standing library does not lose rows.
      healers: healers.filter(
        (h) =>
          savedHealerKeys.includes(String(h.healer_slug)) || savedHealerKeys.includes(String(h.id))
      ),
      // Books are now keyed by slug (detail-page buttons), but the shelf card
      // heart still saves by id — accept either so no saved row is lost.
      books: books.filter(
        (b) => savedBookIds.includes(String(b.slug)) || savedBookIds.includes(String(b.id))
      ),
      videos: videos.filter((v) => savedVideoIds.includes(String(v.id))),
      courses: courses.filter((c) => savedCourseIds.includes(String(c.id))),
      freeResources: freeResources.filter((r) => savedResourceIds.includes(String(r.id))),
    });
  }, [healers, books, videos, courses, freeResources]);

  // THE CURATION LAYER — the union of every subject slug across everything the
  // visitor saved. This is what restricts the pill row: the library only ever
  // offers a filter that will actually return something.
  const savedSubjectSlugs = useMemo(() => {
    if (!saved) return [];
    const slugs = new Set();
    Object.values(saved)
      .flat()
      .forEach((item) => {
        (Array.isArray(item.subject_slugs) ? item.subject_slugs : []).forEach((slug) => {
          if (slug) slugs.add(slug);
        });
      });
    return [...slugs];
  }, [saved]);

  const totalSaved = saved ? Object.values(saved).flat().length : 0;

  // Apply the pill filter to a shelf. With no pill selected everything shows.
  const bySubject = (rows) =>
    activeSubject ? rows.filter((row) => row.subject_slugs?.includes(activeSubject)) : rows;

  const renderOffering = (item) => (
    <OfferingCard item={item} healerName={healerNameById.get(item.healer_id)} />
  );

  // Paid offerings all live in one table, split apart by product_type. An unset
  // value means a legacy row, which the admin default treats as a course.
  const savedCourses = saved?.courses ?? [];
  const courseOfferings = bySubject(
    savedCourses.filter((c) => !c.product_type || c.product_type === 'course')
  );
  const retreatOfferings = bySubject(savedCourses.filter((c) => c.product_type === 'retreat'));
  const downloadOfferings = bySubject(savedCourses.filter((c) => c.product_type === 'download'));

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white font-sans">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0f1d]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="bg-gradient-to-r from-sky-500 via-purple-500 to-pink-500 bg-clip-text text-2xl font-extrabold tracking-wider text-transparent"
          >
            SPIRITPEDIA
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-white/20 active:scale-95"
          >
            &larr; Explore
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <header className="mb-10">
          <h1 className="text-5xl font-bold text-white">My Library</h1>
          <p className="mt-3 text-xl text-gray-400">
            {totalSaved > 0
              ? `Your saved archive — ${totalSaved} item${totalSaved === 1 ? '' : 's'}.`
              : 'Your saved archive.'}
          </p>
        </header>

        {saved === null ? null : totalSaved === 0 ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
            <div className="mb-6 select-none text-7xl opacity-30">📚</div>
            <h2 className="mb-3 text-3xl font-bold">Your library is empty.</h2>
            <p className="max-w-md text-gray-400">
              Tap the heart on any healer, book, video, course, or free resource to build your
              spiritual archive.
            </p>
            <Link
              href="/"
              className="mt-8 rounded-full bg-[#7c3aed] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-[#7c3aed]/30 transition-all hover:scale-105 hover:bg-[#6d28d9] active:scale-95"
            >
              Start exploring
            </Link>
          </div>
        ) : (
          <>
            {/* Pills restricted to the subjects the visitor's own saved items
                carry, filtering by client state rather than navigation. */}
            <section className="pb-10">
              <SubjectPills
                subjects={subjects}
                currentSubjectSlug={activeSubject}
                allowedSlugs={savedSubjectSlugs}
                onSelect={setActiveSubject}
              />
            </section>

            {/* grid-cols-1 is load-bearing, as on the homepage: an implicit auto
                column sizes to its items' max-content width, which would stretch
                the page to the full un-wrapped width of every shelf. */}
            <main className="grid grid-cols-1 gap-14">
              <ContentShelf
                title="Saved Healers"
                subtitle="Your Practitioners"
                items={bySubject(saved.healers)}
                renderItem={(healer) => <HealerCard healer={healer} />}
                itemWidthClass="w-[260px]"
              />

              <ContentShelf
                title="Saved Books"
                subtitle="Your Reading List"
                items={bySubject(saved.books)}
                renderItem={(book) => <BookCard book={book} />}
                itemWidthClass="w-[200px]"
              />

              <ContentShelf
                title="Saved Free Resources"
                subtitle="No Cost, No Catch"
                items={bySubject(saved.freeResources)}
                renderItem={(item) => (
                  <FreeResourceCard item={item} healerName={healerNameById.get(item.healer_id)} />
                )}
              />

              <ContentShelf
                title="Saved Courses"
                subtitle="Go Deeper"
                items={courseOfferings}
                renderItem={renderOffering}
              />

              <ContentShelf
                title="Saved Retreats"
                subtitle="In Person"
                items={retreatOfferings}
                renderItem={renderOffering}
              />

              <ContentShelf
                title="Saved Downloads"
                subtitle="Take It With You"
                items={downloadOfferings}
                renderItem={renderOffering}
              />

              <ContentShelf
                title="Saved Videos"
                subtitle="Watch & Learn"
                items={bySubject(saved.videos)}
                renderItem={(video) => <VideoPlayer video={video} variant="dark" />}
                itemWidthClass="w-[320px]"
              />
            </main>
          </>
        )}
      </div>
    </div>
  );
}
