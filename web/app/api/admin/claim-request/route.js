import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { adminClient, isAdminRequest, NOT_CONFIGURED } from '@/utils/supabaseAdmin';
import { firstNameFrom, sendClaimDecision } from '@/utils/email';

export const dynamic = 'force-dynamic';

// Deciding a "Request to claim it" (claim_requests, migration 0020).
//
//   code    — makes a short code for the claimant to put in the channel's
//             About text or on the website: the fallback proof.
//   approve — links the account to the listing, as a verified claim would
//             (only the service role may write those fields), and stops any
//             outreach journey to it.
//   reject  — closes the request.
//
// Approving or rejecting emails the claimant the decision
// (utils/email.js → sendClaimDecision). The email never undoes the decision.
//
// The admin confirms first, by emailing the listing's own published address
// (the Inbox drafts it) or by seeing the code. `proof` records which.

const PROOFS = ['listing_email', 'code', 'other'];
// No 0/O or 1/I, so a code read off a screen is typed back right.
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// The claimant hears the decision. Everything here is a courtesy: a failure is
// logged and the decision stands. → true when the email was accepted.
async function tellClaimant(supabase, claim, decision) {
  try {
    const [{ data: authUser }, { data: profile }] = await Promise.all([
      supabase.auth.admin.getUserById(claim.user_id),
      supabase.from('user_profiles').select('full_name').eq('id', claim.user_id).maybeSingle(),
    ]);
    const email = authUser?.user?.email;
    if (!email) return false;
    const listingName = claim.healer_slug ? claim.healers?.name : claim.publishers?.name;
    const listingPath = claim.healer_slug
      ? `/healers/${claim.healer_slug}`
      : claim.publishers?.slug
        ? `/publishers/${claim.publishers.slug}`
        : '/';
    const result = await sendClaimDecision({
      email,
      firstName: firstNameFrom(profile?.full_name),
      decision,
      listingName,
      listingPath,
    });
    return Boolean(result.sent);
  } catch (err) {
    console.error('[claim-request] decision email failed:', err);
    return false;
  }
}

function makeCode() {
  let out = '';
  for (let i = 0; i < 6; i += 1) out += CODE_LETTERS[randomInt(CODE_LETTERS.length)];
  return `SPIRITPEDIA-${out}`;
}

export async function POST(request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  const supabase = adminClient();
  if (!supabase) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const { action, id, proof } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const { data: claim } = await supabase
    .from('claim_requests')
    .select('id, user_id, healer_slug, publisher_id, status, proof_code, healers(name), publishers(name, slug)')
    .eq('id', id)
    .maybeSingle();
  if (!claim) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (claim.status !== 'pending') {
    return NextResponse.json({ error: 'already_decided', message: `This request is already ${claim.status}.` }, { status: 409 });
  }

  if (action === 'code') {
    // The same code every time it is asked for, so one sent to the claimant
    // never goes stale.
    const code = claim.proof_code || makeCode();
    if (!claim.proof_code) {
      const { error } = await supabase.from('claim_requests').update({ proof_code: code }).eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, proof_code: code });
  }

  if (action === 'reject') {
    const { error } = await supabase
      .from('claim_requests')
      .update({ status: 'rejected', decided_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const notified = await tellClaimant(supabase, claim, 'rejected');
    return NextResponse.json({ ok: true, status: 'rejected', notified });
  }

  if (action !== 'approve') return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
  if (!PROOFS.includes(proof)) {
    return NextResponse.json({ error: 'missing_proof', message: 'Say how the claim was confirmed.' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, linked_healer_slug, linked_publisher_id')
    .eq('id', claim.user_id)
    .maybeSingle();

  // One listing of each kind per account, as a verified claim allows. Moving an
  // account from one listing to another is a decision to make on the record,
  // not by approving a request.
  const current = claim.healer_slug ? profile?.linked_healer_slug : profile?.linked_publisher_id;
  const wanted = claim.healer_slug || claim.publisher_id;
  if (current && current !== wanted) {
    return NextResponse.json(
      { error: 'already_linked', message: 'This account already manages a different listing.' },
      { status: 409 }
    );
  }

  // Nobody else may already manage it.
  const { data: others } = await supabase
    .from('user_profiles')
    .select('id')
    .eq(claim.healer_slug ? 'linked_healer_slug' : 'linked_publisher_id', wanted)
    .neq('id', claim.user_id)
    .limit(1);
  if (others?.length) {
    return NextResponse.json(
      { error: 'already_claimed', message: 'Someone else already manages this listing.' },
      { status: 409 }
    );
  }

  const link = claim.healer_slug ? { linked_healer_slug: claim.healer_slug } : { linked_publisher_id: claim.publisher_id };
  const { error: linkError } = await supabase
    .from('user_profiles')
    .upsert(
      { id: claim.user_id, user_type: 'practitioner', verification_status: 'approved', ...link },
      { onConflict: 'id' }
    );
  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });

  await supabase
    .from('claim_requests')
    .update({ status: 'approved', proof, decided_at: new Date().toISOString() })
    .eq('id', id);

  // Claimed: the outreach journey to this listing has done its job.
  await supabase
    .from('healer_journeys')
    .update({ status: 'stopped', stop_reason: 'claimed' })
    .eq(claim.healer_slug ? 'healer_slug' : 'publisher_id', wanted)
    .neq('status', 'stopped');

  const notified = await tellClaimant(supabase, claim, 'approved');

  return NextResponse.json({
    ok: true,
    status: 'approved',
    healer_slug: claim.healer_slug,
    publisher_id: claim.publisher_id,
    notified,
  });
}
