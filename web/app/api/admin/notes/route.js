import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Internal notes about a user.
//
// admin_notes carries RLS with NO policies at all, so neither anon nor
// authenticated can read a byte of it — these are notes ABOUT people, and a
// user reading what was written about them is the one outcome that must be
// impossible. The service role is therefore the only way in, which is why both
// halves live here rather than in the browser.
//
// Columns are subject_user_id and body. (The spec called them user_id and note;
// the table that was actually created uses these.)
export async function GET(request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const { data, error } = await supabase
    .from('admin_notes')
    .select('id, body, created_by, created_at')
    .eq('subject_user_id', id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data || [] });
}

export async function POST(request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const payload = await request.json().catch(() => ({}));
  const id = payload.id;
  const body = String(payload.body || '').trim();

  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  if (!body) return NextResponse.json({ error: 'empty_note' }, { status: 400 });

  const { data, error } = await supabase
    .from('admin_notes')
    .insert({
      subject_user_id: id,
      body,
      // There is no admin user table yet, so the author is the configured
      // display name. It becomes a real identity when admin accounts exist.
      created_by: process.env.ADMIN_NAME || 'Admin',
    })
    .select('id, body, created_by, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data });
}
