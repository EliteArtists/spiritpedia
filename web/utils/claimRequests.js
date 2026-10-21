// "Request to claim it" (claim_requests, migration 0020): what happens after
// the admin decides. Plain functions that import only other plain functions,
// so they are tested without Supabase or Resend (claimRequests.test.mjs).

import { claimApproved, claimDeclined } from './emailTemplates.js';

// The Privacy Policy: "Requests to claim a listing — 12 months after we decide
// them." Change both together.
export const CLAIM_REQUEST_RETENTION_MONTHS = 12;

// Decided before this moment → deleted.
export function claimRequestCutoff(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - CLAIM_REQUEST_RETENTION_MONTHS);
  return cutoff.toISOString();
}

// Deletes every decided request (approved, rejected or withdrawn) whose
// decision is older than the retention period. A pending request is never
// touched, however old: nobody has decided it yet. → { deleted } or { error }.
export async function purgeDecidedClaimRequests(supabase, now = new Date()) {
  const { data, error } = await supabase
    .from('claim_requests')
    .delete()
    .neq('status', 'pending')
    .not('decided_at', 'is', null)
    .lt('decided_at', claimRequestCutoff(now))
    .select('id');
  if (error) return { error: error.message || String(error) };
  return { deleted: data?.length || 0 };
}

// The email telling a claimant the decision: D7 when approved, D8 with the
// admin's reason when declined (utils/emailTemplates.js). → { subject, text, html }.
export function claimDecisionMessage({ decision, firstName, listingName, reason }) {
  if (decision === 'approved') return claimApproved({ firstName, listingName });
  return claimDeclined({ firstName, listingName, reason });
}
