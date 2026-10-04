import { supabase } from './supabase.js';

// What a review is about, in words a person would recognise: the item's title
// and whoever made it.
//
// THE TABLES DO NOT AGREE ON HOW THEY NAME A CREATOR, and this is where that
// has to be absorbed:
//
//   book           books.author inline (the name on the cover), else the
//                  healers row behind books.healer_slug
//   video          healers.name via videos.healer_slug        — text join
//   course         healers.name via courses.healer_id         — bigint join
//   free_resource  healers.name via free_resources.healer_id  — bigint join
//
// Two different join keys and one table that keeps the name inline. 'course'
// covers every product_type: retreats, downloads, memberships and the rest all
// live in `courses` and share /offerings/[slug].
//
// Reads use the anonymous client — these are public tables and this is public
// data, the same as every detail page.
const SOURCES = {
  book: { table: 'books', inline: 'author', join: 'healer_slug' },
  video: { table: 'videos', join: 'healer_slug' },
  course: { table: 'courses', join: 'healer_id' },
  free_resource: { table: 'free_resources', join: 'healer_id' },
};

// NOTHING HERE THROWS. An email that cannot name the item is worth sending with
// the slug in its place; one that fails because a join missed is not. Every
// path falls back to { title: contentSlug, creatorName: null }, and the
// templates drop the "by …" clause entirely rather than render it empty.
export async function getContentMeta(contentType, contentSlug) {
  const fallback = { title: contentSlug, creatorName: null };
  const source = SOURCES[contentType];
  if (!source || !contentSlug) return fallback;

  try {
    const columns = ['title', source.inline, source.join].filter(Boolean).join(', ');

    const { data: item, error } = await supabase
      .from(source.table)
      .select(columns)
      .eq('slug', contentSlug)
      .maybeSingle();

    if (error || !item) return fallback;

    return {
      title: item.title || contentSlug,
      creatorName: await resolveCreator(source, item),
    };
  } catch {
    return fallback;
  }
}

async function resolveCreator(source, item) {
  const inline = source.inline ? (item[source.inline] || '').trim() : '';
  if (inline) return inline;

  const key = item[source.join];
  if (!key) return null;

  const { data } = await supabase
    .from('healers')
    .select('name')
    .eq(source.join === 'healer_id' ? 'id' : 'healer_slug', key)
    .maybeSingle();

  return data?.name || null;
}
