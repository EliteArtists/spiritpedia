import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import { loadCatalogue } from '@/utils/discoveryData';
import { editionLog, previewEdition, testSendEdition } from '@/utils/discoveryEditions';

export const dynamic = 'force-dynamic';

// Admin → People → an explorer → Discoveries.
//   GET ?id=  — the next edition as it would be sent today, and the send log
//   POST { id, action: 'test' } — send that preview to love@spiritpedia.co
//
// Picks that came from activity learning are never shown here: the Privacy
// Policy promises the team never sees what is learned. The preview and the
// log replace them with a note, and a test-send carries the same note.
export async function GET(request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const shared = await loadCatalogue(supabase);
  const preview = await previewEdition(supabase, shared, id);
  if (!preview) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const { _message, _picks, _dropped, ...shown } = preview;
  return NextResponse.json({ preview: shown, log: await editionLog(supabase, id) });
}

export async function POST(request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });
  const { id, action } = await request.json().catch(() => ({}));
  if (!id || action !== 'test') return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const shared = await loadCatalogue(supabase);
  const result = await testSendEdition(supabase, shared, id);
  if (result.status === 'not_found') return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (result.status !== 'sent') return NextResponse.json({ error: 'send_failed', message: 'The test email did not send.' }, { status: 502 });
  return NextResponse.json({ ok: true, to: result.to });
}
