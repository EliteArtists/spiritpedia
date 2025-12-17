import { getContentBySubjectSlug, getAllSubjects } from '../../../data/subjects.js';
import Link from 'next/link';

export default async function SubjectPage({ params }) {
  const { slug } = params;
  const { books, videos, healers } = await getContentBySubjectSlug(slug);

  return (
    <main className="min-h-screen bg-white p-8 md:p-16">
      <Link href="/" className="text-blue-600 hover:underline mb-8 inline-block">&larr; Back to Home</Link>
      
      <h1 className="text-5xl font-bold text-gray-900 capitalize mb-2">{slug.replace(/-/g, ' ')}</h1>
      <p className="text-xl text-gray-500 mb-12">Curated content for your journey in {slug.replace(/-/g, ' ')}.</p>

      <div className="space-y-16">
        
        {/* 📚 BOOKS CAROUSEL */}
        <section>
          <h2 className="text-3xl font-bold text-blue-600 mb-6 flex items-center">
            📚 Books <span className="ml-3 text-lg font-normal text-gray-400">({books.length})</span>
          </h2>
          {books.length === 0 ? (
            <p className="text-gray-500 italic">No books found for this subject.</p>
          ) : (
            <div className="flex overflow-x-auto space-x-6 pb-6 no-scrollbar">
              {books.map((book) => (
                <div key={book.id} className="flex-shrink-0 w-64 bg-white p-6 rounded-2xl shadow-md border-t-4 border-blue-400 hover:shadow-xl transition-shadow">
                  <h4 className="text-xl font-bold text-gray-900 leading-tight">{book.title}</h4>
                  <p className="text-sm text-gray-500 mt-3 font-medium">by {book.author}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 🎥 VIDEOS CAROUSEL */}
        <section>
          <h2 className="text-3xl font-bold text-pink-600 mb-6 flex items-center">
            🎥 Videos <span className="ml-3 text-lg font-normal text-gray-400">({videos.length})</span>
          </h2>
          {videos.length === 0 ? (
            <p className="text-gray-500 italic">No videos found for this subject.</p>
          ) : (
            <div className="flex overflow-x-auto space-x-6 pb-6 no-scrollbar">
              {videos.map((video) => (
                <a 
                  key={video.title} 
                  href={video.platform_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-shrink-0 w-80 bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-all border-t-4 border-pink-400 group"
                >
                  <p className="text-lg font-bold text-gray-800 group-hover:text-pink-600 transition-colors">{video.title}</p>
                  <span className="text-sm font-bold text-blue-500 mt-4 block uppercase tracking-wider">Watch Video &rarr;</span>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* 🧘 HEALERS SECTION (Vertical for Trust) */}
        <section>
          <h2 className="text-3xl font-bold text-green-600 mb-6 flex items-center">
            🧘 Healers <span className="ml-3 text-lg font-normal text-gray-400">({healers.length})</span>
          </h2>
          {healers.length === 0 ? (
            <p className="text-gray-500 italic">No healers found for this subject.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {healers.map((healer) => (
                <div key={healer.id} className="bg-white p-8 rounded-2xl shadow-md border border-gray-100 relative overflow-hidden">
                  <div className="relative z-10">
                    <h4 className="text-2xl font-bold text-gray-900">{healer.name}</h4>
                    <p className="text-gray-600 mt-3 leading-relaxed">{healer.bio}</p>
                    <div className="mt-6 flex items-center space-x-4">
                      <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${healer.is_famous ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {healer.is_famous ? '⭐ Famous Teacher' : '📍 Local Practitioner'}
                      </span>
                      {healer.city && <span className="text-gray-400 text-sm font-medium">📍 {healer.city}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}

export async function generateStaticParams() {
  const subjects = await getAllSubjects(); 
  return subjects.map((subject) => ({
    slug: subject.slug,
  }));
}