'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getContentBySubjectSlug } from '@/data/subjects.js';

// NEW: List of Trending Emotional States from your vision
const EMOTIONAL_STATES = [
  "I feel lost", "I can't forgive", "I need peace", 
  "I feel anxious", "I can't sleep", "I feel heartbroken",
  "I'm overwhelmed", "I feel disconnected", "I want to trust again",
  "I want to let go", "I'm holding onto the past", "I feel stuck"
];

export default function HomePageContent({ allSubjects, initialSubjectSlug }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [selectedSlug, setSelectedSlug] = useState(initialSubjectSlug); 
  const [content, setContent] = useState({ books: [], videos: [], healers: [] });
  const [isLoading, setIsLoading] = useState(false);

  const fetchContent = useCallback(async (slug) => {
    if (!slug) {
        setContent({ books: [], videos: [], healers: [] });
        return;
    }
    setIsLoading(true);
    const data = await getContentBySubjectSlug(slug); 
    setContent(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const urlSlug = searchParams.get('subject');
    if (urlSlug && urlSlug !== selectedSlug) {
      setSelectedSlug(urlSlug);
      fetchContent(urlSlug);
    } else if (!urlSlug && selectedSlug) {
      setSelectedSlug(null);
      setContent({ books: [], videos: [], healers: [] });
    }
  }, [searchParams, fetchContent]);

  const handleSubjectClick = (slug) => {
    setSelectedSlug(slug);
    router.push(`/?subject=${slug}`, undefined, { shallow: true }); 
  };

  return (
    <main className="min-h-screen bg-white">

      {/* 1. HERO SECTION (BLUE GRADIENT) */}
      <div className="w-full p-8 md:p-16 lg:p-20 hero-gradient text-white flex flex-col items-center">
        
        <h1 className="text-5xl md:text-6xl font-bold mb-8">Spiritpedia</h1>
        
        {/* Search Box */}
        <div className="w-full max-w-2xl relative mb-8">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="How are you feeling today?" 
            className="w-full pl-14 pr-5 py-4 text-lg text-gray-900 border border-gray-300 rounded-full shadow-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* NEW: EMOTIONAL STATES CAROUSEL */}
        <div className="w-full max-w-4xl">
          <p className="text-center text-sm font-medium mb-4 opacity-80 uppercase tracking-widest">Trending Emotional States</p>
          <div className="flex overflow-x-auto space-x-3 pb-4 no-scrollbar">
            {EMOTIONAL_STATES.map((state) => (
              <button
                key={state}
                className="flex-shrink-0 px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full text-sm font-medium transition-all whitespace-nowrap backdrop-blur-sm"
                onClick={() => alert(`Next weekend we will link "${state}" to the keyword search!`)}
              >
                {state}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. SUBJECTS SCROLLER */}
      <section className="w-full py-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 px-8">Explore by Subject</h2>
        <div className="w-full overflow-x-auto whitespace-nowrap py-4 px-8">
          {allSubjects.map((subject) => (
            <button
              key={subject.slug} 
              onClick={() => handleSubjectClick(subject.slug)} 
              className={`inline-flex flex-col items-center justify-start w-28 text-center mr-3 transition-transform hover:scale-105 p-1 border-2 rounded-2xl
                  ${selectedSlug === subject.slug ? 'border-blue-600 bg-blue-50' : 'border-transparent'}
              `}
            >
              <div className="w-20 h-20 bg-gray-100 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center">
                  {/* Real icons coming later */}
              </div>
              <span className="mt-3 text-sm font-medium text-gray-700 whitespace-normal break-words">
                {subject.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. CONTENT DISPLAY */}
      <section className="w-full p-8 bg-gray-50 border-t">
        {!selectedSlug ? (
             <div className="w-full max-w-6xl mx-auto text-center py-20">
                <h2 className="text-3xl font-bold text-gray-300">Select a subject or feeling to begin your journey.</h2>
             </div>
        ) : (
            <div className="w-full max-w-6xl mx-auto space-y-12">
                <h2 className="text-2xl font-extrabold text-gray-800 text-center capitalize">
                    {selectedSlug.replace(/-/g, ' ')} Content
                </h2>

                {isLoading ? (
                    <p className="text-center text-blue-600 animate-pulse">Gathering spiritual wisdom...</p>
                ) : (
                    <>
                        {/* Books Section */}
                        <section>
                          <h3 className="text-3xl font-bold text-blue-600 mb-6">📚 Books ({content.books.length})</h3>
                          <div className="flex overflow-x-auto space-x-6 pb-6">
                            {content.books.map((book) => (
                              <div key={book.id} className="flex-shrink-0 w-64 bg-white p-6 rounded-xl shadow-md border-t-4 border-blue-400">
                                <h4 className="text-xl font-bold text-gray-900">{book.title}</h4>
                                <p className="text-sm text-gray-500 mt-2">by {book.author}</p>
                              </div>
                            ))}
                          </div>
                        </section>

                        {/* Videos Section */}
                        <section>
                          <h3 className="text-3xl font-bold text-pink-600 mb-6">🎥 Videos ({content.videos.length})</h3>
                          <div className="flex overflow-x-auto space-x-6 pb-6">
                            {content.videos.map((video) => (
                              <a key={video.title} href={video.platform_url} target="_blank" className="flex-shrink-0 w-72 bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all border-t-4 border-pink-400">
                                <p className="text-lg font-semibold text-gray-800">{video.title}</p>
                                <span className="text-blue-500 text-sm mt-4 block">Watch Now &rarr;</span>
                              </a>
                            ))}
                          </div>
                        </section>
                    </>
                )}
            </div>
        )}
      </section>
    </main>
  );
}