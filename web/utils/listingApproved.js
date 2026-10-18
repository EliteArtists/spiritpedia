// "Your listing is live": the email an owner gets when the admin approves
// their listing — a practitioner, channel, app, organisation or publisher
// (/api/admin/practitioner). Same plain style as the review moderation and
// claim emails. A plain function with no imports, so it is tested without
// Resend (listingApproved.test.mjs).

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// → { subject, text, html }
export function listingLiveMessage({ firstName, listingName, listingUrl, accountUrl, supportEmail }) {
  const name = listingName || 'Your listing';
  const hi = `Hi ${firstName || 'there'},`;
  return {
    subject: 'Your listing on Spiritpedia is live',
    text: `${hi}

Good news: ${name} is now live on Spiritpedia.

See it here: ${listingUrl}

You can update it any time from your account page: ${accountUrl}

If anything needs changing that you can't edit yourself, just reply to this email or write to ${supportEmail}.

With love,
The Spiritpedia team`,
    html: `<p>${escapeHtml(hi)}</p><p>Good news: ${escapeHtml(name)} is now live on Spiritpedia.</p><p><a href="${listingUrl}">See it here</a></p><p>You can update it any time from <a href="${accountUrl}">your account page</a>.</p><p>If anything needs changing that you can't edit yourself, just reply to this email or write to <a href="mailto:${supportEmail}">${supportEmail}</a>.</p><p>With love,<br>The Spiritpedia team</p>`,
  };
}
