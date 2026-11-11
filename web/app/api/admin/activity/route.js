import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

// GET /api/admin/activity?days=7|30|90&platform=all|web|app
//
// Admin → Activity: TOTALS ONLY (migration 0021). Every figure here comes from
// the anonymous daily counts or from account creation dates. Nothing reads a
// member's own learning (activity_events, subject_affinity), and nothing here
// can show what any one person did. Popularity only: no price, commission or
// affiliate data touches any order on this page.

const DAYS = [7, 30, 90];
const TITLES = {
  healer: { table: 'healers', key: 'healer_slug', label: 'name', path: '/healers/' },
  publisher: { table: 'publishers', key: 'slug', label: 'name', path: '/publishers/' },
  book: { table: 'books', key: 'slug', label: 'title', path: '/books/' },
  video: { table: 'videos', key: 'slug', label: 'title', path: '/videos/' },
  course: { table: 'courses', key: 'slug', label: 'title', path: '/offerings/' },
  free_resource: { table: 'free_resources', key: 'slug', label: 'title', path: '/free-resources/' },
};

// Every activity_daily row in the range, paged (PostgREST returns at most
// 1,000 rows a request), summed by kind and platform, with today's figures
// apart. These are the headline totals: how much is happening, not what.
async function totals(supabase, from, to, platform) {
  const sum = { period: {}, today: {}, latestDay: null };
  const today = to;
  for (let start = 0; ; start += 1000) {
    let q = supabase
      .from('activity_daily')
      .select('day, platform, kind, count')
      .gte('day', from)
      .lte('day', to)
      .order('day', { ascending: false })
      .order('platform')
      .order('kind')
      .order('content_type')
      .order('content_slug')
      .range(start, start + 999);
    if (platform) q = q.eq('platform', platform);
    const { data, error } = await q;
    if (error) throw error;
    for (const r of data || []) {
      sum.period[r.kind] = (sum.period[r.kind] || 0) + r.count;
      if (r.day === today) sum.today[r.kind] = (sum.today[r.kind] || 0) + r.count;
      if (!sum.latestDay || r.day > sum.latestDay) sum.latestDay = r.day;
    }
    if (!data || data.length < 1000) break;
  }
  return sum;
}

function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

// Names and links for the items in the lists, one query per table.
async function withTitles(supabase, rows) {
  const byType = {};
  for (const r of rows) (byType[r.content_type] ||= new Set()).add(r.content_slug);
  const names = {};
  await Promise.all(
    Object.entries(byType).map(async ([type, slugs]) => {
      const t = TITLES[type];
      if (!t) return;
      const { data } = await supabase.from(t.table).select(`${t.key}, ${t.label}`).in(t.key, [...slugs]);
      for (const d of data || []) names[`${type}:${d[t.key]}`] = d[t.label];
    })
  );
  return rows.map((r) => ({
    ...r,
    title: names[`${r.content_type}:${r.content_slug}`] || r.content_slug,
    href: TITLES[r.content_type] ? `${TITLES[r.content_type].path}${r.content_slug}` : null,
  }));
}

export async function GET(request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const params = new URL(request.url).searchParams;
  const days = DAYS.includes(Number(params.get('days'))) ? Number(params.get('days')) : 30;
  const platformParam = params.get('platform');
  const platform = platformParam === 'web' || platformParam === 'app' ? platformParam : null;

  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * 86400000);
  const range = { p_from: isoDay(from), p_to: isoDay(to), p_platform: platform };

  const [opened, saved, rising, misses, signups, subjects] = await Promise.all([
    supabase.rpc('activity_top', { p_kind: 'open', ...range, p_limit: 20 }),
    supabase.rpc('activity_top', { p_kind: 'saved', ...range, p_limit: 20 }),
    supabase.rpc('subject_rising', { p_platform: platform, p_limit: 10 }),
    supabase.rpc('search_misses_top', { ...range, p_min: 2, p_limit: 50 }),
    // Sign-ups are counted by where the account was made, whatever the
    // platform filter says about activity.
    supabase.rpc('signups_by_day', { p_from: range.p_from, p_to: range.p_to }),
    supabase.from('subjects').select('slug, name'),
  ]);

  const error = [opened, saved, rising, misses, signups].find((r) => r.error)?.error;
  if (error) return NextResponse.json({ error: 'query_failed', message: error.message }, { status: 500 });

  let headline;
  try {
    headline = await totals(supabase, range.p_from, range.p_to, platform);
  } catch (err) {
    return NextResponse.json({ error: 'query_failed', message: err.message }, { status: 500 });
  }

  const subjectNames = Object.fromEntries((subjects.data || []).map((s) => [s.slug, s.name]));

  return NextResponse.json({
    days,
    platform: platform || 'all',
    from: range.p_from,
    to: range.p_to,
    mostOpened: await withTitles(supabase, opened.data || []),
    mostSaved: await withTitles(supabase, saved.data || []),
    rising: (rising.data || []).map((r) => ({ ...r, name: subjectNames[r.subject_slug] || r.subject_slug })),
    searchMisses: misses.data || [],
    signups: signups.data || [],
    totals: headline,
    // When this was read on the server: the page's "Updated" line.
    readAt: new Date().toISOString(),
  });
}
