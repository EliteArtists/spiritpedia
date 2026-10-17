// "Request to claim it" (claim_requests, migration 0020): what happens after
// the admin decides. Plain functions with no imports, so they are tested
// without Supabase or Resend (claimRequests.test.mjs).

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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// The email telling a claimant the decision, in the same plain style as the
// review moderation emails. → { subject, text, html }.
export function claimDecisionMessage({ decision, firstName, listingName, listingUrl, accountUrl, supportEmail }) {
  const name = listingName || 'the listing';
  const hi = `Hi ${firstName || 'there'},`;
  const signOff = 'With love,\nThe Spiritpedia team';
  const signOffHtml = '<p>With love,<br>The Spiritpedia team</p>';

  if (decision === 'approved') {
    return {
      subject: `Your claim to ${name} is approved`,
      text: `${hi}

Your request to manage ${name} on Spiritpedia has been approved.

The listing is now linked to your account. Sign in to update it from your account page: ${accountUrl}

View your listing: ${listingUrl}

${signOff}`,
      html: `<p>${escapeHtml(hi)}</p><p>Your request to manage ${escapeHtml(name)} on Spiritpedia has been approved.</p><p>The listing is now linked to your account. Sign in to update it from <a href="${accountUrl}">your account page</a>.</p><p><a href="${listingUrl}">View your listing</a></p>${signOffHtml}`,
    };
  }

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
