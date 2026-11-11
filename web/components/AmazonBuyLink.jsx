'use client';

// A Buy on Amazon link that counts the tap (migration 0046, /api/amazon-click).
//
// sendBeacon queues the count and returns at once, so the new tab opens with
// no wait; where it is missing, a keepalive fetch does the same. Nothing about
// the visitor is sent: the item, the platform and the link (of which the
// server keeps only the store).
export default function AmazonBuyLink({ href, contentType, contentSlug, className, rel, children }) {
  const count = () => {
    try {
      const body = JSON.stringify({ platform: 'web', content_type: contentType, content_slug: contentSlug, url: href });
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon?.('/api/amazon-click', blob)) return;
      fetch('/api/amazon-click', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
    } catch {
      // Counting must never stop the link.
    }
  };

  return (
    <a href={href} target="_blank" rel={rel} className={className} onClick={count} onAuxClick={count}>
      {children}
    </a>
  );
}
