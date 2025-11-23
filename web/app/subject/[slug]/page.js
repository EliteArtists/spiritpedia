import { getContentBySubjectSlug, generateStaticParams } from '../../../data/subjects.js'; 

export { generateStaticParams };

// We get the subject slug from the URL (e.g., 'meditation') via the 'params' prop
export default async function SubjectDetailPage({ params }) {
  
  // FINAL FIX: Explicitly await the parameter resolution, which is the only way
  // to silence the Turbopack error in the latest Next.js versions.
  const resolvedParams = await params;
  const subjectSlug = resolvedParams?.slug || ''; 

  // Now, we safely check if subjectSlug is empty before proceeding.
  if (!subjectSlug) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <p className="text-xl text-gray-700">Error: Subject Not Found or Missing URL Slug.</p>
      </main>
    );
  }

  // Use the safe subjectSlug to format the page title
  const pageTitle = subjectSlug.replace(/-/g, ' '); 

  // Fetch all content related to this subject
  const { books, videos, healers } = await getContentBySubjectSlug(subjectSlug);

  // --- Start Content Rendering (The part we want to see!) ---
  return (
    <main className="min-h-screen bg-gray-50 p-8 md:p-12">
      
      {/* Subject Header */}
      <div className="w-full max-w-4xl mx-auto mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 capitalize">
          {pageTitle}
        </h1>
        <p className="mt-2 text-xl text-gray-600">
          Curated content for your journey in {pageTitle}.
        </p>
      </div>

      {/* Content Modules Container */}
      <div className="w-full max-w-4xl mx-auto space-y-12">

        {/* 1. BOOKS MODULE */}
        <section>
          <h2 className="text-3xl font-bold text-blue-600 mb-6">📚 Books ({books.length})</h2>
          {books.length === 0 ? (
            <p className="text-gray-500">No books found for this subject.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {books.map((book) => (
                <div key={book.id} className="bg-white p-4 rounded-lg shadow-md border-t-4 border-blue-400">
                  <h3 className="text-xl font-semibold">{book.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">by {book.author}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 2. VIDEOS MODULE */}
        <section>
          <h2 className="text-3xl font-bold text-pink-600 mb-6">🎥 Videos ({videos.length})</h2>
          {videos.length === 0 ? (
            <p className="text-gray-500">No videos found for this subject.</p>
          ) : (
            <div className="space-y-4">
              {videos.map((video) => (
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
          <h2 className="text-3xl font-bold text-green-600 mb-6">🧘 Healers ({healers.length})</h2>
          {healers.length === 0 ? (
            <p className="text-gray-500">No healers found for this subject.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {healers.map((healer) => (
                <div key={healer.id} className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-xl font-semibold">{healer.name}</h3>
                  <p className="text-sm text-gray-700 mt-1">{healer.bio.substring(0, 50)}...</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${healer.is_famous ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'} mt-2 inline-block`}>
                    {healer.is_famous ? 'Famous Teacher' : 'Local Practitioner'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}