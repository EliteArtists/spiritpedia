// Save this as your backup reference for: app/page.js (or components/HomePageContent.js)
import React, { suspense } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize the backend bridge client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function HomePage({ searchParams }) {
  // Gracefully handle query execution matching the updated database names
  const currentSubjectSlug = searchParams?.subject || null;

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
    ? allBooks.filter(book => book.subject_slug === currentSubjectSlug)
    : allBooks;

  const filteredVideos = currentSubjectSlug
    ? allVideos.filter(video => video.subject_slug === currentSubjectSlug)
    : allVideos;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-indigo-950 text-white font-sans">
      {/* HEADER HERO ELEMENT */}
      <header className="py-16 text-center max-w-4xl mx-auto px-4">
        <h1 className="text-6xl font-extrabold tracking-wider mb-6 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-cyan-300">
          SPIRITPEDIA
        </h1>
        <div className="relative max-w-xl mx-auto">
          <input 
            type="text" 
            placeholder="How are you feeling today?" 
            className="w-full py-4 px-6 rounded-full bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-teal-400 backdrop-blur-md"
          />
        </div>
      </header>

      {/* TOP SCROLLER CATEGORIES */}
      <section className="max-w-6xl mx-auto px-6 mb-12">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-teal-400/70 mb-4 text-center">
          Explore by Subject
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide justify-start md:justify-center">
          <a 
            href="?" 
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border whitespace-nowrap ${
              !currentSubjectSlug 
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 border-transparent shadow-lg shadow-cyan-500/20' 
                : 'bg-white/5 border-white/10 hover:bg-white/10'
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
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 border-transparent shadow-lg shadow-cyan-500/20'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
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
          <h2 className="text-2xl font-bold tracking-wide border-b border-white/10 pb-3 mb-6 flex items-center gap-2">
            <span>🛡️</span> Master Practitioners
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHealers.map((healer) => (
              <div key={healer.id} className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-white/20 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold text-cyan-200">{healer.name}</h3>
                    {healer.is_famous && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        Superhero
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed mb-4">{healer.bio}</p>
                </div>
                {healer.city && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    📍 {healer.city}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* SHELF 2: MULTIMEDIA VIDEO COMPONENT */}
        <section>
          <h2 className="text-2xl font-bold tracking-wide border-b border-white/10 pb-3 mb-6 flex items-center gap-2">
            <span>🎬</span> YouTube Broadcast Library
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => {
              // Extract the standard ID token to build automated cover layout wrappers
              const videoId = video.platform_url?.includes('v=') 
                ? video.platform_url.split('v=')[1]?.split('&')[0] 
                : video.platform_url?.split('/').pop();
              
              return (
                <div key={video.id} className="overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group">
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
                    <h4 className="font-semibold text-slate-100 line-clamp-2 hover:text-cyan-300 transition-colors">
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
          <h2 className="text-2xl font-bold tracking-wide border-b border-white/10 pb-3 mb-6 flex items-center gap-2">
            <span>📚</span> Core Literary References
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((book) => (
              <a 
                key={book.id}
                href={book.amazon_url || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all flex gap-4 items-center"
              >
                <div className="w-16 h-24 bg-slate-800 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl shadow-md overflow-hidden border border-white/10">
                  {book.mock_cover_url && book.mock_cover_url !== 'NULL' ? (
                    <img src={book.mock_cover_url} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    '📖'
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 line-clamp-1">{book.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">by {book.author}</p>
                  <span className="inline-block mt-3 text-[10px] font-bold text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded-md border border-teal-400/20 uppercase tracking-wider">
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
