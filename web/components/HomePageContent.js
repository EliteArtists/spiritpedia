'use client'; // <-- Essential: Allows state and hooks

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; // For URL manipulation
import Link from 'next/link';
// FIX: We now import the function that already exists and works for fetching content by slug
import { getContentBySubjectSlug } from '@/data/subjects.js'; 

// This component takes the pre-fetched list of subjects from the server
export default function HomePageContent({ allSubjects, initialSubjectSlug }) {
  
  const router = useRouter(); // Tool to update the browser URL
  const searchParams = useSearchParams(); // Tool to read the URL filter
  
  // State 1: Tracks which subject is currently selected and displaying content
  const [selectedSlug, setSelectedSlug] = useState(initialSubjectSlug); 
  
  // State 2: Stores the books, videos, and healers for the selected subject
  const [content, setContent] = useState({ books: [], videos: [], healers: [] });
  const [isLoading, setIsLoading] = useState(false);

  // --- Core Function: Fetches Content Based on Slug ---
  const fetchContent = useCallback(async (slug) => {
    if (!slug) {
        setContent({ books: [], videos: [], healers: [] });
        return;
    }
    setIsLoading(true);
    // FIX: Calling the existing, correct function
    const data = await getContentBySubjectSlug(slug); 
    setContent(data);
    setIsLoading(false);
  }, []);

  // --- Effect 1: Initial Load & URL Changes (Reads the URL) ---
  useEffect(() => {
    const urlSlug = searchParams.get('subject'); // Reads '?subject=meditation'
    
    if (urlSlug && urlSlug !== selectedSlug) {
      setSelectedSlug(urlSlug);
      fetchContent(urlSlug);
    } else if (!urlSlug && selectedSlug) {
      // Clear content if user removes filter from URL
      setSelectedSlug(null);
      setContent({ books: [], videos: [], healers: [] });
    }
    // Only run on component mount and when searchParams change
  }, [searchParams]); 

  // --- Effect 2: Run Fetcher when Slug State Changes ---
  useEffect(() => {
    // Run the content fetcher anytime selectedSlug changes (after a button click)
    fetchContent(selectedSlug);
  }, [selectedSlug, fetchContent]);


  // --- Event Handler: Runs when a user clicks a tile ---
  const handleSubjectClick = (slug) => {
    setSelectedSlug(slug);
    
    // PUSH NEW URL: Updates the address bar WITHOUT RELOADING THE PAGE
    router.push(`/?subject=${slug}`, undefined, { shallow: true }); 
  };


  return (
    <main className="min-h-screen bg-white">

      {/* 1. HERO SECTION (BLUE GRADIENT) */}
      <div className="w-full p-8 md:p-16 lg:p-24 hero-gradient text-white">
        
        {/* Logo/Title */}
        <h1 className="text-5xl md:text-6xl font-bold">
          Spiritpedia
        </h1>
        
        {/* Search Box Container */}
        <div className="w-full max-w-2xl mt-8 relative">
          
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            {/* SVG of a search icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <input
            type="text"
            placeholder="Search spiritual wisdom here..."
            className="w-full pl-14 pr-5 py-4 text-lg text-gray-900 border border-gray-300 rounded-full shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* 2. SUBJECTS SCROLLER ("JUST EAT" MODEL) */}
      <section className="w-full py-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 px-8">
          Explore by Subject
        </h2>
        
        <div className="w-full overflow-x-auto whitespace-nowrap py-4 px-8">
          
          {/* Mapping over the list of subjects from the database */}
          {allSubjects.length === 0 ? (
            <p className="text-center text-gray-500 w-full whitespace-normal">
                Loading subjects or check Supabase connection...
            </p>
          ) : (
            allSubjects.map((subject) => (
              <button
                key={subject.slug} 
                // Runs the click handler to filter and update the URL
                onClick={() => handleSubjectClick(subject.slug)} 
                className={`inline-flex flex-col items-center justify-start w-28 text-center mr-3 transition-transform hover:scale-105 p-1 border-2 
                    ${selectedSlug === subject.slug ? 'border-blue-600 bg-blue-50 shadow-lg' : 'border-transparent hover:border-gray-300'}
                `}
              >
                {/* ICON PLACEHOLDER */}
                <div className="w-20 h-20 bg-gray-100 rounded-2xl shadow-md border border-gray-200 flex items-center justify-center">
                    {/* The real icon image will go here */}
                </div>

                {/* Subject Title */}
                <span className="mt-3 text-sm font-medium text-gray-700 whitespace-normal break-words">
                  {subject.name}
                </span>
              </button>
            ))
          )}
        </div>
      </section>

      {/* 3. DISCOVER CONTENT SECTION - Content only shows when a filter is applied */}
      <section className="w-full p-8 bg-gray-50 border-t border-gray-100">
        
        {/* Content Preview (Default view when no filter is selected) */}
        {!selectedSlug && (
             <div className="w-full max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-gray-600">
                <h2 className="text-2xl font-semibold text-gray-700 col-span-4 mb-4 text-center">
                    Discover
                </h2>
                <div className="p-6 bg-white rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold">Books ({allSubjects.length})</h3>
                </div>
                <div className="p-6 bg-white rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold">Videos</h3>
                </div>
                <div className="p-6 bg-white rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold">Healers (Famous)</h3>
                </div>
                <div className="p-6 bg-white rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold">Healers (Local)</h3>
                </div>
             </div>
        )}

        {/* Filtered Content View */}
        {selectedSlug && (
            <div className="w-full max-w-6xl mx-auto space-y-12">
                <h2 className="text-2xl font-extrabold text-gray-800 text-center capitalize">
                    {selectedSlug.replace(/-/g, ' ')} Content
                </h2>

                {isLoading ? (
                    <p className="text-center text-blue-600 font-medium">Loading content...</p>
                ) : (
                    <>
                        {/* 1. BOOKS MODULE */}
                        <section>
                          <h3 className="text-3xl font-bold text-blue-600 mb-6">📚 Books ({content.books.length})</h3>
                          {content.books.length === 0 ? (
                            <p className="text-gray-500">No books found for this subject.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {content.books.map((book) => (
                                <div key={book.id} className="bg-white p-4 rounded-lg shadow-md border-t-4 border-blue-400">
                                  <h4 className="text-xl font-semibold">{book.title}</h4>
                                  <p className="text-sm text-gray-500 mt-1">by {book.author}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </section>

                        {/* 2. VIDEOS MODULE */}
                        <section>
                          <h3 className="text-3xl font-bold text-pink-600 mb-6">🎥 Videos ({content.videos.length})</h3>
                          {content.videos.length === 0 ? (
                            <p className="text-gray-500">No videos found for this subject.</p>
                          ) : (
                            <div className="space-y-4">
                              {content.videos.map((video) => (
                                <a 
                                  key={video.title} 
                                  href={video.platform_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="block bg-white p-4 rounded-lg shadow-md hover:bg-gray-100 transition duration-150"
                                >
                                  <p className="text-lg font-medium text-gray-800">{video.title}</p>
                                  <span className="text-sm text-gray-500">View on Platform &rarr;</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </section>

                        {/* 3. HEALERS MODULE */}
                        <section>
                          <h3 className="text-3xl font-bold text-green-600 mb-6">🧘 Healers ({content.healers.length})</h3>
                          {content.healers.length === 0 ? (
                            <p className="text-gray-500">No healers found for this subject.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {content.healers.map((healer) => (
                                <div key={healer.id} className="bg-white p-4 rounded-lg shadow-md">
                                  <h4 className="text-xl font-semibold">{healer.name}</h4>
                                  <p className="text-sm text-gray-700 mt-1">{healer.bio.substring(0, 50)}...</p>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${healer.is_famous ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'} mt-2 inline-block`}>
                                    {healer.is_famous ? 'Famous Teacher' : 'Local Practitioner'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </section>
                    </>
                )}

            </div>
        )}
      </section>
    </main>
  );
}