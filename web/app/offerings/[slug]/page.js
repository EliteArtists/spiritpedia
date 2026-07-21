import { supabase } from '@/utils/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { backContextQuery } from '@/utils/backContext';

// Product-type styling + copy live in one map so the badge colour, badge label,
// and CTA label all stay in lockstep. An unset product_type falls back to
// 'course' — the admin default and the legacy pre-column behaviour.
const PRODUCT_TYPES = {
  course: { badge: 'bg-violet-600', label: 'COURSE', cta: 'Enrol Now →' },
  retreat: { badge: 'bg-amber-500', label: 'RETREAT', cta: 'Book Place →' },
  download: { badge: 'bg-blue-600', label: 'DOWNLOAD', cta: 'Get Download →' },
  membership: { badge: 'bg-emerald-600', label: 'MEMBERSHIP', cta: 'Join Now →' },
};

export default async function OfferingDetail({ params, searchParams }) {
  const { slug } = await params;
  // Contextual back navigation — the linking page supplies its own path + label.
  const { from, fromTitle } = await searchParams;

  // Join the healer so we can render the "By …" credit from one round-trip.
  // Courses relate to a healer through the bigint healer_id FK. Offerings resolve
  // by the SEO-friendly `slug`, not the UUID id.
  const { data: offering, error } = await supabase
    .from('courses')
    .select('*, healers (name, healer_slug)')
    .eq('slug', slug)
    .single();

  if (error || !offering) {
    notFound();
  }

  const healer = offering.healers;
  const type = PRODUCT_TYPES[offering.product_type] || PRODUCT_TYPES.course;
  const subjects = Array.isArray(offering.subject_slugs) ? offering.subject_slugs : [];

  return (
    <main className="relative min-h-screen bg-[#0a0f1d] text-white">
      {/* Back link — anchored to the page's top-left, above the header, context-aware */}
      <div className="absolute top-8 left-6 md:left-8 z-10">
        <BackButton from={from} fromTitle={fromTitle} />
      </div>

      {/* Header — centred badges, title, healer credit */}
      <header className="max-w-4xl mx-auto pt-12 pb-8 px-6 text-center bg-[#0a0f1d]">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span
            className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full text-white ${type.badge}`}
          >
            {type.label}
          </span>
          {offering.price && (
            <span className="bg-[#111827] text-white text-xs font-bold px-3 py-1 rounded-full border border-white/10">
              {offering.price}
            </span>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-white mt-4 leading-tight">
          {offering.title}
        </h1>

        {healer && (
          <Link
            href={`/healers/${healer.healer_slug}${backContextQuery(`/offerings/${offering.slug}`, offering.title)}`}
            className="text-sm text-violet-400 hover:text-violet-300 mt-2 inline-block"
          >
            By {healer.name}
          </Link>
        )}
      </header>

      {/* Body — image + subjects on the left, description + CTA on the right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start max-w-4xl mx-auto px-6 py-10">
        {/* Left column */}
        <div>
          {offering.image_url ? (
            <img
              src={offering.image_url}
              alt={offering.title}
              className="w-full rounded-2xl object-cover max-h-[400px]"
            />
          ) : (
            <div className="bg-gradient-to-br from-violet-900 to-[#0a0f1d] w-full h-[300px] rounded-2xl" />
          )}
        </div>

        {/* Right column */}
        <div>
          {offering.description && (
            <p className="text-base leading-relaxed text-gray-300 whitespace-pre-line">
              {offering.description}
            </p>
          )}

          {offering.course_url ? (
            <a
              href={offering.course_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 w-full py-4 px-8 bg-violet-600 hover:bg-violet-700 text-white font-bold text-base rounded-2xl transition-colors duration-200 text-center block"
            >
              {type.cta}
            </a>
          ) : (
            <span className="text-gray-400 text-center text-sm mt-8 block">
              Contact {healer ? healer.name : 'the healer'} directly for booking information.
            </span>
          )}

          {subjects.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
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
      </div>
    </main>
  );
}
