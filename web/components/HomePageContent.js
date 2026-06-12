// Save this as your backup reference for: app/page.js (or components/HomePageContent.js)
import React, { suspense } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize the backend bridge client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function HomePage({ initialSubjectSlug }) {
  // The active subject slug is supplied by the parent server component (app/page.js),
  // which already awaited searchParams. We consume that prop directly here instead of
  // re-reading the async searchParams API, which fixes the data filter stream.
  const currentSubjectSlug = initialSubjectSlug || null;

  // 1. Concurrent fetching streams to secure all content instantly
  const [subjectsData, healersData, booksData, videosData] = await Promise.all([
    supabase.from('subjects').select('*').order('name', { ascending: true }),
    supabase.from('healers').select('*'),
    supabase.from('books').select('*'),
    supabase.from('videos').select('*')
  ]);

  const subjects = subjectsData.data || [];
  const allHealers = healersData.data || [];
  const allBooks = booksData.data || [];
  const allVideos = videosData.data || [];

  // 2. Filter content surgically based on the active top horizontal navigation scroller
  const filteredHealers = currentSubjectSlug
    ? allHealers.filter(healer => healer.subject_slugs?.includes(currentSubjectSlug))
    : allHealers;

  const filteredBooks = currentSubjectSlug
    ? allBooks.filter(book => book.subject_slugs?.includes(currentSubjectSlug))
    : allBooks;

  const filteredVideos = currentSubjectSlug
    ? allVideos.filter(video => video.subject_slugs?.includes(currentSubjectSlug))
    : allVideos;

  return (
    <div
      className="min-h-screen animate-gradient-slow text-white font-sans"
      style={{ background: 'linear-gradient(135deg, #0a2a66, #3f91ec, #a4c3ec, #0a2a66)', backgroundSize: '400% 400%' }}
    >
      {/* HEADER HERO ELEMENT */}
      <header className="py-16 text-center max-w-4xl mx-auto px-4">
        <h1 className="text-6xl font-extrabold tracking-wider mb-6 bg-clip-text text-transparent bg-gradient-to-r from-sky-500 via-purple-500 to-pink-500">
          SPIRITPEDIA
        </h1>
        <div className="relative max-w-xl mx-auto">
          <input
            type="text"
            placeholder="How are you feeling today?"
            className="w-full py-4 px-6 rounded-full bg-white/60 border border-white/50 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-300 backdrop-blur-md shadow-sm"
          />
        </div>
      </header>

      {/* TOP SCROLLER CATEGORIES */}
      <section className="max-w-6xl mx-auto px-6 mb-12">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-4 text-center">
          Explore by Subject
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide justify-start md:justify-center">
          <a 
            href="?" 
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border whitespace-nowrap ${
              !currentSubjectSlug
                ? 'bg-white text-black border-transparent shadow-lg shadow-black/20'
                : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
            }`}
          >
            🌟 View All
          </a>
          {subjects.map((sub) => (
            <a
              key={sub.id}
              href={`?subject=${sub.slug}`}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border whitespace-nowrap ${
                currentSubjectSlug === sub.slug
                  ? 'bg-white text-black border-transparent shadow-lg shadow-black/20'
                  : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
              }`}
            >
              {sub.name}
            </a>
          ))}
        </div>
      </section>

      {/* RENDER DYNAMIC SHELVES */}
      <main className="max-w-6xl mx-auto px-6 pb-24 grid gap-16">
        
        {/* SHELF 1: HEALERS DIRECTORY */}
        <section>
          <h2 className="text-2xl font-bold tracking-wide border-b border-slate-300/60 pb-3 mb-6 flex items-center gap-2">
            <span>🛡️</span> Master Practitioners
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHealers.map((healer) => (
              <a
                key={healer.id}
                href={`/healers/${healer.healer_slug}`}
                className="p-6 rounded-2xl bg-white text-black border border-slate-200 shadow-md transition-all duration-300 ease-out flex flex-col justify-between hover:shadow-xl hover:-translate-y-1"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold text-purple-600">{healer.name}</h3>
                    {healer.is_famous && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-600 border border-amber-300">
                        Superhero
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed mb-4">{healer.bio}</p>
                </div>
                {healer.city && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    📍 {healer.city}
                  </span>
                )}
              </a>
            ))}
          </div>
        </section>

        {/* SHELF 2: MULTIMEDIA VIDEO COMPONENT */}
        <section>
          <h2 className="text-2xl font-bold tracking-wide border-b border-slate-300/60 pb-3 mb-6 flex items-center gap-2">
            <span>🎬</span> YouTube Broadcast Library
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => {
              // Extract the standard ID token to build automated cover layout wrappers
              const videoId = video.platform_url?.includes('v=') 
                ? video.platform_url.split('v=')[1]?.split('&')[0] 
                : video.platform_url?.split('/').pop();
              
              return (
                <div key={video.id} className="overflow-hidden rounded-2xl bg-white text-black border border-slate-200 shadow-md hover:shadow-xl transition-all group">
                  <a href={video.platform_url} target="_blank" rel="noopener noreferrer" className="block relative aspect-video bg-black">
                    {videoId ? (
                      <img 
                        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} 
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">Video Link</div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-xl font-bold">▶</div>
                    </div>
                  </a>
                  <div className="p-4">
                    <h4 className="font-semibold text-slate-700 line-clamp-2 hover:text-purple-600 transition-colors">
                      <a href={video.platform_url} target="_blank" rel="noopener noreferrer">{video.title}</a>
                    </h4>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SHELF 3: CURATED ARCHIVE BOOKS */}
        <section>
          <h2 className="text-2xl font-bold tracking-wide border-b border-slate-300/60 pb-3 mb-6 flex items-center gap-2">
            <span>📚</span> Core Literary References
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((book) => (
              <a 
                key={book.id}
                href={book.amazon_url || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-4 rounded-2xl bg-white text-black border border-slate-200 shadow-md hover:shadow-xl transition-all flex gap-4 items-center"
              >
                <div className="w-16 h-24 bg-slate-100 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl shadow-md overflow-hidden border border-slate-200">
                  {book.mock_cover_url && book.mock_cover_url !== 'NULL' ? (
                    <img src={book.mock_cover_url} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    '📖'
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 line-clamp-1">{book.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">by {book.author}</p>
                  <span className="inline-block mt-3 text-[10px] font-bold text-purple-500 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200 uppercase tracking-wider">
                    Amazon Link
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
