// "Request to claim it" (claim_requests, migration 0020): what happens after
// the admin decides. Plain functions that import only other plain functions,
// so they are tested without Supabase or Resend (claimRequests.test.mjs).

import { escapeHtml, greeting } from './emailParts.js';
import { claimApproved } from './emailTemplates.js';

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

// The email telling a claimant the decision. Approved is the approved copy's
// D7 (utils/emailTemplates.js); rejected keeps its wording until the admin can
// record a reason for the claimant (D8 needs one). → { subject, text, html }.
export function claimDecisionMessage({ decision, firstName, listingName, supportEmail }) {
  if (decision === 'approved') return claimApproved({ firstName, listingName });

  const name = listingName || 'the listing';
  const hi = greeting(firstName);
  const signOff = 'With love,\nThe Spiritpedia team';
  const signOffHtml = '<p>With love,<br>The Spiritpedia team</p>';

  return {
    subject: `An update on your claim to ${name}`,
    text: `${hi}

Thank you for asking to manage ${name} on Spiritpedia.

We weren't able to confirm that the listing is yours, so we can't link it to your account.

If you think we've got this wrong, please reply to this email or write to ${supportEmail}, and we'll look at it again.

${signOff}`,
    html: `<p>${escapeHtml(hi)}</p><p>Thank you for asking to manage ${escapeHtml(name)} on Spiritpedia.</p><p>We weren't able to confirm that the listing is yours, so we can't link it to your account.</p><p>If you think we've got this wrong, please reply to this email or write to <a href="mailto:${supportEmail}">${supportEmail}</a>, and we'll look at it again.</p>${signOffHtml}`,
  };
}
