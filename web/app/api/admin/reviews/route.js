import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import {
  contentUrl,
  firstNameFrom,
  sendReviewApproved,
  sendReviewRejected,
} from '@/utils/email';
import { getContentMeta } from '@/utils/contentMeta';

export const dynamic = 'force-dynamic';

// Every review, whatever its status.
//
// This cannot be read from the browser with the anonymous key: the public
// policy on reviews is `status = 'approved'`, which is the whole point of
// moderation — a pending review is not hidden by the UI, it is unreadable.
// The service role is the only thing that sees the queue.
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const { data, error } = await supabase
    .from('reviews')
    .select('id, content_type, content_slug, rating, body, author_name, author_healer_slug, status, created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: 'query_failed', message: error.message }, { status: 200 });
  }

  return NextResponse.json({ reviews: data || [] });
}

// Moderate one review: set its status, then tell the person who wrote it.
//
// WHY NOT /api/admin/write WITH A FLAG. That route is a generic, allowlisted
// table writer; giving it an opinion about email would mean giving it an
// opinion about every table it serves, one branch at a time. The decision and
// the notice belong together, and this is the route that already knows what a
// review is.
//
// The write goes through the service role because the table's trigger pins
// `status` against anyone else — that is what stops an author approving
// themselves.
const STATUSES = ['pending', 'approved', 'rejected'];

export async function PATCH(request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const { id, status } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from('reviews')
    .update({ status })
    .eq('id', id)
    .select('id, user_id, content_type, content_slug, author_name, status')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The row is returned and checked rather than assumed. A BEFORE UPDATE
  // trigger that rewrites the column answers 200 with nothing changed, and an
  // admin would be told every press worked while the queue never moved.
  if (updated.status !== status) {
    return NextResponse.json(
      {
        error: 'refused',
        message: `The database refused the change — the review is still ${updated.status}.`,
        status: updated.status,
      },
      { status: 409 }
    );
  }

  // Everything past this point is the notice, and none of it may undo the
  // decision. A moderated review stays moderated whether or not the email goes.
  let notified = false;
  if (status === 'approved' || status === 'rejected') {
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(updated.user_id);
      const email = authUser?.user?.email;

      if (email) {
        const meta = await getContentMeta(updated.content_type, updated.content_slug);
        const firstName = firstNameFrom(updated.author_name);

        const result =
          status === 'approved'
            ? await sendReviewApproved({
                email,
                firstName,
                ...meta,
                url: contentUrl(updated.content_type, updated.content_slug),
              })
            : await sendReviewRejected({ email, firstName, ...meta });

        notified = result.sent;
      }
    } catch (err) {
      console.error('[reviews] moderation email failed:', err);
    }
  }

  return NextResponse.json({ ok: true, status: updated.status, notified });
}
