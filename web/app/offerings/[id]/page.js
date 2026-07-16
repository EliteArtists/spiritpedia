import { supabase } from '@/utils/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';

// Product-type styling + copy live in one map so the badge colour, badge label,
// and CTA label all stay in lockstep. An unset product_type falls back to
// 'course' — the admin default and the legacy pre-column behaviour.
const PRODUCT_TYPES = {
  course: { badge: 'bg-violet-600', label: 'COURSE', cta: 'Enrol Now →' },
  retreat: { badge: 'bg-amber-500', label: 'RETREAT', cta: 'Book Place →' },
  download: { badge: 'bg-blue-600', label: 'DOWNLOAD', cta: 'Get Download →' },
  membership: { badge: 'bg-emerald-600', label: 'MEMBERSHIP', cta: 'Join Now →' },
};

export default async function OfferingDetail({ params }) {
  const { id } = await params;

  // Join the healer so we can render the "By …" / "Back to …" links from one
  // round-trip. Courses relate to a healer through the bigint healer_id FK.
  const { data: offering, error } = await supabase
    .from('courses')
    .select('*, healers (name, healer_slug)')
    .eq('id', id)
    .single();

  if (error || !offering) {
    notFound();
  }

  const healer = offering.healers;
  const type = PRODUCT_TYPES[offering.product_type] || PRODUCT_TYPES.course;
  const subjects = Array.isArray(offering.subject_slugs) ? offering.subject_slugs : [];

  return (
    <main className="min-h-screen bg-[#0a0f1d] text-white">
      {/* Hero — cover image (or gradient fallback) with corner overlays */}
      <section className="relative h-[50vh] overflow-hidden">
        {offering.image_url ? (
          <img
            src={offering.image_url}
            alt={offering.title}
            className="object-cover object-top h-full w-full"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-violet-900 to-[#0a0f1d]" />
        )}

        {/* Darkening scrim so the overlaid text stays legible over any image */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Top-left: back to the Spiritpedia homepage. The healer's profile is
            reachable from the "By …" credit below, so this stays a top-level exit. */}
        <Link
          href="/"
          className="absolute top-6 left-6 text-sm text-white/70 hover:text-white transition-colors"
        >
          ← Back to Spiritpedia
        </Link>

        {/* Top-right: price badge (only when a price is set) */}
        {offering.price && (
          <span className="absolute top-6 right-6 bg-[#111827]/90 text-white text-sm font-bold px-4 py-2 rounded-full backdrop-blur-sm">
            {offering.price}
          </span>
        )}

        {/* Bottom-left: product-type badge + title */}
        <div className="absolute bottom-6 left-6 right-6">
          <span
            className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full mb-3 text-white ${type.badge}`}
          >
            {type.label}
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight max-w-3xl">
            {offering.title}
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

          {offering.description && (
            <p className="text-lg leading-relaxed text-gray-300 whitespace-pre-line mb-8">
              {offering.description}
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
        {offering.course_url ? (
          <a
            href={offering.course_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 px-8 bg-violet-600 hover:bg-violet-700 text-white font-bold text-lg rounded-2xl text-center block transition-colors duration-200"
          >
            {type.cta}
          </a>
        ) : (
          <span className="text-gray-400 text-center block">
            Contact {healer ? healer.name : 'the healer'} directly for booking information.
          </span>
        )}
      </section>
    </main>
  );
}
