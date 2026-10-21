// SERVER ONLY (it is handed the service-role client).
//
// Loads what a personal discovery edition is chosen from
// (utils/discoverySelect.js). The catalogue — every listing, video, free
// resource, subject and town, and anonymous save totals — is the same for
// everyone, so a daily run loads it once; a person's own inputs are loaded per
// person.
//
// Activity learning is read only when the person has switched it on
// (user_preferences.learning_enabled). The caller decides whether a pick that
// came from it may be shown to the team (it may not: discoveryEmail.js
// masks it).

const PAGE = 1000;

async function everyRow(query) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query().range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < PAGE) return rows;
  }
}

export async function loadCatalogue(supabase) {
  const [healers, videos, freeResources, subjects, saves, broken] = await Promise.all([
    everyRow(() =>
      supabase
        .from('healers')
        .select('healer_slug, name, tier, subject_slugs, entity_type, image_url, image_urls, availability_type, place_id, official')
        .not('healer_slug', 'is', null)
    ),
    everyRow(() => supabase.from('videos').select('slug, title, subject_slugs, healer_slug, platform_url')),
    everyRow(() =>
      supabase.from('free_resources').select('id, slug, title, subject_slugs, is_active, start_date, end_date')
    ),
    everyRow(() => supabase.from('subjects').select('slug, name')),
    // Anonymous totals: how many accounts saved each item. Never who.
    everyRow(() =>
      supabase.from('user_favourites').select('content_type, content_slug').in('content_type', ['healer', 'video', 'free_resource'])
    ),
    everyRow(() => supabase.from('broken_images').select('table_name, record_id').eq('table_name', 'free_resources')),
  ]);

  const placeIds = [...new Set(healers.map((h) => h.place_id).filter(Boolean))];
  const places = {};
  for (let i = 0; i < placeIds.length; i += 500) {
    const { data } = await supabase.from('places').select('id, name, lat, lng').in('id', placeIds.slice(i, i + 500));
    for (const p of data || []) places[p.id] = { name: p.name, lat: Number(p.lat), lng: Number(p.lng) };
  }

  const saveCounts = { healer: {}, video: {}, free_resource: {} };
  for (const s of saves) saveCounts[s.content_type][s.content_slug] = (saveCounts[s.content_type][s.content_slug] || 0) + 1;

  const freeSlugById = new Map(freeResources.map((f) => [f.id, f.slug]));
  const brokenFree = new Set(broken.map((b) => freeSlugById.get(b.record_id)).filter(Boolean));

  return {
    catalogue: {
      healers,
      videos,
      freeResources,
      subjects: Object.fromEntries(subjects.filter((s) => s.slug).map((s) => [s.slug, s.name])),
    },
    places,
    saveCounts,
    broken: { free_resource: brokenFree },
  };
}

// Learning's top subjects now: score halves every 30 days (0021).
export function topLearnedSubjects(rows, now = Date.now(), limit = 3) {
  return (rows || [])
    .map((r) => ({
      slug: r.subject_slug,
      score: r.score * 0.5 ** ((now - Date.parse(r.updated_at)) / (30 * 24 * 60 * 60 * 1000)),
    }))
    .filter((r) => r.score > 0.01)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.slug);
}

export async function loadPerson(supabase, userId) {
  const [{ data: profile }, { data: interests }, { data: prefs }, saves, { data: history }, { data: emailPrefs }] =
    await Promise.all([
      supabase
        .from('user_profiles')
        .select('id, full_name, user_type, verification_status, linked_healer_slug, linked_publisher_id, created_at')
        .eq('id', userId)
        .maybeSingle(),
      supabase.from('user_interests').select('subjects, hidden_subjects').eq('user_id', userId).maybeSingle(),
      supabase.from('user_preferences').select('area_place_id, learning_enabled').eq('user_id', userId).maybeSingle(),
      everyRow(() => supabase.from('user_favourites').select('content_type, content_slug').eq('user_id', userId)),
      supabase
        .from('discovery_editions')
        .select('edition_number, status, picks, sent_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(24),
      supabase.from('email_preferences').select('unsubscribed_at, unsubscribe_token').eq('user_id', userId).maybeSingle(),
    ]);
  if (!profile) return null;

  let learning = null;
  if (prefs?.learning_enabled) {
    const { data: affinity } = await supabase
      .from('subject_affinity')
      .select('subject_slug, score, updated_at')
      .eq('user_id', userId);
    learning = topLearnedSubjects(affinity);
  }

  let area = null;
  if (prefs?.area_place_id) {
    const { data: place } = await supabase.from('places').select('name, lat, lng').eq('id', prefs.area_place_id).maybeSingle();
    if (place) area = { name: place.name, lat: Number(place.lat), lng: Number(place.lng) };
  }

  return {
    profile,
    moreOf: interests?.subjects || [],
    hidden: interests?.hidden_subjects || [],
    learning,
    saves: saves.map((s) => ({ type: s.content_type, slug: s.content_slug })),
    area,
    history: history || [],
    emailPrefs: emailPrefs || null,
  };
}
