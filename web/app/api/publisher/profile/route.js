import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { adminClient } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

// A publisher's own listing (migration 0020): read it, and change the two
// things a publisher may change themselves. The practitioner route's rules:
// identity from Supabase, never the body; the row from THEIR profile, never the
// request; an allowlist. The name, logo and contact_email stay with Spiritpedia
// (contact_email is what a claim is matched against).

function cleanUrl(value) {
  const v = String(value ?? '').trim();
  if (!v) return null;
  try {
    const url = new URL(v);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

async function ownPublisher(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { error: NextResponse.json({ error: 'no_token' }, { status: 401 }) };

  const reader = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await reader.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return { error: NextResponse.json({ error: 'invalid_token' }, { status: 401 }) };

  const supabase = adminClient();
  if (!supabase) return { error: NextResponse.json({ error: 'service_role_missing' }, { status: 503 }) };

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_type, verification_status, linked_publisher_id')
    .eq('id', user.id)
    .maybeSingle();

  if (
    !profile ||
    profile.user_type !== 'practitioner' ||
    profile.verification_status !== 'approved' ||
    !profile.linked_publisher_id
  ) {
    return { error: NextResponse.json({ error: 'not_an_approved_publisher' }, { status: 403 }) };
  }
  return { supabase, publisherId: profile.linked_publisher_id };
}

export async function GET(request) {
  const { error, supabase, publisherId } = await ownPublisher(request);
  if (error) return error;
  const { data: publisher } = await supabase
    .from('publishers')
    .select('id, name, slug, description, website_url, logo_url, contact_email')
    .eq('id', publisherId)
    .maybeSingle();
  if (!publisher) return NextResponse.json({ error: 'publisher_row_missing' }, { status: 404 });
  return NextResponse.json({ publisher });
}

export async function PATCH(request) {
  const { error, supabase, publisherId } = await ownPublisher(request);
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const update = {};
  if (typeof body.description === 'string') update.description = body.description.trim().slice(0, 5000) || null;
  if ('website_url' in body) {
    const raw = String(body.website_url ?? '').trim();
    const valid = raw ? cleanUrl(raw) : null;
    if (raw && !valid) {
      return NextResponse.json({ error: 'invalid_url', message: 'The website must be a full http(s) address.' }, { status: 400 });
    }
    update.website_url = valid;
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 });

  const { error: updateError } = await supabase.from('publishers').update(update).eq('id', publisherId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ ok: true, updated: Object.keys(update) });
}
