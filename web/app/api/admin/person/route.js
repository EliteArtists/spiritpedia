import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Everything behind one person's record: their profile, their email, the healer
// row they are linked to, and the content hanging off it.
//
// The joins are not uniform and cannot be made so: videos and books find a
// practitioner by the text healer_slug, while courses and free_resources use
// the bigint healer_id. That split is documented in the README and is why this
// needs the healer row before it can count anything.
export async function GET(request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !profile) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data: authUser } = await supabase.auth.admin.getUserById(id);
  profile.email = authUser?.user?.email || null;
  profile.last_sign_in_at = authUser?.user?.last_sign_in_at || null;
  profile.email_confirmed_at = authUser?.user?.email_confirmed_at || null;

  let healer = null;
  let content = { videos: [], books: [], courses: [], free_resources: [] };

  if (profile.linked_healer_slug) {
    const { data: h } = await supabase
      .from('healers')
      .select('id, name, healer_slug, tier, entity_type, availability_type, city, country')
      .eq('healer_slug', profile.linked_healer_slug)
      .maybeSingle();
    healer = h || null;

    if (healer) {
      const [videos, books, courses, resources] = await Promise.all([
        supabase.from('videos').select('id, title, platform_url').eq('healer_slug', healer.healer_slug),
        supabase.from('books').select('id, title, slug').eq('healer_slug', healer.healer_slug),
        supabase.from('courses').select('id, title, slug, product_type').eq('healer_id', healer.id),
        supabase.from('free_resources').select('id, title, slug, resource_type').eq('healer_id', healer.id),
      ]);
      content = {
        videos: videos.data || [],
        books: books.data || [],
        courses: courses.data || [],
        free_resources: resources.data || [],
      };
    }
  }

  return NextResponse.json({ profile, healer, content });
}

// Change verification_status by hand.
//
// The field-protection trigger pins this column against every ordinary caller,
// which is what stops practitioners approving themselves. The service role is
// the one path that may set it, and this is deliberately the only field the
// route will write — a general-purpose profile editor here would be a way to
// overwrite linked_healer_slug too, and that belongs with the claim checks.
const STATUSES = ['pending', 'approved', 'rejected'];

export async function PATCH(request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const { id, verification_status: status } = body;

  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({ verification_status: status })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, verification_status: status });
}
