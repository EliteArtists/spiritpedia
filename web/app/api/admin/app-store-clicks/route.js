import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import { PLACEMENTS } from '@/utils/appStores';

export const dynamic = 'force-dynamic';

// GET /api/admin/app-store-clicks?days=7|30|90
//
// Admin → Activity → Get the app (migration 0052). Totals only: taps on the
// website's App Store and Google Play links per placement and store, closes of
// the Android strip and the welcome card, and taps by kind of device. Taps,
// not installs. All website, so there is no platform. Before 0052 runs this
// answers { missing: true } and the panel says so.

const DAYS = [7, 30, 90];

export async function GET(request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const params = new URL(request.url).searchParams;
  const days = DAYS.includes(Number(params.get('days'))) ? Number(params.get('days')) : 30;
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * 86400000);

  const { data, error } = await supabase.rpc('app_store_clicks_totals', {
    p_from: from.toISOString().slice(0, 10),
    p_to: to.toISOString().slice(0, 10),
  });
  if (error) {
    // PGRST202: the function isn't there yet (0052 not run).
    if (error.code === 'PGRST202' || /function .* does not exist|Could not find the function/i.test(error.message)) {
      return NextResponse.json({ missing: true, rows: [], total: 0 });
    }
    return NextResponse.json({ error: 'query_failed', message: error.message }, { status: 500 });
  }

  const byPlacement = {};
  const devices = { iphone: 0, ipad: 0, android: 0, desktop: 0, other: 0 };
  const dismissed = { android_banner: 0, after_signup: 0 };
  let total = 0;
  for (const r of data || []) {
    const n = Number(r.total) || 0;
    if (r.action === 'dismiss') {
      if (r.placement in dismissed) dismissed[r.placement] += n;
      continue;
    }
    const row = (byPlacement[r.placement] ||= { placement: r.placement, app_store: 0, google_play: 0, total: 0 });
    if (r.store === 'app_store' || r.store === 'google_play') row[r.store] += n;
    row.total += n;
    if (r.device in devices) devices[r.device] += n;
    total += n;
  }

  // In the same order as utils/appStores.js PLACEMENTS.
  const rows = Object.values(byPlacement).sort(
    (a, b) => PLACEMENTS.indexOf(a.placement) - PLACEMENTS.indexOf(b.placement)
  );
  return NextResponse.json({ missing: false, days, rows, total, devices, dismissed });
}
