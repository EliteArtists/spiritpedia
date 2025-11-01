/* This is the main homepage for the Spiritpedia website. */

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      
      {/* Container for our content */}
      <div className="text-center">

        {/* Logo/Title */}
        <h1 className="text-6xl font-bold text-gray-900">
          Spiritpedia
        </h1>

        {/* Vision Statement (from your README) */}
        <p className="mt-4 text-2xl text-gray-700">
          A spiritual encyclopedia for the modern age.
        </p>

        {/* Download Button */}
        <button className="mt-10 px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg shadow-lg hover:bg-blue-700 transition-colors">
          Download the App
        </button>

      </div>

    </main>
  );
}