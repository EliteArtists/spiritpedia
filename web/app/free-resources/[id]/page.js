import { supabase } from '@/utils/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';

// This layout is always free, so there's no price badge and one fixed CTA. The
// resource_type is still surfaced as a small label alongside the "FREE RESOURCE"
// badge for context.
export default async function FreeResourceDetail({ params }) {
  const { id } = await params;

  // Join the healer for the "By …" / "Back to …" links. Free resources relate to
  // a healer through the bigint healer_id FK.
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
      {/* Hero — cover image (or gradient fallback) with corner overlays */}
      <section className="relative h-[50vh] overflow-hidden">
        {resource.image_url ? (
          <img
            src={resource.image_url}
            alt={resource.title}
            className="object-cover object-top h-full w-full"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-violet-900 to-[#0a0f1d]" />
        )}

        {/* Darkening scrim so the overlaid text stays legible over any image */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Top-left: back to the healer's profile */}
        {healer && (
          <Link
            href={`/healers/${healer.healer_slug}`}
            className="absolute top-6 left-6 text-sm text-white/70 hover:text-white transition-colors"
          >
            ← Back to {healer.name}
          </Link>
        )}

        {/* Bottom-left: FREE RESOURCE badge + title (no price badge — always free) */}
        <div className="absolute bottom-6 left-6 right-6">
          <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full mb-3 bg-teal-600 text-white">
            FREE RESOURCE
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight max-w-3xl">
            {resource.title}
          </h1>
        </div>
      </section>

      {/* Info — healer credit, full description, subject pills */}
      <section className="bg-[#0a0f1d] w-full">
        <div className="max-w-3xl mx-auto px-6 py-12">
          {healer && (
            <Link
              href={`/healers/${healer.healer_slug}`}
              className="text-sm text-violet-400 hover:text-violet-300 mb-6 block"
            >
              By {healer.name}
            </Link>
          )}

          {resource.description && (
            <p className="text-lg leading-relaxed text-gray-300 whitespace-pre-line mb-8">
              {resource.description}
            </p>
          )}

          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8">
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
      </section>

      {/* Outbound CTA — direct link out, or a contact fallback when none exists */}
      <section className="mt-10 max-w-3xl mx-auto px-6 pb-16">
        {resource.resource_url ? (
          <a
            href={resource.resource_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 px-8 bg-violet-600 hover:bg-violet-700 text-white font-bold text-lg rounded-2xl text-center block transition-colors duration-200"
          >
            Get It Free →
          </a>
        ) : (
          <span className="text-gray-400 text-center block">
            Contact {healer ? healer.name : 'the healer'} directly for access information.
          </span>
        )}
      </section>
    </main>
  );
}
