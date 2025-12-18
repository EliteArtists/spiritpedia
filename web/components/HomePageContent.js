'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getContentBySubjectSlug } from '@/data/subjects.js';
import Link from 'next/link';

const CHAKRA_EMOTIONS = [
  { label: "I feel unsafe", color: "#d62828" }, { label: "I feel grounded", color: "#d62828" }, { label: "I feel strong", color: "#d62828" },
  { label: "I feel numb", color: "#f77f00" }, { label: "I feel creative", color: "#f77f00" }, { label: "I feel sensual", color: "#f77f00" },
  { label: "I feel powerless", color: "#fcbf49" }, { label: "I feel confident", color: "#fcbf49" }, { label: "I feel ready", color: "#fcbf49" },
  { label: "I feel heartbroken", color: "#80ed99" }, { label: "I feel love", color: "#80ed99" }, { label: "I feel peace", color: "#80ed99" },
  { label: "I can't express myself", color: "#3f88c5" }, { label: "I feel heard", color: "#3f88c5" }, { label: "I feel open", color: "#3f88c5" },
  { label: "I feel confused", color: "#6a4c93" }, { label: "I feel clear", color: "#6a4c93" }, { label: "I feel intuitive", color: "#6a4c93" },
  { label: "I feel disconnected", color: "#d6ccff" }, { label: "I feel connected", color: "#d6ccff" }, { label: "I feel divine", color: "#d6ccff" }
];

const EMOTION_TO_SUBJECT_MAP = {
  "I feel unsafe": "ancient-wisdom", "I feel grounded": "ancient-wisdom", "I feel strong": "ancient-wisdom",
  "I feel heartbroken": "meditation", "I feel love": "meditation", "I feel peace": "meditation",
  "I feel confused": "astrology", "I feel intuitive": "human-design", "I feel clear": "human-design",
  "I feel disconnected": "breathwork", "I feel connected": "channelled-teachings", "I feel divine": "channelled-teachings"
};

export default function HomePageContent({ allSubjects, initialSubjectSlug }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedSlug, setSelectedSlug] = useState(initialSubjectSlug); 
  const [content, setContent] = useState({ books: [], videos: [], healers: [] });
  const [isLoading, setIsLoading] = useState(false);

  const fetchContent = useCallback(async (slug) => {
    if (!slug) { setContent({ books: [], videos: [], healers: [] }); return; }
    setIsLoading(true);
    const data = await getContentBySubjectSlug(slug); 
    if (data.healers) {
        data.healers.sort((a, b) => (b.ad_rank_score || 0) - (a.ad_rank_score || 0));
    }
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
  }, [searchParams, fetchContent, selectedSlug]);

  const handleSubjectClick = (slug) => {
    setSelectedSlug(slug);
    router.push(`/?subject=${slug}`, undefined, { shallow: true }); 
  };

  const handleEmotionClick = (label) => {
    const targetSlug = EMOTION_TO_SUBJECT_MAP[label];
    if (targetSlug) handleSubjectClick(targetSlug);
    else alert(`Curating path for "${label}"!`);
  };

  return (
    <main className="min-h-screen bg-white">
      {/* 1. HERO SECTION */}
      <div className="w-full p-8 md:p-16 lg:p-20 text-white flex flex-col items-center animate-gradient-slow"
           style={{ background: 'linear-gradient(135deg, #0a2a66, #3f91ec, #a4c3ec, #0a2a66)', backgroundSize: '400% 400%' }}>
        <h1 className="text-5xl md:text-6xl font-bold mb-8 drop-shadow-lg text-center tracking-tighter uppercase italic">Spiritpedia</h1>
        <div className="w-full max-w-2xl relative mb-8">
          <input type="text" placeholder="How are you feeling today?" 
                 className="w-full pl-8 pr-5 py-4 text-lg text-gray-900 border-none rounded-full shadow-2xl focus:ring-4 focus:ring-white/40 outline-none" />
        </div>
        <div className="w-full max-w-4xl">
          <p className="text-center text-[10px] font-black mb-4 opacity-50 uppercase tracking-[0.3em] text-white">Explore By Subject</p>
          <div className="flex overflow-x-auto space-x-3 pb-4 no-scrollbar">
            {allSubjects.map((s) => (
              <button key={s.slug} onClick={() => handleSubjectClick(s.slug)}
                className={`flex-shrink-0 px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-[10px] font-black uppercase tracking-widest transition-all backdrop-blur-sm
                  ${selectedSlug === s.slug ? 'bg-white/40 border-white scale-105 shadow-md' : ''}`}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. CHAKRA EMOTIONS SCROLLER */}
      <section className="w-full py-8 bg-white border-b">
        <h2 className="text-[10px] font-black text-gray-400 mb-6 px-8 text-center uppercase tracking-[0.3em]">Trending Emotional States</h2>
        <div className="flex overflow-x-auto space-x-4 pb-4 px-8 no-scrollbar">
          {CHAKRA_EMOTIONS.map((state, i) => (
            <button key={i} onClick={() => handleEmotionClick(state.label)}
              className="flex-shrink-0 px-8 py-4 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 shadow-lg"
              style={{ backgroundColor: state.color, boxShadow: `0 8px 15px ${state.color}44` }}>
              {state.label}
            </button>
          ))}
        </div>
      </section>

      {/* 3. CONTENT DISPLAY */}
      <section className="w-full p-8 bg-gray-50 min-h-[400px]">
        {!selectedSlug ? (
             <div className="w-full max-w-6xl mx-auto text-center py-32">
                <p className="text-gray-200 font-black text-7xl uppercase tracking-tighter opacity-50">Spiritpedia</p>
                <p className="text-gray-400 font-medium mt-4 italic">Select a path above to begin your journey.</p>
             </div>
        ) : (
            <div className="w-full max-w-6xl mx-auto space-y-12">
                <div className="text-center mb-16">
                    <h2 className="text-5xl font-black text-gray-900 uppercase tracking-tighter italic">{selectedSlug.replace(/-/g, ' ')}</h2>
                    <div className="h-1 w-24 bg-blue-600 mx-auto mt-4 rounded-full"></div>
                </div>

                {isLoading ? (
                    <p className="text-center text-blue-600 animate-pulse font-bold uppercase tracking-widest">Gathering wisdom...</p>
                ) : (
                    <div className="space-y-24">
                        {/* HEALERS / SUPERHEROES (Minimal Card Style) */}
                        {content.healers.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              {content.healers.map((h) => (
                                <div key={h.id} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-50 transition-all hover:shadow-xl relative overflow-hidden">
                                  <div className={`absolute top-0 right-0 text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest ${h.is_famous ? 'bg-yellow-400' : 'bg-green-400'}`}>
                                    {h.is_famous ? 'Superhero' : 'Local Hero'}
                                  </div>
                                  <Link href={`/healers/${h.healer_slug}`}>
                                    <h4 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic hover:text-blue-600 cursor-pointer leading-none">{h.name}</h4>
                                  </Link>
                                  <p className="text-gray-400 mt-4 line-clamp-3 text-sm leading-relaxed">{h.bio}</p>
                                  <div className="mt-8 flex justify-between items-center">
                                    <Link href={`/healers/${h.healer_slug}`} className="text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] border-b-2 border-blue-600 pb-1">View Profile</Link>
                                    {h.city && <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">📍 {h.city}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                        )}

                        {/* BOOKS (Gallery Mode + Clickable) */}
                        {content.books.length > 0 && (
                          <div className="flex overflow-x-auto space-x-6 pb-6 no-scrollbar">
                            {content.books.map((book) => {
                              const asinMatch = book.amazon_url?.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);
                              const asin = asinMatch ? asinMatch[1] : null;
                              const coverUrl = book.mock_cover_url?.startsWith('http') ? book.mock_cover_url : (asin ? `https://images.amazon.com/images/P/${asin}.01.LZZZZZZZ.jpg` : 'https://placehold.co/400x600?text=Spiritpedia');
                              return (
                                <a 
                                  key={book.id} 
                                  href={book.amazon_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="flex-shrink-0 w-56 group transition-transform hover:scale-105"
                                >
                                  <img src={coverUrl} alt={book.title} className="w-full h-80 object-cover rounded-xl shadow-lg group-hover:shadow-2xl transition-all" />
                                </a>
                              );
                            })}
                          </div>
                        )}

                        {/* VIDEOS (Visual Gallery Mode + YouTube Magic) */}
                        {content.videos.length > 0 && (
                          <div className="flex overflow-x-auto space-x-6 pb-6 no-scrollbar">
                            {content.videos.map((video) => {
                              // Extract YouTube ID from URL
                              const videoId = video.platform_url?.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
                              const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : 'https://placehold.co/600x400?text=Spiritpedia+Video';

                              return (
                                <a 
                                  key={video.id || video.title} 
                                  href={video.platform_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="flex-shrink-0 w-80 group transition-all hover:scale-105"
                                >
                                  <div className="relative aspect-video overflow-hidden rounded-2xl shadow-lg group-hover:shadow-2xl transition-all">
                                    <img src={thumbUrl} alt={video.title} className="w-full h-full object-cover" />
                                    {/* Minimal Play Overlay */}
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors flex items-center justify-center">
                                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-blue-600 border-b-[8px] border-b-transparent ml-1"></div>
                                      </div>
                                    </div>
                                  </div>
                                  <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-pink-600 transition-colors line-clamp-1 px-1">
                                    {video.title}
                                  </p>
                                </a>
                              );
                            })}
                          </div>
                        )}
                    </div>
                )}
            </div>
        )}
      </section>
    </main>
  );
}