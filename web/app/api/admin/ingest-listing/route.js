import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import { checkListing, findDuplicates, isHub, isPublisher, siteKey, slugify, youtubeKey } from '@/utils/listingIngest';

export const dynamic = 'force-dynamic';

// POST /api/admin/ingest-listing { listing, insert }
//
// Admin → Ingestion → Add Listing (owner, 11 Nov 2026): one new person,
// channel, app, organisation, school or publisher, with the sprint ingest's
// checks (utils/listingIngest.js, the same rules as scripts/ingest.mjs). With
// insert false it only checks; with insert true it checks again here, and
// inserts only when nothing stops it. The browser's own check is a preview;
// this one decides.
//
// → { problems, warnings, duplicates, place, teachers, authors, inserted? }

const AVAILABILITY = {
  worldwide: 'Worldwide (Famous Names)',
  local: 'Local Only (In-Person)',
  local_online: 'Local & Online Sessions',
};

const TEXT = [
  'kind', 'name', 'slug', 'bio', 'tier', 'availability', 'city', 'country', 'location_source', 'no_public_base',
  'contact_email', 'contact_email_source', 'contact_recipient_type', 'contact_form_url', 'contact_phone', 'booking_url', 'website_url',
  'youtube_url', 'instagram_url', 'facebook_url', 'twitter_url', 'tiktok_url',
];

// Columns migration 0048 adds. Written when the database has them; before
// 0048 runs, the insert is retried without them and says so, rather than
// failing the whole listing.
const MIGRATION_0048 = ['contact_recipient_type', 'contact_email_source'];

async function insertListing(supabase, table, values, columns) {
  const first = await supabase.from(table).insert(values).select(columns).single();
  const missing = ['42703', 'PGRST204'].includes(first.error?.code);
  if (!missing) return { ...first, without0048: false };
  const fallback = { ...values };
  for (const key of MIGRATION_0048) if (table === 'publishers' || key !== 'contact_email_source') delete fallback[key];
  const second = await supabase.from(table).insert(fallback).select(columns).single();
  return { ...second, without0048: true };
}

// Trimmed strings, whole-number years, real arrays: what the form sent, made
// safe to check and to write.
function clean(raw) {
  const out = {};
  for (const k of TEXT) out[k] = typeof raw?.[k] === 'string' ? raw[k].trim() : '';
  out.slug = out.slug || slugify(out.name);
  for (const k of ['birth_year', 'death_year', 'founded_year']) {
    const n = parseInt(raw?.[k], 10);
    out[k] = Number.isFinite(n) ? n : null;
  }
  out.image_urls = (Array.isArray(raw?.image_urls) ? raw.image_urls : []).map((u) => String(u || '').trim()).filter(Boolean).slice(0, 3);
  out.subjects = [...new Set((Array.isArray(raw?.subjects) ? raw.subjects : []).map((s) => String(s).trim().toLowerCase()).filter(Boolean))];
  out.teachers = (Array.isArray(raw?.teachers) ? raw.teachers : []).map((t) => ({
    slug: String(t?.slug || '').trim().toLowerCase(),
    role: t?.role || 'instructor',
  }));
  out.authors = (Array.isArray(raw?.authors) ? raw.authors : []).map((a) => String(a?.slug || a || '').trim().toLowerCase()).filter(Boolean);
  return out;
}

// ilike with the pattern characters escaped, so a name is matched as written.
const literal = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

async function duplicates(supabase, input) {
  const healerCols = 'name, healer_slug, website_url, youtube_url, entity_type';
  const healers = () => supabase.from('healers').select(healerCols);
  const publishers = () => supabase.from('publishers').select('name, slug, website_url');
  const queries = [
    ['healer', healers().eq('healer_slug', input.slug)],
    ['healer', healers().ilike('name', literal(input.name))],
    ['publisher', publishers().eq('slug', input.slug)],
    ['publisher', publishers().ilike('name', literal(input.name))],
  ];
  const host = siteKey(input.website_url)?.split('/')[0];
  if (host) {
    queries.push(['healer', healers().ilike('website_url', `%${literal(host)}%`)]);
    queries.push(['publisher', publishers().ilike('website_url', `%${literal(host)}%`)]);
  }
  const yt = youtubeKey(input.youtube_url);
  if (yt) queries.push(['healer', healers().ilike('youtube_url', `%${literal(yt.split('/').pop())}%`)]);

  const results = await Promise.all(queries.map(([, q]) => q));
  const failed = results.find((r) => r.error);
  if (failed) throw new Error(failed.error.message);
  const rows = results.flatMap((r, i) =>
    (r.data || []).map((row) => (queries[i][0] === 'publisher' ? { ...row, kind: 'publisher' } : row))
  );
  // One row may have come back from several queries.
  const seen = new Set();
  return findDuplicates(input, rows).filter((d) => {
    const k = `${d.kind}:${d.slug}:${d.field}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function POST(request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const input = clean(body.listing);
  const publisher = isPublisher(input.kind);

  try {
    const { data: subjectRows, error: subjectErr } = await supabase.from('subjects').select('slug');
    if (subjectErr) throw new Error(subjectErr.message);
    const { problems, warnings } = checkListing(input, { subjectSlugs: new Set(subjectRows.map((s) => s.slug)) });

    // Same slug or name stops it, as in the sprint ingest. The same website or
    // channel is shown for a decision: a teacher's site is sometimes their
    // school's.
    const dupes = await duplicates(supabase, input);
    for (const d of dupes) {
      const where = `${d.name} (/${d.kind === 'publisher' ? 'publishers' : 'healers'}/${d.slug})`;
      if (d.field === 'slug' || d.field === 'name') problems.push(`Already on Spiritpedia: the same ${d.field} as ${where}.`);
      else warnings.push(`The same ${d.field} as ${where}. Check it isn’t the same listing.`);
    }

    // The base, as Near You will find it (resolve_place, migration 0019).
    let place = null;
    if (!publisher && input.city && input.country && input.tier !== 'ascended_master') {
      const { data: placeId } = await supabase.rpc('resolve_place', { p_city: input.city, p_country: input.country });
      if (placeId) {
        const { data } = await supabase.from('places').select('id, name, region, country').eq('id', placeId).maybeSingle();
        place = data || { id: placeId };
      } else {
        warnings.push(
          `"${input.city}, ${input.country}" isn’t a town in places (under 5,000 people, or another spelling): Near You won’t find it until a place alias is added (README §18.4).`
        );
      }
    }

    // Teachers (a hub) or authors (a publisher), by slug.
    const resolve = async (slugs) => {
      if (!slugs.length) return [];
      const { data, error } = await supabase.from('healers').select('id, name, healer_slug, entity_type').in('healer_slug', slugs);
      if (error) throw new Error(error.message);
      return data || [];
    };
    const teacherRows = isHub(input.kind) ? await resolve(input.teachers.map((t) => t.slug)) : [];
    const teachers = [];
    for (const t of input.teachers) {
      const row = teacherRows.find((r) => r.healer_slug === t.slug);
      if (!row) problems.push(`Teacher: no listing "${t.slug}".`);
      else if (!teachers.some((x) => x.id === row.id)) teachers.push({ id: row.id, name: row.name, slug: row.healer_slug, role: t.role });
    }
    const authorRows = publisher ? await resolve(input.authors) : [];
    for (const a of input.authors) if (!authorRows.some((r) => r.healer_slug === a)) problems.push(`Author: no listing "${a}".`);
    const authors = authorRows.map((r) => ({ id: r.id, name: r.name, slug: r.healer_slug }));

    const result = { problems, warnings, duplicates: dupes, place, teachers, authors, slug: input.slug };
    if (!body.insert || problems.length) return NextResponse.json(result);

    // ── Insert ─────────────────────────────────────────────────────────────
    if (publisher) {
      const { data: row, error, without0048 } = await insertListing(
        supabase,
        'publishers',
        {
          name: input.name,
          slug: input.slug,
          description: input.bio || null,
          website_url: input.website_url || null,
          logo_url: input.image_urls[0] || null,
          founded_year: input.founded_year,
          subject_slugs: input.subjects,
          tier: input.tier,
          contact_email: input.contact_email || null,
          contact_email_source: input.contact_email ? input.contact_email_source || null : null,
          contact_recipient_type: input.contact_email ? input.contact_recipient_type || null : null,
        },
        'id, slug'
      );
      if (error) throw new Error(error.message);
      if (without0048) result.warnings.push('Saved without the email source and recipient type: run migration 0048, then add them.');
      let linked = 0;
      if (authors.length) {
        const { error: linkErr } = await supabase
          .from('publisher_healers')
          .insert(authors.map((a) => ({ publisher_id: row.id, healer_id: a.id })));
        if (linkErr) {
          return NextResponse.json({ ...result, inserted: { table: 'publishers', ...row, linked }, linkError: linkErr.message });
        }
        linked = authors.length;
      }
      return NextResponse.json({ ...result, inserted: { table: 'publishers', ...row, linked } });
    }

    const ascended = input.tier === 'ascended_master';
    const availability = input.kind === 'individual' ? AVAILABILITY[input.availability] || AVAILABILITY.worldwide : AVAILABILITY.worldwide;
    const { data: row, error, without0048 } = await insertListing(
      supabase,
      'healers',
      {
        name: input.name,
        healer_slug: input.slug,
        bio: input.bio || null,
        tier: input.tier,
        entity_type: input.kind,
        image_urls: input.image_urls,
        subject_slugs: input.subjects,
        birth_year: ascended ? input.birth_year : null,
        death_year: ascended ? input.death_year : null,
        availability_type: availability,
        // place_id follows from city + country (trigger, migration 0019).
        city: ascended ? null : input.city || null,
        country: ascended ? null : input.country || null,
        contact_email: input.contact_email || null,
        contact_email_source: input.contact_email ? input.contact_email_source || null : null,
        contact_recipient_type: input.contact_email ? input.contact_recipient_type || null : null,
        contact_form_url: input.contact_form_url || null,
        contact_phone: input.contact_phone || null,
        booking_url: input.booking_url || null,
        website_url: input.website_url || null,
        youtube_url: input.youtube_url || null,
        instagram_url: input.instagram_url || null,
        facebook_url: input.facebook_url || null,
        twitter_url: input.twitter_url || null,
        tiktok_url: input.tiktok_url || null,
        founded_year: input.kind === 'individual' ? null : input.founded_year,
      },
      'id, healer_slug, place_id'
    );
    if (error) throw new Error(error.message);
    if (without0048) result.warnings.push('Saved without the recipient type: run migration 0048, then add it.');
    let linked = 0;
    if (teachers.length) {
      const { error: linkErr } = await supabase
        .from('hub_teachers')
        .insert(teachers.map((t) => ({ hub_id: row.id, teacher_id: t.id, role: t.role })));
      if (linkErr) {
        return NextResponse.json({ ...result, inserted: { table: 'healers', ...row, linked }, linkError: linkErr.message });
      }
      linked = teachers.length;
    }
    return NextResponse.json({ ...result, inserted: { table: 'healers', ...row, linked } });
  } catch (err) {
    return NextResponse.json({ error: 'failed', message: err.message }, { status: 500 });
  }
}
