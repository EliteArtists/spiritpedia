import { createClient } from '@supabase/supabase-js';
import { adminClient } from './supabaseAdmin.js';
import { TABLES, URL_COLUMNS, amazonId } from './contentSubmissions.js';

// SERVER ONLY: the service role. Who an owner is, and what they own
// (content_submissions, migration 0024).
//
// The practitioner and publisher profile routes' rules: identity is asked of
// Supabase, never read from the body; the listing comes from THEIR profile row,
// never the request.
//
//   as 'healer'     — an approved account linked to a practitioner, channel,
//                     app or organisation: everything on that listing.
//   as 'publisher'  — an approved account linked to a publisher: books for its
//                     linked authors, and only the ones it added itself.

export const HOLDING_BUCKET = 'content-submissions';
export const PUBLIC_BUCKET = 'practitioner-images';
// Approved images, copied out of the holding bucket. Not under a user's
// folder, so they stay when the account is deleted, with the listing.
export const PUBLIC_CONTENT_FOLDER = 'content';

export const LIVE_COLUMNS = {
  videos: 'id, title, slug, platform_url, subject_slugs, healer_slug, created_at',
  books: 'id, title, slug, amazon_url, author, description, mock_cover_url, subject_slugs, healer_slug, created_at',
  courses:
    'id, title, slug, course_url, description, price, image_url, product_type, start_date, end_date, subject_slugs, healer_id, affiliate_status, created_at',
  free_resources:
    'id, title, slug, resource_url, resource_type, description, image_url, subject_slugs, healer_id, is_featured, created_at',
};

function json(body, status) {
  return Response.json(body, { status });
}

// → { error: Response } or { user, supabase, profile, healer, publisher, authors }
export async function ownerFrom(request, as) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { error: json({ error: 'no_token' }, 401) };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { error: json({ error: 'misconfigured' }, 503) };
  const reader = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await reader.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return { error: json({ error: 'invalid_token' }, 401) };

  const supabase = adminClient();
  if (!supabase) return { error: json({ error: 'service_role_missing' }, 503) };

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_type, verification_status, linked_healer_slug, linked_publisher_id, full_name')
    .eq('id', user.id)
    .maybeSingle();

  const approved = profile?.user_type === 'practitioner' && profile?.verification_status === 'approved';
  const owner = { user, supabase, profile, as, healer: null, publisher: null, authors: [] };

  if (as === 'healer') {
    if (!approved || !profile.linked_healer_slug) {
      return { error: json({ error: 'not_an_owner', message: 'Only a verified owner can manage this listing.' }, 403) };
    }
    const { data: healer } = await supabase
      .from('healers')
      .select('id, healer_slug, name, entity_type')
      .eq('healer_slug', profile.linked_healer_slug)
      .maybeSingle();
    if (!healer) return { error: json({ error: 'listing_missing' }, 404) };
    owner.healer = healer;
    return owner;
  }

  if (as === 'publisher') {
    if (!approved || !profile.linked_publisher_id) {
      return { error: json({ error: 'not_an_owner', message: 'Only a verified owner can manage this listing.' }, 403) };
    }
    const { data: publisher } = await supabase
      .from('publishers')
      .select('id, name, slug')
      .eq('id', profile.linked_publisher_id)
      .maybeSingle();
    if (!publisher) return { error: json({ error: 'listing_missing' }, 404) };
    const { data: links } = await supabase
      .from('publisher_healers')
      .select('healers(id, healer_slug, name)')
      .eq('publisher_id', publisher.id);
    owner.publisher = publisher;
    owner.authors = (links || [])
      .map((l) => l.healers)
      .filter(Boolean)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return owner;
  }

  return { error: json({ error: 'unknown_listing' }, 400) };
}

// The books a publisher may manage: the ones it added (approved submissions).
async function publisherBookIds(supabase, publisherId) {
  const { data } = await supabase
    .from('content_submissions')
    .select('target_id')
    .eq('publisher_id', publisherId)
    .eq('content_type', 'book')
    .eq('kind', 'new')
    .eq('status', 'approved');
  return [...new Set((data || []).map((r) => r.target_id).filter(Boolean))];
}

// Everything live that this owner may edit or remove.
export async function liveItems(owner) {
  const { supabase } = owner;
  if (owner.healer) {
    const { healer } = owner;
    const [videos, books, courses, resources] = await Promise.all([
      supabase.from('videos').select(LIVE_COLUMNS.videos).eq('healer_slug', healer.healer_slug).order('created_at', { ascending: false }),
      supabase.from('books').select(LIVE_COLUMNS.books).eq('healer_slug', healer.healer_slug).order('created_at', { ascending: false }),
      supabase.from('courses').select(LIVE_COLUMNS.courses).eq('healer_id', healer.id).order('created_at', { ascending: false }),
      supabase.from('free_resources').select(LIVE_COLUMNS.free_resources).eq('healer_id', healer.id).order('created_at', { ascending: false }),
    ]);
    return {
      video: videos.data || [],
      book: books.data || [],
      course: courses.data || [],
      free_resource: resources.data || [],
    };
  }
  const ids = await publisherBookIds(supabase, owner.publisher.id);
  const { data: books } = ids.length
    ? await supabase.from('books').select(LIVE_COLUMNS.books).in('id', ids).order('created_at', { ascending: false })
    : { data: [] };
  return { video: [], book: books || [], course: [], free_resource: [] };
}

// One live item, if this owner may change it. → the row, or null.
export async function ownedItem(owner, contentType, id) {
  const table = TABLES[contentType];
  if (!table || id === undefined || id === null || id === '') return null;
  const { supabase } = owner;
  const { data: row } = await supabase.from(table).select(LIVE_COLUMNS[table]).eq('id', id).maybeSingle();
  if (!row) return null;
  if (owner.healer) {
    if (contentType === 'video' || contentType === 'book') return row.healer_slug === owner.healer.healer_slug ? row : null;
    return row.healer_id === owner.healer.id ? row : null;
  }
  if (contentType !== 'book') return null;
  const ids = await publisherBookIds(supabase, owner.publisher.id);
  return ids.includes(String(row.id)) ? row : null;
}

export async function knownSubjects(supabase) {
  const { data } = await supabase.from('subjects').select('slug, name').order('name');
  return data || [];
}

// Something already on Spiritpedia with this link. → { id, title, healer } or null.
export async function findDuplicate(supabase, contentType, link, { exceptId } = {}) {
  if (!link) return null;
  const table = TABLES[contentType];
  const column = URL_COLUMNS[contentType];
  let query = supabase.from(table).select(`id, title, slug${contentType === 'video' || contentType === 'book' ? ', healer_slug' : ''}`).limit(1);
  const asin = contentType === 'book' ? amazonId(link) : null;
  query = asin ? query.ilike(column, `%${asin}%`) : query.eq(column, link);
  if (exceptId !== undefined && exceptId !== null) query = query.neq('id', exceptId);
  const { data } = await query;
  return data?.[0] || null;
}

// An owner removed something with this link. → the newest removal, or null.
export async function findRemoval(supabase, contentType, link) {
  if (!link) return null;
  const asin = contentType === 'book' ? amazonId(link) : null;
  let query = supabase
    .from('content_removals')
    .select('id, title, healer_slug, removed_by_name, removed_at')
    .eq('content_type', contentType)
    .order('removed_at', { ascending: false })
    .limit(1);
  query = asin ? query.ilike('url', `%${asin}%`) : query.eq('url', link);
  const { data } = await query;
  return data?.[0] || null;
}

// A short-lived link to an image still in the holding bucket.
export async function holdingImageUrl(supabase, path) {
  if (!path) return null;
  const { data } = await supabase.storage.from(HOLDING_BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl || null;
}

// The public-bucket path of an image we host for content, or null for any
// other URL (an image ingestion linked to elsewhere).
export function hostedContentPath(url) {
  const marker = `/storage/v1/object/public/${PUBLIC_BUCKET}/`;
  const at = String(url || '').indexOf(marker);
  if (at < 0) return null;
  const path = String(url).slice(at + marker.length).split('?')[0];
  return path.startsWith(`${PUBLIC_CONTENT_FOLDER}/`) ? decodeURIComponent(path) : null;
}

// What YouTube says the video is called (its public oEmbed data). → title or null.
export async function youtubeTitle(watchUrl) {
  if (!watchUrl) return null;
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl)}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const body = await res.json();
    return typeof body.title === 'string' ? body.title.trim() || null : null;
  } catch {
    return null;
  }
}
