import { supabase } from '@/utils/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';

// This layout is always free, so there's no price badge and one fixed CTA.
export default async function FreeResourceDetail({ params }) {
  const { id } = await params;

  // Join the healer for the "By …" credit. Free resources relate to a healer
  // through the bigint healer_id FK.
  const { data: resource, error } = await supabase
    .from('free_resources')
    .select('*, healers (name, healer_slug)')
    .eq('id', id)
    .single();

  if (error || !resource) {
    notFound();
  }

  const healer = resource.healers;
  const subjects = Array.isArray(resource.subject_slugs) ? resource.subject_slugs : [];

  return (
    <main className="min-h-screen bg-[#0a0f1d] text-white">
      {/* Header — centred badge, title, healer credit, back link */}
      <header className="max-w-4xl mx-auto pt-12 pb-8 px-6 text-center bg-[#0a0f1d]">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-teal-600 text-white">
            FREE RESOURCE
          </span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-white mt-4 leading-tight">
          {resource.title}
        </h1>

        {healer && (
          <Link
            href={`/healers/${healer.healer_slug}`}
            className="text-sm text-violet-400 hover:text-violet-300 mt-2 inline-block"
          >
            By {healer.name}
          </Link>
        )}

        <Link
          href="/"
          className="block text-sm text-gray-500 hover:text-gray-300 mt-3 transition-colors"
        >
          ← Back to Spiritpedia
        </Link>
      </header>

      {/* Body — image + subjects on the left, description + CTA on the right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start max-w-4xl mx-auto px-6 py-10">
        {/* Left column */}
        <div>
          {resource.image_url ? (
            <img
              src={resource.image_url}
              alt={resource.title}
              className="w-full rounded-2xl object-cover max-h-[400px]"
            />
          ) : (
            <div className="bg-gradient-to-br from-violet-900 to-[#0a0f1d] w-full h-[300px] rounded-2xl" />
          )}

          {subjects.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {subjects.map((slug) => (
                <span
                  key={slug}
                  className="bg-[#111827] text-gray-400 text-xs px-3 py-1 rounded-full border border-white/10"
                >
                  {slug}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div>
          {resource.description && (
            <p className="text-base leading-relaxed text-gray-300 whitespace-pre-line">
              {resource.description}
            </p>
          )}

          {resource.resource_url ? (
            <a
              href={resource.resource_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 w-full py-4 px-8 bg-violet-600 hover:bg-violet-700 text-white font-bold text-base rounded-2xl transition-colors duration-200 text-center block"
            >
              Get It Free →
            </a>
          ) : (
            <span className="text-gray-400 text-center text-sm mt-8 block">
              Contact {healer ? healer.name : 'the healer'} directly for access information.
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
