/*
This is the main homepage for the Spiritpedia website (v3).
It now uses a "Hero" section and a horizontal scroller
to match the app's "Just Eat" design model.
*/

// This is the list of subjects you provided.
const subjects = [
  'Law of Attraction', 'Meditation', 'Breathwork', 'Sound Healing',
  'Conscious Science', 'Energy Medicine', 'Tai Chi', 'Qi Gong',
  'EFT / Tapping', 'Reiki', 'Astrology', 'Human Design',
  'Channelled Teachings', 'Sacred Geometry', 'Quantum Healing',
  'Near Death Experiences', 'Mediumship & Spirits', 'Plant Medicine',
  'Homeopathy', 'Dreamwork', 'Shadow Work', 'Shamanism',
  'Ancient Wisdom', 'Masculine / F'
]; // Truncated for one line

export default function Home() {
  return (
    // Main container is now plain white, as the hero has its own background.
    <main className="min-h-screen bg-white">

      {/* === 1. HERO SECTION (BLUE GRADIENT) ===
        We apply our new 'hero-gradient' class here.
      */}
      <div className="w-full p-8 md:p-16 lg:p-24 hero-gradient text-white">
        
        {/* Logo/Title */}
        <h1 className="text-5xl md:text-6xl font-bold">
          Spiritpedia
        </h1>
        
        {/* Search Box Container */}
        <div className="w-full max-w-2xl mt-8 relative">
          
          {/* We use a 'relative' container to place the icon inside the input */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            {/* This is an SVG (code for an image) of a search icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Search Input */}
          <input
            type="text"
            placeholder="Search spiritual wisdom here..."
            className="w-full pl-14 pr-5 py-4 text-lg text-gray-900 border border-gray-300 rounded-full shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* === 2. SUBJECTS SCROLLER ("JUST EAT" MODEL) === 
      */}
      <section className="w-full py-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 px-8">
          Explore by Subject
        </h2>
        
        {/* This is the horizontal scrolling container.
          'overflow-x-auto' = allows horizontal scrolling
          'whitespace-nowrap' = stops the items from wrapping to the next line
        */}
        <div className="w-full overflow-x-auto whitespace-nowrap py-4 px-8">
          
          {/* We loop through the 'subjects' list to create each item */}
          {subjects.map((subject) => (
            <button
              key={subject}
              // 'inline-flex' = makes them sit side-by-side
              // 'flex-col' = makes the icon and text stack vertically
              className="inline-flex flex-col items-center justify-start w-28 text-center mr-3 transition-transform hover:scale-105"
            >
              {/* ICON PLACEHOLDER */}
              {/* We will replace this with real icons later. */}
              <div className="w-20 h-20 bg-gray-100 rounded-2xl shadow-md border border-gray-200 flex items-center justify-center">
                 {/* This space is for the icon image */}
              </div>

              {/* Subject Title */}
              <span className="mt-3 text-sm font-medium text-gray-700 whitespace-normal break-words">
                {subject}
              </span>
            </button>
          ))}
        </div>
      </section>


      {/* === 3. PLACEHOLDERS SECTION === 
      */}
      <section className="w-full p-8 bg-gray-50 border-t border-gray-100">
        <h2 className="text-2xl font-semibold text-gray-700 mb-6 text-center">
          Discover
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-gray-600 max-w-6xl mx-auto">
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-semibold">Books</h3>
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
      </section>

    </main>
  );
}