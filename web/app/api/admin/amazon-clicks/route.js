import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

// GET /api/admin/amazon-clicks?days=7|30|90&platform=all|web|app
//
// Admin → Activity → Amazon clicks (migration 0046). Totals only: taps on a
// Buy on Amazon button per item and store. Clicks, not sales. Before 0046
// runs this answers { missing: true } and the panel says so.

const DAYS = [7, 30, 90];
const TITLES = {
  book: { table: 'books', path: '/books/' },
  course: { table: 'courses', path: '/offerings/' },
};

export async function GET(request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const params = new URL(request.url).searchParams;
  const days = DAYS.includes(Number(params.get('days'))) ? Number(params.get('days')) : 30;
  const p = params.get('platform');
  const platform = p === 'web' || p === 'app' ? p : null;
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * 86400000);

  const { data, error } = await supabase.rpc('amazon_clicks_top', {
    p_from: from.toISOString().slice(0, 10),
    p_to: to.toISOString().slice(0, 10),
    p_platform: platform,
    p_limit: 20,
  });
  if (error) {
    // PGRST202: the function isn't there yet (0046 not run).
    if (error.code === 'PGRST202' || /function .* does not exist|Could not find the function/i.test(error.message)) {
      return NextResponse.json({ missing: true, rows: [], total: 0 });
    }
    return NextResponse.json({ error: 'query_failed', message: error.message }, { status: 500 });
  }

  const names = {};
  await Promise.all(
    Object.entries(TITLES).map(async ([type, t]) => {
      const slugs = [...new Set((data || []).filter((r) => r.content_type === type).map((r) => r.content_slug))];
      if (!slugs.length) return;
      const { data: rows } = await supabase.from(t.table).select('slug, title').in('slug', slugs);
      for (const r of rows || []) names[`${type}:${r.slug}`] = r.title;
    })
  );

  const rows = (data || []).map((r) => ({
    ...r,
    total: Number(r.total),
    title: names[`${r.content_type}:${r.content_slug}`] || r.content_slug,
    href: `${TITLES[r.content_type]?.path || '/'}${r.content_slug}`,
  }));
  return NextResponse.json({ missing: false, days, platform: platform || 'all', rows, total: rows.reduce((a, r) => a + r.total, 0) });
}
