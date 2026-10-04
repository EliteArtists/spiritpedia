import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { adminClient } from '@/utils/supabaseAdmin';
import { firstNameFrom, sendReviewReceived } from '@/utils/email';
import { getContentMeta } from '@/utils/contentMeta';

export const dynamic = 'force-dynamic';

// "We have your review." Fired from the review form once the upsert has
// succeeded, fire-and-forget.
//
// contentType and contentSlug ARE taken from the body, and that is safe in a
// way the recipient is not: they only decide which item the email names, and
// the email goes to the token holder whatever they say. The worst a tampered
// body can do is send someone a confusing email about their own review.
export async function POST(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'no_token' }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.json({ error: 'misconfigured' }, { status: 503 });

  const reader = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await reader.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user?.email) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { contentType, contentSlug } = body;
  if (!contentType || !contentSlug) {
    return NextResponse.json({ error: 'missing_content' }, { status: 400 });
  }

  const supabase = adminClient();

  // The reviewer's own name on the review beats the profile name: it is what
  // they chose to be called on this one, and the profile may be empty.
  let firstName = 'there';
  if (supabase) {
    const [{ data: review }, { data: profile }] = await Promise.all([
      supabase
        .from('reviews')
        .select('author_name')
        .eq('user_id', user.id)
        .eq('content_type', contentType)
        .eq('content_slug', contentSlug)
        .maybeSingle(),
      supabase.from('user_profiles').select('full_name').eq('id', user.id).maybeSingle(),
    ]);
    firstName = firstNameFrom(review?.author_name || profile?.full_name);
  }

  const meta = await getContentMeta(contentType, contentSlug);
  const result = await sendReviewReceived({ email: user.email, firstName, ...meta });

  return NextResponse.json({ ok: true, sent: result.sent });
}
