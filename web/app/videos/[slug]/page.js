import { supabase } from '@/utils/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { backContextQuery } from '@/utils/backContext';
import ShareButton from '@/components/ShareButton';
import { buildMetadata, notFoundMetadata, SITE_URL } from '@/utils/seo';
import ReviewPlaceholder, { RatingRow } from '@/components/ReviewPlaceholder';

// Hourly ceiling on staleness — see the note in app/page.js.
export const revalidate = 3600;

// The canonical 11-character YouTube id out of either URL shape. Anything else
// — Vimeo, a podcast host, a bare link — returns null, and the page falls back
// to an outbound link rather than embedding something that will not load.
function getYouTubeId(url) {
  const match = url?.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

// Best-effort host name for the fallback link's label.
function platformName(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'the original site';
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { data: video } = await supabase
    .from('videos')
    .select('title, platform_url')
    .eq('slug', slug)
    .single();
  if (!video) return notFoundMetadata('Video');

  const videoId = getYouTubeId(video.platform_url);

  return buildMetadata({
    title: video.title,
    description: `Watch ${video.title} on Spiritpedia.`,
    path: `/videos/${slug}`,
    // YouTube's own thumbnail is the only image a video row carries. Falls back
    // to the site default when the URL is not a YouTube one.
    image: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null,
    type: 'video.other',
  });
}

// PostgREST caps a response at 1,000 rows and truncates it WITHOUT an error, so
// a plain select here would prerender the first thousand videos and silently
// leave the other 1,269 to render on demand. Paged by `id` rather than
// created_at: the bulk import gave thousands of rows the same timestamp, and
// ties let Postgres order differently per query, so pages overlap and some rows
// are never returned.
export async function generateStaticParams() {
  const PAGE = 1000;
  const slugs = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('videos')
      .select('slug')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data?.length) break;
    slugs.push(...data.map((row) => row.slug).filter(Boolean));
    if (data.length < PAGE) break;
  }
  return slugs.map((slug) => ({ slug }));
}

export default async function VideoDetail({ params, searchParams }) {
  const { slug } = await params;
  // Contextual back navigation — whatever page linked here passes its own path
  // and label via ?from=&fromTitle=, so the back link returns the user there.
  const { from, fromTitle } = await searchParams;

  const { data: video, error } = await supabase
    .from('videos')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !video) {
    notFound();
  }

  // Videos link to a healer by the text `healer_slug` column, which is NOT a
  // declared foreign key — a PostgREST embedded join errors with PGRST200. So
  // the healer is resolved in a second query, keyed off that slug. (healers has
  // no `slug` column; the key is `healer_slug`.)
  const { data: healer } = video.healer_slug
    ? await supabase
        .from('healers')
        .select('name, healer_slug')
        .eq('healer_slug', video.healer_slug)
        .single()
    : { data: null };

  const videoId = getYouTubeId(video.platform_url);

  return (
    <main className="relative min-h-screen bg-[#0a0f1d] pb-16">
      {/* Back link — anchored to the page's top-left, context-aware */}
      <div className="absolute top-8 left-6 md:left-8 z-10">
        <BackButton from={from} fromTitle={fromTitle || 'Videos'} />
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-20 pb-12">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">{video.title}</h1>
          <ShareButton
            className="shrink-0 mt-1"
            url={`${SITE_URL}/videos/${video.slug}`}
            title={`${video.title} — Spiritpedia`}
          />
        </div>

        {healer && (
          <Link
            href={`/healers/${healer.healer_slug}${backContextQuery(`/videos/${video.slug}`, video.title)}`}
            className="text-sm text-violet-400 hover:text-violet-300 mb-6 inline-block"
          >
            By {healer.name}
          </Link>
        )}

        {/* Player — 16:9, responsive. aspect-video keeps the ratio without the
            padding-top trick, so the iframe can simply fill its box. */}
        {videoId ? (
          <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${videoId}?rel=0`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : video.platform_url ? (
          // Not a YouTube URL, so there is nothing embeddable — send them to it
          // rather than render a frame that will refuse to load.
          <a
            href={video.platform_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex aspect-video w-full items-center justify-center rounded-2xl border border-white/10 bg-[#111827] text-sm font-semibold text-violet-400 hover:text-violet-300"
          >
            Watch on {platformName(video.platform_url)} →
          </a>
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-white/10 bg-[#111827] text-sm text-gray-600">
            No video link available
          </div>
        )}

        {/* Star rating row — empty until community reviews exist */}
        <RatingRow className="mt-6 mb-6" />

        {/* Shelf actions — placeholders, matching the book page's un-wired
            buttons. Rendered as disabled rather than omitted so the shape of
            the finished page is visible. */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <span className="block w-full cursor-not-allowed rounded-xl border border-white/10 bg-[#111827] px-6 py-3 text-center text-sm text-gray-500">
            Watch Later — Coming Soon
          </span>
          <span className="block w-full cursor-not-allowed rounded-xl border border-white/10 bg-[#111827] px-6 py-3 text-center text-sm text-gray-500">
            Mark as Watched — Coming Soon
          </span>
        </div>

        {video.platform_url && (
          <a
            href={video.platform_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block w-full rounded-xl bg-[#FF0000] px-6 py-3 text-center text-sm font-bold text-white hover:bg-[#d90000]"
          >
            {videoId ? 'Watch on YouTube' : `Watch on ${platformName(video.platform_url)}`}
          </a>
        )}

        {Array.isArray(video.subject_slugs) && video.subject_slugs.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {video.subject_slugs.map((subject) => (
              <Link
                key={subject}
                href={`/subject/${subject}`}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400 transition-colors hover:border-violet-400/60 hover:text-white"
              >
                {subject}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Community reviews — empty state placeholder */}
      <ReviewPlaceholder />
    </main>
  );
}
